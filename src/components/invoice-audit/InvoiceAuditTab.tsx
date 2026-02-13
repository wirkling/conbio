'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { InvoiceAudit } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import AuditResultDetail from './AuditResultDetail';

const auditStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
};

interface InvoiceAuditTabProps {
  contractId: string;
  currency: string;
  hasDocuments: boolean;
}

export default function InvoiceAuditTab({
  contractId,
  currency,
  hasDocuments,
}: InvoiceAuditTabProps) {
  const [audits, setAudits] = useState<InvoiceAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<InvoiceAudit | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAudits = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/invoice-audit?contract_id=${contractId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAudits(data);

        // Update selected audit if it was refreshed
        if (selectedAudit) {
          const updated = data.find((a: InvoiceAudit) => a.id === selectedAudit.id);
          if (updated) setSelectedAudit(updated);
        }

        return data;
      }
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setLoading(false);
    }
    return [];
  }, [contractId, selectedAudit]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  // Poll for processing audits
  useEffect(() => {
    const hasProcessing = audits.some(
      (a) => a.status === 'processing' || a.status === 'pending'
    );

    if (hasProcessing) {
      pollingRef.current = setInterval(() => {
        fetchAudits();
      }, 5000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [audits, fetchAudits]);

  const handleUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('invoice', file);
      formData.append('contract_id', contractId);

      const response = await fetch('/api/invoice-audit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to start audit');
        return;
      }

      const audit = await response.json();
      toast.success('Invoice audit completed');
      setSelectedAudit(audit);
      fetchAudits();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset so same file can be selected again
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning if no contract document */}
      {!hasDocuments && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-800">
                  No contract document uploaded
                </p>
                <p className="text-sm text-orange-600">
                  Please upload the contract PDF in the Documents section first. The AI audit compares the invoice against the contract document.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Invoice for Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? (
              <div className="space-y-3">
                <Loader2 className="mx-auto h-10 w-10 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">
                  Uploading and analyzing invoice...
                </p>
                <p className="text-xs text-gray-400">
                  This may take 15-45 seconds depending on document size
                </p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop an invoice PDF here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF files only. The AI will compare it against the contract fee schedule.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!hasDocuments}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Invoice PDF
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit History */}
      {audits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Discrepancies</TableHead>
                  <TableHead className="text-right">Invoice Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => {
                  const statusConf = auditStatusConfig[audit.status] || auditStatusConfig.pending;
                  return (
                    <TableRow
                      key={audit.id}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedAudit?.id === audit.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedAudit(audit)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {audit.invoice_file_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(audit.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConf.color}>
                          {audit.status === 'processing' && (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          {audit.status === 'completed' && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {audit.status === 'failed' && (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {audit.status === 'completed' ? (
                          <span className={audit.total_discrepancies > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {audit.total_discrepancies}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {audit.invoice_total !== null
                          ? new Intl.NumberFormat('de-DE', {
                              style: 'currency',
                              currency: audit.currency || currency,
                              minimumFractionDigits: 2,
                            }).format(audit.invoice_total)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Selected Audit Detail */}
      {selectedAudit && selectedAudit.status === 'completed' && (
        <AuditResultDetail audit={selectedAudit} />
      )}

      {/* Error display for failed audits */}
      {selectedAudit && selectedAudit.status === 'failed' && (
        <Card className="border-red-200">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Audit Failed</p>
                <p className="text-sm text-red-600">
                  {selectedAudit.error_message || 'An unknown error occurred during the audit.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
