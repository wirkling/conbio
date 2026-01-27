'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function NewContractPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bonusMalusMode, setBonusMalusMode] = useState<'standard' | 'custom'>('custom');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a contract');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Build inflation clause object from nested fields
      const inflationRateType = formData.get('inflation_rate_type') as string;
      const inflationCalculation = formData.get('inflation_calculation') as string;
      const inflationTiming = formData.get('inflation_timing') as string;
      const inflationNotes = formData.get('inflation_notes') as string;

      const inflationClause =
        inflationRateType || inflationCalculation || inflationTiming || inflationNotes
          ? {
              rate_type: inflationRateType || undefined,
              calculation_method: inflationCalculation || undefined,
              application_timing: inflationTiming || undefined,
              notes: inflationNotes || undefined,
            }
          : null;

      // Build bonus/malus object based on mode
      let bonusMalusTerms = null;
      if (bonusMalusMode === 'standard') {
        const earlyBonus = formData.get('early_bonus_percent');
        const earlyThreshold = formData.get('early_threshold_weeks');
        const latePenalty = formData.get('late_penalty_percent');
        const penaltyPeriod = formData.get('penalty_per_period');
        const maxPenalty = formData.get('max_penalty_percent');

        if (earlyBonus || latePenalty) {
          bonusMalusTerms = {
            type: 'standard',
            early_bonus_percent: earlyBonus ? parseFloat(earlyBonus as string) : 0,
            early_threshold_weeks: earlyThreshold ? parseInt(earlyThreshold as string) : 0,
            late_penalty_percent: latePenalty ? parseFloat(latePenalty as string) : 0,
            penalty_per_period: (penaltyPeriod as 'month' | 'week' | 'day') || 'month',
            max_penalty_percent: maxPenalty ? parseFloat(maxPenalty as string) : 0,
          };
        }
      } else {
        const customTerms = formData.get('bonus_malus_custom');
        if (customTerms) {
          bonusMalusTerms = {
            type: 'custom',
            terms: customTerms as string,
          };
        }
      }

      // 1. Upload document if provided
      let documentUrls: string[] = [];
      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput?.files && fileInput.files.length > 0) {
        for (const file of Array.from(fileInput.files)) {
          const filePath = `${user.id}/${Date.now()}-${file.name}`;
          const { data, error } = await supabase.storage
            .from('contract-documents')
            .upload(filePath, file);

          if (error) {
            console.error('Error uploading file:', error);
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }

          if (data) {
            documentUrls.push(data.path);
          }
        }
      }

      // 2. Prepare contract data
      const contractData = {
        title: formData.get('title') as string,
        contract_number: (formData.get('contract_number') as string) || null,
        contract_type: formData.get('contract_type') as string,
        status: (formData.get('status') as string) || 'draft',
        vendor_name: (formData.get('vendor_name') as string) || null,
        client_name: (formData.get('client_name') as string) || 'Symbio',
        project_name: (formData.get('project_name') as string) || null,
        sponsor_name: (formData.get('sponsor_name') as string) || null,
        description: (formData.get('description') as string) || null,
        signature_date: (formData.get('signature_date') as string) || null,
        start_date: (formData.get('start_date') as string) || null,
        end_date: (formData.get('end_date') as string) || null,
        notice_period: formData.get('notice_period')
          ? parseInt(formData.get('notice_period') as string)
          : null,
        auto_renew: formData.get('auto_renew') === 'on',
        original_value: formData.get('original_value')
          ? parseFloat(formData.get('original_value') as string)
          : 0,
        current_value: formData.get('original_value')
          ? parseFloat(formData.get('original_value') as string)
          : 0,
        currency: (formData.get('currency') as string) || 'EUR',
        payment_terms: (formData.get('payment_terms') as string) || null,
        bonus_malus_terms: bonusMalusTerms,
        inflation_clause: inflationClause,
        liability_terms: (formData.get('liability_terms') as string) || null,
        retention_period_value: formData.get('retention_period_value')
          ? parseInt(formData.get('retention_period_value') as string)
          : null,
        retention_period_unit: (formData.get('retention_period_unit') as string) || null,
        sharepoint_url: (formData.get('sharepoint_url') as string) || null,
        notes: (formData.get('notes') as string) || null,
        document_urls: documentUrls.length > 0 ? documentUrls : null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 3. Insert into Supabase
      const { data: newContract, error: contractError } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single();

      if (contractError) {
        console.error('Error creating contract:', contractError);
        toast.error('Failed to create contract');
        setIsSubmitting(false);
        return;
      }

      // 4. Create audit log entry
      await supabase.from('audit_log').insert([
        {
          table_name: 'contracts',
          record_id: newContract.id,
          action: 'create',
          old_values: null,
          new_values: contractData,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        },
      ]);

      toast.success('Contract created successfully');
      router.push(`/contracts/${newContract.id}`);
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Contract</h1>
          <p className="text-gray-500">Create a new contract record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the contract title and classification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="title">Contract Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Master Service Agreement - Acme Corp"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contract_number">Contract Number</Label>
                <Input id="contract_number" placeholder="e.g., CON-2024-001" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contract_type">Contract Type *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="msa">Master Service Agreement</SelectItem>
                    <SelectItem value="service_agreement">Service Agreement</SelectItem>
                    <SelectItem value="license_agreement">License Agreement</SelectItem>
                    <SelectItem value="nda">NDA</SelectItem>
                    <SelectItem value="sow">Statement of Work</SelectItem>
                    <SelectItem value="purchase_order">Purchase Order</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="sponsorship">Sponsorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="draft">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the contract..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle>Parties</CardTitle>
            <CardDescription>
              Identify the parties involved in this contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input id="vendor_name" placeholder="e.g., Acme Corporation" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input id="client_name" placeholder="e.g., Symbio" defaultValue="Symbio" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project_name">Project Name</Label>
                <Input id="project_name" placeholder="e.g., Platform Development" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sponsor_name">Sponsor Name</Label>
                <Input id="sponsor_name" placeholder="e.g., Research Foundation" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Key Dates</CardTitle>
            <CardDescription>
              Contract timeline and deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="signature_date">Signature Date</Label>
                <Input id="signature_date" type="date" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" type="date" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notice_period">Notice Period (days)</Label>
                <Input
                  id="notice_period"
                  type="number"
                  placeholder="e.g., 90"
                  min="0"
                  max="365"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="auto_renew" className="rounded" />
              <Label htmlFor="auto_renew">Auto-renew contract</Label>
            </div>

            <p className="text-sm text-gray-500">
              Cancellation deadline will be automatically calculated based on end date and notice period.
            </p>
          </CardContent>
        </Card>

        {/* Commercials */}
        <Card>
          <CardHeader>
            <CardTitle>Commercials</CardTitle>
            <CardDescription>
              Contract value and payment terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="original_value">Contract Value</Label>
                <Input
                  id="original_value"
                  type="number"
                  placeholder="e.g., 50000"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select defaultValue="EUR">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input id="payment_terms" placeholder="e.g., Net 30" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Legal Requirements</CardTitle>
            <CardDescription>
              Legal terms and compliance requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bonus/Malus Agreements */}
            <div className="grid gap-2">
              <Label htmlFor="bonus_malus_type">Bonus/Malus Agreements</Label>

              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="bonus_malus_standard"
                  checked={bonusMalusMode === 'standard'}
                  onChange={(e) =>
                    setBonusMalusMode(e.target.checked ? 'standard' : 'custom')
                  }
                  className="rounded"
                />
                <Label htmlFor="bonus_malus_standard" className="font-normal">
                  Use Standard Bonus/Malus Agreement
                </Label>
              </div>

              {bonusMalusMode === 'standard' ? (
                <div className="border rounded-md p-4 space-y-3 bg-gray-50">
                  {/* Early Delivery Bonus */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Early Delivery Bonus
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label htmlFor="early_bonus_percent" className="text-xs">
                          Bonus %
                        </Label>
                        <Input
                          id="early_bonus_percent"
                          name="early_bonus_percent"
                          type="number"
                          placeholder="5"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="early_threshold_weeks" className="text-xs">
                          Threshold (weeks)
                        </Label>
                        <Input
                          id="early_threshold_weeks"
                          name="early_threshold_weeks"
                          type="number"
                          placeholder="2"
                          min="0"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., "5% bonus if delivered 2+ weeks early"
                    </p>
                  </div>

                  {/* Late Delivery Penalty */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Late Delivery Penalty
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1">
                        <Label htmlFor="late_penalty_percent" className="text-xs">
                          Penalty %
                        </Label>
                        <Input
                          id="late_penalty_percent"
                          name="late_penalty_percent"
                          type="number"
                          placeholder="10"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="penalty_per_period" className="text-xs">
                          Per
                        </Label>
                        <Select name="penalty_per_period" defaultValue="month">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="max_penalty_percent" className="text-xs">
                          Max Cap %
                        </Label>
                        <Input
                          id="max_penalty_percent"
                          name="max_penalty_percent"
                          type="number"
                          placeholder="20"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., "10% penalty per month delayed, max 20%"
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Textarea
                    id="bonus_malus_custom"
                    name="bonus_malus_custom"
                    placeholder="e.g., 1 month delay = 10% penalty, max 20% total; Early delivery = 5% bonus"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Define performance-based bonuses or penalties with limits and percentages
                  </p>
                </>
              )}
            </div>

            {/* Inflation Clause */}
            <div className="grid gap-2">
              <Label>Inflation Clause</Label>
              <div className="border rounded-md p-4 space-y-3 bg-gray-50">
                <div className="grid gap-2">
                  <Label htmlFor="inflation_rate_type" className="text-sm">
                    Rate Type
                  </Label>
                  <Input
                    id="inflation_rate_type"
                    name="inflation_rate_type"
                    placeholder="e.g., CPI, HVPI, Custom Index"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inflation_calculation" className="text-sm">
                    Calculation Method
                  </Label>
                  <Input
                    id="inflation_calculation"
                    name="inflation_calculation"
                    placeholder="e.g., Annual adjustment based on published index"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inflation_timing" className="text-sm">
                    Application Timing
                  </Label>
                  <Input
                    id="inflation_timing"
                    name="inflation_timing"
                    placeholder="e.g., On contract anniversary date"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inflation_notes" className="text-sm">
                    Additional Notes
                  </Label>
                  <Textarea
                    id="inflation_notes"
                    name="inflation_notes"
                    placeholder="Any additional inflation clause details..."
                    rows={2}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Define how inflation adjustments are calculated and applied
              </p>
            </div>

            {/* Liability Terms */}
            <div className="grid gap-2">
              <Label htmlFor="liability_terms">Liability</Label>
              <Textarea
                id="liability_terms"
                name="liability_terms"
                placeholder="Define liability terms, caps, exclusions, and insurance requirements..."
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Liability terms specific to this contract
              </p>
            </div>

            {/* Document Retention Period */}
            <div className="grid gap-2">
              <Label>Document Retention Period</Label>
              <div className="flex gap-2 items-start">
                <div className="grid gap-2 flex-1">
                  <Input
                    id="retention_period_value"
                    name="retention_period_value"
                    type="number"
                    placeholder="e.g., 10"
                    min="0"
                    max="999"
                    className="w-32"
                  />
                </div>
                <div className="grid gap-2 flex-1">
                  <Select name="retention_period_unit">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Period that contract documents must be retained for compliance
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Links & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>
              Links to external resources and notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sharepoint_url">SharePoint URL</Label>
              <Input
                id="sharepoint_url"
                type="url"
                placeholder="https://symbio.sharepoint.com/..."
              />
              <p className="text-xs text-gray-500">
                Link to the contract folder in SharePoint
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this contract..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
            <CardDescription>
              Attach the contract document (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOC, DOCX up to 50MB
              </p>
              <Input type="file" className="mt-4 max-w-xs mx-auto" accept=".pdf,.doc,.docx" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Contract
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
