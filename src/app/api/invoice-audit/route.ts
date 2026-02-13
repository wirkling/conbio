import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  INVOICE_AUDIT_SYSTEM_PROMPT,
  INVOICE_AUDIT_USER_PROMPT,
} from '@/lib/utils/invoice-audit-prompts';
import { InvoiceAuditResult } from '@/types/database';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_BEDROCK_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const invoiceFile = formData.get('invoice') as File | null;
    const contractId = formData.get('contract_id') as string | null;

    if (!invoiceFile || !contractId) {
      return NextResponse.json(
        { error: 'Missing invoice file or contract_id' },
        { status: 400 }
      );
    }

    // Upload invoice to storage
    const invoicePath = `${contractId}/${Date.now()}-${invoiceFile.name}`;
    const invoiceBuffer = Buffer.from(await invoiceFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(invoicePath, invoiceBuffer, {
        contentType: invoiceFile.type,
      });

    if (uploadError) {
      console.error('Invoice upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload invoice' },
        { status: 500 }
      );
    }

    // Find the primary contract document
    const { data: contractDoc } = await supabase
      .from('documents')
      .select('id, storage_path, file_name')
      .eq('contract_id', contractId)
      .eq('is_primary', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no primary doc, try any document
    let documentToUse = contractDoc;
    if (!documentToUse) {
      const { data: anyDoc } = await supabase
        .from('documents')
        .select('id, storage_path, file_name')
        .eq('contract_id', contractId)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      documentToUse = anyDoc;
    }

    if (!documentToUse) {
      // Clean up uploaded invoice
      await supabase.storage.from('invoices').remove([invoicePath]);
      return NextResponse.json(
        { error: 'No contract document found. Please upload a contract PDF first.' },
        { status: 400 }
      );
    }

    // Create audit record with status 'processing'
    const { data: audit, error: auditCreateError } = await supabase
      .from('invoice_audits')
      .insert({
        contract_id: contractId,
        invoice_file_name: invoiceFile.name,
        invoice_file_path: invoicePath,
        invoice_file_size_bytes: invoiceFile.size,
        contract_document_id: documentToUse.id,
        contract_document_path: documentToUse.storage_path,
        status: 'processing',
        created_by: user.id,
      })
      .select()
      .single();

    if (auditCreateError || !audit) {
      console.error('Audit record creation error:', auditCreateError);
      return NextResponse.json(
        { error: 'Failed to create audit record' },
        { status: 500 }
      );
    }

    // Download both PDFs from storage
    const { data: contractPdfData, error: contractDownloadError } =
      await supabase.storage
        .from('contract-documents')
        .download(documentToUse.storage_path);

    if (contractDownloadError || !contractPdfData) {
      await updateAuditStatus(supabase, audit.id, 'failed', 'Failed to download contract document');
      return NextResponse.json(
        { error: 'Failed to download contract document' },
        { status: 500 }
      );
    }

    const { data: invoicePdfData, error: invoiceDownloadError } =
      await supabase.storage.from('invoices').download(invoicePath);

    if (invoiceDownloadError || !invoicePdfData) {
      await updateAuditStatus(supabase, audit.id, 'failed', 'Failed to download invoice');
      return NextResponse.json(
        { error: 'Failed to download invoice' },
        { status: 500 }
      );
    }

    // Convert to base64 for Bedrock
    const contractBase64 = Buffer.from(
      await contractPdfData.arrayBuffer()
    ).toString('base64');
    const invoiceBase64 = Buffer.from(
      await invoicePdfData.arrayBuffer()
    ).toString('base64');

    // Call AWS Bedrock with both documents
    try {
      const modelId =
        process.env.AWS_BEDROCK_MODEL_ID ||
        'anthropic.claude-sonnet-4-20250514-v1:0';

      const bedrockPayload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 8192,
        system: INVOICE_AUDIT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: contractBase64,
                },
              },
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: invoiceBase64,
                },
              },
              {
                type: 'text',
                text: INVOICE_AUDIT_USER_PROMPT,
              },
            ],
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(bedrockPayload),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      );

      // Extract text content from response
      const textContent = responseBody.content?.find(
        (c: { type: string }) => c.type === 'text'
      );

      if (!textContent?.text) {
        await updateAuditStatus(supabase, audit.id, 'failed', 'No text response from AI model');
        return NextResponse.json(
          { error: 'No response from AI model' },
          { status: 500 }
        );
      }

      // Parse the JSON result
      let auditResult: InvoiceAuditResult;
      try {
        // Remove potential markdown code fences
        let jsonText = textContent.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        auditResult = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        await updateAuditStatus(supabase, audit.id, 'failed', 'Failed to parse AI response as JSON');
        return NextResponse.json(
          { error: 'Failed to parse audit results' },
          { status: 500 }
        );
      }

      // Update audit record with results
      const { data: updatedAudit, error: updateError } = await supabase
        .from('invoice_audits')
        .update({
          status: 'completed',
          audit_result: auditResult,
          total_discrepancies: auditResult.discrepancies?.length || 0,
          invoice_total: auditResult.summary?.total_invoiced || null,
          contract_expected_total:
            auditResult.summary?.total_contracted || null,
          currency: auditResult.summary?.currency || 'EUR',
        })
        .eq('id', audit.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update audit record:', updateError);
      }

      return NextResponse.json(updatedAudit || audit);
    } catch (bedrockError) {
      console.error('Bedrock API error:', bedrockError);
      await updateAuditStatus(
        supabase,
        audit.id,
        'failed',
        `AI model error: ${bedrockError instanceof Error ? bedrockError.message : 'Unknown error'}`
      );
      return NextResponse.json(
        { error: 'AI analysis failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Invoice audit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractId = request.nextUrl.searchParams.get('contract_id');

    if (!contractId) {
      return NextResponse.json(
        { error: 'Missing contract_id parameter' },
        { status: 400 }
      );
    }

    const { data: audits, error } = await supabase
      .from('invoice_audits')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audits' },
        { status: 500 }
      );
    }

    return NextResponse.json(audits || []);
  } catch (error) {
    console.error('Error in GET /api/invoice-audit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to update audit status on failure
async function updateAuditStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  auditId: string,
  status: 'failed' | 'completed',
  errorMessage?: string
) {
  await supabase
    .from('invoice_audits')
    .update({
      status,
      error_message: errorMessage || null,
    })
    .eq('id', auditId);
}
