'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  ArrowLeft,
  Edit,
  FileText,
  Plus,
  Upload,
  ExternalLink,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Download,
  Trash2,
  Target,
  Receipt,
  Link2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Copy,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ContractStatus, ContractType, MilestoneStatus, CostCategory, StandardBonusMalus, CustomBonusMalus, BonusMalusTerms, Milestone, Contract } from '@/types/database';
import { calculateRetentionEndDate } from '@/lib/utils/dates';
import { calculateBonusMalus } from '@/lib/utils/bonus-malus';
import { calculateMilestoneAdjustment } from '@/lib/utils/milestone-adjustments';
import { generateInflationEmail } from '@/lib/utils/email-templates';
import { toast } from 'sonner';

// Mock data - will be replaced with Supabase queries
const mockContract = {
  id: '1',
  title: 'Master Service Agreement - Acme Corp',
  contract_number: 'CON-2024-001',
  contract_type: 'msa' as ContractType,
  status: 'active' as ContractStatus,
  description: 'Master service agreement for platform development services including design, development, testing, and deployment phases.',
  vendor_name: 'Acme Corporation',
  client_name: 'Symbio',
  project_name: 'Platform Development',
  sponsor_name: null,
  signature_date: '2024-01-15',
  start_date: '2024-02-01',
  end_date: '2025-01-31',
  notice_period_days: 90,
  cancellation_deadline: '2024-11-02',
  auto_renew: false,
  original_value: 150000,
  current_value: 195000,
  currency: 'EUR' as const,
  payment_terms: 'Net 30',
  department: 'operations' as const,
  sharepoint_url: 'https://symbio.sharepoint.com/sites/contracts/acme-msa',
  notes: 'Reviewed by Alan on 2024-01-10. Approved by Legal.',
  bonus_malus_terms: {
    type: 'standard' as const,
    early_bonus_percent: 5,
    early_threshold_weeks: 2,
    late_penalty_percent: 10,
    penalty_per_period: 'month' as const,
    max_penalty_percent: 20,
  },
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
  owner_id: null,
  parent_contract_id: null,
  relationship_type: null,
  created_at: '2024-01-10T10:30:00Z',
  updated_at: '2024-06-15T14:22:00Z',
  created_by: null,
  updated_by: null,
};

const mockChangeOrders = [
  {
    id: 'co1',
    change_order_number: 'CO-001',
    title: 'Scope Extension - Phase 2',
    description: 'Added Phase 2 deliverables including mobile app development and API integrations.',
    effective_date: '2024-06-01',
    value_change: 45000,
    created_at: '2024-05-15T09:00:00Z',
  },
];

const mockDocuments = [
  {
    id: 'doc1',
    file_name: 'MSA_Acme_Corp_Signed.pdf',
    file_type: 'application/pdf',
    file_size_bytes: 2456000,
    is_primary: true,
    uploaded_at: '2024-01-15T11:00:00Z',
  },
  {
    id: 'doc2',
    file_name: 'CO-001_Phase2_Extension.pdf',
    file_type: 'application/pdf',
    file_size_bytes: 856000,
    is_primary: false,
    uploaded_at: '2024-06-01T14:30:00Z',
  },
];

