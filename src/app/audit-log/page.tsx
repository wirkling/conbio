'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowLeft, Search, Filter, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  old_values: any;
  new_values: any;
  user_id: string | null;
  timestamp: string;
}

const tableLabels: Record<string, string> = {
  contracts: 'Contracts',
  milestones: 'Milestones',
  change_orders: 'Change Orders',
  passthrough_costs: 'Pass-through Costs',
  inflation_rates: 'Inflation Rates',
  milestone_changes: 'Milestone Changes',
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
};

export default function AuditLogPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch audit logs
  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1000);

        if (error) {
          console.error('Error fetching audit logs:', error);
          toast.error('Failed to load audit logs');
        } else {
          setLogs(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  const filteredLogs = logs.filter((log) => {
    // Table filter
    if (tableFilter !== 'all' && log.table_name !== tableFilter) {
      return false;
    }

    // Action filter
    if (actionFilter !== 'all' && log.action !== actionFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.table_name.toLowerCase().includes(query) ||
        log.record_id.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const exportLogs = () => {
    const csv = [
      'Timestamp,Table,Record ID,Action,User ID',
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.table_name,
          log.record_id,
          log.action,
          log.user_id || 'system',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Audit log exported');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-gray-500">Track all changes and activities</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportLogs}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

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
                placeholder="Search by table, record ID, or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Table filter */}
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {Object.entries(tableLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Action filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing {filteredLogs.length} of {logs.length} entries
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-20">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {tableLabels[log.table_name] || log.table_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={actionColors[log.action]}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {log.record_id.substring(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {log.user_id ? log.user_id.substring(0, 8) : 'system'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLog(log)}
                      title="View details"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-gray-500">No audit log entries found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your filters
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <Card
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Audit Log Details</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedLog(null)}
                >
                  ×
                </Button>
              </CardTitle>
              <CardDescription>
                {formatTimestamp(selectedLog.timestamp)} •{' '}
                {tableLabels[selectedLog.table_name] || selectedLog.table_name} •{' '}
                <Badge className={actionColors[selectedLog.action]}>
                  {selectedLog.action}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Record ID</Label>
                <code className="block mt-1 text-xs bg-gray-100 p-2 rounded">
                  {selectedLog.record_id}
                </code>
              </div>

              {selectedLog.old_values && (
                <div>
                  <Label className="text-sm font-medium">Previous Values</Label>
                  <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <Label className="text-sm font-medium">New Values</Label>
                  <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">User ID</Label>
                <code className="block mt-1 text-xs bg-gray-100 p-2 rounded">
                  {selectedLog.user_id || 'system'}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
