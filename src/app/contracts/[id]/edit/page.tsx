'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ContractType, ContractStatus, Currency, BonusMalusTerms } from '@/types/database';

// Mock contract data - in production, fetch by ID from Supabase
const mockContract = {
  id: '1',
  title: 'Master Service Agreement - Acme Corp',
  contract_number: 'CON-2024-001',
  contract_type: 'msa' as ContractType,
  status: 'active' as ContractStatus,
  description:
    'Master service agreement for platform development services including design, development, testing, and deployment phases.',
  vendor_name: 'Acme Corporation',
  client_name: 'Symbio',
  project_name: 'Platform Development',
  sponsor_name: null,
  signature_date: '2024-01-15',
  start_date: '2024-02-01',
  end_date: '2025-01-31',
  notice_period_days: 90,
  auto_renew: false,
  original_value: 150000,
  currency: 'EUR' as Currency,
  payment_terms: 'Net 30',
  department: 'operations',
  sharepoint_url: 'https://symbio.sharepoint.com/sites/contracts/acme-msa',
  notes: 'Reviewed by Alan on 2024-01-10. Approved by Legal.',
  bonus_malus_terms: {
    type: 'standard' as const,
    early_bonus_percent: 5,
    early_threshold_weeks: 2,
    late_penalty_percent: 10,
    penalty_per_period: 'month' as const,
    max_penalty_percent: 20,
  } as BonusMalusTerms,
  inflation_clause: {
    rate_type: 'German Consumer Price Index (CPI)',
    calculation_method: 'Annual adjustment based on published index change',
    application_timing: 'Applied on contract anniversary date (February 1)',
    notes: 'Minimum 2% increase threshold before adjustment applies',
  },
  liability_terms:
    'Liability capped at contract value. PI insurance required minimum €5M. Excludes consequential damages except for gross negligence.',
  retention_period_value: 10,
  retention_period_unit: 'years' as const,
};

