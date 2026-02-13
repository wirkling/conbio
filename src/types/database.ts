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
  | 'site_contract'
  | 'other';

export type ContractStatus =
  | 'draft'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'renewed';

export type Department = 'legal' | 'finance' | 'operations' | 'other';

export type UserRole = 'admin' | 'editor' | 'viewer';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'PLN';

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
  symbio_entity: string | null;
  intercompany: boolean;

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
  document_urls: string[] | null;
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

export type ChangeOrderType =
  | 'milestone_adjustment'    // Adjust existing milestone(s)
  | 'lump_sum_immediate'      // Immediate billing
  | 'lump_sum_milestone'      // New milestone with due date
  | 'passthrough_only'        // PTC budget adjustment only
  | 'combined';               // Direct + PTC changes

export interface ChangeOrder {
  id: string;
  contract_id: string;
  change_order_number: string | null;
  title: string;
  description: string | null;
  effective_date: string | null;

  // Type & Impact
  co_type: ChangeOrderType;
  value_change: number | null;           // DEPRECATED: Use direct_cost_change instead
  direct_cost_change: number | null;     // Direct revenue/cost impact
  ptc_change: number | null;             // Pass-through cost impact

  // Document
  document_url: string | null;           // PDF upload path or SharePoint link
  is_document_sharepoint: boolean;

  // Immediate Invoicing
  invoiced_immediately: boolean;
  invoiced_date: string | null;

  // Metadata
  scope_change_summary: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ChangeOrderPassthroughAdjustment {
  id: string;
  change_order_id: string;
  passthrough_cost_id: string;
  previous_budget: number;
  new_budget: number;
  adjustment_reason: string | null;
  created_at: string;
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
  symbio_entity?: string;
  intercompany?: boolean;
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
  co_type: ChangeOrderType;

  // Direct cost/revenue changes
  direct_cost_change?: number;
  milestone_adjustments?: MilestoneAdjustmentInput[];  // For milestone_adjustment type

  // Pass-through cost changes
  ptc_change?: number;
  ptc_adjustments?: PassthroughAdjustmentInput[];

  // Document
  document_file?: File;                  // For upload
  document_sharepoint_url?: string;      // Or SharePoint link

  // Lump sum specific
  invoiced_immediately?: boolean;
  new_milestone_due_date?: string;       // For lump_sum_milestone type
  new_milestone_name?: string;

  // Legacy
  value_change?: number;
  scope_change_summary?: string;
}

export interface MilestoneAdjustmentInput {
  milestone_id: string;
  new_value?: number;
  new_due_date?: string;
  adjustment_reason?: string;
}

export interface PassthroughAdjustmentInput {
  passthrough_cost_id: string;
  new_budget: number;
  adjustment_reason?: string;
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
  invoice_url: string | null;
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

// ============================================
// PTC PREPAYMENTS
// ============================================

export type PrepaymentModel = 'retainer' | 'hold_repay';
export type PrepaymentDirection = 'receive' | 'pay';
export type PrepaymentPaymentTerms =
  | 'upon_signature'
  | '30_days_after_signature'
  | '60_days_after_signature'
  | 'upon_study_start'
  | 'custom';

export interface PtcPrepayment {
  id: string;
  contract_id: string;
  prepayment_model: PrepaymentModel;
  direction: PrepaymentDirection;
  payment_terms: PrepaymentPaymentTerms;
  payment_terms_custom: string | null;
  prepayment_amount: number;
  currency: string;
  threshold_amount: number | null;
  threshold_percentage: number | null;
  reconciliation_trigger: string | null;
  reconciliation_milestone_id: string | null;
  reconciliation_date: string | null;
  reconciled: boolean;
  reconciled_date: string | null;
  reconciled_amount: number | null;
  payment_received: boolean;
  payment_received_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PtcPrepaymentTopup {
  id: string;
  prepayment_id: string;
  amount: number;
  topup_date: string;
  invoice_number: string | null;
  invoice_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PtcPrepaymentBalance {
  prepayment_id: string;
  contract_id: string;
  prepayment_model: PrepaymentModel;
  prepayment_amount: number;
  currency: string;
  threshold_amount: number | null;
  threshold_percentage: number | null;
  total_funded: number;
  total_drawn: number;
  current_balance: number;
  is_below_threshold: boolean;
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
  ptc_prepayment?: PtcPrepayment | null;
  invoice_audits?: InvoiceAudit[];
  owner?: User | null;
  parent_contract?: Contract | null;
}

// ============================================
// INVOICE AUDITS
// ============================================

export type InvoiceAuditStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface InvoiceAudit {
  id: string;
  contract_id: string;

  // Invoice file
  invoice_file_name: string;
  invoice_file_path: string;
  invoice_file_size_bytes: number | null;

  // Contract document reference
  contract_document_id: string | null;
  contract_document_path: string | null;

  // Status
  status: InvoiceAuditStatus;
  error_message: string | null;

  // Results
  audit_result: InvoiceAuditResult | null;

  // Summary
  total_discrepancies: number;
  invoice_total: number | null;
  contract_expected_total: number | null;
  currency: string;

  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface InvoiceAuditResult {
  summary: {
    overall_status: 'match' | 'discrepancies_found' | 'major_discrepancies';
    confidence_score: number;
    invoice_number: string | null;
    invoice_date: string | null;
    invoice_period: string | null;
    total_invoiced: number;
    total_contracted: number;
    total_difference: number;
    currency: string;
  };
  line_items: InvoiceAuditLineItem[];
  discrepancies: InvoiceAuditDiscrepancy[];
  recommendations: string[];
  extracted_contract_terms: ExtractedContractTerms;
}

export interface InvoiceAuditLineItem {
  description: string;
  invoice_quantity: number | null;
  invoice_unit_price: number | null;
  invoice_total: number;
  contract_unit_price: number | null;
  contract_total: number | null;
  status: 'match' | 'price_mismatch' | 'not_in_contract' | 'missing_from_invoice';
  difference: number | null;
  notes: string | null;
}

export interface InvoiceAuditDiscrepancy {
  type: 'price_mismatch' | 'quantity_mismatch' | 'unauthorized_charge' | 'missing_item' | 'calculation_error' | 'other';
  severity: 'high' | 'medium' | 'low';
  description: string;
  invoice_value: number | null;
  contract_value: number | null;
  difference: number | null;
  line_item_reference: string | null;
}

export interface ExtractedContractTerms {
  visit_fees: { visit_name: string; fee: number }[];
  startup_fee: number | null;
  closeout_fee: number | null;
  screen_failure_fee: number | null;
  patient_compensation: number | null;
  other_fees: { description: string; fee: number }[];
  currency: string;
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
