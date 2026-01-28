'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Contract, Milestone, PassthroughCost, ChangeOrder } from '@/types/database';
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
} from '@/components/ui/dialog';
import { ArrowLeft, FileText, Plus, Target, Receipt, Edit, Trash2, CheckCircle2 } from 'lucide-react';
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
  const [isAddPTCOpen, setIsAddPTCOpen] = useState(false);

  // Milestone form state
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneValue, setMilestoneValue] = useState(0);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

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
      original_due_date: null,
      original_value: milestoneValue,
      current_due_date: null,
      current_value: milestoneValue,
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
      setMilestoneValue(0);
      setIsAddMilestoneOpen(false);
    } catch (error: any) {
      console.error('Error adding milestone:', error);
      toast.error(`Failed to add milestone: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneName(milestone.name);
    setMilestoneValue(milestone.current_value || 0);
    setIsEditMilestoneOpen(true);
  };

  const handleSaveEditMilestone = async () => {
    if (!editingMilestone || !milestoneName) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          name: milestoneName,
          current_value: milestoneValue,
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
                current_value: milestoneValue,
                updated_at: new Date().toISOString(),
              }
            : m
        ),
      }));

      toast.success('Milestone updated successfully');

      // Reset form and close dialog
      setEditingMilestone(null);
      setMilestoneName('');
      setMilestoneValue(0);
      setIsEditMilestoneOpen(false);
    } catch (error: any) {
      console.error('Error updating milestone:', error);
      toast.error(`Failed to update milestone: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) {
        console.error('Supabase error deleting milestone:', error);
        toast.error(`Failed to delete milestone: ${error.message}`);
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
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.milestones.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.milestone_number || '-'}</TableCell>
                        <TableCell>{m.name}</TableCell>
                        <TableCell>
                          <Badge className={milestoneStatusColors[m.status]}>
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(m.current_due_date)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(m.current_value, contract.currency)}
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
                    ))}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                step="0.01"
                placeholder="0.00"
                value={milestoneValue}
                onChange={(e) => setMilestoneValue(parseFloat(e.target.value) || 0)}
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
                step="0.01"
                placeholder="0.00"
                value={milestoneValue}
                onChange={(e) => setMilestoneValue(parseFloat(e.target.value) || 0)}
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

      {/* Add Change Order Dialog (read-only for now) */}
      <Dialog open={isAddChangeOrderOpen} onOpenChange={setIsAddChangeOrderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Change Order</DialogTitle>
            <DialogDescription>
              This would be the form to add a new change order (currently read-only for testing)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">
              In the full version, this dialog would contain inputs for:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-gray-600">
              <li>Change order title</li>
              <li>Change order number</li>
              <li>Value change</li>
              <li>Effective date</li>
              <li>Description</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add PTC Dialog (read-only for now) */}
      <Dialog open={isAddPTCOpen} onOpenChange={setIsAddPTCOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pass-Through Cost</DialogTitle>
            <DialogDescription>
              This would be the form to add a new pass-through cost (currently read-only for testing)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">
              In the full version, this dialog would contain inputs for:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-gray-600">
              <li>Category</li>
              <li>Description</li>
              <li>Passthrough type</li>
              <li>Budgeted total</li>
              <li>Notes</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
