'use client';

import { InvoiceAudit, InvoiceAuditResult } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

function formatCurrency(value: number | null, currency: string = 'EUR') {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const statusConfig = {
  match: {
    label: 'All Match',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  discrepancies_found: {
    label: 'Discrepancies Found',
    color: 'bg-orange-100 text-orange-800',
    icon: AlertTriangle,
  },
  major_discrepancies: {
    label: 'Major Discrepancies',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
  },
};

const lineItemStatusColors: Record<string, string> = {
  match: 'bg-green-50',
  price_mismatch: 'bg-red-50',
  not_in_contract: 'bg-orange-50',
  missing_from_invoice: 'bg-blue-50',
};

const lineItemStatusLabels: Record<string, string> = {
  match: 'Match',
  price_mismatch: 'Price Mismatch',
  not_in_contract: 'Not in Contract',
  missing_from_invoice: 'Missing from Invoice',
};

const severityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-orange-100 text-orange-800',
  low: 'bg-yellow-100 text-yellow-800',
};

interface AuditResultDetailProps {
  audit: InvoiceAudit;
}

export default function AuditResultDetail({ audit }: AuditResultDetailProps) {
  const result = audit.audit_result as InvoiceAuditResult | null;

  if (!result) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No audit results available.
        </CardContent>
      </Card>
    );
  }

  const overallStatus = statusConfig[result.summary.overall_status] || statusConfig.discrepancies_found;
  const StatusIcon = overallStatus.icon;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Summary</span>
            <Badge className={overallStatus.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {overallStatus.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Invoice Number</p>
              <p className="font-medium">{result.summary.invoice_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Invoice Date</p>
              <p className="font-medium">{result.summary.invoice_date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Invoice Period</p>
              <p className="font-medium">{result.summary.invoice_period || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Confidence</p>
              <p className="font-medium">{Math.round(result.summary.confidence_score * 100)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">Total Invoiced</p>
              <p className="text-lg font-bold">
                {formatCurrency(result.summary.total_invoiced, result.summary.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expected (Contract)</p>
              <p className="text-lg font-bold">
                {formatCurrency(result.summary.total_contracted, result.summary.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Difference</p>
              <p className={`text-lg font-bold ${result.summary.total_difference > 0 ? 'text-red-600' : result.summary.total_difference < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {result.summary.total_difference > 0 ? '+' : ''}
                {formatCurrency(result.summary.total_difference, result.summary.currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items ({result.line_items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Invoice Price</TableHead>
                <TableHead className="text-right">Invoice Total</TableHead>
                <TableHead className="text-right">Contract Price</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.line_items.map((item, index) => (
                <TableRow key={index} className={lineItemStatusColors[item.status] || ''}>
                  <TableCell>
                    <div className="font-medium">{item.description}</div>
                    {item.notes && (
                      <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.invoice_quantity ?? '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.invoice_unit_price, result.summary.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.invoice_total, result.summary.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.contract_unit_price, result.summary.currency)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${(item.difference || 0) > 0 ? 'text-red-600' : (item.difference || 0) < 0 ? 'text-green-600' : ''}`}>
                    {item.difference !== null
                      ? `${item.difference > 0 ? '+' : ''}${formatCurrency(item.difference, result.summary.currency)}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${item.status === 'match' ? 'border-green-300 text-green-700' : item.status === 'price_mismatch' ? 'border-red-300 text-red-700' : item.status === 'not_in_contract' ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}`}>
                      {lineItemStatusLabels[item.status] || item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discrepancies */}
      {result.discrepancies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">
              Discrepancies ({result.discrepancies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.discrepancies.map((disc, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={severityColors[disc.severity]}>
                      {disc.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium text-gray-500 capitalize">
                      {disc.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {disc.line_item_reference && (
                    <span className="text-xs text-gray-400">
                      Ref: {disc.line_item_reference}
                    </span>
                  )}
                </div>
                <p className="text-sm">{disc.description}</p>
                {(disc.invoice_value !== null || disc.contract_value !== null) && (
                  <div className="flex gap-4 text-sm">
                    {disc.invoice_value !== null && (
                      <span>
                        Invoice: <strong>{formatCurrency(disc.invoice_value, result.summary.currency)}</strong>
                      </span>
                    )}
                    {disc.contract_value !== null && (
                      <span>
                        Contract: <strong>{formatCurrency(disc.contract_value, result.summary.currency)}</strong>
                      </span>
                    )}
                    {disc.difference !== null && (
                      <span className="text-red-600">
                        Diff: <strong>{formatCurrency(disc.difference, result.summary.currency)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Extracted Contract Terms */}
      {result.extracted_contract_terms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Extracted Contract Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Visit Fees */}
              {result.extracted_contract_terms.visit_fees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Visit Fees</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {result.extracted_contract_terms.visit_fees.map((vf, i) => (
                      <div key={i} className="bg-gray-50 rounded px-3 py-2 text-sm">
                        <span className="text-gray-600">{vf.visit_name}:</span>{' '}
                        <span className="font-medium">
                          {formatCurrency(vf.fee, result.extracted_contract_terms.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Fees */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {result.extracted_contract_terms.startup_fee !== null && (
                  <div>
                    <p className="text-xs text-gray-500">Startup Fee</p>
                    <p className="font-medium">
                      {formatCurrency(result.extracted_contract_terms.startup_fee, result.extracted_contract_terms.currency)}
                    </p>
                  </div>
                )}
                {result.extracted_contract_terms.closeout_fee !== null && (
                  <div>
                    <p className="text-xs text-gray-500">Closeout Fee</p>
                    <p className="font-medium">
                      {formatCurrency(result.extracted_contract_terms.closeout_fee, result.extracted_contract_terms.currency)}
                    </p>
                  </div>
                )}
                {result.extracted_contract_terms.screen_failure_fee !== null && (
                  <div>
                    <p className="text-xs text-gray-500">Screen Failure Fee</p>
                    <p className="font-medium">
                      {formatCurrency(result.extracted_contract_terms.screen_failure_fee, result.extracted_contract_terms.currency)}
                    </p>
                  </div>
                )}
                {result.extracted_contract_terms.patient_compensation !== null && (
                  <div>
                    <p className="text-xs text-gray-500">Patient Compensation</p>
                    <p className="font-medium">
                      {formatCurrency(result.extracted_contract_terms.patient_compensation, result.extracted_contract_terms.currency)}
                    </p>
                  </div>
                )}
              </div>

              {result.extracted_contract_terms.other_fees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Other Fees</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {result.extracted_contract_terms.other_fees.map((of, i) => (
                      <div key={i} className="bg-gray-50 rounded px-3 py-2 text-sm">
                        <span className="text-gray-600">{of.description}:</span>{' '}
                        <span className="font-medium">
                          {formatCurrency(of.fee, result.extracted_contract_terms.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
