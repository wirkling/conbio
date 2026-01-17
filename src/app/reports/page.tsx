'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
} from 'lucide-react';

// Mock report data
const contractsByStatus = [
  { status: 'Active', count: 32, value: 1250000 },
  { status: 'Draft', count: 8, value: 320000 },
  { status: 'Expired', count: 5, value: 180000 },
  { status: 'Terminated', count: 2, value: 45000 },
];

const contractsByType = [
  { type: 'Master Service Agreement', count: 12, value: 580000 },
  { type: 'Service Agreement', count: 15, value: 420000 },
  { type: 'License Agreement', count: 8, value: 185000 },
  { type: 'NDA', count: 25, value: 0 },
  { type: 'Lease', count: 3, value: 540000 },
  { type: 'Other', count: 4, value: 70000 },
];

const expiringContracts = [
  {
    id: '1',
    title: 'Software License - CloudTools',
    vendor: 'CloudTools Inc',
    end_date: '2024-12-31',
    days_left: 14,
    value: 24000,
  },
  {
    id: '2',
    title: 'MSA - Acme Corp',
    vendor: 'Acme Corporation',
    end_date: '2025-01-31',
    days_left: 45,
    value: 195000,
  },
  {
    id: '3',
    title: 'Consulting - DataExperts',
    vendor: 'DataExperts LLC',
    end_date: '2025-02-28',
    days_left: 73,
    value: 85000,
  },
  {
    id: '4',
    title: 'SaaS License - Analytics Pro',
    vendor: 'Analytics Pro GmbH',
    end_date: '2025-03-15',
    days_left: 88,
    value: 36000,
  },
];

const contractsByDepartment = [
  { department: 'Operations', count: 22, value: 820000 },
  { department: 'Legal', count: 18, value: 125000 },
  { department: 'Finance', count: 5, value: 680000 },
  { department: 'Other', count: 2, value: 170000 },
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
  switch (status.toLowerCase()) {
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

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('90');

  const totalContracts = contractsByStatus.reduce((sum, s) => sum + s.count, 0);
  const totalValue = contractsByStatus.reduce((sum, s) => sum + s.value, 0);

  const handleExport = (reportType: string) => {
    // In real app, this would trigger CSV/Excel export
    console.log('Exporting report:', reportType);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">
            Contract analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Next 30 days</SelectItem>
              <SelectItem value="90">Next 90 days</SelectItem>
              <SelectItem value="180">Next 6 months</SelectItem>
              <SelectItem value="365">Next 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Contracts
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Expiring ({timeRange}d)
            </CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {expiringContracts.filter(c => c.days_left <= parseInt(timeRange)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg. Contract Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Math.round(totalValue / totalContracts))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contracts by Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contracts by Status</CardTitle>
              <CardDescription>Distribution of contracts by current status</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleExport('by-status')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractsByStatus.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell>
                      <Badge className={getStatusColor(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Contracts by Type */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contracts by Type</CardTitle>
              <CardDescription>Distribution of contracts by type</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleExport('by-type')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractsByType.map((row) => (
                  <TableRow key={row.type}>
                    <TableCell className="font-medium">{row.type}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expiring Contracts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Expiring Contracts</CardTitle>
              <CardDescription>
                Contracts expiring in the next {timeRange} days
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleExport('expiring')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringContracts
                  .filter(c => c.days_left <= parseInt(timeRange))
                  .map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.title}</TableCell>
                      <TableCell>{contract.vendor}</TableCell>
                      <TableCell>{contract.end_date}</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            contract.days_left <= 30
                              ? 'text-red-600'
                              : contract.days_left <= 60
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {contract.days_left} days
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(contract.value)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Contracts by Department */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contracts by Department</CardTitle>
              <CardDescription>Contract ownership across departments</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleExport('by-department')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {contractsByDepartment.map((dept) => (
                <div
                  key={dept.department}
                  className="p-4 rounded-lg border bg-gray-50"
                >
                  <p className="text-sm text-gray-500">{dept.department}</p>
                  <p className="text-2xl font-bold">{dept.count}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(dept.value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
