'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Contract, Milestone, PassthroughCost, ChangeOrder } from '@/types/database';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, FileText } from 'lucide-react';

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

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = params.id as string;
  const { user } = useAuth();
  const hasFetchedRef = useRef(false);

  // Test: Add ONE dialog state
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

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
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {data.milestones.length === 0 ? (
                <p className="text-gray-500">No milestones defined</p>
              ) : (
                <ul className="space-y-2">
                  {data.milestones.map((m) => (
                    <li key={m.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-gray-500">
                          Status: {m.status} {m.current_due_date && `• Due: ${m.current_due_date}`}
                        </p>
                      </div>
                      <span className="font-medium">{formatCurrency(m.current_value, contract.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="change-orders">
          <Card>
            <CardHeader>
              <CardTitle>Change Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {data.changeOrders.length === 0 ? (
                <p className="text-gray-500">No change orders</p>
              ) : (
                <ul className="space-y-2">
                  {data.changeOrders.map((co) => (
                    <li key={co.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{co.title}</p>
                        <p className="text-xs text-gray-500">
                          {co.change_order_number} {co.effective_date && `• ${co.effective_date}`}
                        </p>
                      </div>
                      <span className={`font-medium ${(co.value_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(co.value_change || 0) >= 0 ? '+' : ''}{formatCurrency(co.value_change || 0, contract.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ptc">
          <Card>
            <CardHeader>
              <CardTitle>Pass-Through Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {data.passthroughCosts.length === 0 ? (
                <p className="text-gray-500">No pass-through costs defined</p>
              ) : (
                <ul className="space-y-2">
                  {data.passthroughCosts.map((ptc) => (
                    <li key={ptc.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{ptc.description}</p>
                        <p className="text-xs text-gray-500">
                          {ptc.category} • Type: {ptc.passthrough_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(ptc.budgeted_total, ptc.currency)}</p>
                        <p className="text-xs text-gray-500">Spent: {formatCurrency(ptc.actual_spent, ptc.currency)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
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
    </div>
  );
}