// NEW: Milestones mock data
const mockMilestones = [
  {
    id: 'm1',
    contract_id: '1',
    name: 'Project Kickoff',
    description: null,
    milestone_number: 1,
    original_due_date: '2024-02-15',
    original_value: 15000,
    current_due_date: '2024-02-15',
    current_value: 15000,
    status: 'completed' as MilestoneStatus,
    completed_date: '2024-01-28', // Completed 18 days early (2.5 weeks)
    invoiced: true,
    invoiced_date: '2024-01-29',
    paid: true,
    paid_date: '2024-02-15',
    adjustment_type: 'bonus' as const,
    adjustment_amount: 750, // 5% of 15000
    adjustment_percentage: 5,
    adjustment_reason: 'Delivered 2 weeks early',
    adjustment_calculated_at: '2024-01-28T16:00:00Z',
    created_at: '2024-01-10T10:30:00Z',
    updated_at: '2024-01-28T16:00:00Z',
  },
  {
    id: 'm2',
    contract_id: '1',
    name: 'Design Phase Complete',
    description: null,
    milestone_number: 2,
    original_due_date: '2024-04-30',
    original_value: 35000,
    current_due_date: '2024-04-30',
    current_value: 35000,
    status: 'completed' as MilestoneStatus,
    completed_date: '2024-04-28', // 2 days early - not enough for bonus
    invoiced: true,
    invoiced_date: '2024-04-29',
    paid: true,
    paid_date: '2024-05-15',
    adjustment_type: null,
    adjustment_amount: null,
    adjustment_percentage: null,
    adjustment_reason: null,
    adjustment_calculated_at: '2024-04-28T14:00:00Z',
    created_at: '2024-01-10T10:30:00Z',
    updated_at: '2024-04-28T14:00:00Z',
  },
  {
    id: 'm3',
    contract_id: '1',
    name: 'Development Phase 1',
    description: null,
    milestone_number: 3,
    original_due_date: '2024-07-31',
    original_value: 50000,
    current_due_date: '2024-08-15', // Changed via CO
    current_value: 65000, // Increased via CO
    status: 'in_progress' as MilestoneStatus,
    completed_date: null,
    invoiced: false,
    invoiced_date: null,
    paid: false,
    paid_date: null,
    adjustment_type: null,
    adjustment_amount: null,
    adjustment_percentage: null,
    adjustment_reason: null,
    adjustment_calculated_at: null,
    created_at: '2024-01-10T10:30:00Z',
    updated_at: '2024-06-01T09:00:00Z',
  },
  {
    id: 'm4',
    contract_id: '1',
    name: 'UAT Complete',
    description: null,
    milestone_number: 4,
    original_due_date: '2024-10-31',
    original_value: 30000,
    current_due_date: '2024-11-15',
    current_value: 30000,
    status: 'pending' as MilestoneStatus,
    completed_date: null,
    invoiced: false,
    invoiced_date: null,
    paid: false,
    paid_date: null,
    adjustment_type: null,
    adjustment_amount: null,
    adjustment_percentage: null,
    adjustment_reason: null,
    adjustment_calculated_at: null,
    created_at: '2024-01-10T10:30:00Z',
    updated_at: '2024-01-10T10:30:00Z',
  },
  {
    id: 'm5',
    contract_id: '1',
    name: 'Go-Live',
    description: null,
    milestone_number: 5,
    original_due_date: '2024-12-31',
    original_value: 20000,
    current_due_date: '2025-01-15',
    current_value: 50000, // Increased for Phase 2
    status: 'pending' as MilestoneStatus,
    completed_date: null,
    invoiced: false,
    invoiced_date: null,
    paid: false,
    paid_date: null,
    adjustment_type: null,
    adjustment_amount: null,
    adjustment_percentage: null,
    adjustment_reason: null,
    adjustment_calculated_at: null,
    created_at: '2024-01-10T10:30:00Z',
    updated_at: '2024-06-01T09:00:00Z',
  },
];

// NEW: Pass-through costs mock data
const mockPassthroughCosts = [
  {
    id: 'pt1',
    category: 'travel' as CostCategory,
    description: 'Client site visits & workshops',
    passthrough_type: 'quarterly',
    budgeted_total: 20000,
    budgeted_per_period: 5000,
    actual_spent: 8500,
    currency: 'EUR',
    period_start: '2024-02-01',
    period_end: '2025-01-31',
  },
  {
    id: 'pt2',
    category: 'equipment' as CostCategory,
    description: 'Development hardware & licenses',
    passthrough_type: 'total',
    budgeted_total: 15000,
    budgeted_per_period: null,
    actual_spent: 12300,
    currency: 'EUR',
    period_start: null,
    period_end: null,
  },
  {
    id: 'pt3',
    category: 'other' as CostCategory,
    description: 'Third-party API integrations',
    passthrough_type: 'total',
    budgeted_total: 8000,
    budgeted_per_period: null,
    actual_spent: 3200,
    currency: 'EUR',
    period_start: null,
    period_end: null,
  },
];

// NEW: Linked vendor contracts
const mockLinkedVendors = [
  {
    id: 'vc1',
    title: 'Subcontractor - DevTeam GmbH',
    contract_number: 'CON-2024-010',
    vendor_name: 'DevTeam GmbH',
    share_type: 'percentage',
    percentage: 25,
    total_shared: 12500,
    applies_to: 'Development milestones',
    status: 'active',
  },
  {
    id: 'vc2',
    title: 'Design Services - CreativeStudio',
    contract_number: 'CON-2024-011',
    vendor_name: 'CreativeStudio AG',
    share_type: 'fixed',
    fixed_amount: 8000,
    total_shared: 8000,
    applies_to: 'Design Phase',
    status: 'completed',
  },
];

