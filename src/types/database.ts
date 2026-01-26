// Database types for Symbio Contract Management System

export type ContractType =
  | 'service_agreement'
  | 'license_agreement'
  | 'nda'
  | 'sow'
  | 'msa'
  | 'purchase_order'
  | 'lease'
  | 'sponsorship'
  | 'partnership'
  | 'other';

export type ContractStatus =
  | 'draft'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'renewed';

export type Department = 'legal' | 'finance' | 'operations' | 'other';

export type UserRole = 'admin' | 'editor' | 'viewer';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

export type RetentionPeriodUnit = 'days' | 'months' | 'years';

export interface InflationClause {
  rate_type?: string;           // e.g., "CPI", "HVPI", "Custom Index"
  calculation_method?: string;  // e.g., "Annual adjustment", "Quarterly review"
  application_timing?: string;  // e.g., "On contract anniversary", "Monthly"
  notes?: string;              // Additional flexible text
}

// Inflation rate tracking
export interface InflationRate {
  id: string;
  rate_type: string;
  year: number;
  rate_percentage: number;
  effective_from: string;
  effective_until: string | null;
  source_url: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

// Bonus/Malus structured types
export interface StandardBonusMalus {
  type: 'standard';
  early_bonus_percent: number;        // e.g., 5
  early_threshold_weeks: number;      // e.g., 2 (bonus if 2+ weeks early)
  late_penalty_percent: number;       // e.g., 10
  penalty_per_period: 'month' | 'week' | 'day';  // "10% per month"
  max_penalty_percent: number;        // e.g., 20
}

export interface CustomBonusMalus {
  type: 'custom';
  terms: string;  // Free-form text
}

export type BonusMalusTerms = StandardBonusMalus | CustomBonusMalus;

export interface Contract {
  id: string;
  title: string;
  contract_number: string | null;
  contract_type: ContractType;
  status: ContractStatus;
  description: string | null;

  // Parties
  vendor_name: string | null;
  client_name: string | null;
  project_name: string | null;
  sponsor_name: string | null;

  // Dates
  signature_date: string | null;
  start_date: string | null;
  end_date: string | null;
  notice_period_days: number | null;
  cancellation_deadline: string | null;
  auto_renew: boolean;

  // Commercials
  original_value: number | null;
  currency: Currency;
  current_value: number | null;
  payment_terms: string | null;

  // Ownership
  owner_id: string | null;
  department: Department | null;
  sharepoint_url: string | null;
  notes: string | null;

  // Legal Requirements
  bonus_malus_terms: BonusMalusTerms | null;
  inflation_clause: InflationClause | null;
  liability_terms: string | null;
  retention_period_value: number | null;
  retention_period_unit: RetentionPeriodUnit | null;

