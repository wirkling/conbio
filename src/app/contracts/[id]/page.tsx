'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Contract,
  Milestone,
  PassthroughCost,
  PassthroughActual,
  ChangeOrder,
  ChangeOrderFormData,
  MilestoneAdjustmentInput,
  PassthroughAdjustmentInput,
  ChangeOrderType,
  PtcPrepayment,
  PtcPrepaymentTopup,
  PtcPrepaymentBalance,
  PrepaymentModel,
  PrepaymentDirection,
  PrepaymentPaymentTerms,
} from '@/types/database';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, FileText, Plus, Target, Receipt, Edit, Trash2, CheckCircle2, Upload, Link2, MoreHorizontal, CheckCheck, DollarSign, Banknote, AlertTriangle, RefreshCw, ExternalLink, ClipboardCheck } from 'lucide-react';
import InvoiceAuditTab from '@/components/invoice-audit/InvoiceAuditTab';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  terminated: 'bg-red-100 text-red-800',
  renewed: 'bg-blue-100 text-blue-800',
};

function formatCurrency(value: number | null, currency: string = 'EUR') {
  if (value === null) return '0 ' + currency;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('de-DE');
}

const milestoneStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delayed: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = params.id as string;
  const { user } = useAuth();
  const hasFetchedRef = useRef(false);

  // Dialog states
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [isEditMilestoneOpen, setIsEditMilestoneOpen] = useState(false);
  const [isAddChangeOrderOpen, setIsAddChangeOrderOpen] = useState(false);
  const [isEditChangeOrderOpen, setIsEditChangeOrderOpen] = useState(false);
  const [isAddPTCOpen, setIsAddPTCOpen] = useState(false);
  const [isEditPTCOpen, setIsEditPTCOpen] = useState(false);
  const [isApplyInflationOpen, setIsApplyInflationOpen] = useState(false);

  // Milestone form state
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneValue, setMilestoneValue] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Change Order form state
  const [changeOrderTitle, setChangeOrderTitle] = useState('');
  const [changeOrderNumber, setChangeOrderNumber] = useState('');
  const [changeOrderValue, setChangeOrderValue] = useState('');
  const [changeOrderDate, setChangeOrderDate] = useState('');
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);

  // Enhanced Change Order multi-step form state
  const [coFormStep, setCoFormStep] = useState(1);
  const [coFormData, setCoFormData] = useState<Partial<ChangeOrderFormData>>({
    co_type: 'milestone_adjustment',
    milestone_adjustments: [],
    ptc_adjustments: [],
  });

  // Pass-Through Cost form state
  const [ptcDescription, setPtcDescription] = useState('');
  const [ptcBudget, setPtcBudget] = useState('');
  const [ptcActualSpent, setPtcActualSpent] = useState('');
  const [editingPTC, setEditingPTC] = useState<PassthroughCost | null>(null);

  // Prepayment state
  const [prepayment, setPrepayment] = useState<PtcPrepayment | null>(null);
  const [prepaymentBalance, setPrepaymentBalance] = useState<PtcPrepaymentBalance | null>(null);
  const [prepaymentTopups, setPrepaymentTopups] = useState<PtcPrepaymentTopup[]>([]);
  const [passthroughActuals, setPassthroughActuals] = useState<PassthroughActual[]>([]);

  // Prepayment dialog states
  const [isConfigurePrepaymentOpen, setIsConfigurePrepaymentOpen] = useState(false);
  const [isEditPrepaymentOpen, setIsEditPrepaymentOpen] = useState(false);
  const [isAddActualOpen, setIsAddActualOpen] = useState(false);
  const [isEditActualOpen, setIsEditActualOpen] = useState(false);
  const [isAddTopupOpen, setIsAddTopupOpen] = useState(false);
  const [isEditTopupOpen, setIsEditTopupOpen] = useState(false);

  // Prepayment form state
  const [prepaymentForm, setPrepaymentForm] = useState({
    prepayment_model: 'retainer' as PrepaymentModel,
    direction: 'receive' as PrepaymentDirection,
    payment_terms: 'upon_signature' as PrepaymentPaymentTerms,
    payment_terms_custom: '',
    prepayment_amount: '',
    threshold_amount: '',
    threshold_percentage: '',
    reconciliation_trigger: '',
    reconciliation_date: '',
    notes: '',
  });

  // Actual form state
  const [actualForm, setActualForm] = useState({
    passthrough_cost_id: '',
    amount: '',
    transaction_date: '',
    period_year: new Date().getFullYear().toString(),
    period_month: (new Date().getMonth() + 1).toString(),
    invoice_number: '',
    invoice_url: '',
    description: '',
  });
  const [editingActual, setEditingActual] = useState<PassthroughActual | null>(null);

  // Topup form state
  const [topupForm, setTopupForm] = useState({
    amount: '',
    topup_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    invoice_url: '',
    notes: '',
  });
  const [editingTopup, setEditingTopup] = useState<PtcPrepaymentTopup | null>(null);

  // Inflation adjustment form state
  const [inflationYear, setInflationYear] = useState(new Date().getFullYear().toString());
  const [inflationRate, setInflationRate] = useState('');
  const [configuredRate, setConfiguredRate] = useState<number | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedMilestonesForInflation, setSelectedMilestonesForInflation] = useState<string[]>([]);

  const [data, setData] = useState<{
    contract: Contract | null;
    milestones: Milestone[];
    changeOrders: ChangeOrder[];
    passthroughCosts: PassthroughCost[];
    subcontractors: Contract[];
    loading: boolean;
    error: string | null;
  }>({
    contract: null,
    milestones: [],
    changeOrders: [],
    passthroughCosts: [],
    subcontractors: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user || !contractId || hasFetchedRef.current) return;

    hasFetchedRef.current = true;

    const fetchData = async () => {
      try {
        const { data: fetchedData, error } = await supabase
          .from('contracts')
          .select(`
            *,
            milestones(*),
            change_orders(*),
            passthrough_costs!contract_id(*)
          `)
          .eq('id', contractId)
          .single();

        if (error) {
          setData(prev => ({
            ...prev,
            error: error.message,
            loading: false,
          }));
          return;
        }

        // Fetch subcontractors (child contracts)
        const { data: subcontractorsData, error: subError } = await supabase
          .from('contracts')
          .select('*')
          .eq('parent_contract_id', contractId)
          .order('contract_number', { ascending: true });

        if (subError) {
          console.error('Error fetching subcontractors:', subError);
        }

        // Fetch prepayment config
        const { data: prepaymentData } = await supabase
          .from('ptc_prepayments')
          .select('*')
          .eq('contract_id', contractId)
          .maybeSingle();

        if (prepaymentData) {
          setPrepayment(prepaymentData);

          // Fetch balance view
          const { data: balanceData } = await supabase
            .from('ptc_prepayment_balance')
            .select('*')
            .eq('contract_id', contractId)
            .maybeSingle();
          if (balanceData) setPrepaymentBalance(balanceData);

          // Fetch top-ups
          const { data: topupsData } = await supabase
            .from('ptc_prepayment_topups')
            .select('*')
            .eq('prepayment_id', prepaymentData.id)
            .order('topup_date', { ascending: false });
          if (topupsData) setPrepaymentTopups(topupsData);
        }

        // Fetch passthrough actuals for all PTC categories
        const ptcIds = (fetchedData.passthrough_costs || []).map((p: PassthroughCost) => p.id);
        if (ptcIds.length > 0) {
          const { data: actualsData } = await supabase
            .from('passthrough_actuals')
            .select('*')
            .in('passthrough_cost_id', ptcIds)
            .order('transaction_date', { ascending: false });
          if (actualsData) setPassthroughActuals(actualsData);
        }

        setData({
          contract: fetchedData,
          milestones: fetchedData.milestones || [],
          changeOrders: fetchedData.change_orders || [],
          passthroughCosts: fetchedData.passthrough_costs || [],
          subcontractors: subcontractorsData || [],
          loading: false,
          error: null,
        });
      } catch (err) {
        setData(prev => ({
          ...prev,
          error: 'An error occurred',
          loading: false,
        }));
      }
    };

    fetchData();
  }, [user, contractId]);

  // Fetch configured inflation rate when dialog opens or year changes
  useEffect(() => {
    if (isApplyInflationOpen && inflationYear) {
      fetchConfiguredInflationRate(parseInt(inflationYear));
    }
  }, [isApplyInflationOpen, inflationYear]);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (data.error || !data.contract) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">
            {data.error || 'Contract not found'}
          </p>
          <Link href="/contracts" className="text-blue-600 hover:underline">
            Back to Contracts
          </Link>
        </div>
      </div>
    );
  }

  const contract = data.contract;

  // Calculate totals
  const totalMilestoneValue = data.milestones.reduce((sum, m) => sum + (m.current_value || 0), 0);
  const totalChangeOrderValue = data.changeOrders.reduce((sum, co) => sum + (co.value_change || 0), 0);
  const totalPTCBudget = data.passthroughCosts.reduce((sum, ptc) => sum + (ptc.budgeted_total || 0), 0);

  // Milestone handlers
  const handleAddMilestone = async () => {
    if (!milestoneName) return;

    const newMilestoneData = {
      contract_id: contractId,
      name: milestoneName,
      description: null,
      milestone_number: data.milestones.length + 1,
      original_due_date: milestoneDueDate || null,
      original_value: parseFloat(milestoneValue) || 0,
      current_due_date: milestoneDueDate || null,
      current_value: parseFloat(milestoneValue) || 0,
      status: 'pending' as const,
      completed_date: null,
      invoiced: false,
      invoiced_date: null,
      paid: false,
      paid_date: null,
    };

    try {
      const { data: insertedMilestone, error } = await supabase
        .from('milestones')
        .insert([newMilestoneData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding milestone:', error);
        toast.error(`Failed to add milestone: ${error.message}`);
        return;
      }

      console.log('Milestone added to database:', insertedMilestone);

      setData(prev => ({
        ...prev,
        milestones: [...prev.milestones, insertedMilestone],
      }));

      toast.success('Milestone added successfully');

      // Reset form and close dialog
      setMilestoneName('');
      setMilestoneValue('');
      setMilestoneDueDate('');
      setIsAddMilestoneOpen(false);
    } catch (error: any) {
      console.error('Error adding milestone:', error);
      toast.error(`Failed to add milestone: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneName(milestone.name);
    setMilestoneValue(milestone.current_value?.toString() || '');
    setMilestoneDueDate(milestone.current_due_date || '');
    setIsEditMilestoneOpen(true);
  };

  const handleSaveEditMilestone = async () => {
    if (!editingMilestone || !milestoneName) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          name: milestoneName,
          current_value: parseFloat(milestoneValue) || 0,
          current_due_date: milestoneDueDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMilestone.id);

      if (error) {
        console.error('Supabase error updating milestone:', error);
        toast.error(`Failed to update milestone: ${error.message}`);
        return;
      }

      console.log('Milestone updated in database:', editingMilestone.id);

      setData(prev => ({
        ...prev,
        milestones: prev.milestones.map(m =>
          m.id === editingMilestone.id
            ? {
                ...m,
                name: milestoneName,
                current_value: parseFloat(milestoneValue) || 0,
                current_due_date: milestoneDueDate || null,
                updated_at: new Date().toISOString(),
              }
            : m
        ),
      }));

      toast.success('Milestone updated successfully');

      // Reset form and close dialog
      setEditingMilestone(null);
      setMilestoneName('');
      setMilestoneValue('');
      setMilestoneDueDate('');
      setIsEditMilestoneOpen(false);
    } catch (error: any) {
      console.error('Error updating milestone:', error);
      toast.error(`Failed to update milestone: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const { data: deletedData, error, count } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId)
        .select();

      if (error) {
        console.error('Supabase error deleting milestone:', error);
        toast.error(`Failed to delete milestone: ${error.message}`);
        return;
      }

      console.log('Delete response:', { deletedData, count });

      if (!deletedData || deletedData.length === 0) {
        console.error('No rows were deleted - milestone might not exist or RLS policy blocking');
        toast.error('Failed to delete milestone - no rows affected');
        return;
      }

      console.log('Milestone deleted from database:', milestoneId);

      setData(prev => ({
        ...prev,
        milestones: prev.milestones.filter(m => m.id !== milestoneId),
      }));

      toast.success('Milestone deleted successfully');
    } catch (error: any) {
      console.error('Error deleting milestone:', error);
      toast.error(`Failed to delete milestone: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleMarkMilestoneComplete = async (milestone: Milestone) => {
    try {
      const completedDate = new Date().toISOString().split('T')[0];
      let adjustmentType: 'bonus' | 'penalty' | null = null;
      let adjustmentAmount: number | null = null;
      let adjustmentPercentage: number | null = null;
      let adjustmentReason: string | null = null;

      // Calculate bonus/malus if contract has terms
      if (contract.bonus_malus_terms && milestone.current_due_date) {
        const dueDate = new Date(milestone.current_due_date);
        const completedDateTime = new Date(completedDate);
        const daysDiff = Math.floor((dueDate.getTime() - completedDateTime.getTime()) / (1000 * 60 * 60 * 24));

        if (contract.bonus_malus_terms.type === 'standard') {
          const terms = contract.bonus_malus_terms;

          // Early completion bonus
          if (daysDiff > 0) {
            const weeksDiff = Math.floor(daysDiff / 7);
            if (weeksDiff >= terms.early_threshold_weeks) {
              adjustmentType = 'bonus';
              adjustmentPercentage = terms.early_bonus_percent;
              adjustmentAmount = (milestone.current_value || 0) * (terms.early_bonus_percent / 100);
              adjustmentReason = `Completed ${weeksDiff} weeks early`;
            }
          }
          // Late completion penalty
          else if (daysDiff < 0) {
            adjustmentType = 'penalty';
            const absDays = Math.abs(daysDiff);

            let periods = 0;
            if (terms.penalty_per_period === 'day') {
              periods = absDays;
            } else if (terms.penalty_per_period === 'week') {
              periods = Math.floor(absDays / 7);
            } else if (terms.penalty_per_period === 'month') {
              periods = Math.floor(absDays / 30);
            }

            const penaltyPercent = Math.min(
              terms.late_penalty_percent * periods,
              terms.max_penalty_percent
            );
            adjustmentPercentage = -penaltyPercent;
            adjustmentAmount = -(milestone.current_value || 0) * (penaltyPercent / 100);
            adjustmentReason = `Completed ${periods} ${terms.penalty_per_period}(s) late`;
          }
        }
      }

      const { error } = await supabase
        .from('milestones')
        .update({
          status: 'completed' as const,
          completed_date: completedDate,
          adjustment_type: adjustmentType,
          adjustment_amount: adjustmentAmount,
          adjustment_percentage: adjustmentPercentage,
          adjustment_reason: adjustmentReason,
          adjustment_calculated_at: adjustmentType ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestone.id);

      if (error) {
        console.error('Error marking milestone as complete:', error);
        toast.error(`Failed to mark milestone as complete: ${error.message}`);
        return;
      }

      setData(prev => ({
        ...prev,
        milestones: prev.milestones.map((m) =>
          m.id === milestone.id
            ? {
                ...m,
                status: 'completed' as const,
                completed_date: completedDate,
                adjustment_type: adjustmentType,
                adjustment_amount: adjustmentAmount,
                adjustment_percentage: adjustmentPercentage,
                adjustment_reason: adjustmentReason,
                adjustment_calculated_at: adjustmentType ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
              }
            : m
        ),
      }));

      if (adjustmentType) {
        const adjustmentText = adjustmentType === 'bonus' ? 'Bonus' : 'Penalty';
        toast.success(
          `Milestone completed! ${adjustmentText}: ${formatCurrency(Math.abs(adjustmentAmount || 0), contract.currency)} (${adjustmentPercentage}%)`
        );
      } else {
        toast.success('Milestone marked as complete');
      }
    } catch (error: any) {
      console.error('Error marking milestone as complete:', error);
      toast.error(`Failed to mark milestone as complete: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleMarkMilestoneInvoiced = async (milestone: Milestone) => {
    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          invoiced: true,
          invoiced_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestone.id);

      if (error) {
        console.error('Error marking milestone as invoiced:', error);
        toast.error(`Failed to mark milestone as invoiced: ${error.message}`);
        return;
      }

      setData(prev => ({
        ...prev,
        milestones: prev.milestones.map((m) =>
          m.id === milestone.id
            ? {
                ...m,
                invoiced: true,
                invoiced_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString(),
              }
            : m
        ),
      }));

      toast.success('Milestone marked as invoiced');
    } catch (error: any) {
      console.error('Error marking milestone as invoiced:', error);
      toast.error(`Failed to mark milestone as invoiced: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleMarkMilestonePaid = async (milestone: Milestone) => {
    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          paid: true,
          paid_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestone.id);

      if (error) {
        console.error('Error marking milestone as paid:', error);
        toast.error(`Failed to mark milestone as paid: ${error.message}`);
        return;
      }

      setData(prev => ({
        ...prev,
        milestones: prev.milestones.map((m) =>
          m.id === milestone.id
            ? {
                ...m,
                paid: true,
                paid_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString(),
              }
            : m
        ),
      }));

      toast.success('Milestone marked as paid');
    } catch (error: any) {
      console.error('Error marking milestone as paid:', error);
      toast.error(`Failed to mark milestone as paid: ${error?.message || 'Unknown error'}`);
    }
  };

  const fetchConfiguredInflationRate = async (year: number) => {
    if (!contract.inflation_clause?.rate_type) {
      setConfiguredRate(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inflation_rates')
        .select('*')
        .eq('rate_type', contract.inflation_clause.rate_type)
        .eq('year', year)
        .single();

      if (error) {
        console.log('No configured rate found for year:', year);
        setConfiguredRate(null);
      } else if (data) {
        setConfiguredRate(data.rate_percentage);
        if (!manualOverride) {
          setInflationRate(data.rate_percentage.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching inflation rate:', error);
      setConfiguredRate(null);
    }
  };

  const handleApplyInflation = async () => {
    const effectiveRate = manualOverride ? parseFloat(inflationRate) : configuredRate;

    if (!effectiveRate || selectedMilestonesForInflation.length === 0) {
      toast.error('Please enter inflation rate and select at least one milestone');
      return;
    }

    if (isNaN(effectiveRate) || effectiveRate <= 0) {
      toast.error('Please enter a valid inflation rate');
      return;
    }

    try {
      const year = parseInt(inflationYear);
      const updatedMilestones: Milestone[] = [];

      for (const milestoneId of selectedMilestonesForInflation) {
        const milestone = data.milestones.find((m) => m.id === milestoneId);
        if (!milestone || milestone.inflation_superseded_by_co) continue;

        // Calculate adjustment amount
        const adjustmentAmount = (milestone.current_value || 0) * (effectiveRate / 100);
        const newValue = (milestone.current_value || 0) + adjustmentAmount;

        // Create new inflation adjustment record
        const newAdjustment = {
          year,
          rate: effectiveRate,
          amount: adjustmentAmount,
          applied_date: new Date().toISOString().split('T')[0],
          applied_by: user?.id || null,
        };

        // Update milestone with new adjustment
        const updatedInflationAdjustments = [
          ...(milestone.inflation_adjustments || []),
          newAdjustment,
        ];

        const { error } = await supabase
          .from('milestones')
          .update({
            current_value: newValue,
            inflation_adjustments: updatedInflationAdjustments,
            updated_at: new Date().toISOString(),
          })
          .eq('id', milestone.id);

        if (error) {
          console.error('Error applying inflation to milestone:', error);
          toast.error(`Failed to apply inflation to ${milestone.name}: ${error.message}`);
          continue;
        }

        updatedMilestones.push({
          ...milestone,
          current_value: newValue,
          inflation_adjustments: updatedInflationAdjustments,
          updated_at: new Date().toISOString(),
        });
      }

      if (updatedMilestones.length > 0) {
        setData(prev => ({
          ...prev,
          milestones: prev.milestones.map((m) => {
            const updated = updatedMilestones.find((um) => um.id === m.id);
            return updated || m;
          }),
        }));

        const overrideText = manualOverride ? ' (manual override)' : '';
        toast.success(`Inflation applied to ${updatedMilestones.length} milestone(s)${overrideText}`);

        // Reset form
        setInflationRate('');
        setConfiguredRate(null);
        setManualOverride(false);
        setSelectedMilestonesForInflation([]);
        setIsApplyInflationOpen(false);
      }
    } catch (error: any) {
      console.error('Error applying inflation:', error);
      toast.error(`Failed to apply inflation: ${error?.message || 'Unknown error'}`);
    }
  };

  // Change Order handlers
  const handleAddChangeOrder = async () => {
    if (!coFormData.title) {
      toast.error('Title is required');
      return;
    }

    try {
      // 1. Calculate direct cost change based on CO type
      let directCostChange = coFormData.direct_cost_change || 0;
      let ptcChange = 0;

      // For milestone adjustments, calculate from milestone_adjustments array
      if (coFormData.co_type === 'milestone_adjustment' && coFormData.milestone_adjustments) {
        directCostChange = coFormData.milestone_adjustments.reduce((sum, adj) => {
          const milestone = data.milestones.find((m) => m.id === adj.milestone_id);
          const change = (adj.new_value || 0) - (milestone?.current_value || 0);
          return sum + change;
        }, 0);
      }

      // For PTC-related types, calculate from ptc_adjustments array
      if (
        (coFormData.co_type === 'passthrough_only' || coFormData.co_type === 'combined') &&
        coFormData.ptc_adjustments
      ) {
        ptcChange = coFormData.ptc_adjustments.reduce((sum, adj) => {
          const ptc = data.passthroughCosts.find((p) => p.id === adj.passthrough_cost_id);
          const change = adj.new_budget - (ptc?.budgeted_total || 0);
          return sum + change;
        }, 0);
      }

      // 2. Handle document upload/link
      let documentUrl = coFormData.document_sharepoint_url || null;
      let isSharePoint = !!coFormData.document_sharepoint_url;

      if (coFormData.document_file) {
        // TODO: Implement actual file upload to Supabase Storage
        // For now, create a mock path
        // const { data: uploadData, error: uploadError } = await supabase.storage
        //   .from('change-order-documents')
        //   .upload(`${contractId}/${coFormData.document_file.name}`, coFormData.document_file);

        // Mock storage path for now
        documentUrl = `/storage/change-orders/${contractId}/${coFormData.document_file.name}`;
        isSharePoint = false;
        console.log('Document would be uploaded to:', documentUrl);
      }

      // 3. Create change order record
      const newChangeOrderData = {
        contract_id: contractId,
        title: coFormData.title,
        change_order_number: coFormData.change_order_number || null,
        description: coFormData.description || null,
        effective_date: coFormData.effective_date || new Date().toISOString().split('T')[0],
        co_type: coFormData.co_type,
        direct_cost_change: directCostChange,
        ptc_change: ptcChange,
        value_change: directCostChange, // For backward compatibility
        document_url: documentUrl,
        is_document_sharepoint: isSharePoint,
        invoiced_immediately: coFormData.invoiced_immediately || false,
        invoiced_date: coFormData.invoiced_immediately
          ? new Date().toISOString().split('T')[0]
          : null,
        scope_change_summary: coFormData.scope_change_summary || null,
      };

      const { data: insertedChangeOrder, error } = await supabase
        .from('change_orders')
        .insert([newChangeOrderData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding change order:', error);
        toast.error(`Failed to add change order: ${error.message}`);
        return;
      }

      console.log('Change order added to database:', insertedChangeOrder);

      // 3. Handle milestone adjustments
      if (coFormData.co_type === 'milestone_adjustment' && coFormData.milestone_adjustments) {
        for (const adj of coFormData.milestone_adjustments) {
          const milestone = data.milestones.find((m) => m.id === adj.milestone_id);
          if (!milestone) continue;

          // Update milestone
          const { error: updateError } = await supabase
            .from('milestones')
            .update({
              current_value: adj.new_value,
              current_due_date: adj.new_due_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', milestone.id);

          if (updateError) {
            console.error('Error updating milestone:', updateError);
            toast.error(`Failed to update milestone ${milestone.name}: ${updateError.message}`);
          } else {
            // Create milestone change record for audit trail
            const { error: changeError } = await supabase
              .from('milestone_changes')
              .insert([{
                milestone_id: milestone.id,
                change_order_id: insertedChangeOrder.id,
                previous_due_date: milestone.current_due_date,
                new_due_date: adj.new_due_date,
                previous_value: milestone.current_value,
                new_value: adj.new_value,
                change_reason: adj.adjustment_reason || null,
              }]);

            if (changeError) {
              console.error('Error creating milestone change record:', changeError);
              // Don't show error to user - this is just audit trail
            }

            // Update local state
            setData(prev => ({
              ...prev,
              milestones: prev.milestones.map((m) =>
                m.id === milestone.id
                  ? {
                      ...m,
                      current_value: adj.new_value || m.current_value,
                      current_due_date: adj.new_due_date || m.current_due_date,
                      updated_at: new Date().toISOString(),
                    }
                  : m
              ),
            }));
          }
        }
      }

      // 4. Handle lump_sum_milestone type - create new milestone
      if (coFormData.co_type === 'lump_sum_milestone') {
        const newMilestoneData = {
          contract_id: contractId,
          name: coFormData.new_milestone_name || `${coFormData.title} - Milestone`,
          description: null,
          milestone_number: data.milestones.length + 1,
          original_due_date: coFormData.new_milestone_due_date || null,
          original_value: coFormData.direct_cost_change || 0,
          current_due_date: coFormData.new_milestone_due_date || null,
          current_value: coFormData.direct_cost_change || 0,
          status: 'pending' as const,
          completed_date: null,
          invoiced: false,
          invoiced_date: null,
          paid: false,
          paid_date: null,
          inflation_adjustments: [],
          inflation_superseded_by_co: false,
          adjustment_type: null,
          adjustment_amount: null,
          adjustment_percentage: null,
          adjustment_reason: null,
          adjustment_calculated_at: null,
        };

        const { data: insertedMilestone, error: milestoneError } = await supabase
          .from('milestones')
          .insert([newMilestoneData])
          .select()
          .single();

        if (milestoneError) {
          console.error('Error creating milestone:', milestoneError);
          toast.error(`Change order created but failed to create milestone: ${milestoneError.message}`);
        } else {
          setData(prev => ({
            ...prev,
            milestones: [...prev.milestones, insertedMilestone],
          }));
        }
      }

      // 5. Handle pass-through cost adjustments
      if (
        (coFormData.co_type === 'passthrough_only' || coFormData.co_type === 'combined') &&
        coFormData.ptc_adjustments
      ) {
        for (const adj of coFormData.ptc_adjustments) {
          const ptc = data.passthroughCosts.find((p) => p.id === adj.passthrough_cost_id);
          if (!ptc) continue;

          // Update PTC budget
          const { error: updateError } = await supabase
            .from('passthrough_costs')
            .update({
              budgeted_total: adj.new_budget,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ptc.id);

          if (updateError) {
            console.error('Error updating pass-through cost:', updateError);
            toast.error(`Failed to update PTC ${ptc.description}: ${updateError.message}`);
          } else {
            // Update local state
            setData(prev => ({
              ...prev,
              passthroughCosts: prev.passthroughCosts.map((p) =>
                p.id === ptc.id
                  ? {
                      ...p,
                      budgeted_total: adj.new_budget,
                      updated_at: new Date().toISOString(),
                    }
                  : p
              ),
            }));

            // Create adjustment record in change_order_passthrough_adjustments table
            const { error: adjError } = await supabase
              .from('change_order_passthrough_adjustments')
              .insert([{
                change_order_id: insertedChangeOrder.id,
                passthrough_cost_id: ptc.id,
                previous_budget: ptc.budgeted_total || 0,
                new_budget: adj.new_budget,
                adjustment_reason: adj.adjustment_reason || null,
              }]);

            if (adjError) {
              console.error('Error creating PTC adjustment record:', adjError);
              // Don't show error to user - this is just audit trail
            }
          }
        }
      }

      // 7. Update local state
      setData(prev => ({
        ...prev,
        changeOrders: [...prev.changeOrders, insertedChangeOrder],
      }));

      toast.success('Change order created successfully');

      // 8. Reset form and close dialog
      setCoFormStep(1);
      setCoFormData({
        co_type: 'milestone_adjustment',
        milestone_adjustments: [],
        ptc_adjustments: [],
      });
      setIsAddChangeOrderOpen(false);
    } catch (error: any) {
      console.error('Error adding change order:', error);
      toast.error(`Failed to add change order: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditChangeOrder = (changeOrder: ChangeOrder) => {
    setEditingChangeOrder(changeOrder);
    setChangeOrderTitle(changeOrder.title);
    setChangeOrderNumber(changeOrder.change_order_number || '');
    setChangeOrderValue(changeOrder.value_change?.toString() || '');
    setChangeOrderDate(changeOrder.effective_date || '');
    setIsEditChangeOrderOpen(true);
  };

  const handleSaveEditChangeOrder = async () => {
    if (!editingChangeOrder || !changeOrderTitle) return;

    try {
      const { error } = await supabase
        .from('change_orders')
        .update({
          title: changeOrderTitle,
          change_order_number: changeOrderNumber || null,
          value_change: parseFloat(changeOrderValue) || 0,
          effective_date: changeOrderDate || null,
        })
        .eq('id', editingChangeOrder.id);

      if (error) {
        console.error('Supabase error updating change order:', error);
        toast.error(`Failed to update change order: ${error.message}`);
        return;
      }

      console.log('Change order updated in database:', editingChangeOrder.id);

      setData(prev => ({
        ...prev,
        changeOrders: prev.changeOrders.map(co =>
          co.id === editingChangeOrder.id
            ? {
                ...co,
                title: changeOrderTitle,
                change_order_number: changeOrderNumber || null,
                value_change: parseFloat(changeOrderValue) || 0,
                effective_date: changeOrderDate || null,
              }
            : co
        ),
      }));

      toast.success('Change order updated successfully');

      // Reset form and close dialog
      setEditingChangeOrder(null);
      setChangeOrderTitle('');
      setChangeOrderNumber('');
      setChangeOrderValue('');
      setChangeOrderDate('');
      setIsEditChangeOrderOpen(false);
    } catch (error: any) {
      console.error('Error updating change order:', error);
      toast.error(`Failed to update change order: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteChangeOrder = async (changeOrderId: string) => {
    if (!confirm('Are you sure you want to delete this change order?')) return;

    try {
      const { data: deletedData, error } = await supabase
        .from('change_orders')
        .delete()
        .eq('id', changeOrderId)
        .select();

      if (error) {
        console.error('Supabase error deleting change order:', error);
        toast.error(`Failed to delete change order: ${error.message}`);
        return;
      }

      if (!deletedData || deletedData.length === 0) {
        console.error('No rows were deleted - change order might not exist or RLS policy blocking');
        toast.error('Failed to delete change order - no rows affected');
        return;
      }

      console.log('Change order deleted from database:', changeOrderId);

      setData(prev => ({
        ...prev,
        changeOrders: prev.changeOrders.filter(co => co.id !== changeOrderId),
      }));

      toast.success('Change order deleted successfully');
    } catch (error: any) {
      console.error('Error deleting change order:', error);
      toast.error(`Failed to delete change order: ${error?.message || 'Unknown error'}`);
    }
  };

  // Pass-Through Cost handlers
  const handleAddPTC = async () => {
    if (!ptcDescription) return;

    const newPTCData = {
      contract_id: contractId,
      description: ptcDescription,
      category: 'other' as const,
      passthrough_type: 'total' as const,
      budgeted_total: parseFloat(ptcBudget) || 0,
      budgeted_per_period: null,
      budgeted_per_unit: null,
      estimated_units: null,
      currency: contract.currency,
      actual_spent: parseFloat(ptcActualSpent) || 0,
      period_start: null,
      period_end: null,
      vendor_contract_id: null,
      notes: null,
    };

    try {
      const { data: insertedPTC, error } = await supabase
        .from('passthrough_costs')
        .insert([newPTCData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding PTC:', error);
        toast.error(`Failed to add pass-through cost: ${error.message}`);
        return;
      }

      console.log('PTC added to database:', insertedPTC);

      setData(prev => ({
        ...prev,
        passthroughCosts: [...prev.passthroughCosts, insertedPTC],
      }));

      toast.success('Pass-through cost added successfully');

      // Reset form and close dialog
      setPtcDescription('');
      setPtcBudget('');
      setPtcActualSpent('');
      setIsAddPTCOpen(false);
    } catch (error: any) {
      console.error('Error adding PTC:', error);
      toast.error(`Failed to add pass-through cost: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditPTC = (ptc: PassthroughCost) => {
    setEditingPTC(ptc);
    setPtcDescription(ptc.description || '');
    setPtcBudget(ptc.budgeted_total?.toString() || '');
    setPtcActualSpent(ptc.actual_spent?.toString() || '');
    setIsEditPTCOpen(true);
  };

  const handleSaveEditPTC = async () => {
    if (!editingPTC || !ptcDescription) return;

    try {
      const { error } = await supabase
        .from('passthrough_costs')
        .update({
          description: ptcDescription,
          budgeted_total: parseFloat(ptcBudget) || 0,
          actual_spent: parseFloat(ptcActualSpent) || 0,
        })
        .eq('id', editingPTC.id);

      if (error) {
        console.error('Supabase error updating PTC:', error);
        toast.error(`Failed to update pass-through cost: ${error.message}`);
        return;
      }

      console.log('PTC updated in database:', editingPTC.id);

      setData(prev => ({
        ...prev,
        passthroughCosts: prev.passthroughCosts.map(ptc =>
          ptc.id === editingPTC.id
            ? {
                ...ptc,
                description: ptcDescription,
                budgeted_total: parseFloat(ptcBudget) || 0,
                actual_spent: parseFloat(ptcActualSpent) || 0,
              }
            : ptc
        ),
      }));

      toast.success('Pass-through cost updated successfully');

      // Reset form and close dialog
      setEditingPTC(null);
      setPtcDescription('');
      setPtcBudget('');
      setPtcActualSpent('');
      setIsEditPTCOpen(false);
    } catch (error: any) {
      console.error('Error updating PTC:', error);
      toast.error(`Failed to update pass-through cost: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeletePTC = async (ptcId: string) => {
    if (!confirm('Are you sure you want to delete this pass-through cost?')) return;

    try {
      const { data: deletedData, error } = await supabase
        .from('passthrough_costs')
        .delete()
        .eq('id', ptcId)
        .select();

      if (error) {
        console.error('Supabase error deleting PTC:', error);
        toast.error(`Failed to delete pass-through cost: ${error.message}`);
        return;
      }

      if (!deletedData || deletedData.length === 0) {
        console.error('No rows were deleted - PTC might not exist or RLS policy blocking');
        toast.error('Failed to delete pass-through cost - no rows affected');
        return;
      }

      console.log('PTC deleted from database:', ptcId);

      setData(prev => ({
        ...prev,
        passthroughCosts: prev.passthroughCosts.filter(ptc => ptc.id !== ptcId),
      }));

      toast.success('Pass-through cost deleted successfully');
    } catch (error: any) {
      console.error('Error deleting PTC:', error);
      toast.error(`Failed to delete pass-through cost: ${error?.message || 'Unknown error'}`);
    }
  };

  // ============================================
  // PREPAYMENT HANDLERS
  // ============================================

  const refreshPrepaymentData = async () => {
    const { data: prepaymentData } = await supabase
      .from('ptc_prepayments')
      .select('*')
      .eq('contract_id', contractId)
      .maybeSingle();

    setPrepayment(prepaymentData);

    if (prepaymentData) {
      const { data: balanceData } = await supabase
        .from('ptc_prepayment_balance')
        .select('*')
        .eq('contract_id', contractId)
        .maybeSingle();
      setPrepaymentBalance(balanceData);

      const { data: topupsData } = await supabase
        .from('ptc_prepayment_topups')
        .select('*')
        .eq('prepayment_id', prepaymentData.id)
        .order('topup_date', { ascending: false });
      setPrepaymentTopups(topupsData || []);
    } else {
      setPrepaymentBalance(null);
      setPrepaymentTopups([]);
    }

    // Refresh actuals
    const ptcIds = data.passthroughCosts.map(p => p.id);
    if (ptcIds.length > 0) {
      const { data: actualsData } = await supabase
        .from('passthrough_actuals')
        .select('*')
        .in('passthrough_cost_id', ptcIds)
        .order('transaction_date', { ascending: false });
      setPassthroughActuals(actualsData || []);
    }
  };

  const handleCreatePrepayment = async () => {
    if (!prepaymentForm.prepayment_amount) {
      toast.error('Prepayment amount is required');
      return;
    }

    try {
      const defaultDirection: PrepaymentDirection = contract.parent_contract_id ? 'pay' : 'receive';

      const insertData: Record<string, unknown> = {
        contract_id: contractId,
        prepayment_model: prepaymentForm.prepayment_model,
        direction: prepaymentForm.direction || defaultDirection,
        payment_terms: prepaymentForm.payment_terms,
        payment_terms_custom: prepaymentForm.payment_terms === 'custom' ? prepaymentForm.payment_terms_custom : null,
        prepayment_amount: parseFloat(prepaymentForm.prepayment_amount) || 0,
        currency: contract.currency,
        notes: prepaymentForm.notes || null,
        created_by: user?.id || null,
      };

      if (prepaymentForm.prepayment_model === 'retainer') {
        insertData.threshold_amount = prepaymentForm.threshold_amount ? parseFloat(prepaymentForm.threshold_amount) : null;
        insertData.threshold_percentage = prepaymentForm.threshold_percentage ? parseFloat(prepaymentForm.threshold_percentage) : null;
      } else {
        insertData.reconciliation_trigger = prepaymentForm.reconciliation_trigger || null;
        insertData.reconciliation_date = prepaymentForm.reconciliation_date || null;
      }

      const { error } = await supabase.from('ptc_prepayments').insert([insertData]);

      if (error) {
        toast.error(`Failed to create prepayment: ${error.message}`);
        return;
      }

      toast.success('Prepayment configured successfully');
      setIsConfigurePrepaymentOpen(false);
      resetPrepaymentForm();
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to create prepayment: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleUpdatePrepayment = async () => {
    if (!prepayment || !prepaymentForm.prepayment_amount) return;

    try {
      const updateData: Record<string, unknown> = {
        prepayment_model: prepaymentForm.prepayment_model,
        direction: prepaymentForm.direction,
        payment_terms: prepaymentForm.payment_terms,
        payment_terms_custom: prepaymentForm.payment_terms === 'custom' ? prepaymentForm.payment_terms_custom : null,
        prepayment_amount: parseFloat(prepaymentForm.prepayment_amount) || 0,
        notes: prepaymentForm.notes || null,
      };

      if (prepaymentForm.prepayment_model === 'retainer') {
        updateData.threshold_amount = prepaymentForm.threshold_amount ? parseFloat(prepaymentForm.threshold_amount) : null;
        updateData.threshold_percentage = prepaymentForm.threshold_percentage ? parseFloat(prepaymentForm.threshold_percentage) : null;
        updateData.reconciliation_trigger = null;
        updateData.reconciliation_date = null;
      } else {
        updateData.reconciliation_trigger = prepaymentForm.reconciliation_trigger || null;
        updateData.reconciliation_date = prepaymentForm.reconciliation_date || null;
        updateData.threshold_amount = null;
        updateData.threshold_percentage = null;
      }

      const { error } = await supabase
        .from('ptc_prepayments')
        .update(updateData)
        .eq('id', prepayment.id);

      if (error) {
        toast.error(`Failed to update prepayment: ${error.message}`);
        return;
      }

      toast.success('Prepayment updated successfully');
      setIsEditPrepaymentOpen(false);
      resetPrepaymentForm();
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to update prepayment: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeletePrepayment = async () => {
    if (!prepayment) return;
    if (!confirm('Are you sure you want to delete this prepayment configuration? This will also delete all top-up records.')) return;

    try {
      const { error } = await supabase
        .from('ptc_prepayments')
        .delete()
        .eq('id', prepayment.id);

      if (error) {
        toast.error(`Failed to delete prepayment: ${error.message}`);
        return;
      }

      toast.success('Prepayment deleted');
      setPrepayment(null);
      setPrepaymentBalance(null);
      setPrepaymentTopups([]);
    } catch (error: any) {
      toast.error(`Failed to delete prepayment: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleMarkPaymentReceived = async () => {
    if (!prepayment) return;

    try {
      const { error } = await supabase
        .from('ptc_prepayments')
        .update({
          payment_received: true,
          payment_received_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', prepayment.id);

      if (error) {
        toast.error(`Failed to update: ${error.message}`);
        return;
      }

      toast.success('Payment marked as received');
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to update: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleReconcile = async () => {
    if (!prepayment || !prepaymentBalance) return;

    try {
      const { error } = await supabase
        .from('ptc_prepayments')
        .update({
          reconciled: true,
          reconciled_date: new Date().toISOString().split('T')[0],
          reconciled_amount: prepaymentBalance.current_balance,
        })
        .eq('id', prepayment.id);

      if (error) {
        toast.error(`Failed to reconcile: ${error.message}`);
        return;
      }

      toast.success('Prepayment reconciled');
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to reconcile: ${error?.message || 'Unknown error'}`);
    }
  };

  // Actual handlers
  const handleAddActual = async () => {
    if (!actualForm.passthrough_cost_id || !actualForm.amount) {
      toast.error('PTC category and amount are required');
      return;
    }

    try {
      const { data: inserted, error } = await supabase
        .from('passthrough_actuals')
        .insert([{
          passthrough_cost_id: actualForm.passthrough_cost_id,
          amount: parseFloat(actualForm.amount),
          transaction_date: actualForm.transaction_date || new Date().toISOString().split('T')[0],
          period_year: parseInt(actualForm.period_year) || null,
          period_month: parseInt(actualForm.period_month) || null,
          invoice_number: actualForm.invoice_number || null,
          invoice_url: actualForm.invoice_url || null,
          description: actualForm.description || null,
        }])
        .select()
        .single();

      if (error) {
        toast.error(`Failed to add actual: ${error.message}`);
        return;
      }

      toast.success('PTC actual added');
      setPassthroughActuals(prev => [inserted, ...prev]);
      setIsAddActualOpen(false);
      resetActualForm();

      // Refresh passthrough costs to get updated actual_spent (DB trigger updates it)
      const { data: refreshedPtc } = await supabase
        .from('passthrough_costs')
        .select('*')
        .eq('contract_id', contractId);
      if (refreshedPtc) {
        setData(prev => ({ ...prev, passthroughCosts: refreshedPtc }));
      }
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to add actual: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditActual = (actual: PassthroughActual) => {
    setEditingActual(actual);
    setActualForm({
      passthrough_cost_id: actual.passthrough_cost_id,
      amount: actual.amount.toString(),
      transaction_date: actual.transaction_date,
      period_year: actual.period_year?.toString() || '',
      period_month: actual.period_month?.toString() || '',
      invoice_number: actual.invoice_number || '',
      invoice_url: actual.invoice_url || '',
      description: actual.description || '',
    });
    setIsEditActualOpen(true);
  };

  const handleSaveEditActual = async () => {
    if (!editingActual) return;

    try {
      const { error } = await supabase
        .from('passthrough_actuals')
        .update({
          passthrough_cost_id: actualForm.passthrough_cost_id,
          amount: parseFloat(actualForm.amount),
          transaction_date: actualForm.transaction_date,
          period_year: parseInt(actualForm.period_year) || null,
          period_month: parseInt(actualForm.period_month) || null,
          invoice_number: actualForm.invoice_number || null,
          invoice_url: actualForm.invoice_url || null,
          description: actualForm.description || null,
        })
        .eq('id', editingActual.id);

      if (error) {
        toast.error(`Failed to update actual: ${error.message}`);
        return;
      }

      toast.success('PTC actual updated');
      setPassthroughActuals(prev => prev.map(a =>
        a.id === editingActual.id ? { ...a, ...{
          passthrough_cost_id: actualForm.passthrough_cost_id,
          amount: parseFloat(actualForm.amount),
          transaction_date: actualForm.transaction_date,
          period_year: parseInt(actualForm.period_year) || null,
          period_month: parseInt(actualForm.period_month) || null,
          invoice_number: actualForm.invoice_number || null,
          invoice_url: actualForm.invoice_url || null,
          description: actualForm.description || null,
        }} : a
      ));
      setIsEditActualOpen(false);
      setEditingActual(null);
      resetActualForm();

      const { data: refreshedPtc } = await supabase
        .from('passthrough_costs')
        .select('*')
        .eq('contract_id', contractId);
      if (refreshedPtc) {
        setData(prev => ({ ...prev, passthroughCosts: refreshedPtc }));
      }
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to update actual: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteActual = async (actualId: string) => {
    if (!confirm('Are you sure you want to delete this PTC actual?')) return;

    try {
      const { error } = await supabase
        .from('passthrough_actuals')
        .delete()
        .eq('id', actualId);

      if (error) {
        toast.error(`Failed to delete actual: ${error.message}`);
        return;
      }

      toast.success('PTC actual deleted');
      setPassthroughActuals(prev => prev.filter(a => a.id !== actualId));

      const { data: refreshedPtc } = await supabase
        .from('passthrough_costs')
        .select('*')
        .eq('contract_id', contractId);
      if (refreshedPtc) {
        setData(prev => ({ ...prev, passthroughCosts: refreshedPtc }));
      }
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to delete actual: ${error?.message || 'Unknown error'}`);
    }
  };

  // Topup handlers
  const handleAddTopup = async () => {
    if (!prepayment || !topupForm.amount) {
      toast.error('Amount is required');
      return;
    }

    try {
      const { data: inserted, error } = await supabase
        .from('ptc_prepayment_topups')
        .insert([{
          prepayment_id: prepayment.id,
          amount: parseFloat(topupForm.amount),
          topup_date: topupForm.topup_date || new Date().toISOString().split('T')[0],
          invoice_number: topupForm.invoice_number || null,
          invoice_url: topupForm.invoice_url || null,
          notes: topupForm.notes || null,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) {
        toast.error(`Failed to add top-up: ${error.message}`);
        return;
      }

      toast.success('Top-up added');
      setPrepaymentTopups(prev => [inserted, ...prev]);
      setIsAddTopupOpen(false);
      resetTopupForm();
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to add top-up: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditTopup = (topup: PtcPrepaymentTopup) => {
    setEditingTopup(topup);
    setTopupForm({
      amount: topup.amount.toString(),
      topup_date: topup.topup_date,
      invoice_number: topup.invoice_number || '',
      invoice_url: topup.invoice_url || '',
      notes: topup.notes || '',
    });
    setIsEditTopupOpen(true);
  };

  const handleSaveEditTopup = async () => {
    if (!editingTopup) return;

    try {
      const { error } = await supabase
        .from('ptc_prepayment_topups')
        .update({
          amount: parseFloat(topupForm.amount),
          topup_date: topupForm.topup_date,
          invoice_number: topupForm.invoice_number || null,
          invoice_url: topupForm.invoice_url || null,
          notes: topupForm.notes || null,
        })
        .eq('id', editingTopup.id);

      if (error) {
        toast.error(`Failed to update top-up: ${error.message}`);
        return;
      }

      toast.success('Top-up updated');
      setPrepaymentTopups(prev => prev.map(t =>
        t.id === editingTopup.id ? { ...t,
          amount: parseFloat(topupForm.amount),
          topup_date: topupForm.topup_date,
          invoice_number: topupForm.invoice_number || null,
          invoice_url: topupForm.invoice_url || null,
          notes: topupForm.notes || null,
        } : t
      ));
      setIsEditTopupOpen(false);
      setEditingTopup(null);
      resetTopupForm();
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to update top-up: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteTopup = async (topupId: string) => {
    if (!confirm('Are you sure you want to delete this top-up?')) return;

    try {
      const { error } = await supabase
        .from('ptc_prepayment_topups')
        .delete()
        .eq('id', topupId);

      if (error) {
        toast.error(`Failed to delete top-up: ${error.message}`);
        return;
      }

      toast.success('Top-up deleted');
      setPrepaymentTopups(prev => prev.filter(t => t.id !== topupId));
      await refreshPrepaymentData();
    } catch (error: any) {
      toast.error(`Failed to delete top-up: ${error?.message || 'Unknown error'}`);
    }
  };

  const resetPrepaymentForm = () => {
    const defaultDirection: PrepaymentDirection = contract.parent_contract_id ? 'pay' : 'receive';
    setPrepaymentForm({
      prepayment_model: 'retainer',
      direction: defaultDirection,
      payment_terms: 'upon_signature',
      payment_terms_custom: '',
      prepayment_amount: '',
      threshold_amount: '',
      threshold_percentage: '',
      reconciliation_trigger: '',
      reconciliation_date: '',
      notes: '',
    });
  };

  const resetActualForm = () => {
    setActualForm({
      passthrough_cost_id: '',
      amount: '',
      transaction_date: '',
      period_year: new Date().getFullYear().toString(),
      period_month: (new Date().getMonth() + 1).toString(),
      invoice_number: '',
      invoice_url: '',
      description: '',
    });
  };

  const resetTopupForm = () => {
    setTopupForm({
      amount: '',
      topup_date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      invoice_url: '',
      notes: '',
    });
  };

  const openEditPrepayment = () => {
    if (!prepayment) return;
    setPrepaymentForm({
      prepayment_model: prepayment.prepayment_model,
      direction: prepayment.direction,
      payment_terms: prepayment.payment_terms,
      payment_terms_custom: prepayment.payment_terms_custom || '',
      prepayment_amount: prepayment.prepayment_amount.toString(),
      threshold_amount: prepayment.threshold_amount?.toString() || '',
      threshold_percentage: prepayment.threshold_percentage?.toString() || '',
      reconciliation_trigger: prepayment.reconciliation_trigger || '',
      reconciliation_date: prepayment.reconciliation_date || '',
      notes: prepayment.notes || '',
    });
    setIsEditPrepaymentOpen(true);
  };

  const paymentTermsLabel = (terms: PrepaymentPaymentTerms, custom?: string | null) => {
    const labels: Record<PrepaymentPaymentTerms, string> = {
      upon_signature: 'Upon signature',
      '30_days_after_signature': '30 days after signature',
      '60_days_after_signature': '60 days after signature',
      upon_study_start: 'Upon study start',
      custom: custom || 'Custom',
    };
    return labels[terms] || terms;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contracts">
            <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
            <p className="text-gray-500">{contract.contract_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsDetailsDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Badge className={statusColors[contract.status]}>{contract.status}</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(contract.current_value, contract.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.milestones.length}</p>
            <p className="text-xs text-gray-500">{formatCurrency(totalMilestoneValue, contract.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Change Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.changeOrders.length}</p>
            <p className="text-xs text-gray-500">{formatCurrency(totalChangeOrderValue, contract.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">PTC Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPTCBudget, contract.currency)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Symbio Entity</p>
              <p className="font-medium">{contract.symbio_entity || 'Not specified'}</p>
            </div>
            {contract.intercompany && (
              <div>
                <p className="text-sm text-gray-500">Intercompany</p>
                <div className="font-medium">
                  <Badge className="bg-blue-100 text-blue-800">Intercompany Contract</Badge>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-medium">{contract.vendor_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-medium">{contract.client_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Value</p>
              <p className="font-medium">{formatCurrency(contract.current_value, contract.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">{contract.end_date || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({data.milestones.length})</TabsTrigger>
          <TabsTrigger value="change-orders">Change Orders ({data.changeOrders.length})</TabsTrigger>
          <TabsTrigger value="ptc">
            Pass-Through Costs ({data.passthroughCosts.length})
            {prepaymentBalance?.is_below_threshold && <span className="ml-1 h-2 w-2 rounded-full bg-orange-500 inline-block" />}
          </TabsTrigger>
          {data.contract?.contract_type === 'msa' && (
            <TabsTrigger value="subcontractors">Subcontractors ({data.subcontractors.length})</TabsTrigger>
          )}
          {data.contract?.contract_type === 'site_contract' && (
            <TabsTrigger value="invoice-audit">
              <ClipboardCheck className="h-4 w-4 mr-1" />
              Invoice Audit
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Financial Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Contract Value */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Contract Value</div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Original:</div>
                      <div className="text-lg font-medium">
                        {formatCurrency(contract.original_value, contract.currency)}
                      </div>
                      {(() => {
                        const totalCOImpact = data.changeOrders.reduce(
                          (sum, co) => sum + (co.direct_cost_change || 0),
                          0
                        );
                        const totalMilestoneValue = data.milestones.reduce(
                          (sum, m) => sum + (m.current_value || 0),
                          0
                        );
                        return totalCOImpact !== 0 ? (
                          <>
                            <div className={`text-xs ${totalCOImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Change Orders: {totalCOImpact > 0 ? '+' : ''}
                              {formatCurrency(totalCOImpact, contract.currency)}
                            </div>
                            <div className="text-xs text-gray-400">Current Total:</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {formatCurrency(totalMilestoneValue, contract.currency)}
                            </div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Milestone Progress */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Milestone Progress</div>
                    <div className="space-y-2">
                      {(() => {
                        const totalMilestones = data.milestones.length;
                        const completedMilestones = data.milestones.filter((m) => m.status === 'completed').length;
                        const invoicedMilestones = data.milestones.filter((m) => m.invoiced).length;
                        const paidMilestones = data.milestones.filter((m) => m.paid).length;

                        const invoicedValue = data.milestones
                          .filter((m) => m.invoiced)
                          .reduce((sum, m) => sum + (m.current_value || 0), 0);
                        const paidValue = data.milestones
                          .filter((m) => m.paid)
                          .reduce((sum, m) => sum + (m.current_value || 0), 0);

                        return (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Completed:</span>
                              <span className="font-medium">{completedMilestones} / {totalMilestones}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-600">Invoiced:</span>
                              <span className="font-medium">
                                {invoicedMilestones} ({formatCurrency(invoicedValue, contract.currency)})
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-green-600">Paid:</span>
                              <span className="font-medium">
                                {paidMilestones} ({formatCurrency(paidValue, contract.currency)})
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t flex justify-between text-xs">
                              <span className="text-gray-500">Outstanding:</span>
                              <span className="font-bold text-orange-600">
                                {formatCurrency(invoicedValue - paidValue, contract.currency)}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Pass-Through Costs */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Pass-Through Costs</div>
                    <div className="space-y-2">
                      {(() => {
                        const totalBudget = data.passthroughCosts.reduce(
                          (sum, ptc) => sum + (ptc.budgeted_total || 0),
                          0
                        );
                        const totalSpent = data.passthroughCosts.reduce(
                          (sum, ptc) => sum + (ptc.actual_spent || 0),
                          0
                        );
                        const remaining = totalBudget - totalSpent;
                        const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

                        return (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Budget:</span>
                              <span className="font-medium">{formatCurrency(totalBudget, contract.currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-orange-600">Spent:</span>
                              <span className="font-medium">{formatCurrency(totalSpent, contract.currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Remaining:</span>
                              <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(remaining, contract.currency)}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Utilization:</span>
                                <span className="font-medium">{utilization.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    utilization > 100
                                      ? 'bg-red-600'
                                      : utilization > 80
                                      ? 'bg-orange-600'
                                      : 'bg-green-600'
                                  }`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            {prepayment && prepaymentBalance && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="flex justify-between text-xs">
                                  <span className="text-purple-600">Prepayment:</span>
                                  <span className="font-medium">{formatCurrency(prepayment.prepayment_amount, contract.currency)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-purple-600">Balance:</span>
                                  <span className={`font-medium ${prepaymentBalance.is_below_threshold ? 'text-orange-600' : 'text-green-600'}`}>
                                    {formatCurrency(prepaymentBalance.current_balance, contract.currency)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Description:</span>
                    <p>{contract.description || 'No description'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Project:</span>
                    <p>{contract.project_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Department:</span>
                    <p>{contract.department || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Milestones</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsApplyInflationOpen(true)}>
                  <Target className="h-4 w-4 mr-1" />
                  Apply Inflation
                </Button>
                <Button size="sm" onClick={() => setIsAddMilestoneOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.milestones.length === 0 ? (
                <p className="text-gray-500 p-6">No milestones defined</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.milestones.map((m) => {
                      const hasValueChanged = m.original_value !== m.current_value;
                      const hasDueDateChanged = m.original_due_date !== m.current_due_date;
                      const hasChanges = hasValueChanged || hasDueDateChanged;
                      const valueChange = (m.current_value || 0) - (m.original_value || 0);

                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.milestone_number || '-'}</TableCell>
                          <TableCell>
                            {m.name}
                            {hasChanges && (
                              <span className="ml-2 text-xs text-orange-600">●</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={milestoneStatusColors[m.status]}>
                                {m.status}
                              </Badge>
                              <div className="flex gap-2 text-xs">
                                {m.invoiced && (
                                  <span className="text-blue-600 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Invoiced
                                  </span>
                                )}
                                {m.paid && (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCheck className="h-3 w-3" />
                                    Paid
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{formatDate(m.current_due_date)}</div>
                              {hasDueDateChanged && (
                                <div className="text-xs text-gray-400 line-through">
                                  {formatDate(m.original_due_date)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <div className="font-medium">
                                {formatCurrency(m.current_value, contract.currency)}
                              </div>
                              {hasValueChanged && (
                                <div className="text-xs text-gray-400 line-through">
                                  {formatCurrency(m.original_value, contract.currency)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {hasChanges || m.adjustment_type || (m.inflation_adjustments && m.inflation_adjustments.length > 0) ? (
                              <div className="text-xs space-y-1">
                                {hasValueChanged && (
                                  <div className={valueChange > 0 ? 'text-green-600' : 'text-red-600'}>
                                    CO: {valueChange > 0 ? '+' : ''}
                                    {formatCurrency(valueChange, contract.currency)}
                                  </div>
                                )}
                                {hasDueDateChanged && (
                                  <div className="text-orange-600">
                                    Date changed
                                  </div>
                                )}
                                {m.inflation_adjustments && m.inflation_adjustments.length > 0 && (
                                  <div className="text-blue-600">
                                    Inflation: {m.inflation_adjustments.length}x
                                  </div>
                                )}
                                {m.adjustment_type && (
                                  <div className={m.adjustment_type === 'bonus' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    {m.adjustment_type === 'bonus' ? '🎁 Bonus: ' : '⚠️ Penalty: '}
                                    {m.adjustment_amount && m.adjustment_amount > 0 ? '+' : ''}
                                    {formatCurrency(m.adjustment_amount || 0, contract.currency)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {m.status !== 'completed' && (
                                  <DropdownMenuItem onClick={() => handleMarkMilestoneComplete(m)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                {!m.invoiced && (
                                  <DropdownMenuItem onClick={() => handleMarkMilestoneInvoiced(m)}>
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Mark Invoiced
                                  </DropdownMenuItem>
                                )}
                                {!m.paid && m.invoiced && (
                                  <DropdownMenuItem onClick={() => handleMarkMilestonePaid(m)}>
                                    <Banknote className="h-4 w-4 mr-2" />
                                    Mark Paid
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditMilestone(m)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMilestone(m.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="change-orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Change Orders</CardTitle>
              <Button size="sm" onClick={() => setIsAddChangeOrderOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Change Order
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.changeOrders.length === 0 ? (
                <p className="text-gray-500 p-6">No change orders</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>CO Number</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead className="text-right">Impact</TableHead>
                      <TableHead>Doc</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.changeOrders.map((co) => {
                      const coTypeLabels: Record<string, string> = {
                        milestone_adjustment: 'Milestone Adj.',
                        lump_sum_immediate: 'Lump Sum (Immed.)',
                        lump_sum_milestone: 'Lump Sum (Mile.)',
                        passthrough_only: 'PTC Only',
                        combined: 'Combined',
                      };

                      const coTypeColors: Record<string, string> = {
                        milestone_adjustment: 'bg-blue-100 text-blue-800',
                        lump_sum_immediate: 'bg-green-100 text-green-800',
                        lump_sum_milestone: 'bg-purple-100 text-purple-800',
                        passthrough_only: 'bg-orange-100 text-orange-800',
                        combined: 'bg-indigo-100 text-indigo-800',
                      };

                      return (
                        <TableRow key={co.id}>
                          <TableCell className="font-medium">
                            {co.title}
                            {co.invoiced_immediately && (
                              <span className="ml-2 text-xs text-green-600">● Invoiced</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={coTypeColors[co.co_type] || 'bg-gray-100 text-gray-800'}>
                              {coTypeLabels[co.co_type] || co.co_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{co.change_order_number || '-'}</TableCell>
                          <TableCell>{formatDate(co.effective_date)}</TableCell>
                          <TableCell className="text-right">
                            {co.direct_cost_change !== null && co.direct_cost_change !== 0 && (
                              <div className={`font-medium ${(co.direct_cost_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(co.direct_cost_change || 0) >= 0 ? '+' : ''}
                                {formatCurrency(co.direct_cost_change || 0, contract.currency)}
                              </div>
                            )}
                            {co.ptc_change !== null && co.ptc_change !== 0 && (
                              <div className={`text-xs ${(co.ptc_change || 0) >= 0 ? 'text-orange-600' : 'text-orange-500'}`}>
                                PTC: {(co.ptc_change || 0) >= 0 ? '+' : ''}
                                {formatCurrency(co.ptc_change || 0, contract.currency)}
                              </div>
                            )}
                            {(!co.direct_cost_change || co.direct_cost_change === 0) &&
                             (!co.ptc_change || co.ptc_change === 0) && (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {co.document_url ? (
                              <a
                                href={co.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title={co.is_document_sharepoint ? 'SharePoint Link' : 'View Document'}
                              >
                                {co.is_document_sharepoint ? (
                                  <Link2 className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditChangeOrder(co)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteChangeOrder(co.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ptc">
          <div className="space-y-4">
            {/* Threshold Warning Banner */}
            {prepaymentBalance?.is_below_threshold && (
              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">Prepayment balance is below threshold</p>
                  <p className="text-xs text-orange-600">
                    Current balance: {formatCurrency(prepaymentBalance.current_balance, contract.currency)}
                    {prepayment?.threshold_amount && ` (threshold: ${formatCurrency(prepayment.threshold_amount, contract.currency)})`}
                    {prepayment?.threshold_percentage && ` (threshold: ${prepayment.threshold_percentage}% of funded)`}
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsAddTopupOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Top-Up
                </Button>
              </div>
            )}

            {/* Prepayment Configuration Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Prepayment / Retainer</CardTitle>
                {!prepayment ? (
                  <Button size="sm" onClick={() => {
                    resetPrepaymentForm();
                    setIsConfigurePrepaymentOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Configure Prepayment
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={openEditPrepayment}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={handleDeletePrepayment}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!prepayment ? (
                  <p className="text-gray-500 text-sm">No prepayment configured for this contract.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Model</p>
                        <p className="text-sm font-medium">
                          {prepayment.prepayment_model === 'retainer' ? 'Retainer / Bucket' : 'Hold & Repay'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Direction</p>
                        <p className="text-sm font-medium">
                          {prepayment.direction === 'receive' ? 'Receive from client' : 'Pay to vendor'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Payment Terms</p>
                        <p className="text-sm font-medium">
                          {paymentTermsLabel(prepayment.payment_terms, prepayment.payment_terms_custom)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-sm font-medium">
                          {formatCurrency(prepayment.prepayment_amount, contract.currency)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="flex items-center gap-2">
                      <Badge className={prepayment.payment_received ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {prepayment.payment_received
                          ? `Payment received ${prepayment.payment_received_date ? formatDate(prepayment.payment_received_date) : ''}`
                          : 'Payment pending'}
                      </Badge>
                      {!prepayment.payment_received && (
                        <Button size="sm" variant="outline" onClick={handleMarkPaymentReceived}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Received
                        </Button>
                      )}
                    </div>

                    {/* Balance Gauge (retainer model) */}
                    {prepayment.prepayment_model === 'retainer' && prepaymentBalance && (
                      <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Balance</span>
                          <span className={`font-bold ${prepaymentBalance.is_below_threshold ? 'text-orange-600' : 'text-green-600'}`}>
                            {formatCurrency(prepaymentBalance.current_balance, contract.currency)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              prepaymentBalance.is_below_threshold ? 'bg-orange-500' :
                              (prepaymentBalance.current_balance / prepaymentBalance.total_funded) < 0.3 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.max(0, Math.min(100, prepaymentBalance.total_funded > 0 ? (prepaymentBalance.current_balance / prepaymentBalance.total_funded) * 100 : 0))}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Funded: {formatCurrency(prepaymentBalance.total_funded, contract.currency)}</span>
                          <span>Drawn: {formatCurrency(prepaymentBalance.total_drawn, contract.currency)}</span>
                        </div>
                        {prepayment.threshold_amount && (
                          <p className="text-xs text-gray-500">
                            Threshold: {formatCurrency(prepayment.threshold_amount, contract.currency)}
                          </p>
                        )}
                        {prepayment.threshold_percentage && (
                          <p className="text-xs text-gray-500">
                            Threshold: {prepayment.threshold_percentage}% of total funded
                          </p>
                        )}
                      </div>
                    )}

                    {/* Hold & Repay details */}
                    {prepayment.prepayment_model === 'hold_repay' && prepaymentBalance && (
                      <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Held Amount</p>
                            <p className="font-medium">{formatCurrency(prepaymentBalance.total_funded, contract.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Drawn</p>
                            <p className="font-medium">{formatCurrency(prepaymentBalance.total_drawn, contract.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Net to Reconcile</p>
                            <p className="font-bold">{formatCurrency(prepaymentBalance.current_balance, contract.currency)}</p>
                          </div>
                        </div>
                        {prepayment.reconciliation_trigger && (
                          <p className="text-xs text-gray-500">Trigger: {prepayment.reconciliation_trigger}</p>
                        )}
                        {prepayment.reconciliation_date && (
                          <p className="text-xs text-gray-500">Reconciliation date: {formatDate(prepayment.reconciliation_date)}</p>
                        )}
                        {prepayment.reconciled ? (
                          <Badge className="bg-green-100 text-green-800">
                            Reconciled on {formatDate(prepayment.reconciled_date)} — {formatCurrency(prepayment.reconciled_amount, contract.currency)}
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={handleReconcile}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Reconcile
                          </Button>
                        )}
                      </div>
                    )}

                    {prepayment.notes && (
                      <p className="text-xs text-gray-500">Notes: {prepayment.notes}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly PTC Tracking Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Monthly PTC Tracking</CardTitle>
                <Button size="sm" onClick={() => {
                  resetActualForm();
                  setIsAddActualOpen(true);
                }} disabled={data.passthroughCosts.length === 0}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add PTC Actual
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {passthroughActuals.length === 0 ? (
                  <p className="text-gray-500 p-6 text-sm">No PTC actuals recorded yet.{data.passthroughCosts.length === 0 && ' Add PTC categories first.'}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>PTC Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {passthroughActuals.map((actual) => {
                        const ptcCategory = data.passthroughCosts.find(p => p.id === actual.passthrough_cost_id);
                        return (
                          <TableRow key={actual.id}>
                            <TableCell className="text-sm">{formatDate(actual.transaction_date)}</TableCell>
                            <TableCell className="text-sm">
                              {actual.period_month && actual.period_year
                                ? `${actual.period_month}/${actual.period_year}`
                                : actual.period_year || '-'}
                            </TableCell>
                            <TableCell className="text-sm">{ptcCategory?.description || ptcCategory?.category || '-'}</TableCell>
                            <TableCell className="text-sm">{actual.description || '-'}</TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {formatCurrency(actual.amount, contract.currency)}
                            </TableCell>
                            <TableCell className="text-sm">{actual.invoice_number || '-'}</TableCell>
                            <TableCell>
                              {actual.invoice_url ? (
                                <a href={actual.invoice_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditActual(actual)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteActual(actual.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Top-Up History (retainer only) */}
            {prepayment?.prepayment_model === 'retainer' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Top-Up History</CardTitle>
                  <Button size="sm" onClick={() => {
                    resetTopupForm();
                    setIsAddTopupOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Top-Up
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {prepaymentTopups.length === 0 ? (
                    <p className="text-gray-500 p-6 text-sm">No top-ups recorded yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prepaymentTopups.map((topup) => (
                          <TableRow key={topup.id}>
                            <TableCell className="text-sm">{formatDate(topup.topup_date)}</TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {formatCurrency(topup.amount, contract.currency)}
                            </TableCell>
                            <TableCell className="text-sm">{topup.invoice_number || '-'}</TableCell>
                            <TableCell>
                              {topup.invoice_url ? (
                                <a href={topup.invoice_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-sm">{topup.notes || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTopup(topup)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTopup(topup.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PTC Categories Card (existing, restructured) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Pass-Through Cost Categories</CardTitle>
                <Button size="sm" onClick={() => setIsAddPTCOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add PTC
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.passthroughCosts.length === 0 ? (
                  <p className="text-gray-500 p-6">No pass-through costs defined</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Actual Spent</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.passthroughCosts.map((ptc) => (
                        <TableRow key={ptc.id}>
                          <TableCell className="font-medium">{ptc.description || '-'}</TableCell>
                          <TableCell>{ptc.category}</TableCell>
                          <TableCell>{ptc.passthrough_type}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(ptc.budgeted_total, ptc.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(ptc.actual_spent, ptc.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditPTC(ptc)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeletePTC(ptc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {data.contract?.contract_type === 'msa' && (
          <TabsContent value="subcontractors">
            <Card>
              <CardHeader>
                <CardTitle>Subcontractor Contracts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.subcontractors.length === 0 ? (
                  <p className="text-gray-500 p-6">No subcontractor contracts linked to this Project Contract</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contract Number</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Vendor Name</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.subcontractors.map((subcontract) => (
                        <TableRow key={subcontract.id}>
                          <TableCell className="font-medium">
                            {subcontract.contract_number || '-'}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/contracts/${subcontract.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {subcontract.title}
                            </Link>
                          </TableCell>
                          <TableCell>{subcontract.vendor_name || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(subcontract.current_value || subcontract.original_value, subcontract.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[subcontract.status] || 'bg-gray-100 text-gray-800'}>
                              {subcontract.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(subcontract.end_date)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link href={`/contracts/${subcontract.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {data.contract?.contract_type === 'site_contract' && (
          <TabsContent value="invoice-audit">
            <InvoiceAuditTab
              contractId={contractId}
              currency={contract.currency || 'EUR'}
              hasDocuments={Boolean(contract.document_urls && contract.document_urls.length > 0)}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Test Dialog - Read-only contract details */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Full Contract Details</DialogTitle>
            <DialogDescription>Complete information about this contract</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Contract Number</p>
                <p className="text-sm">{contract.contract_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type</p>
                <p className="text-sm">{contract.contract_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-sm">{contract.start_date || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-sm">{contract.end_date || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Original Value</p>
                <p className="text-sm">{formatCurrency(contract.original_value, contract.currency)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Current Value</p>
                <p className="text-sm">{formatCurrency(contract.current_value, contract.currency)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                <p className="text-sm">{contract.payment_terms || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Auto Renew</p>
                <p className="text-sm">{contract.auto_renew ? 'Yes' : 'No'}</p>
              </div>
            </div>
            {contract.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm">{contract.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog - NOW WITH WORKING FORM */}
      <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>
              Create a new milestone for this contract
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="milestone_name">Milestone Name *</Label>
              <Input
                id="milestone_name"
                placeholder="e.g., Requirements & Design Phase"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="milestone_value">Value ({contract.currency}) *</Label>
              <Input
                id="milestone_value"
                type="number"
                step="any"
                placeholder="0.00"
                value={milestoneValue}
                onChange={(e) => setMilestoneValue(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="milestone_due_date">Due Date</Label>
              <Input
                id="milestone_due_date"
                type="date"
                value={milestoneDueDate}
                onChange={(e) => setMilestoneDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddMilestoneOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMilestone} disabled={!milestoneName}>
              Add Milestone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Milestone Dialog */}
      <Dialog open={isEditMilestoneOpen} onOpenChange={setIsEditMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>
              Update milestone details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_milestone_name">Milestone Name *</Label>
              <Input
                id="edit_milestone_name"
                placeholder="e.g., Requirements & Design Phase"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_milestone_value">Value ({contract.currency}) *</Label>
              <Input
                id="edit_milestone_value"
                type="number"
                step="any"
                placeholder="0.00"
                value={milestoneValue}
                onChange={(e) => setMilestoneValue(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_milestone_due_date">Due Date</Label>
              <Input
                id="edit_milestone_due_date"
                type="date"
                value={milestoneDueDate}
                onChange={(e) => setMilestoneDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditMilestoneOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditMilestone} disabled={!milestoneName}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Inflation Dialog */}
      <Dialog open={isApplyInflationOpen} onOpenChange={(open) => {
        setIsApplyInflationOpen(open);
        if (!open) {
          setInflationRate('');
          setSelectedMilestonesForInflation([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply Inflation Adjustment</DialogTitle>
            <DialogDescription>
              Select milestones and apply inflation rate adjustment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inflation_year">Year *</Label>
                <Input
                  id="inflation_year"
                  type="number"
                  value={inflationYear}
                  onChange={(e) => setInflationYear(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inflation_rate">Inflation Rate (%) *</Label>
                <Input
                  id="inflation_rate"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 2.5"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(e.target.value)}
                  disabled={!manualOverride && configuredRate !== null}
                />
                {configuredRate !== null && !manualOverride && (
                  <p className="text-xs text-green-600">
                    ✓ Configured rate: {configuredRate}% for {contract.inflation_clause?.rate_type}
                  </p>
                )}
                {configuredRate === null && !manualOverride && (
                  <p className="text-xs text-gray-500">
                    No configured rate found. <a href="/settings/inflation" target="_blank" className="text-blue-600 hover:underline">Manage rates</a>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="manual_override"
                checked={manualOverride}
                onChange={(e) => {
                  setManualOverride(e.target.checked);
                  if (!e.target.checked && configuredRate !== null) {
                    setInflationRate(configuredRate.toString());
                  }
                }}
              />
              <Label htmlFor="manual_override" className="text-sm cursor-pointer">
                Manual override (enter custom rate)
              </Label>
            </div>

            <div className="grid gap-2">
              <Label>Select Milestones *</Label>
              <p className="text-xs text-gray-500">
                Only un-invoiced milestones with due dates in or after {inflationYear} are shown
              </p>
              {data.milestones.length === 0 ? (
                <p className="text-sm text-gray-500">No milestones available</p>
              ) : (
                <div className="border rounded-md p-4 space-y-2 max-h-96 overflow-y-auto">
                  {data.milestones
                    .filter((m) => {
                      // Only show un-invoiced milestones
                      if (m.invoiced) return false;
                      // Only show milestones with due dates in/after selected year
                      if (!m.current_due_date) return true; // Include milestones without dates
                      const dueYear = new Date(m.current_due_date).getFullYear();
                      return dueYear >= parseInt(inflationYear);
                    })
                    .map((milestone) => {
                    const isSelected = selectedMilestonesForInflation.includes(milestone.id);
                    const hasInflation = milestone.inflation_adjustments && milestone.inflation_adjustments.length > 0;

                    return (
                      <div
                        key={milestone.id}
                        className={`flex items-start gap-3 p-2 rounded ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : ''
                        } ${
                          milestone.inflation_superseded_by_co ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={milestone.inflation_superseded_by_co}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMilestonesForInflation([
                                ...selectedMilestonesForInflation,
                                milestone.id,
                              ]);
                            } else {
                              setSelectedMilestonesForInflation(
                                selectedMilestonesForInflation.filter((id) => id !== milestone.id)
                              );
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{milestone.name}</div>
                          <div className="text-xs text-gray-500">
                            Current Value: {formatCurrency(milestone.current_value, contract.currency)}
                            {hasInflation && (
                              <span className="ml-2 text-blue-600">
                                ({milestone.inflation_adjustments.length} adjustment(s) applied)
                              </span>
                            )}
                            {milestone.inflation_superseded_by_co && (
                              <span className="ml-2 text-orange-600">
                                (Superseded by Change Order)
                              </span>
                            )}
                          </div>
                          {inflationRate && isSelected && (
                            <div className="text-xs text-green-600 mt-1">
                              New Value: {formatCurrency(
                                (milestone.current_value || 0) * (1 + parseFloat(inflationRate || '0') / 100),
                                contract.currency
                              )}{' '}
                              (+{formatCurrency(
                                (milestone.current_value || 0) * (parseFloat(inflationRate || '0') / 100),
                                contract.currency
                              )})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyInflationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyInflation}
              disabled={!inflationRate || selectedMilestonesForInflation.length === 0}
            >
              Apply Inflation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Change Order Dialog */}
      <Dialog open={isEditChangeOrderOpen} onOpenChange={setIsEditChangeOrderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Change Order</DialogTitle>
            <DialogDescription>
              Update change order details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_co_title">Title *</Label>
              <Input
                id="edit_co_title"
                placeholder="e.g., Scope Extension - Phase 2"
                value={changeOrderTitle}
                onChange={(e) => setChangeOrderTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_co_number">Change Order Number</Label>
              <Input
                id="edit_co_number"
                placeholder="e.g., CO-002"
                value={changeOrderNumber}
                onChange={(e) => setChangeOrderNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_co_value">Value Change ({contract.currency})</Label>
              <Input
                id="edit_co_value"
                type="number"
                step="any"
                placeholder="0.00"
                value={changeOrderValue}
                onChange={(e) => setChangeOrderValue(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Positive for increase, negative for decrease
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_co_date">Effective Date</Label>
              <Input
                id="edit_co_date"
                type="date"
                value={changeOrderDate}
                onChange={(e) => setChangeOrderDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditChangeOrderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditChangeOrder} disabled={!changeOrderTitle}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Add Change Order Dialog - Multi-Step */}
      <Dialog open={isAddChangeOrderOpen} onOpenChange={(open) => {
        setIsAddChangeOrderOpen(open);
        if (!open) {
          // Reset form
          setCoFormStep(1);
          setCoFormData({
            co_type: 'milestone_adjustment',
            milestone_adjustments: [],
            ptc_adjustments: [],
          });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Change Order - Step {coFormStep} of 4</DialogTitle>
            <DialogDescription>
              {coFormStep === 1 && 'Select the type of change order'}
              {coFormStep === 2 && 'Define the impact on contract value'}
              {coFormStep === 3 && 'Attach CO document (optional)'}
              {coFormStep === 4 && 'Review and confirm'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= coFormStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-16 h-1 ${
                      step < coFormStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Type Selection */}
          {coFormStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Change Order Type *</Label>
                <RadioGroup
                  value={coFormData.co_type}
                  onValueChange={(value: string) =>
                    setCoFormData({ ...coFormData, co_type: value as ChangeOrderType })
                  }
                >
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="milestone_adjustment" id="type-milestone" />
                      <Label htmlFor="type-milestone" className="cursor-pointer flex-1">
                        <div className="font-medium">Adjust Individual Milestones</div>
                        <p className="text-xs text-gray-500">
                          Modify values or due dates of existing milestones
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="lump_sum_immediate" id="type-immediate" />
                      <Label htmlFor="type-immediate" className="cursor-pointer flex-1">
                        <div className="font-medium">Lump Sum (Billed Immediately)</div>
                        <p className="text-xs text-gray-500">
                          One-time payment invoiced right away
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="lump_sum_milestone" id="type-milestone-new" />
                      <Label htmlFor="type-milestone-new" className="cursor-pointer flex-1">
                        <div className="font-medium">Lump Sum (Billed at Specific Time)</div>
                        <p className="text-xs text-gray-500">
                          Creates a new milestone with a due date
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="passthrough_only" id="type-ptc" />
                      <Label htmlFor="type-ptc" className="cursor-pointer flex-1">
                        <div className="font-medium">Pass-Through Cost Adjustment</div>
                        <p className="text-xs text-gray-500">
                          Adjust pass-through cost budgets only
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2 border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="combined" id="type-combined" />
                      <Label htmlFor="type-combined" className="cursor-pointer flex-1">
                        <div className="font-medium">Combined (Direct + Pass-Through)</div>
                        <p className="text-xs text-gray-500">
                          Includes both direct revenue and pass-through cost changes
                        </p>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="co_title">Title *</Label>
                  <Input
                    id="co_title"
                    placeholder="e.g., Scope Extension - Phase 2"
                    value={coFormData.title || ''}
                    onChange={(e) => setCoFormData({ ...coFormData, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="co_number">Change Order Number</Label>
                  <Input
                    id="co_number"
                    placeholder="e.g., CO-002"
                    value={coFormData.change_order_number || ''}
                    onChange={(e) =>
                      setCoFormData({ ...coFormData, change_order_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="co_effective_date">Effective Date</Label>
                <Input
                  id="co_effective_date"
                  type="date"
                  value={coFormData.effective_date || ''}
                  onChange={(e) =>
                    setCoFormData({ ...coFormData, effective_date: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="co_description">Description</Label>
                <Textarea
                  id="co_description"
                  placeholder="Describe the scope change..."
                  rows={3}
                  value={coFormData.description || ''}
                  onChange={(e) =>
                    setCoFormData({ ...coFormData, description: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Step 2: Impact Definition */}
          {coFormStep === 2 && (
            <div className="space-y-4">
              {/* Milestone Adjustment Type */}
              {coFormData.co_type === 'milestone_adjustment' && (
                <div className="space-y-3">
                  <Label>Select Milestones to Adjust</Label>
                  {data.milestones.length === 0 ? (
                    <div className="border rounded-md p-4 text-sm text-gray-500 text-center">
                      No milestones available. Please add milestones to the contract first.
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 space-y-3 max-h-96 overflow-y-auto">
                      {data.milestones.map((milestone) => {
                        const adjustment = coFormData.milestone_adjustments?.find(
                          (a) => a.milestone_id === milestone.id
                        );
                        const isSelected = !!adjustment;

                        return (
                          <div
                            key={milestone.id}
                            className={`border rounded-md p-3 ${
                              isSelected ? 'border-blue-600 bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCoFormData({
                                      ...coFormData,
                                      milestone_adjustments: [
                                        ...(coFormData.milestone_adjustments || []),
                                        {
                                          milestone_id: milestone.id,
                                          new_value: milestone.current_value || undefined,
                                          new_due_date: milestone.current_due_date || undefined,
                                        },
                                      ],
                                    });
                                  } else {
                                    setCoFormData({
                                      ...coFormData,
                                      milestone_adjustments: coFormData.milestone_adjustments?.filter(
                                        (a) => a.milestone_id !== milestone.id
                                      ),
                                    });
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{milestone.name}</div>
                                <div className="text-xs text-gray-500">
                                  Current: {contract.currency} {(milestone.current_value || 0).toLocaleString()} •{' '}
                                  Due: {milestone.current_due_date || 'Not set'}
                                </div>

                                {/* Adjustment Inputs */}
                                {isSelected && (
                                  <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="grid gap-1">
                                      <Label className="text-xs">New Value ({contract.currency})</Label>
                                      <Input
                                        type="number"
                                        step="any"
                                        value={adjustment?.new_value || ''}
                                        onChange={(e) => {
                                          const newAdjs = coFormData.milestone_adjustments?.map((a) =>
                                            a.milestone_id === milestone.id
                                              ? { ...a, new_value: parseFloat(e.target.value) || undefined }
                                              : a
                                          );
                                          setCoFormData({ ...coFormData, milestone_adjustments: newAdjs });
                                        }}
                                      />
                                    </div>
                                    <div className="grid gap-1">
                                      <Label className="text-xs">New Due Date</Label>
                                      <Input
                                        type="date"
                                        value={adjustment?.new_due_date || ''}
                                        onChange={(e) => {
                                          const newAdjs = coFormData.milestone_adjustments?.map((a) =>
                                            a.milestone_id === milestone.id
                                              ? { ...a, new_due_date: e.target.value || undefined }
                                              : a
                                          );
                                          setCoFormData({ ...coFormData, milestone_adjustments: newAdjs });
                                        }}
                                      />
                                    </div>
                                    <div className="col-span-2 grid gap-1">
                                      <Label className="text-xs">Reason (optional)</Label>
                                      <Input
                                        placeholder="e.g., Client delay, scope change"
                                        value={adjustment?.adjustment_reason || ''}
                                        onChange={(e) => {
                                          const newAdjs = coFormData.milestone_adjustments?.map((a) =>
                                            a.milestone_id === milestone.id
                                              ? { ...a, adjustment_reason: e.target.value }
                                              : a
                                          );
                                          setCoFormData({ ...coFormData, milestone_adjustments: newAdjs });
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Lump Sum Immediate */}
              {coFormData.co_type === 'lump_sum_immediate' && (
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="direct_cost_immediate">Amount ({contract.currency}) *</Label>
                    <Input
                      id="direct_cost_immediate"
                      type="number"
                      step="any"
                      placeholder="e.g., 25000"
                      value={coFormData.direct_cost_change || ''}
                      onChange={(e) =>
                        setCoFormData({
                          ...coFormData,
                          direct_cost_change: parseFloat(e.target.value) || undefined,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Positive for revenue increase, negative for refund
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="invoiced_now"
                      checked={coFormData.invoiced_immediately || false}
                      onChange={(e) =>
                        setCoFormData({ ...coFormData, invoiced_immediately: e.target.checked })
                      }
                    />
                    <Label htmlFor="invoiced_now">Mark as invoiced immediately</Label>
                  </div>
                </div>
              )}

              {/* Lump Sum Milestone */}
              {coFormData.co_type === 'lump_sum_milestone' && (
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="new_milestone_name">Milestone Name *</Label>
                    <Input
                      id="new_milestone_name"
                      placeholder="e.g., CO-002 Deliverable"
                      value={coFormData.new_milestone_name || ''}
                      onChange={(e) =>
                        setCoFormData({ ...coFormData, new_milestone_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new_milestone_value">Value ({contract.currency}) *</Label>
                      <Input
                        id="new_milestone_value"
                        type="number"
                        step="any"
                        placeholder="e.g., 50000"
                        value={coFormData.direct_cost_change || ''}
                        onChange={(e) =>
                          setCoFormData({
                            ...coFormData,
                            direct_cost_change: parseFloat(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_milestone_due">Due Date *</Label>
                      <Input
                        id="new_milestone_due"
                        type="date"
                        value={coFormData.new_milestone_due_date || ''}
                        onChange={(e) =>
                          setCoFormData({ ...coFormData, new_milestone_due_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pass-Through or Combined */}
              {(coFormData.co_type === 'passthrough_only' || coFormData.co_type === 'combined') && (
                <div className="space-y-3">
                  <Label>Pass-Through Cost Adjustments</Label>
                  {data.passthroughCosts.length === 0 ? (
                    <div className="border rounded-md p-4 text-sm text-gray-500 text-center">
                      No pass-through costs available. Please add pass-through costs to the contract first.
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 space-y-3 max-h-96 overflow-y-auto">
                      {data.passthroughCosts.map((ptc) => {
                        const adjustment = coFormData.ptc_adjustments?.find(
                          (a) => a.passthrough_cost_id === ptc.id
                        );
                        const isSelected = !!adjustment;

                        return (
                          <div
                            key={ptc.id}
                            className={`border rounded-md p-3 ${
                              isSelected ? 'border-blue-600 bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCoFormData({
                                      ...coFormData,
                                      ptc_adjustments: [
                                        ...(coFormData.ptc_adjustments || []),
                                        {
                                          passthrough_cost_id: ptc.id,
                                          new_budget: ptc.budgeted_total || 0,
                                        },
                                      ],
                                    });
                                  } else {
                                    setCoFormData({
                                      ...coFormData,
                                      ptc_adjustments: coFormData.ptc_adjustments?.filter(
                                        (a) => a.passthrough_cost_id !== ptc.id
                                      ),
                                    });
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{ptc.description || 'Unnamed'}</div>
                                <div className="text-xs text-gray-500">
                                  Category: {ptc.category} • Current Budget:{' '}
                                  {contract.currency} {(ptc.budgeted_total || 0).toLocaleString()}
                                </div>

                                {/* Adjustment Inputs */}
                                {isSelected && (
                                  <div className="mt-3 grid gap-2">
                                    <div className="grid gap-1">
                                      <Label className="text-xs">New Budget ({contract.currency})</Label>
                                      <Input
                                        type="number"
                                        step="any"
                                        value={adjustment?.new_budget || ''}
                                        onChange={(e) => {
                                          const newAdjs = coFormData.ptc_adjustments?.map((a) =>
                                            a.passthrough_cost_id === ptc.id
                                              ? { ...a, new_budget: parseFloat(e.target.value) || 0 }
                                              : a
                                          );
                                          setCoFormData({ ...coFormData, ptc_adjustments: newAdjs });
                                        }}
                                      />
                                    </div>
                                    <div className="grid gap-1">
                                      <Label className="text-xs">Reason (optional)</Label>
                                      <Input
                                        placeholder="e.g., Additional travel required"
                                        value={adjustment?.adjustment_reason || ''}
                                        onChange={(e) => {
                                          const newAdjs = coFormData.ptc_adjustments?.map((a) =>
                                            a.passthrough_cost_id === ptc.id
                                              ? { ...a, adjustment_reason: e.target.value }
                                              : a
                                          );
                                          setCoFormData({ ...coFormData, ptc_adjustments: newAdjs });
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Direct Cost for Combined Type */}
              {coFormData.co_type === 'combined' && (
                <div className="space-y-3 border-t pt-4">
                  <Label className="font-medium">Direct Revenue/Cost Change</Label>
                  <div className="grid gap-2">
                    <Label htmlFor="direct_cost_combined">Amount ({contract.currency})</Label>
                    <Input
                      id="direct_cost_combined"
                      type="number"
                      step="any"
                      placeholder="e.g., 25000 or -5000"
                      value={coFormData.direct_cost_change || ''}
                      onChange={(e) =>
                        setCoFormData({
                          ...coFormData,
                          direct_cost_change: parseFloat(e.target.value) || undefined,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Positive for revenue increase, negative for cost reduction
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Document */}
          {coFormStep === 3 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Change Order Document (Optional)</Label>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload PDF</TabsTrigger>
                    <TabsTrigger value="sharepoint">SharePoint Link</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-3">
                    <div
                      className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => document.getElementById('co-file-input')?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PDF up to 50MB</p>
                      <input
                        id="co-file-input"
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCoFormData({
                              ...coFormData,
                              document_file: file,
                              document_sharepoint_url: undefined, // Clear SharePoint URL if file is selected
                            });
                          }
                        }}
                      />
                    </div>
                    {coFormData.document_file && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="flex-1">{coFormData.document_file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            setCoFormData({ ...coFormData, document_file: undefined })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sharepoint" className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="sharepoint_url">SharePoint URL</Label>
                      <Input
                        id="sharepoint_url"
                        type="url"
                        placeholder="https://yourcompany.sharepoint.com/..."
                        value={coFormData.document_sharepoint_url || ''}
                        onChange={(e) =>
                          setCoFormData({
                            ...coFormData,
                            document_sharepoint_url: e.target.value,
                            document_file: undefined, // Clear file if SharePoint URL is provided
                          })
                        }
                      />
                      <p className="text-xs text-gray-500">
                        Paste the link to the CO document in SharePoint
                      </p>
                    </div>
                    {coFormData.document_sharepoint_url && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                        <Link2 className="h-4 w-4" />
                        <span className="flex-1 truncate">{coFormData.document_sharepoint_url}</span>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {coFormStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4 space-y-3">
                <h3 className="font-medium">Change Order Summary</h3>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Type:</div>
                  <div className="font-medium">
                    {coFormData.co_type === 'milestone_adjustment' && 'Milestone Adjustment'}
                    {coFormData.co_type === 'lump_sum_immediate' && 'Lump Sum (Immediate)'}
                    {coFormData.co_type === 'lump_sum_milestone' && 'Lump Sum (Milestone)'}
                    {coFormData.co_type === 'passthrough_only' && 'Pass-Through Only'}
                    {coFormData.co_type === 'combined' && 'Combined (Direct + PTC)'}
                  </div>

                  <div className="text-gray-500">Title:</div>
                  <div className="font-medium">{coFormData.title || 'N/A'}</div>

                  {coFormData.change_order_number && (
                    <>
                      <div className="text-gray-500">CO Number:</div>
                      <div className="font-medium">{coFormData.change_order_number}</div>
                    </>
                  )}

                  {coFormData.effective_date && (
                    <>
                      <div className="text-gray-500">Effective Date:</div>
                      <div className="font-medium">{coFormData.effective_date}</div>
                    </>
                  )}
                </div>

                {/* Impact Summary */}
                <div className="border-t pt-3 space-y-2">
                  <h4 className="font-medium text-sm">Impact Summary</h4>

                  {/* Milestone Adjustments */}
                  {coFormData.co_type === 'milestone_adjustment' && coFormData.milestone_adjustments && coFormData.milestone_adjustments.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500">Milestones Affected:</span>{' '}
                      <span className="font-medium">
                        {coFormData.milestone_adjustments.length}
                      </span>
                      {coFormData.milestone_adjustments.map((adj) => {
                        const milestone = data.milestones.find((m) => m.id === adj.milestone_id);
                        if (!milestone) return null;
                        const valueChange = (adj.new_value || 0) - (milestone.current_value || 0);

                        return (
                          <div key={adj.milestone_id} className="ml-4 mt-1 text-xs">
                            • {milestone.name}:{' '}
                            {valueChange !== 0 && (
                              <span
                                className={valueChange > 0 ? 'text-green-600' : 'text-red-600'}
                              >
                                {valueChange > 0 ? '+' : ''}
                                {contract.currency} {valueChange.toLocaleString()}
                              </span>
                            )}
                            {adj.new_due_date &&
                              adj.new_due_date !== milestone.current_due_date && (
                                <span className="text-orange-600">
                                  {' '} • Due: {adj.new_due_date}
                                </span>
                              )}
                          </div>
                        );
                      })}
                      <div className="mt-2 text-xs font-medium">
                        Total Value Change:{' '}
                        <span className={
                          coFormData.milestone_adjustments.reduce((sum, adj) => {
                            const milestone = data.milestones.find((m) => m.id === adj.milestone_id);
                            return sum + ((adj.new_value || 0) - (milestone?.current_value || 0));
                          }, 0) > 0 ? 'text-green-600' : 'text-red-600'
                        }>
                          {coFormData.milestone_adjustments.reduce((sum, adj) => {
                            const milestone = data.milestones.find((m) => m.id === adj.milestone_id);
                            const change = (adj.new_value || 0) - (milestone?.current_value || 0);
                            return sum + change;
                          }, 0) > 0 ? '+' : ''}
                          {contract.currency}{' '}
                          {coFormData.milestone_adjustments.reduce((sum, adj) => {
                            const milestone = data.milestones.find((m) => m.id === adj.milestone_id);
                            return sum + ((adj.new_value || 0) - (milestone?.current_value || 0));
                          }, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Direct Cost Change (for lump sum and combined types) */}
                  {(coFormData.co_type === 'lump_sum_immediate' ||
                    coFormData.co_type === 'lump_sum_milestone' ||
                    (coFormData.co_type === 'combined' && coFormData.direct_cost_change)) && (
                    <div className="text-sm">
                      <span className="text-gray-500">Direct Revenue/Cost Change:</span>{' '}
                      <span
                        className={`font-medium ${
                          (coFormData.direct_cost_change || 0) > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {(coFormData.direct_cost_change || 0) > 0 ? '+' : ''}
                        {contract.currency} {(coFormData.direct_cost_change || 0).toLocaleString()}
                      </span>
                      {coFormData.co_type === 'lump_sum_milestone' && (
                        <div className="ml-4 mt-1 text-xs text-gray-600">
                          New Milestone: {coFormData.new_milestone_name} • Due: {coFormData.new_milestone_due_date}
                        </div>
                      )}
                      {coFormData.invoiced_immediately && (
                        <div className="ml-4 mt-1 text-xs text-blue-600">
                          ✓ Marked as invoiced immediately
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pass-Through Cost Adjustments */}
                  {(coFormData.co_type === 'passthrough_only' ||
                    coFormData.co_type === 'combined') &&
                    coFormData.ptc_adjustments &&
                    coFormData.ptc_adjustments.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-500">Pass-Through Cost Adjustments:</span>{' '}
                        <span className="font-medium">
                          {coFormData.ptc_adjustments.length} category(s)
                        </span>
                        {coFormData.ptc_adjustments.map((adj) => {
                          const ptc = data.passthroughCosts.find(
                            (p) => p.id === adj.passthrough_cost_id
                          );
                          if (!ptc) return null;
                          const change = adj.new_budget - (ptc.budgeted_total || 0);

                          return (
                            <div key={adj.passthrough_cost_id} className="ml-4 mt-1 text-xs">
                              • {ptc.description}:{' '}
                              <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
                                {change > 0 ? '+' : ''}
                                {contract.currency} {change.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                        <div className="mt-2 text-xs font-medium">
                          Total PTC Change:{' '}
                          <span className={
                            coFormData.ptc_adjustments.reduce((sum, adj) => {
                              const ptc = data.passthroughCosts.find((p) => p.id === adj.passthrough_cost_id);
                              return sum + (adj.new_budget - (ptc?.budgeted_total || 0));
                            }, 0) > 0 ? 'text-green-600' : 'text-red-600'
                          }>
                            {coFormData.ptc_adjustments.reduce((sum, adj) => {
                              const ptc = data.passthroughCosts.find((p) => p.id === adj.passthrough_cost_id);
                              const change = adj.new_budget - (ptc?.budgeted_total || 0);
                              return sum + change;
                            }, 0) > 0 ? '+' : ''}
                            {contract.currency}{' '}
                            {coFormData.ptc_adjustments.reduce((sum, adj) => {
                              const ptc = data.passthroughCosts.find((p) => p.id === adj.passthrough_cost_id);
                              return sum + (adj.new_budget - (ptc?.budgeted_total || 0));
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                </div>

                {/* Description */}
                {coFormData.description && (
                  <div className="border-t pt-3">
                    <div className="text-sm">
                      <span className="text-gray-500">Description:</span>
                      <p className="mt-1 text-gray-700">{coFormData.description}</p>
                    </div>
                  </div>
                )}

                {/* Document */}
                {(coFormData.document_file || coFormData.document_sharepoint_url) && (
                  <div className="border-t pt-3">
                    <div className="text-sm">
                      <span className="text-gray-500">Document:</span>
                      <div className="mt-2 flex items-center gap-2 text-gray-700">
                        {coFormData.document_file && (
                          <>
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span>{coFormData.document_file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(coFormData.document_file.size / 1024).toFixed(1)} KB)
                            </span>
                          </>
                        )}
                        {coFormData.document_sharepoint_url && (
                          <>
                            <Link2 className="h-4 w-4 text-blue-600" />
                            <span className="truncate">{coFormData.document_sharepoint_url}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {coFormStep > 1 && (
              <Button variant="outline" onClick={() => setCoFormStep(coFormStep - 1)}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsAddChangeOrderOpen(false)}>
              Cancel
            </Button>
            {coFormStep < 4 ? (
              <Button
                onClick={() => setCoFormStep(coFormStep + 1)}
                disabled={coFormStep === 1 && !coFormData.title}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleAddChangeOrder} disabled={!coFormData.title}>
                Save Change Order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pass-Through Cost Dialog */}
      <Dialog open={isEditPTCOpen} onOpenChange={setIsEditPTCOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pass-Through Cost</DialogTitle>
            <DialogDescription>
              Update pass-through cost details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_ptc_description">Description *</Label>
              <Input
                id="edit_ptc_description"
                placeholder="e.g., Client site visits & workshops"
                value={ptcDescription}
                onChange={(e) => setPtcDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_ptc_budget">Budget ({contract.currency}) *</Label>
              <Input
                id="edit_ptc_budget"
                type="number"
                step="any"
                placeholder="0.00"
                value={ptcBudget}
                onChange={(e) => setPtcBudget(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_ptc_actual">Actual Spent ({contract.currency})</Label>
              <Input
                id="edit_ptc_actual"
                type="number"
                step="any"
                placeholder="0.00"
                value={ptcActualSpent}
                onChange={(e) => setPtcActualSpent(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditPTCOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditPTC} disabled={!ptcDescription}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add PTC Dialog */}
      <Dialog open={isAddPTCOpen} onOpenChange={(open) => {
        setIsAddPTCOpen(open);
        if (!open) {
          setPtcDescription('');
          setPtcBudget('');
          setPtcActualSpent('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pass-Through Cost</DialogTitle>
            <DialogDescription>
              Create a new pass-through cost category for this contract
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add_ptc_description">Description *</Label>
              <Input
                id="add_ptc_description"
                placeholder="e.g., Client site visits & workshops"
                value={ptcDescription}
                onChange={(e) => setPtcDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add_ptc_budget">Budget ({contract.currency}) *</Label>
              <Input
                id="add_ptc_budget"
                type="number"
                step="any"
                placeholder="0.00"
                value={ptcBudget}
                onChange={(e) => setPtcBudget(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add_ptc_actual">Actual Spent ({contract.currency})</Label>
              <Input
                id="add_ptc_actual"
                type="number"
                step="any"
                placeholder="0.00"
                value={ptcActualSpent}
                onChange={(e) => setPtcActualSpent(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddPTCOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPTC} disabled={!ptcDescription}>
              Add Pass-Through Cost
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configure Prepayment Dialog */}
      <Dialog open={isConfigurePrepaymentOpen} onOpenChange={setIsConfigurePrepaymentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Prepayment</DialogTitle>
            <DialogDescription>Set up PTC prepayment / retainer tracking for this contract</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Prepayment Model *</Label>
              <RadioGroup
                value={prepaymentForm.prepayment_model}
                onValueChange={(v: string) => setPrepaymentForm(f => ({ ...f, prepayment_model: v as PrepaymentModel }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retainer" id="model_retainer" />
                  <Label htmlFor="model_retainer" className="font-normal">
                    Retainer / Bucket — refillable fund, monthly draws
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hold_repay" id="model_hold_repay" />
                  <Label htmlFor="model_hold_repay" className="font-normal">
                    Hold & Repay — lump sum held until reconciliation
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <RadioGroup
                value={prepaymentForm.direction}
                onValueChange={(v: string) => setPrepaymentForm(f => ({ ...f, direction: v as PrepaymentDirection }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="receive" id="dir_receive" />
                  <Label htmlFor="dir_receive" className="font-normal">Receive from client/sponsor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pay" id="dir_pay" />
                  <Label htmlFor="dir_pay" className="font-normal">Pay to vendor</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select
                value={prepaymentForm.payment_terms}
                onValueChange={(v: string) => setPrepaymentForm(f => ({ ...f, payment_terms: v as PrepaymentPaymentTerms }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upon_signature">Upon signature</SelectItem>
                  <SelectItem value="30_days_after_signature">30 days after signature</SelectItem>
                  <SelectItem value="60_days_after_signature">60 days after signature</SelectItem>
                  <SelectItem value="upon_study_start">Upon study start</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {prepaymentForm.payment_terms === 'custom' && (
                <Input
                  placeholder="Describe custom payment terms"
                  value={prepaymentForm.payment_terms_custom}
                  onChange={(e) => setPrepaymentForm(f => ({ ...f, payment_terms_custom: e.target.value }))}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label>Prepayment Amount ({contract.currency}) *</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={prepaymentForm.prepayment_amount}
                onChange={(e) => setPrepaymentForm(f => ({ ...f, prepayment_amount: e.target.value }))}
              />
            </div>

            {/* Retainer-specific fields */}
            {prepaymentForm.prepayment_model === 'retainer' && (
              <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-700">Retainer Threshold</p>
                <div className="grid gap-2">
                  <Label className="text-xs">Threshold Amount ({contract.currency})</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g., 5000"
                    value={prepaymentForm.threshold_amount}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, threshold_amount: e.target.value, threshold_percentage: '' }))}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">— or —</p>
                <div className="grid gap-2">
                  <Label className="text-xs">Threshold Percentage (%)</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g., 20"
                    value={prepaymentForm.threshold_percentage}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, threshold_percentage: e.target.value, threshold_amount: '' }))}
                  />
                </div>
              </div>
            )}

            {/* Hold & Repay specific fields */}
            {prepaymentForm.prepayment_model === 'hold_repay' && (
              <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
                <p className="text-xs font-medium text-purple-700">Reconciliation</p>
                <div className="grid gap-2">
                  <Label className="text-xs">Reconciliation Trigger</Label>
                  <Input
                    placeholder="e.g., End of study, Final milestone"
                    value={prepaymentForm.reconciliation_trigger}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, reconciliation_trigger: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Reconciliation Date (optional)</Label>
                  <Input
                    type="date"
                    value={prepaymentForm.reconciliation_date}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, reconciliation_date: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={prepaymentForm.notes}
                onChange={(e) => setPrepaymentForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigurePrepaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePrepayment} disabled={!prepaymentForm.prepayment_amount}>
              Save Prepayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prepayment Dialog */}
      <Dialog open={isEditPrepaymentOpen} onOpenChange={setIsEditPrepaymentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Prepayment</DialogTitle>
            <DialogDescription>Update prepayment configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Prepayment Model *</Label>
              <RadioGroup
                value={prepaymentForm.prepayment_model}
                onValueChange={(v: string) => setPrepaymentForm(f => ({ ...f, prepayment_model: v as PrepaymentModel }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retainer" id="edit_model_retainer" />
                  <Label htmlFor="edit_model_retainer" className="font-normal">Retainer / Bucket</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hold_repay" id="edit_model_hold_repay" />
                  <Label htmlFor="edit_model_hold_repay" className="font-normal">Hold & Repay</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <RadioGroup
                value={prepaymentForm.direction}
                onValueChange={(v: string) => setPrepaymentForm(f => ({ ...f, direction: v as PrepaymentDirection }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="receive" id="edit_dir_receive" />
                  <Label htmlFor="edit_dir_receive" className="font-normal">Receive from client/sponsor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pay" id="edit_dir_pay" />
                  <Label htmlFor="edit_dir_pay" className="font-normal">Pay to vendor</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select
                value={prepaymentForm.payment_terms}
                onValueChange={(v: string) => setPrepaymentForm(f => ({ ...f, payment_terms: v as PrepaymentPaymentTerms }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upon_signature">Upon signature</SelectItem>
                  <SelectItem value="30_days_after_signature">30 days after signature</SelectItem>
                  <SelectItem value="60_days_after_signature">60 days after signature</SelectItem>
                  <SelectItem value="upon_study_start">Upon study start</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {prepaymentForm.payment_terms === 'custom' && (
                <Input
                  placeholder="Describe custom payment terms"
                  value={prepaymentForm.payment_terms_custom}
                  onChange={(e) => setPrepaymentForm(f => ({ ...f, payment_terms_custom: e.target.value }))}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label>Prepayment Amount ({contract.currency}) *</Label>
              <Input
                type="number"
                step="any"
                value={prepaymentForm.prepayment_amount}
                onChange={(e) => setPrepaymentForm(f => ({ ...f, prepayment_amount: e.target.value }))}
              />
            </div>

            {prepaymentForm.prepayment_model === 'retainer' && (
              <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-700">Retainer Threshold</p>
                <div className="grid gap-2">
                  <Label className="text-xs">Threshold Amount ({contract.currency})</Label>
                  <Input
                    type="number"
                    step="any"
                    value={prepaymentForm.threshold_amount}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, threshold_amount: e.target.value, threshold_percentage: '' }))}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">— or —</p>
                <div className="grid gap-2">
                  <Label className="text-xs">Threshold Percentage (%)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={prepaymentForm.threshold_percentage}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, threshold_percentage: e.target.value, threshold_amount: '' }))}
                  />
                </div>
              </div>
            )}

            {prepaymentForm.prepayment_model === 'hold_repay' && (
              <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
                <p className="text-xs font-medium text-purple-700">Reconciliation</p>
                <div className="grid gap-2">
                  <Label className="text-xs">Reconciliation Trigger</Label>
                  <Input
                    value={prepaymentForm.reconciliation_trigger}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, reconciliation_trigger: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Reconciliation Date</Label>
                  <Input
                    type="date"
                    value={prepaymentForm.reconciliation_date}
                    onChange={(e) => setPrepaymentForm(f => ({ ...f, reconciliation_date: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={prepaymentForm.notes}
                onChange={(e) => setPrepaymentForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPrepaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePrepayment} disabled={!prepaymentForm.prepayment_amount}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add PTC Actual Dialog */}
      <Dialog open={isAddActualOpen} onOpenChange={setIsAddActualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add PTC Actual</DialogTitle>
            <DialogDescription>Record a pass-through cost actual for this contract</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>PTC Category *</Label>
              <Select
                value={actualForm.passthrough_cost_id}
                onValueChange={(v: string) => setActualForm(f => ({ ...f, passthrough_cost_id: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select PTC category" />
                </SelectTrigger>
                <SelectContent>
                  {data.passthroughCosts.map(ptc => (
                    <SelectItem key={ptc.id} value={ptc.id}>
                      {ptc.description || ptc.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount ({contract.currency}) *</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={actualForm.amount}
                onChange={(e) => setActualForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={actualForm.transaction_date}
                onChange={(e) => setActualForm(f => ({ ...f, transaction_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Period Month</Label>
                <Select
                  value={actualForm.period_month}
                  onValueChange={(v: string) => setActualForm(f => ({ ...f, period_month: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2000, i).toLocaleString('en', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Period Year</Label>
                <Input
                  type="number"
                  value={actualForm.period_year}
                  onChange={(e) => setActualForm(f => ({ ...f, period_year: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief description"
                value={actualForm.description}
                onChange={(e) => setActualForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Invoice Number</Label>
              <Input
                placeholder="INV-001"
                value={actualForm.invoice_number}
                onChange={(e) => setActualForm(f => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>SharePoint / Invoice URL</Label>
              <Input
                placeholder="https://..."
                value={actualForm.invoice_url}
                onChange={(e) => setActualForm(f => ({ ...f, invoice_url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddActualOpen(false)}>Cancel</Button>
            <Button onClick={handleAddActual} disabled={!actualForm.passthrough_cost_id || !actualForm.amount}>
              Add Actual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit PTC Actual Dialog */}
      <Dialog open={isEditActualOpen} onOpenChange={setIsEditActualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit PTC Actual</DialogTitle>
            <DialogDescription>Update pass-through cost actual</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>PTC Category *</Label>
              <Select
                value={actualForm.passthrough_cost_id}
                onValueChange={(v: string) => setActualForm(f => ({ ...f, passthrough_cost_id: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.passthroughCosts.map(ptc => (
                    <SelectItem key={ptc.id} value={ptc.id}>
                      {ptc.description || ptc.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount ({contract.currency}) *</Label>
              <Input
                type="number"
                step="any"
                value={actualForm.amount}
                onChange={(e) => setActualForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={actualForm.transaction_date}
                onChange={(e) => setActualForm(f => ({ ...f, transaction_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Period Month</Label>
                <Select
                  value={actualForm.period_month}
                  onValueChange={(v: string) => setActualForm(f => ({ ...f, period_month: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2000, i).toLocaleString('en', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Period Year</Label>
                <Input
                  type="number"
                  value={actualForm.period_year}
                  onChange={(e) => setActualForm(f => ({ ...f, period_year: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={actualForm.description}
                onChange={(e) => setActualForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Invoice Number</Label>
              <Input
                value={actualForm.invoice_number}
                onChange={(e) => setActualForm(f => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>SharePoint / Invoice URL</Label>
              <Input
                value={actualForm.invoice_url}
                onChange={(e) => setActualForm(f => ({ ...f, invoice_url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditActualOpen(false); setEditingActual(null); }}>Cancel</Button>
            <Button onClick={handleSaveEditActual} disabled={!actualForm.passthrough_cost_id || !actualForm.amount}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Top-Up Dialog */}
      <Dialog open={isAddTopupOpen} onOpenChange={setIsAddTopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Top-Up</DialogTitle>
            <DialogDescription>Add a retainer top-up payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Amount ({contract.currency}) *</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={topupForm.amount}
                onChange={(e) => setTopupForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Top-Up Date</Label>
              <Input
                type="date"
                value={topupForm.topup_date}
                onChange={(e) => setTopupForm(f => ({ ...f, topup_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Invoice Number</Label>
              <Input
                placeholder="INV-001"
                value={topupForm.invoice_number}
                onChange={(e) => setTopupForm(f => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>SharePoint / Invoice URL</Label>
              <Input
                placeholder="https://..."
                value={topupForm.invoice_url}
                onChange={(e) => setTopupForm(f => ({ ...f, invoice_url: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={topupForm.notes}
                onChange={(e) => setTopupForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTopupOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTopup} disabled={!topupForm.amount}>
              Add Top-Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Top-Up Dialog */}
      <Dialog open={isEditTopupOpen} onOpenChange={setIsEditTopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Top-Up</DialogTitle>
            <DialogDescription>Update top-up details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Amount ({contract.currency}) *</Label>
              <Input
                type="number"
                step="any"
                value={topupForm.amount}
                onChange={(e) => setTopupForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Top-Up Date</Label>
              <Input
                type="date"
                value={topupForm.topup_date}
                onChange={(e) => setTopupForm(f => ({ ...f, topup_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Invoice Number</Label>
              <Input
                value={topupForm.invoice_number}
                onChange={(e) => setTopupForm(f => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>SharePoint / Invoice URL</Label>
              <Input
                value={topupForm.invoice_url}
                onChange={(e) => setTopupForm(f => ({ ...f, invoice_url: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={topupForm.notes}
                onChange={(e) => setTopupForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditTopupOpen(false); setEditingTopup(null); }}>Cancel</Button>
            <Button onClick={handleSaveEditTopup} disabled={!topupForm.amount}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