export default function EditContractPage() {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In production: const contract = await fetchContract(params.id);
  const contract = mockContract;

  // Initialize bonus/malus mode based on existing data
  const [bonusMalusMode, setBonusMalusMode] = useState<'standard' | 'custom'>(
    contract.bonus_malus_terms?.type === 'standard' ? 'standard' : 'custom'
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

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

    // Build bonus_malus_terms JSONB object
    let bonusMalusTerms: BonusMalusTerms | null = null;

    if (bonusMalusMode === 'standard') {
      const earlyBonusPercent = parseFloat(formData.get('early_bonus_percent') as string);
      const earlyThresholdWeeks = parseInt(formData.get('early_threshold_weeks') as string);
      const latePenaltyPercent = parseFloat(formData.get('late_penalty_percent') as string);
      const penaltyPerPeriod = formData.get('penalty_per_period') as 'month' | 'week' | 'day';
      const maxPenaltyPercent = parseFloat(formData.get('max_penalty_percent') as string);

      if (earlyBonusPercent && earlyThresholdWeeks && latePenaltyPercent && maxPenaltyPercent) {
        bonusMalusTerms = {
          type: 'standard',
          early_bonus_percent: earlyBonusPercent,
          early_threshold_weeks: earlyThresholdWeeks,
          late_penalty_percent: latePenaltyPercent,
          penalty_per_period: penaltyPerPeriod || 'month',
          max_penalty_percent: maxPenaltyPercent,
        };
      }
    } else {
      const customTerms = formData.get('bonus_malus_custom') as string;
      if (customTerms) {
        bonusMalusTerms = {
          type: 'custom',
          terms: customTerms,
        };
      }
    }

    // Note: This is a mock implementation. In production, you would:
    // 1. Collect all form data including new legal requirement fields
    // 2. Update in Supabase with these fields:
    //    - bonus_malus_terms: bonusMalusTerms (as JSONB)
    //    - inflation_clause: inflationClause (as JSONB)
    //    - liability_terms: formData.get('liability_terms')
    //    - retention_period_value: parseInt(formData.get('retention_period_value'))
    //    - retention_period_unit: formData.get('retention_period_unit')

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success('Contract updated successfully');
    router.push(`/contracts/${params.id}`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Contract</h1>
          <p className="text-gray-500">{contract.title}</p>
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
                  name="title"
                  defaultValue={contract.title}
                  placeholder="e.g., Master Service Agreement - Acme Corp"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contract_number">Contract Number</Label>
                <Input
                  id="contract_number"
                  name="contract_number"
                  defaultValue={contract.contract_number || ''}
                  placeholder="e.g., CON-2024-001"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contract_type">Contract Type *</Label>
                <Select name="contract_type" defaultValue={contract.contract_type} required>
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
                <Select name="status" defaultValue={contract.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="renewed">Renewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Select name="department" defaultValue={contract.department || undefined}>
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
                  name="description"
                  defaultValue={contract.description || ''}
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
                <Input
                  id="vendor_name"
                  name="vendor_name"
                  defaultValue={contract.vendor_name || ''}
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  defaultValue={contract.client_name || ''}
                  placeholder="e.g., Symbio"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project_name">Project Name</Label>
                <Input
                  id="project_name"
                  name="project_name"
                  defaultValue={contract.project_name || ''}
                  placeholder="e.g., Platform Development"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sponsor_name">Sponsor Name</Label>
                <Input
                  id="sponsor_name"
                  name="sponsor_name"
                  defaultValue={contract.sponsor_name || ''}
                  placeholder="e.g., Research Foundation"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Key Dates</CardTitle>
            <CardDescription>Contract timeline and deadlines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="signature_date">Signature Date</Label>
                <Input
                  id="signature_date"
                  name="signature_date"
                  type="date"
                  defaultValue={contract.signature_date || ''}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={contract.start_date || ''}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={contract.end_date || ''}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notice_period">Notice Period (days)</Label>
                <Input
                  id="notice_period"
                  name="notice_period_days"
                  type="number"
                  defaultValue={contract.notice_period_days || ''}
                  placeholder="e.g., 90"
                  min="0"
                  max="365"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_renew"
                name="auto_renew"
                className="rounded"
                defaultChecked={contract.auto_renew}
              />
              <Label htmlFor="auto_renew">Auto-renew contract</Label>
            </div>

            <p className="text-sm text-gray-500">
              Cancellation deadline will be automatically calculated based on end date and
              notice period.
            </p>
          </CardContent>
        </Card>

        {/* Commercials */}
        <Card>
          <CardHeader>
            <CardTitle>Commercials</CardTitle>
            <CardDescription>Contract value and payment terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="original_value">Contract Value</Label>
                <Input
                  id="original_value"
                  name="original_value"
                  type="number"
                  defaultValue={contract.original_value || ''}
                  placeholder="e.g., 50000"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select name="currency" defaultValue={contract.currency}>
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
                <Input
                  id="payment_terms"
                  name="payment_terms"
                  defaultValue={contract.payment_terms || ''}
                  placeholder="e.g., Net 30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Legal Requirements</CardTitle>
            <CardDescription>Legal terms and compliance requirements</CardDescription>
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
                  onChange={(e) => setBonusMalusMode(e.target.checked ? 'standard' : 'custom')}
                  className="rounded"
                />
                <Label htmlFor="bonus_malus_standard">Use Standard Bonus/Malus Agreement</Label>
              </div>

              {bonusMalusMode === 'standard' ? (
                <div className="border rounded-md p-4 space-y-3 bg-gray-50">
                  {/* Early Delivery Bonus */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Early Delivery Bonus</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label htmlFor="early_bonus_percent" className="text-xs">
                          Bonus %
                        </Label>
                        <Input
                          id="early_bonus_percent"
                          name="early_bonus_percent"
                          type="number"
                          defaultValue={
                            contract.bonus_malus_terms?.type === 'standard'
                              ? contract.bonus_malus_terms.early_bonus_percent
                              : ''
                          }
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
                          defaultValue={
                            contract.bonus_malus_terms?.type === 'standard'
                              ? contract.bonus_malus_terms.early_threshold_weeks
                              : ''
                          }
                          placeholder="2"
                          min="0"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., &quot;5% bonus if delivered 2+ weeks early&quot;
                    </p>
                  </div>

                  {/* Late Delivery Penalty */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Late Delivery Penalty</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1">
                        <Label htmlFor="late_penalty_percent" className="text-xs">
                          Penalty %
                        </Label>
                        <Input
                          id="late_penalty_percent"
                          name="late_penalty_percent"
                          type="number"
                          defaultValue={
                            contract.bonus_malus_terms?.type === 'standard'
                              ? contract.bonus_malus_terms.late_penalty_percent
                              : ''
                          }
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
                        <Select
                          name="penalty_per_period"
                          defaultValue={
                            contract.bonus_malus_terms?.type === 'standard'
                              ? contract.bonus_malus_terms.penalty_per_period
                              : 'month'
                          }
                        >
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
                          defaultValue={
                            contract.bonus_malus_terms?.type === 'standard'
                              ? contract.bonus_malus_terms.max_penalty_percent
                              : ''
                          }
                          placeholder="20"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., &quot;10% penalty per month delayed, max 20%&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Textarea
                    id="bonus_malus_custom"
                    name="bonus_malus_custom"
                    defaultValue={
                      contract.bonus_malus_terms?.type === 'custom'
                        ? contract.bonus_malus_terms.terms
                        : ''
                    }
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
                    defaultValue={contract.inflation_clause?.rate_type || ''}
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
                    defaultValue={contract.inflation_clause?.calculation_method || ''}
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
                    defaultValue={contract.inflation_clause?.application_timing || ''}
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
                    defaultValue={contract.inflation_clause?.notes || ''}
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
                defaultValue={contract.liability_terms || ''}
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
                    defaultValue={contract.retention_period_value || ''}
                    placeholder="e.g., 10"
                    min="0"
                    max="999"
                    className="w-32"
                  />
                </div>
                <div className="grid gap-2 flex-1">
                  <Select
                    name="retention_period_unit"
                    defaultValue={contract.retention_period_unit || undefined}
                  >
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
            <CardDescription>Links to external resources and notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sharepoint_url">SharePoint URL</Label>
              <Input
                id="sharepoint_url"
                name="sharepoint_url"
                type="url"
                defaultValue={contract.sharepoint_url || ''}
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
                name="notes"
                defaultValue={contract.notes || ''}
                placeholder="Internal notes about this contract..."
                rows={3}
              />
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
