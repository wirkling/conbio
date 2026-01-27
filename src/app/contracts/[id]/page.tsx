'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Contract, Milestone, PassthroughCost } from '@/types/database';

export default function ContractDetailPageMinimal() {
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
    return <div className="p-6">Loading...</div>;
  }

  if (data.error || !data.contract) {
    return <div className="p-6 text-red-600">{data.error || 'Contract not found'}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{data.contract.title}</h1>
      <div className="space-y-4">
        <div>
          <span className="font-semibold">Contract Number:</span> {data.contract.contract_number}
        </div>
        <div>
          <span className="font-semibold">Vendor:</span> {data.contract.vendor_name}
        </div>
        <div>
          <span className="font-semibold">Client:</span> {data.contract.client_name}
        </div>
        <div>
          <span className="font-semibold">Status:</span> {data.contract.status}
        </div>
        <div>
          <span className="font-semibold">Value:</span> {data.contract.current_value} {data.contract.currency}
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Milestones ({data.milestones.length})</h2>
          <ul className="list-disc list-inside">
            {data.milestones.map((m) => (
              <li key={m.id}>{m.name} - {m.current_value}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Pass-Through Costs ({data.passthroughCosts.length})</h2>
          <ul className="list-disc list-inside">
            {data.passthroughCosts.map((ptc) => (
              <li key={ptc.id}>{ptc.description} - {ptc.budgeted_total}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
