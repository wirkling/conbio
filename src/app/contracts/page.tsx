'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Filter,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ContractStatus, ContractType, Contract } from '@/types/database';

// Mock data - will be replaced with Supabase queries
const mockContracts = [
  {
    id: '1',
    title: 'Master Service Agreement - Acme Corp',
    contract_number: 'CON-2024-001',
    contract_type: 'msa' as ContractType,
    status: 'active' as ContractStatus,
    vendor_name: 'Acme Corporation',
    client_name: 'Symbio',
    project_name: 'Platform Development',
    end_date: '2025-01-31',
    current_value: 195000,
    currency: 'EUR',
  },
  {
    id: '2',
    title: 'NDA - TechStart GmbH',
    contract_number: 'CON-2024-002',
    contract_type: 'nda' as ContractType,
    status: 'active' as ContractStatus,
    vendor_name: 'TechStart GmbH',
    client_name: 'Symbio',
    project_name: null,
    end_date: '2026-02-28',
    current_value: 0,
    currency: 'EUR',
  },
  {
    id: '3',
    title: 'Software License - CloudTools',
    contract_number: 'CON-2024-003',
    contract_type: 'license_agreement' as ContractType,
    status: 'active' as ContractStatus,
    vendor_name: 'CloudTools Inc',
    client_name: 'Symbio',
    project_name: null,
    end_date: '2024-12-31',
    current_value: 24000,
    currency: 'USD',
  },
  {
    id: '4',
    title: 'Consulting Agreement - DataExperts',
    contract_number: 'CON-2024-004',
    contract_type: 'service_agreement' as ContractType,
    status: 'draft' as ContractStatus,
    vendor_name: 'DataExperts LLC',
    client_name: 'Symbio',
    project_name: 'Analytics Platform',
    end_date: '2025-06-30',
    current_value: 85000,
    currency: 'EUR',
  },
  {
    id: '5',
    title: 'Office Lease Agreement',
    contract_number: 'CON-2023-015',
    contract_type: 'lease' as ContractType,
    status: 'active' as ContractStatus,
    vendor_name: 'Münster Properties GmbH',
    client_name: 'Symbio',
    project_name: null,
    end_date: '2028-12-31',
    current_value: 180000,
    currency: 'EUR',
  },
];