const milestoneStatusColors: Record<MilestoneStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delayed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const costCategoryLabels: Record<CostCategory, string> = {
  investigator_fees: 'Investigator Fees',
  lab_costs: 'Lab Costs',
  imaging: 'Imaging',
  travel: 'Travel',
  equipment: 'Equipment',
  regulatory: 'Regulatory',
  other: 'Other',
};

const contractTypeLabels: Record<ContractType, string> = {
  service_agreement: 'Service Agreement',
  license_agreement: 'License Agreement',
  nda: 'NDA',
  sow: 'Statement of Work',
  msa: 'Master Service Agreement',
  purchase_order: 'Purchase Order',
  lease: 'Lease',
  sponsorship: 'Sponsorship',
  partnership: 'Partnership',
  other: 'Other',
};

const statusColors: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  terminated: 'bg-red-100 text-red-800',
  renewed: 'bg-blue-100 text-blue-800',
};

function formatCurrency(value: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Type guard for CustomBonusMalus
const isCustomBonusMalus = (
  terms: BonusMalusTerms | null
): terms is CustomBonusMalus => {
  return terms?.type === 'custom';
};

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isAddChangeOrderOpen, setIsAddChangeOrderOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isApplyInflationOpen, setIsApplyInflationOpen] = useState(false);
  const [selectedInflationYear, setSelectedInflationYear] = useState<number>(new Date().getFullYear());
  const [inflationRate, setInflationRate] = useState<number | null>(null);
  const [isMarkCompleteOpen, setIsMarkCompleteOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [milestones, setMilestones] = useState<Milestone[]>(mockMilestones);

  const contract = mockContract; // In real app, fetch by params.id

  const totalChangeOrderValue = mockChangeOrders.reduce(
    (sum, co) => sum + (co.value_change || 0),
    0
  );

  // Helper function to render bonus/malus terms
  const renderBonusMalusTerms = (terms: BonusMalusTerms | null) => {
    if (!terms) return null;

    if (terms.type === 'standard') {
      return (
        <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <span className="font-medium">Early Delivery Bonus: </span>
              <span>
                {terms.early_bonus_percent}% if delivered{' '}
                {terms.early_threshold_weeks}+ weeks early
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div>
              <span className="font-medium">Late Delivery Penalty: </span>
              <span>
                {terms.late_penalty_percent}% per{' '}
                {terms.penalty_per_period}, max{' '}
                {terms.max_penalty_percent}% cap
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (isCustomBonusMalus(terms)) {
      return (
        <p className="text-sm whitespace-pre-wrap">
          {terms.terms}
        </p>
      );
    }

    return null;
  };

  // Fetch inflation rate when year changes (mock implementation)
  const fetchInflationRate = (year: number) => {
    // In production, fetch from supabase inflation_rates table
    // For now, return mock data
    const mockRates: Record<number, number> = {
      2024: 2.8,
      2025: 3.2,
      2026: 2.5,
    };
    setInflationRate(mockRates[year] || null);
  };

  // Calculate total contract value increase from inflation
  const calculateTotalIncrease = () => {
    if (!inflationRate) return 0;
    return milestones.reduce((sum, m) => {
      const current = m.current_value || 0;
      const increase = current * (inflationRate / 100);
      return sum + increase;
    }, 0);
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Handle Apply Inflation action
  const handleApplyInflation = async () => {
    if (!inflationRate) {
      toast.error('No inflation rate available');
      return;
    }

    // TODO: In production:
    // 1. Create Change Order
    // 2. Update milestone values
    // 3. Create milestone_changes records
    // 4. Create audit log entries

    toast.success(`Inflation adjustment applied successfully (${inflationRate}%)`);
    setIsApplyInflationOpen(false);
  };

  // Handle Mark Complete action
  const handleMarkComplete = async () => {
    if (!selectedMilestone) return;

    // Calculate bonus/malus adjustment
    const completedMilestone: Milestone = {
      ...selectedMilestone,
      status: 'completed' as MilestoneStatus,
      completed_date: completionDate,
    };

    let adjustmentUpdate = null;
    let adjustmentMessage = '';

    if (contract.bonus_malus_terms?.type === 'standard') {
      adjustmentUpdate = calculateMilestoneAdjustment(
        completedMilestone,
        contract.bonus_malus_terms as StandardBonusMalus
      );

      if (adjustmentUpdate && adjustmentUpdate.adjustment_type) {
        const sign = adjustmentUpdate.adjustment_type === 'bonus' ? '+' : '-';
        adjustmentMessage = ` with ${adjustmentUpdate.adjustment_type} ${sign}${formatCurrency(
          Math.abs(adjustmentUpdate.adjustment_amount || 0),
          contract.currency
        )}`;
      }
    }

    // Update the milestone in state
    const updatedMilestone: Milestone = {
      ...completedMilestone,
      ...(adjustmentUpdate || {}),
      updated_at: new Date().toISOString(),
    };

    setMilestones((prev) =>
      prev.map((m) => (m.id === selectedMilestone.id ? updatedMilestone : m))
    );

    // TODO: In production:
    // 1. Update milestone in Supabase with completion date and adjustment fields
    // 2. Create audit log entry

    toast.success(`Milestone marked complete${adjustmentMessage}`);
    setIsMarkCompleteOpen(false);
    setSelectedMilestone(null);
  };

  // Load inflation rate when dialog opens or year changes
  if (isApplyInflationOpen && selectedInflationYear) {
    fetchInflationRate(selectedInflationYear);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {contract.title}
              </h1>
              <Badge className={statusColors[contract.status]}>
                {contract.status}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">
              {contract.contract_number} • {contractTypeLabels[contract.contract_type]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contract.sharepoint_url && (
            <Button variant="outline" asChild>
              <a href={contract.sharepoint_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                SharePoint
              </a>
            </Button>
          )}
          <Link href={`/contracts/${contract.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">
            Milestones ({milestones.length})
          </TabsTrigger>
          <TabsTrigger value="passthrough">
            Pass-through ({mockPassthroughCosts.length})
          </TabsTrigger>
          <TabsTrigger value="linked">
            Linked ({mockLinkedVendors.length})
          </TabsTrigger>
          <TabsTrigger value="change-orders">
            Change Orders ({mockChangeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({mockDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Key Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Signature Date</p>
                    <p className="font-medium">
                      {contract.signature_date ? formatDate(contract.signature_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">
                      {contract.start_date ? formatDate(contract.start_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">
                      {contract.end_date ? formatDate(contract.end_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Notice Period</p>
                    <p className="font-medium">
                      {contract.notice_period_days ? `${contract.notice_period_days} days` : '-'}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Cancellation Deadline</p>
                  <p className="font-medium text-lg text-orange-600">
                    {contract.cancellation_deadline ? formatDate(contract.cancellation_deadline) : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Auto-renew: {contract.auto_renew ? 'Yes' : 'No'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Commercials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Commercials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Original Value</p>
                    <p className="font-medium">
                      {formatCurrency(contract.original_value || 0, contract.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Change Orders</p>
                    <p className="font-medium text-green-600">
                      +{formatCurrency(totalChangeOrderValue, contract.currency)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Current Value</p>
                  <p className="font-bold text-2xl">
                    {formatCurrency(contract.current_value || 0, contract.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Terms</p>
                  <p className="font-medium">{contract.payment_terms || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Parties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Parties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Vendor</p>
                  <p className="font-medium">{contract.vendor_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{contract.client_name || '-'}</p>
                </div>
                {contract.project_name && (
                  <div>
                    <p className="text-sm text-gray-500">Project</p>
                    <p className="font-medium">{contract.project_name}</p>
                  </div>
                )}
                {contract.sponsor_name && (
                  <div>
                    <p className="text-sm text-gray-500">Sponsor</p>
                    <p className="font-medium">{contract.sponsor_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium capitalize">{contract.department || '-'}</p>
                </div>
                {contract.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-sm">{contract.description}</p>
                  </div>
                )}
                {contract.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm">{contract.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legal Requirements */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Legal Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bonus/Malus */}
                {contract.bonus_malus_terms && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Bonus/Malus Agreements
                    </p>
                    {renderBonusMalusTerms(contract.bonus_malus_terms)}
                  </div>
                )}

                {/* Inflation Clause */}
                {contract.inflation_clause && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-500">Inflation Clause</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsApplyInflationOpen(true)}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Apply Inflation
                      </Button>
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                      {contract.inflation_clause.rate_type && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-gray-500">Rate Type:</span>
                          <span className="font-medium">{contract.inflation_clause.rate_type}</span>
                        </div>
                      )}
                      {contract.inflation_clause.calculation_method && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-gray-500">Calculation:</span>
                          <span className="font-medium">
                            {contract.inflation_clause.calculation_method}
                          </span>
                        </div>
                      )}
                      {contract.inflation_clause.application_timing && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-gray-500">Applied:</span>
                          <span className="font-medium">
                            {contract.inflation_clause.application_timing}
                          </span>
                        </div>
                      )}
                      {contract.inflation_clause.notes && (
                        <div className="pt-2 border-t">
                          <span className="text-gray-500">Notes: </span>
                          <span>{contract.inflation_clause.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Liability Terms */}
                {contract.liability_terms && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Liability</p>
                    <p className="text-sm whitespace-pre-wrap">{contract.liability_terms}</p>
                  </div>
                )}

                {/* Retention Period */}
                {contract.retention_period_value && contract.retention_period_unit && contract.end_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Document Retention Period
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {contract.retention_period_value} {contract.retention_period_unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Retention ends:</span>
                        <span className="font-medium">
                          {formatDate(
                            calculateRetentionEndDate(
                              contract.end_date,
                              contract.retention_period_value,
                              contract.retention_period_unit
                            ).toISOString()
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state if no legal requirements */}
                {!contract.bonus_malus_terms &&
                  !contract.inflation_clause &&
                  !contract.liability_terms &&
                  !contract.retention_period_value && (
                    <p className="text-sm text-gray-400 italic">
                      No legal requirements specified
                    </p>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Change Orders Tab */}
        <TabsContent value="change-orders" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Change Orders</h2>
              <p className="text-sm text-gray-500">
                Track amendments and scope changes
              </p>
            </div>
            <Dialog open={isAddChangeOrderOpen} onOpenChange={setIsAddChangeOrderOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Change Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Change Order</DialogTitle>
                  <DialogDescription>
                    Record a contract amendment or scope change.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="co-title">Title</Label>
                    <Input id="co-title" placeholder="e.g., Scope Extension - Phase 2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="co-number">Change Order Number</Label>
                      <Input id="co-number" placeholder="CO-002" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="co-date">Effective Date</Label>
                      <Input id="co-date" type="date" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="co-value">Value Change (€)</Label>
                    <Input id="co-value" type="number" placeholder="e.g., 25000 or -5000" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="co-description">Description</Label>
                    <Textarea
                      id="co-description"
                      placeholder="Describe the scope change..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddChangeOrderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddChangeOrderOpen(false)}>
                    Save Change Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change Order</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-right">Value Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockChangeOrders.map((co) => (
                    <TableRow key={co.id}>
                      <TableCell>
                        <div className="font-medium">{co.title}</div>
                        <div className="text-sm text-gray-500">{co.change_order_number}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate">{co.description}</p>
                      </TableCell>
                      <TableCell>{co.effective_date}</TableCell>
                      <TableCell className="text-right">
                        <span className={co.value_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {co.value_change >= 0 ? '+' : ''}
                          {formatCurrency(co.value_change)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {mockChangeOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <p className="text-gray-500">No change orders yet</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Impact from Change Orders</span>
                <span className="text-xl font-bold text-green-600">
                  +{formatCurrency(totalChangeOrderValue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Milestones</h2>
              <p className="text-sm text-gray-500">
                Track deliverables and payment schedules
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </div>

          {/* Milestone Progress Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {milestones.filter(m => m.status === 'completed').length}/{milestones.length}
                </div>
                <p className="text-sm text-gray-500">Milestones Completed</p>
                <Progress
                  value={(milestones.filter(m => m.status === 'completed').length / milestones.length) * 100}
                  className="mt-2"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    milestones.filter(m => m.status === 'completed').reduce((sum, m) => {
                      const baseValue = m.current_value || 0;
                      if (contract.bonus_malus_terms?.type === 'standard') {
                        const result = calculateBonusMalus(m, contract.bonus_malus_terms as StandardBonusMalus);
                        const adjustment = result.type === 'bonus' ? result.amount : result.type === 'penalty' ? -result.amount : 0;
                        return sum + baseValue + adjustment;
                      }
                      return sum + baseValue;
                    }, 0)
                  )}
                </div>
                <p className="text-sm text-gray-500">Completed Invoice Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    milestones.filter(m => m.status === 'in_progress').reduce((sum, m) => sum + (m.current_value || 0), 0)
                  )}
                </div>
                <p className="text-sm text-gray-500">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    milestones.reduce((sum, m) => {
                      const baseValue = m.current_value || 0;
                      if (contract.bonus_malus_terms?.type === 'standard' && m.status === 'completed') {
                        const result = calculateBonusMalus(m, contract.bonus_malus_terms as StandardBonusMalus);
                        const adjustment = result.type === 'bonus' ? result.amount : result.type === 'penalty' ? -result.amount : 0;
                        return sum + baseValue + adjustment;
                      }
                      return sum + baseValue;
                    }, 0)
                  )}
                </div>
                <p className="text-sm text-gray-500">Total Invoice Value</p>
              </CardContent>
            </Card>
          </div>

          {/* Milestones Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Base Value</TableHead>
                    <TableHead>Status</TableHead>
                    {contract.bonus_malus_terms?.type === 'standard' && (
                      <>
                        <TableHead className="text-right">Adjustment</TableHead>
                        <TableHead className="text-right">Invoice Amount</TableHead>
                      </>
                    )}
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map((milestone) => {
                    const dateChanged = milestone.original_due_date !== milestone.current_due_date;
                    const valueChanged = milestone.original_value !== milestone.current_value;

                    // Calculate bonus/malus if applicable
                    const bonusMalusResult = contract.bonus_malus_terms?.type === 'standard'
                      ? calculateBonusMalus(milestone, contract.bonus_malus_terms as StandardBonusMalus)
                      : null;

                    const baseValue = milestone.current_value || 0;
                    const adjustmentAmount = bonusMalusResult?.type === 'bonus'
                      ? bonusMalusResult.amount
                      : bonusMalusResult?.type === 'penalty'
                        ? -bonusMalusResult.amount
                        : 0;
                    const invoiceAmount = baseValue + adjustmentAmount;

                    return (
                      <TableRow key={milestone.id}>
                        <TableCell className="font-medium text-gray-500">
                          {milestone.milestone_number}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{milestone.name}</div>
                          {milestone.completed_date && (
                            <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed {formatDate(milestone.completed_date)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{milestone.current_due_date ? formatDate(milestone.current_due_date) : '-'}</div>
                          {dateChanged && (
                            <div className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                              <AlertCircle className="h-3 w-3" />
                              Was {formatDate(milestone.original_due_date!)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatCurrency(baseValue, contract.currency)}</div>
                          {valueChanged && (
                            <div className="text-xs text-orange-600 mt-1">
                              Was {formatCurrency(milestone.original_value || 0, contract.currency)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={milestoneStatusColors[milestone.status]}>
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        {contract.bonus_malus_terms?.type === 'standard' && (
                          <>
                            <TableCell className="text-right">
                              {bonusMalusResult && bonusMalusResult.type !== 'none' ? (
                                <div className={bonusMalusResult.type === 'bonus' ? 'text-green-600' : 'text-red-600'}>
                                  <div className="font-medium">
                                    {bonusMalusResult.type === 'bonus' ? '+' : '-'}
                                    {formatCurrency(bonusMalusResult.amount, contract.currency)}
                                  </div>
                                  <div className="text-xs">{bonusMalusResult.description}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-lg">
                                {formatCurrency(invoiceAmount, contract.currency)}
                              </div>
                              {bonusMalusResult && bonusMalusResult.type !== 'none' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {bonusMalusResult.type === 'bonus' ? 'Incl. bonus' : 'After penalty'}
                                </div>
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {milestone.invoiced ? (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                Invoiced
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-400">
                                Not invoiced
                              </Badge>
                            )}
                            {milestone.paid && (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                Paid
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {milestone.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMilestone(milestone);
                                setCompletionDate(new Date().toISOString().split('T')[0]);
                                setIsMarkCompleteOpen(true);
                              }}
                            >
                              <CheckCircle2 className="mr-2 h-3 w-3" />
                              Mark Complete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pass-through Costs Tab */}
        <TabsContent value="passthrough" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pass-through Costs</h2>
              <p className="text-sm text-gray-500">
                Track budgeted vs. actual pass-through expenses
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Cost Category
            </Button>
          </div>

          {/* Pass-through Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {formatCurrency(mockPassthroughCosts.reduce((sum, pt) => sum + (pt.budgeted_total || 0), 0))}
                </div>
                <p className="text-sm text-gray-500">Total Budget</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(mockPassthroughCosts.reduce((sum, pt) => sum + pt.actual_spent, 0))}
                </div>
                <p className="text-sm text-gray-500">Spent to Date</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    mockPassthroughCosts.reduce((sum, pt) => sum + (pt.budgeted_total || 0), 0) -
                    mockPassthroughCosts.reduce((sum, pt) => sum + pt.actual_spent, 0)
                  )}
                </div>
                <p className="text-sm text-gray-500">Remaining Budget</p>
              </CardContent>
            </Card>
          </div>

          {/* Pass-through Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead>Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPassthroughCosts.map((cost) => {
                    const utilization = cost.budgeted_total
                      ? Math.round((cost.actual_spent / cost.budgeted_total) * 100)
                      : 0;
                    const utilizationColor = utilization > 90
                      ? 'text-red-600'
                      : utilization > 75
                        ? 'text-orange-600'
                        : 'text-green-600';

                    return (
                      <TableRow key={cost.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {costCategoryLabels[cost.category]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{cost.description}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500 capitalize">
                            {cost.passthrough_type === 'quarterly'
                              ? `${formatCurrency(cost.budgeted_per_period || 0)}/quarter`
                              : cost.passthrough_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cost.budgeted_total || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cost.actual_spent)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={utilization} className="w-20" />
                            <span className={`text-sm font-medium ${utilizationColor}`}>
                              {utilization}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Contracts Tab */}
        <TabsContent value="linked" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Linked Contracts</h2>
              <p className="text-sm text-gray-500">
                Vendor contracts and revenue sharing arrangements
              </p>
            </div>
            <Button>
              <Link2 className="mr-2 h-4 w-4" />
              Link Contract
            </Button>
          </div>

          {/* Linked Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {mockLinkedVendors.length}
                </div>
                <p className="text-sm text-gray-500">Linked Vendor Contracts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(mockLinkedVendors.reduce((sum, v) => sum + v.total_shared, 0))}
                </div>
                <p className="text-sm text-gray-500">Total Revenue Shared</p>
              </CardContent>
            </Card>
          </div>

          {/* Linked Vendors Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {mockLinkedVendors.map((vendor) => (
              <Card key={vendor.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{vendor.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {vendor.contract_number} • {vendor.vendor_name}
                      </CardDescription>
                    </div>
                    <Badge className={vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {vendor.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Revenue Share:</span>
                    <span className="font-medium">
                      {vendor.share_type === 'percentage'
                        ? `${vendor.percentage}%`
                        : formatCurrency(vendor.fixed_amount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Applies to:</span>
                    <span className="font-medium">{vendor.applies_to}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Total Shared:</span>
                    <span className="font-bold text-lg">{formatCurrency(vendor.total_shared)}</span>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    View Contract
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {mockLinkedVendors.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="mx-auto h-10 w-10 text-gray-400 mb-4" />
                <p className="text-gray-500">No linked contracts</p>
                <p className="text-sm text-gray-400 mt-1">
                  Link vendor contracts to track revenue sharing
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Documents</h2>
              <p className="text-sm text-gray-500">
                Contract files and attachments
              </p>
            </div>
            <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Add a document to this contract.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, DOC, DOCX up to 50MB
                    </p>
                    <Input type="file" className="mt-4" accept=".pdf,.doc,.docx" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is-primary" className="rounded" />
                    <Label htmlFor="is-primary">Set as primary document</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadDocOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsUploadDocOpen(false)}>
                    Upload
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-red-500" />
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            {doc.is_primary && (
                              <Badge variant="outline" className="text-xs">Primary</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size_bytes)}</TableCell>
                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {mockDocuments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <p className="text-gray-500">No documents uploaded</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Apply Inflation Dialog */}
      <Dialog open={isApplyInflationOpen} onOpenChange={setIsApplyInflationOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply Inflation Adjustment</DialogTitle>
            <DialogDescription>
              Create a change order to adjust milestone values based on inflation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Rate Selection */}
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div>
                  <span className="text-gray-500">Rate Type:</span>
                  <span className="font-medium ml-2">
                    {contract.inflation_clause?.rate_type || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500">Year:</span>
                  <Select
                    value={selectedInflationYear.toString()}
                    onValueChange={(v) => setSelectedInflationYear(parseInt(v))}
                  >
                    <SelectTrigger className="w-24 ml-2 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-lg font-bold text-blue-700">
                Inflation Rate:{' '}
                {inflationRate !== null ? `${inflationRate}%` : 'Not available'}
              </div>
            </div>

            {/* Milestone Impact Preview */}
            {inflationRate !== null && (
              <>
                <div>
                  <Label className="mb-2 block">Milestone Value Changes</Label>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead className="text-right">Current Value</TableHead>
                          <TableHead className="text-right">New Value</TableHead>
                          <TableHead className="text-right">Increase</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestones.map((m) => {
                          const currentValue = m.current_value || 0;
                          const newValue = currentValue * (1 + inflationRate / 100);
                          const increase = newValue - currentValue;

                          return (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.name}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(currentValue, contract.currency)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(newValue, contract.currency)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-green-600">
                                +{formatCurrency(increase, contract.currency)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Total Impact */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Contract Value Increase:</span>
                    <span className="text-xl font-bold text-green-600">
                      +{formatCurrency(calculateTotalIncrease(), contract.currency)}
                    </span>
                  </div>
                </div>

                {/* Email Template Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Email Template</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          generateInflationEmail(
                            contract,
                            milestones,
                            inflationRate,
                            selectedInflationYear
                          )
                        )
                      }
                    >
                      <Copy className="mr-2 h-3 w-3" />
                      Copy Email
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    value={generateInflationEmail(
                      contract,
                      milestones,
                      inflationRate,
                      selectedInflationYear
                    )}
                    rows={12}
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}

            {inflationRate === null && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
                No inflation rate data available for {selectedInflationYear}. Please add inflation
                rates to the database first.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyInflationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyInflation} disabled={inflationRate === null}>
              Create Change Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Complete Dialog */}
      <Dialog open={isMarkCompleteOpen} onOpenChange={setIsMarkCompleteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mark Milestone Complete</DialogTitle>
            <DialogDescription>
              Set the completion date and review the automatic bonus/penalty calculation
            </DialogDescription>
          </DialogHeader>

          {selectedMilestone && (
            <div className="space-y-4 py-4">
              {/* Milestone Info */}
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="font-medium text-lg">{selectedMilestone.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Due: {selectedMilestone.current_due_date ? formatDate(selectedMilestone.current_due_date) : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  Value: {formatCurrency(selectedMilestone.current_value || 0, contract.currency)}
                </div>
              </div>

              {/* Completion Date */}
              <div className="grid gap-2">
                <Label htmlFor="completion_date">Completion Date</Label>
                <Input
                  id="completion_date"
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                />
              </div>

              {/* Bonus/Malus Preview */}
              {contract.bonus_malus_terms?.type === 'standard' && completionDate && (
                <>
                  <Separator />
                  <div>
                    <Label className="mb-2 block">Bonus/Penalty Calculation</Label>
                    {(() => {
                      const completedMilestone = {
                        ...selectedMilestone,
                        completed_date: completionDate,
                      };
                      const adjustment = calculateBonusMalus(
                        completedMilestone,
                        contract.bonus_malus_terms as StandardBonusMalus
                      );

                      const baseValue = selectedMilestone.current_value || 0;
                      const adjustmentAmount =
                        adjustment.type === 'bonus'
                          ? adjustment.amount
                          : adjustment.type === 'penalty'
                            ? -adjustment.amount
                            : 0;
                      const finalAmount = baseValue + adjustmentAmount;

                      if (adjustment.type === 'none') {
                        return (
                          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
                            <div className="text-gray-600">
                              No adjustment - completed within standard timeframe
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          className={`border rounded-md p-3 text-sm ${
                            adjustment.type === 'bonus'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {adjustment.type === 'bonus' ? 'Early Delivery Bonus' : 'Late Delivery Penalty'}
                            </span>
                            <span
                              className={`font-bold ${
                                adjustment.type === 'bonus' ? 'text-green-700' : 'text-red-700'
                              }`}
                            >
                              {adjustment.type === 'bonus' ? '+' : '-'}
                              {formatCurrency(adjustment.amount, contract.currency)}
                            </span>
                          </div>
                          <div className="text-xs mb-2">{adjustment.description}</div>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Final Invoice Amount:</span>
                            <span className="font-bold text-lg">
                              {formatCurrency(finalAmount, contract.currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarkCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkComplete}>Mark Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
