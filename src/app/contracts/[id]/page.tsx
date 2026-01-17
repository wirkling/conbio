'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Edit,
  FileText,
  Plus,
  Upload,
  ExternalLink,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Download,
  Trash2,
} from 'lucide-react';
import { ContractStatus, ContractType } from '@/types/database';

// Mock data - will be replaced with Supabase queries
const mockContract = {
  id: '1',
  title: 'Master Service Agreement - Acme Corp',
  contract_number: 'CON-2024-001',
  contract_type: 'msa' as ContractType,
  status: 'active' as ContractStatus,
  description: 'Master service agreement for platform development services including design, development, testing, and deployment phases.',
  vendor_name: 'Acme Corporation',
  client_name: 'Symbio',
  project_name: 'Platform Development',
  sponsor_name: null,
  signature_date: '2024-01-15',
  start_date: '2024-02-01',
  end_date: '2025-01-31',
  notice_period_days: 90,
  cancellation_deadline: '2024-11-02',
  auto_renew: false,
  original_value: 150000,
  current_value: 195000,
  currency: 'EUR',
  payment_terms: 'Net 30',
  department: 'operations',
  sharepoint_url: 'https://symbio.sharepoint.com/sites/contracts/acme-msa',
  notes: 'Reviewed by Alan on 2024-01-10. Approved by Legal.',
  created_at: '2024-01-10T10:30:00Z',
  updated_at: '2024-06-15T14:22:00Z',
};

const mockChangeOrders = [
  {
    id: 'co1',
    change_order_number: 'CO-001',
    title: 'Scope Extension - Phase 2',
    description: 'Added Phase 2 deliverables including mobile app development and API integrations.',
    effective_date: '2024-06-01',
    value_change: 45000,
    created_at: '2024-05-15T09:00:00Z',
  },
];

const mockDocuments = [
  {
    id: 'doc1',
    file_name: 'MSA_Acme_Corp_Signed.pdf',
    file_type: 'application/pdf',
    file_size_bytes: 2456000,
    is_primary: true,
    uploaded_at: '2024-01-15T11:00:00Z',
  },
  {
    id: 'doc2',
    file_name: 'CO-001_Phase2_Extension.pdf',
    file_type: 'application/pdf',
    file_size_bytes: 856000,
    is_primary: false,
    uploaded_at: '2024-06-01T14:30:00Z',
  },
];

const contractTypeLabels: Record<ContractType, string> = {
  service_agreement: 'Service Agreement',
  license_agreement: 'License Agreement',
  nda: 'NDA',
  sow: 'Statement of Work',
  msa: 'Master Service Agreement',
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isAddChangeOrderOpen, setIsAddChangeOrderOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);

  const contract = mockContract; // In real app, fetch by params.id

  const totalChangeOrderValue = mockChangeOrders.reduce(
    (sum, co) => sum + (co.value_change || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {contract.title}
              </h1>
              <Badge className={statusColors[contract.status]}>
                {contract.status}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">
              {contract.contract_number} • {contractTypeLabels[contract.contract_type]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contract.sharepoint_url && (
            <Button variant="outline" asChild>
              <a href={contract.sharepoint_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                SharePoint
              </a>
            </Button>
          )}
          <Link href={`/contracts/${contract.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="change-orders">
            Change Orders ({mockChangeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({mockDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Key Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Signature Date</p>
                    <p className="font-medium">
                      {contract.signature_date ? formatDate(contract.signature_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">
                      {contract.start_date ? formatDate(contract.start_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">
                      {contract.end_date ? formatDate(contract.end_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Notice Period</p>
                    <p className="font-medium">
                      {contract.notice_period_days ? `${contract.notice_period_days} days` : '-'}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Cancellation Deadline</p>
                  <p className="font-medium text-lg text-orange-600">
                    {contract.cancellation_deadline ? formatDate(contract.cancellation_deadline) : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Auto-renew: {contract.auto_renew ? 'Yes' : 'No'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Commercials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Commercials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Original Value</p>
                    <p className="font-medium">
                      {formatCurrency(contract.original_value || 0, contract.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Change Orders</p>
                    <p className="font-medium text-green-600">
                      +{formatCurrency(totalChangeOrderValue, contract.currency)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Current Value</p>
                  <p className="font-bold text-2xl">
                    {formatCurrency(contract.current_value || 0, contract.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Terms</p>
                  <p className="font-medium">{contract.payment_terms || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Parties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Parties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Vendor</p>
                  <p className="font-medium">{contract.vendor_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{contract.client_name || '-'}</p>
                </div>
                {contract.project_name && (
                  <div>
                    <p className="text-sm text-gray-500">Project</p>
                    <p className="font-medium">{contract.project_name}</p>
                  </div>
                )}
                {contract.sponsor_name && (
                  <div>
                    <p className="text-sm text-gray-500">Sponsor</p>
                    <p className="font-medium">{contract.sponsor_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium capitalize">{contract.department || '-'}</p>
                </div>
                {contract.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-sm">{contract.description}</p>
                  </div>
                )}
                {contract.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm">{contract.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Change Orders Tab */}
        <TabsContent value="change-orders" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Change Orders</h2>
              <p className="text-sm text-gray-500">
                Track amendments and scope changes
              </p>
            </div>
            <Dialog open={isAddChangeOrderOpen} onOpenChange={setIsAddChangeOrderOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Change Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Change Order</DialogTitle>
                  <DialogDescription>
                    Record a contract amendment or scope change.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="co-title">Title</Label>
                    <Input id="co-title" placeholder="e.g., Scope Extension - Phase 2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="co-number">Change Order Number</Label>
                      <Input id="co-number" placeholder="CO-002" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="co-date">Effective Date</Label>
                      <Input id="co-date" type="date" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="co-value">Value Change (€)</Label>
                    <Input id="co-value" type="number" placeholder="e.g., 25000 or -5000" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="co-description">Description</Label>
                    <Textarea
                      id="co-description"
                      placeholder="Describe the scope change..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddChangeOrderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddChangeOrderOpen(false)}>
                    Save Change Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change Order</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-right">Value Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockChangeOrders.map((co) => (
                    <TableRow key={co.id}>
                      <TableCell>
                        <div className="font-medium">{co.title}</div>
                        <div className="text-sm text-gray-500">{co.change_order_number}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate">{co.description}</p>
                      </TableCell>
                      <TableCell>{co.effective_date}</TableCell>
                      <TableCell className="text-right">
                        <span className={co.value_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {co.value_change >= 0 ? '+' : ''}
                          {formatCurrency(co.value_change)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {mockChangeOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <p className="text-gray-500">No change orders yet</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Impact from Change Orders</span>
                <span className="text-xl font-bold text-green-600">
                  +{formatCurrency(totalChangeOrderValue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Documents</h2>
              <p className="text-sm text-gray-500">
                Contract files and attachments
              </p>
            </div>
            <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Add a document to this contract.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, DOC, DOCX up to 50MB
                    </p>
                    <Input type="file" className="mt-4" accept=".pdf,.doc,.docx" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is-primary" className="rounded" />
                    <Label htmlFor="is-primary">Set as primary document</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadDocOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsUploadDocOpen(false)}>
                    Upload
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-red-500" />
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            {doc.is_primary && (
                              <Badge variant="outline" className="text-xs">Primary</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size_bytes)}</TableCell>
                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {mockDocuments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <p className="text-gray-500">No documents uploaded</p>
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