const contractTypeLabels: Record<ContractType, string> = {
  service_agreement: 'Service Agreement',
  license_agreement: 'License Agreement',
  nda: 'NDA',
  sow: 'Statement of Work',
  msa: 'Project Contract',
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

function ContractsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const initialQuery = searchParams.get('q') || '';

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch contracts from Supabase with parent contract info for subcontractors
  useEffect(() => {
    if (!user) return;

    const fetchContracts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          parent_contract:parent_contract_id (
            id,
            contract_number,
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        toast.error('Failed to load contracts');
      } else {
        setContracts(data || []);
      }
      setLoading(false);
    };

    fetchContracts();
  }, [user]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          contract.title.toLowerCase().includes(query) ||
          contract.vendor_name?.toLowerCase().includes(query) ||
          contract.client_name?.toLowerCase().includes(query) ||
          contract.project_name?.toLowerCase().includes(query) ||
          contract.contract_number?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && contract.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && contract.contract_type !== typeFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'main-projects') {
          // Project Contracts without parent contract
          if (contract.contract_type !== 'msa' || contract.parent_contract_id !== null) {
            return false;
          }
        } else if (categoryFilter === 'subcontractors') {
          // Contracts with parent contract
          if (contract.parent_contract_id === null) {
            return false;
          }
        } else if (categoryFilter === 'legal') {
          // NDAs
          if (contract.contract_type !== 'nda') {
            return false;
          }
        }
      }

      return true;
    });
  }, [contracts, searchQuery, statusFilter, typeFilter, categoryFilter]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    return {
      all: contracts.length,
      mainProjects: contracts.filter(
        (c) => c.contract_type === 'msa' && c.parent_contract_id === null
      ).length,
      subcontractors: contracts.filter(
        (c) => c.parent_contract_id !== null
      ).length,
      legal: contracts.filter((c) => c.contract_type === 'nda').length,
    };
  }, [contracts]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-500">
            Manage and search all contracts
          </p>
        </div>
        <Link href="/contracts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All Contracts
            <span className="ml-2 text-xs text-gray-500">({categoryCounts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="main-projects">
            Project Contracts
            <span className="ml-2 text-xs text-gray-500">({categoryCounts.mainProjects})</span>
          </TabsTrigger>
          <TabsTrigger value="subcontractors">
            Subcontractors
            <span className="ml-2 text-xs text-gray-500">({categoryCounts.subcontractors})</span>
          </TabsTrigger>
          <TabsTrigger value="legal">
            Legal (NDAs)
            <span className="ml-2 text-xs text-gray-500">({categoryCounts.legal})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={categoryFilter} className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by vendor, client, project, contract number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="renewed">Renewed</SelectItem>
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Contract Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="msa">Project Contract</SelectItem>
                <SelectItem value="service_agreement">Service Agreement</SelectItem>
                <SelectItem value="license_agreement">License Agreement</SelectItem>
                <SelectItem value="nda">NDA</SelectItem>
                <SelectItem value="sow">Statement of Work</SelectItem>
                <SelectItem value="lease">Lease</SelectItem>
                <SelectItem value="sponsorship">Sponsorship</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing {filteredContracts.length} of {contracts.length} contracts
      </div>

      {/* Contracts table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Counterparty</TableHead>
                {/* Conditional column: Type or Parent Project */}
                {categoryFilter === 'subcontractors' ? (
                  <TableHead>Parent Project</TableHead>
                ) : (
                  <TableHead>Type</TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                {/* Hide Value column for legal/NDAs */}
                {categoryFilter !== 'legal' && (
                  <TableHead className="text-right">Value</TableHead>
                )}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => {
                const contractWithRelations = contract as any; // Type assertion to access parent_contract
                const parentContract = contractWithRelations.parent_contract;

                return (
                <TableRow key={contract.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <Link href={`/contracts/${contract.id}`} className="block">
                      <div className="font-medium text-gray-900">
                        {contract.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contract.contract_number}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{contract.symbio_entity || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {contract.intercompany
                        ? (contract.vendor_name !== contract.symbio_entity ? contract.vendor_name : contract.client_name)
                        : (contract.vendor_name || contract.client_name || 'N/A')
                      }
                    </div>
                    {contract.intercompany && (
                      <div className="text-xs text-blue-600">Intercompany</div>
                    )}
                  </TableCell>
                  {/* Conditional cell: Type or Parent Project */}
                  {categoryFilter === 'subcontractors' ? (
                    <TableCell>
                      {parentContract ? (
                        <Link
                          href={`/contracts/${parentContract.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <div className="font-medium">
                            {parentContract.contract_number}
                          </div>
                          <div className="text-xs text-gray-600 truncate max-w-[200px]">
                            {parentContract.title}
                          </div>
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">No parent</span>
                      )}
                    </TableCell>
                  ) : (
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {contractTypeLabels[contract.contract_type]}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge className={statusColors[contract.status]}>
                      {contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {contract.end_date}
                    </span>
                  </TableCell>
                  {/* Hide Value column for legal/NDAs */}
                  {categoryFilter !== 'legal' && (
                    <TableCell className="text-right">
                      <span className="font-medium">
                        {formatCurrency(contract.current_value || 0, contract.currency)}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <Link href={`/contracts/${contract.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
              })}
              {filteredContracts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={categoryFilter === 'legal' ? 7 : 8}
                    className="text-center py-8"
                  >
                    <p className="text-gray-500">No contracts found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search or filters
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading contracts...</div>}>
      <ContractsContent />
    </Suspense>
  );
}
