'use client';

import { useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import type { InflationRate } from '@/types/database';

// Initialize with some default data
const defaultInflationRates: InflationRate[] = [
  {
    id: '1',
    rate_type: 'German Consumer Price Index (CPI)',
    year: 2024,
    rate_percentage: 2.8,
    effective_from: '2024-01-01',
    effective_until: '2024-12-31',
    source_url: 'https://www.destatis.de',
    notes: 'German Federal Statistical Office',
    created_at: new Date().toISOString(),
    created_by: null,
  },
  {
    id: '2',
    rate_type: 'German Consumer Price Index (CPI)',
    year: 2025,
    rate_percentage: 3.2,
    effective_from: '2025-01-01',
    effective_until: '2025-12-31',
    source_url: 'https://www.destatis.de',
    notes: 'German Federal Statistical Office',
    created_at: new Date().toISOString(),
    created_by: null,
  },
  {
    id: '3',
    rate_type: 'German Consumer Price Index (CPI)',
    year: 2026,
    rate_percentage: 2.5,
    effective_from: '2026-01-01',
    effective_until: '2026-12-31',
    source_url: 'https://www.destatis.de',
    notes: 'Projected',
    created_at: new Date().toISOString(),
    created_by: null,
  },
  {
    id: '4',
    rate_type: 'US Consumer Price Index (CPI)',
    year: 2024,
    rate_percentage: 3.4,
    effective_from: '2024-01-01',
    effective_until: '2024-12-31',
    source_url: 'https://www.bls.gov/cpi/',
    notes: 'US Bureau of Labor Statistics',
    created_at: new Date().toISOString(),
    created_by: null,
  },
  {
    id: '5',
    rate_type: 'US Consumer Price Index (CPI)',
    year: 2025,
    rate_percentage: 2.9,
    effective_from: '2025-01-01',
    effective_until: '2025-12-31',
    source_url: 'https://www.bls.gov/cpi/',
    notes: 'US Bureau of Labor Statistics',
    created_at: new Date().toISOString(),
    created_by: null,
  },
];

export default function InflationRatesPage() {
  const router = useRouter();
  const [rates, setRates] = useState<InflationRate[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<InflationRate | null>(null);
  const [formData, setFormData] = useState({
    rate_type: '',
    year: new Date().getFullYear(),
    rate_percentage: 0,
    source_url: '',
    notes: '',
  });

  // Load rates from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('inflation_rates');
    if (stored) {
      setRates(JSON.parse(stored));
    } else {
      // Initialize with defaults
      setRates(defaultInflationRates);
      localStorage.setItem('inflation_rates', JSON.stringify(defaultInflationRates));
    }
  }, []);

  // Save rates to localStorage whenever they change
  const saveRates = (newRates: InflationRate[]) => {
    setRates(newRates);
    localStorage.setItem('inflation_rates', JSON.stringify(newRates));
  };

  const handleAdd = () => {
    if (!formData.rate_type || !formData.year || formData.rate_percentage === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newRate: InflationRate = {
      id: Date.now().toString(),
      rate_type: formData.rate_type,
      year: formData.year,
      rate_percentage: formData.rate_percentage,
      effective_from: `${formData.year}-01-01`,
      effective_until: `${formData.year}-12-31`,
      source_url: formData.source_url || null,
      notes: formData.notes || null,
      created_at: new Date().toISOString(),
      created_by: null,
    };

    saveRates([...rates, newRate]);
    toast.success('Inflation rate added');
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = (rate: InflationRate) => {
    setEditingRate(rate);
    setFormData({
      rate_type: rate.rate_type,
      year: rate.year,
      rate_percentage: rate.rate_percentage,
      source_url: rate.source_url || '',
      notes: rate.notes || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingRate) return;

    const updatedRates = rates.map((r) =>
      r.id === editingRate.id
        ? {
            ...r,
            rate_type: formData.rate_type,
            year: formData.year,
            rate_percentage: formData.rate_percentage,
            effective_from: `${formData.year}-01-01`,
            effective_until: `${formData.year}-12-31`,
            source_url: formData.source_url || null,
            notes: formData.notes || null,
          }
        : r
    );

    saveRates(updatedRates);
    toast.success('Inflation rate updated');
    setIsAddDialogOpen(false);
    setEditingRate(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this inflation rate?')) {
      saveRates(rates.filter((r) => r.id !== id));
      toast.success('Inflation rate deleted');
    }
  };

  const resetForm = () => {
    setFormData({
      rate_type: '',
      year: new Date().getFullYear(),
      rate_percentage: 0,
      source_url: '',
      notes: '',
    });
    setEditingRate(null);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingRate(null);
    resetForm();
  };

  // Group rates by rate_type
  const groupedRates = rates.reduce((acc, rate) => {
    if (!acc[rate.rate_type]) {
      acc[rate.rate_type] = [];
    }
    acc[rate.rate_type].push(rate);
    return acc;
  }, {} as Record<string, InflationRate[]>);

  // Sort rates within each group by year descending
  Object.keys(groupedRates).forEach((key) => {
    groupedRates[key].sort((a, b) => b.year - a.year);
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inflation Rates</h1>
            <p className="text-gray-500">Manage inflation rate sources and historical data</p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rate
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">About Inflation Rates</p>
              <p>
                Configure inflation rate sources (e.g., German CPI, US CPI, HVPI) and their
                historical rates. These rates are used when applying inflation adjustments to
                contract milestones. You can override rates when applying inflation if needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates by Source */}
      {Object.keys(groupedRates).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No inflation rates configured</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Rate
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.keys(groupedRates)
          .sort()
          .map((rateType) => (
            <Card key={rateType}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {rateType}
                </CardTitle>
                <CardDescription>
                  {groupedRates[rateType].length} rate(s) configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRates[rateType].map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.year}</TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {rate.rate_percentage}%
                        </TableCell>
                        <TableCell>
                          {rate.source_url ? (
                            <a
                              href={rate.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Source
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {rate.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(rate)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(rate.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit' : 'Add'} Inflation Rate</DialogTitle>
            <DialogDescription>
              Configure inflation rate data for use in contract adjustments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rate_type">Rate Type / Source *</Label>
              <Input
                id="rate_type"
                value={formData.rate_type}
                onChange={(e) => setFormData({ ...formData, rate_type: e.target.value })}
                placeholder="e.g., German Consumer Price Index (CPI), US CPI, HVPI"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  min="2000"
                  max="2100"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rate_percentage">Rate (%) *</Label>
                <Input
                  id="rate_percentage"
                  type="number"
                  step="0.1"
                  value={formData.rate_percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_percentage: parseFloat(e.target.value) })
                  }
                  placeholder="e.g., 3.2"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="source_url">Source URL</Label>
              <Input
                id="source_url"
                type="url"
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this rate"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={editingRate ? handleUpdate : handleAdd}>
              {editingRate ? 'Update' : 'Add'} Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
