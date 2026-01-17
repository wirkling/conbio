'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function NewContractPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success('Contract created successfully');
    router.push('/contracts');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Contract</h1>
          <p className="text-gray-500">Create a new contract record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the contract title and classification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="title">Contract Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Master Service Agreement - Acme Corp"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contract_number">Contract Number</Label>
                <Input id="contract_number" placeholder="e.g., CON-2024-001" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contract_type">Contract Type *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="msa">Master Service Agreement</SelectItem>
                    <SelectItem value="service_agreement">Service Agreement</SelectItem>
                    <SelectItem value="license_agreement">License Agreement</SelectItem>
                    <SelectItem value="nda">NDA</SelectItem>
                    <SelectItem value="sow">Statement of Work</SelectItem>
                    <SelectItem value="purchase_order">Purchase Order</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="sponsorship">Sponsorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="draft">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the contract..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle>Parties</CardTitle>
            <CardDescription>
              Identify the parties involved in this contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input id="vendor_name" placeholder="e.g., Acme Corporation" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input id="client_name" placeholder="e.g., Symbio" defaultValue="Symbio" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project_name">Project Name</Label>
                <Input id="project_name" placeholder="e.g., Platform Development" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sponsor_name">Sponsor Name</Label>
                <Input id="sponsor_name" placeholder="e.g., Research Foundation" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Key Dates</CardTitle>
            <CardDescription>
              Contract timeline and deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="signature_date">Signature Date</Label>
                <Input id="signature_date" type="date" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" type="date" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notice_period">Notice Period (days)</Label>
                <Input
                  id="notice_period"
                  type="number"
                  placeholder="e.g., 90"
                  min="0"
                  max="365"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="auto_renew" className="rounded" />
              <Label htmlFor="auto_renew">Auto-renew contract</Label>
            </div>

            <p className="text-sm text-gray-500">
              Cancellation deadline will be automatically calculated based on end date and notice period.
            </p>
          </CardContent>
        </Card>

        {/* Commercials */}
        <Card>
          <CardHeader>
            <CardTitle>Commercials</CardTitle>
            <CardDescription>
              Contract value and payment terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="original_value">Contract Value</Label>
                <Input
                  id="original_value"
                  type="number"
                  placeholder="e.g., 50000"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select defaultValue="EUR">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input id="payment_terms" placeholder="e.g., Net 30" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>
              Links to external resources and notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sharepoint_url">SharePoint URL</Label>
              <Input
                id="sharepoint_url"
                type="url"
                placeholder="https://symbio.sharepoint.com/..."
              />
              <p className="text-xs text-gray-500">
                Link to the contract folder in SharePoint
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this contract..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
            <CardDescription>
              Attach the contract document (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOC, DOCX up to 50MB
              </p>
              <Input type="file" className="mt-4 max-w-xs mx-auto" accept=".pdf,.doc,.docx" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Contract
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