  // Relationships
  parent_contract_id: string | null;
  relationship_type: 'amendment' | 'renewal' | 'sub_contract' | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ChangeOrder {
  id: string;
  contract_id: string;
  change_order_number: string | null;
  title: string;
  description: string | null;
  effective_date: string | null;
  value_change: number | null;
  scope_change_summary: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Document {
  id: string;
  contract_id: string;
  change_order_id: string | null;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  version: number;
  is_primary: boolean;
  uploaded_at: string;
  uploaded_by: string | null;
  ai_summary: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  department: Department | null;
  role: UserRole;
  azure_ad_id: string | null;
  created_at: string;
  last_login: string | null;
}

// Extended types with relations
export interface ContractWithRelations extends Contract {
  change_orders?: ChangeOrder[];
  documents?: Document[];
  owner?: User | null;
  parent_contract?: Contract | null;
}

// Form types
export interface ContractFormData {
  title: string;
  contract_number?: string;
  contract_type: ContractType;
  status: ContractStatus;
  description?: string;
  vendor_name?: string;
  client_name?: string;
  project_name?: string;
  sponsor_name?: string;
  signature_date?: string;
  start_date?: string;
  end_date?: string;
  notice_period_days?: number;
  auto_renew?: boolean;
  original_value?: number;
  currency?: Currency;
  payment_terms?: string;
  department?: Department;
  sharepoint_url?: string;
  notes?: string;
  parent_contract_id?: string;
  relationship_type?: 'amendment' | 'renewal' | 'sub_contract';
  bonus_malus_terms?: BonusMalusTerms;
  inflation_clause?: InflationClause;
  liability_terms?: string;
  retention_period_value?: number;
  retention_period_unit?: RetentionPeriodUnit;
}

export interface ChangeOrderFormData {
  title: string;
  change_order_number?: string;
  description?: string;
  effective_date?: string;
  value_change?: number;
  scope_change_summary?: string;
}

// Search and filter types
export interface ContractFilters {
  status?: ContractStatus[];
  contract_type?: ContractType[];
  department?: Department[];
  date_from?: string;
  date_to?: string;
  min_value?: number;
  max_value?: number;
}

export interface SearchParams {
  query?: string;
  filters?: ContractFilters;
  page?: number;
  limit?: number;
  sort_by?: keyof Contract;
  sort_order?: 'asc' | 'desc';
}

// ============================================
// MILESTONES
// ============================================

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'cancelled';

export interface InflationAdjustment {
  year: number;
  rate: number;
  amount: number;
  applied_date: string;
  applied_by: string | null;
}

export interface Milestone {
  id: string;
  contract_id: string;
  name: string;
  description: string | null;
  milestone_number: number | null;

  // Original values (as defined in contract)
  original_due_date: string | null;
  original_value: number | null;

  // Current values (after change orders)
  current_due_date: string | null;
  current_value: number | null;

  // Status
  status: MilestoneStatus;
  completed_date: string | null;

  // Payment tracking
  invoiced: boolean;
  invoiced_date: string | null;
  paid: boolean;
  paid_date: string | null;

  // Inflation adjustment tracking (array for multiple years)
  inflation_adjustments: InflationAdjustment[];
  inflation_superseded_by_co: boolean;

  // Bonus/Malus adjustment tracking
  adjustment_type: 'bonus' | 'penalty' | null;
  adjustment_amount: number | null;
  adjustment_percentage: number | null;
  adjustment_reason: string | null;
  adjustment_calculated_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface MilestoneChange {
  id: string;
  milestone_id: string;
  change_order_id: string;
  previous_due_date: string | null;
  new_due_date: string | null;
  previous_value: number | null;
  new_value: number | null;
  change_reason: string | null;
  created_at: string;
}

// ============================================
// PASS-THROUGH COSTS
// ============================================

export type PassthroughType = 'total' | 'quarterly' | 'monthly' | 'per_unit';

export type CostCategory =
  | 'investigator_fees'
  | 'lab_costs'
  | 'imaging'
  | 'travel'
  | 'equipment'
  | 'regulatory'
  | 'other';

export interface PassthroughCost {
  id: string;
  contract_id: string;

  category: CostCategory;
  description: string | null;
  passthrough_type: PassthroughType;

  // Budgeted
  budgeted_total: number | null;
  budgeted_per_period: number | null;
  budgeted_per_unit: number | null;
  estimated_units: number | null;
  currency: Currency;

  // Actuals
  actual_spent: number;

  // Period
  period_start: string | null;
  period_end: string | null;

  // Vendor link
  vendor_contract_id: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PassthroughActual {
  id: string;
  passthrough_cost_id: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  period_year: number | null;
  period_quarter: number | null;
  period_month: number | null;
  invoice_number: string | null;
  created_at: string;
}

// ============================================
// VENDOR REVENUE SHARE
// ============================================

export type RevenueShareType = 'percentage' | 'fixed' | 'per_unit' | 'tiered';

export interface VendorRevenueShare {
  id: string;
  vendor_contract_id: string;
  client_contract_id: string;

  share_type: RevenueShareType;
  percentage: number | null;
  fixed_amount: number | null;
  per_unit_amount: number | null;
  currency: Currency;

  description: string | null;
  applies_to: string | null;

  total_shared: number;

  effective_from: string | null;
  effective_until: string | null;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// Extended contract with all relations
export interface ContractWithAllRelations extends Contract {
  change_orders?: ChangeOrder[];
  documents?: Document[];
  milestones?: Milestone[];
  passthrough_costs?: PassthroughCost[];
  vendor_revenue_shares?: VendorRevenueShare[];
  linked_vendor_contracts?: Contract[];
  linked_client_contracts?: Contract[];
  owner?: User | null;
  parent_contract?: Contract | null;
}

// ============================================
// HubSpot types (placeholder for future integration)
// ============================================

export interface HubSpotDeal {
  id: string;
  name: string;
  stage: string;
  amount: number | null;
  company_name: string | null;
  close_date: string | null;
  owner_name: string | null;
  created_at: string;
}

export interface HubSpotConfig {
  api_key: string | null;
  portal_id: string | null;
  pipeline_id: string | null;
  contract_stage_id: string | null;
  is_connected: boolean;
}

// ============================================
// AUDIT LOG
// ============================================

export type AuditAction = 'create' | 'update' | 'delete' | 'complete' | 'approve' | 'reject';

export interface AuditLog {
  id: string;

  // What was changed
  entity_type: string;  // 'contract', 'milestone', 'change_order', etc.
  entity_id: string;
  action: AuditAction;

  // Change details
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  change_summary: string | null;

  // Context
  user_id: string | null;
  user_name: string | null;
  ip_address: string | null;
  user_agent: string | null;

  // Metadata
  created_at: string;
  metadata: Record<string, any> | null;
}
