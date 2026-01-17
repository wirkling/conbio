import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  AlertCircle,
  TrendingUp,
  Clock,
  Link2,
} from 'lucide-react';

// Mock data - will be replaced with Supabase queries
const stats = {
  total: 47,
  active: 32,
  expiringSoon: 5,
  totalValue: 1250000,
};

const recentContracts = [
  {
    id: '1',
    title: 'Master Service Agreement - Acme Corp',
    vendor_name: 'Acme Corporation',
    status: 'active',
    end_date: '2025-01-31',
    current_value: 195000,
  },
  {
    id: '2',
    title: 'NDA - TechStart GmbH',
    vendor_name: 'TechStart GmbH',
    status: 'active',
    end_date: '2026-02-28',
    current_value: 0,
  },
  {
    id: '3',
    title: 'Software License - CloudTools',
    vendor_name: 'CloudTools Inc',
    status: 'active',
    end_date: '2024-12-31',
    current_value: 24000,
  },
];

const upcomingDeadlines = [
  {
    id: '3',
    title: 'Software License - CloudTools',
    type: 'Expiration',
    date: '2024-12-31',
    daysLeft: 14,
  },
  {
    id: '1',
    title: 'Master Service Agreement - Acme Corp',
    type: 'Cancellation Deadline',
    date: '2024-11-02',
    daysLeft: 45,
  },
];

const hubspotDeals = [
  {
    id: 'h1',
    name: 'Enterprise Deal - MegaCorp',
    stage: 'Contract Needed',
    amount: 250000,
  },
  {
    id: 'h2',
    name: 'Platform License - StartupXYZ',
    stage: 'Contract Needed',
    amount: 45000,
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'terminated':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            Overview of your contract portfolio
          </p>
        </div>
        <Link href="/contracts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Contracts
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-gray-500">
              Active contracts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Expiring Soon
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.expiringSoon}
            </div>
            <p className="text-xs text-gray-500">
              Within 90 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Needs Attention
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">2</div>
            <p className="text-xs text-gray-500">
              Action required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent contracts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Contracts</CardTitle>
            <CardDescription>
              Latest contracts added to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentContracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/contracts/${contract.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {contract.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {contract.vendor_name}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <Badge className={getStatusColor(contract.status)}>
                      {contract.status}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(contract.current_value)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/contracts">
                <Button variant="outline" className="w-full">
                  View all contracts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>
              Contracts requiring attention soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <Link
                  key={deadline.id}
                  href={`/contracts/${deadline.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {deadline.title}
                    </p>
                    <p className="text-sm text-gray-500">{deadline.type}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {deadline.date}
                    </p>
                    <p
                      className={`text-xs ${
                        deadline.daysLeft <= 30
                          ? 'text-red-600 font-medium'
                          : 'text-gray-500'
                      }`}
                    >
                      {deadline.daysLeft} days left
                    </p>
                  </div>
                </Link>
              ))}
              {upcomingDeadlines.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No upcoming deadlines
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* HubSpot Integration (Placeholder) */}
        <Card className="lg:col-span-2 border-dashed border-2 border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-yellow-600" />
                <CardTitle>HubSpot Deals</CardTitle>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Coming Soon
                </Badge>
              </div>
              <Link href="/settings/hubspot">
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </Link>
            </div>
            <CardDescription>
              Deals from HubSpot that require contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {hubspotDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-white opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {deal.name}
                    </p>
                    <p className="text-sm text-gray-500">{deal.stage}</p>
                  </div>
                  <div className="ml-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(deal.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-lg bg-yellow-100/50 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Connect HubSpot</strong> to automatically see deals that need contracts.
                Go to Settings → HubSpot to add your API key.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
