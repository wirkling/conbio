'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Contract, Milestone, PassthroughCost } from '@/types/database';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';

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

  const [data, setData] = useState<{
    contract: Contract | null;
    milestones: Milestone[];
    passthroughCosts: PassthroughCost[];
    loading: boolean;
    error: string | null;
  }>({
    contract: null,
    milestones: [],
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
        <Badge className={statusColors[contract.status]}>{contract.status}</Badge>
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
                      <span>{m.name}</span>
                      <span className="font-medium">{formatCurrency(m.current_value, contract.currency)}</span>
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
                      <span>{ptc.description}</span>
                      <span className="font-medium">{formatCurrency(ptc.budgeted_total, ptc.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
