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
  ChangeOrder,
  ChangeOrderFormData,
  MilestoneAdjustmentInput,
  PassthroughAdjustmentInput,
  ChangeOrderType,
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
import { ArrowLeft, FileText, Plus, Target, Receipt, Edit, Trash2, CheckCircle2, Upload, Link2 } from 'lucide-react';
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

  const [data, setData] = useState<{
    contract: Contract | null;
    milestones: Milestone[];
    changeOrders: ChangeOrder[];
    passthroughCosts: PassthroughCost[];
    loading: boolean;
    error: string | null;
  }>({
    contract: null,
    milestones: [],
    changeOrders: [],
    passthroughCosts: [],
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

        setData({
          contract: fetchedData,
          milestones: fetchedData.milestones || [],
          changeOrders: fetchedData.change_orders || [],
          passthroughCosts: fetchedData.passthrough_costs || [],
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

      // 2. Create change order record
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
        document_url: coFormData.document_sharepoint_url || null,
        is_document_sharepoint: !!coFormData.document_sharepoint_url,
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
          <TabsTrigger value="ptc">Pass-Through Costs ({data.passthroughCosts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Milestones</CardTitle>
              <Button size="sm" onClick={() => setIsAddMilestoneOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Milestone
              </Button>
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
                            <Badge className={milestoneStatusColors[m.status]}>
                              {m.status}
                            </Badge>
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
                            {hasChanges ? (
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
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditMilestone(m)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteMilestone(m.id)}
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
                      <TableHead>CO Number</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead className="text-right">Value Change</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.changeOrders.map((co) => (
                      <TableRow key={co.id}>
                        <TableCell className="font-medium">{co.title}</TableCell>
                        <TableCell>{co.change_order_number || '-'}</TableCell>
                        <TableCell>{formatDate(co.effective_date)}</TableCell>
                        <TableCell className={`text-right font-medium ${(co.value_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(co.value_change || 0) >= 0 ? '+' : ''}
                          {formatCurrency(co.value_change || 0, contract.currency)}
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ptc">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Pass-Through Costs</CardTitle>
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
        </TabsContent>
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
                  onValueChange={(value) =>
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

          {/* Step 3: Document - Placeholder for now */}
          {coFormStep === 3 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Change Order Document (Optional)</Label>
                <div className="border-2 border-dashed rounded-md p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Document upload feature coming soon
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    You'll be able to upload PDFs or provide SharePoint links
                  </p>
                </div>
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
    </div>
  );
}
