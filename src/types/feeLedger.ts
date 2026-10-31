/**
 * Fee System v2 – TypeScript types.
 * Matches 20261027000000_fee_system_v2_schema.sql and 20261027000100_fee_system_v2_rpcs.sql
 */

export type FeeHeadCategory =
  | 'academic' | 'admission' | 'transport' | 'hostel' | 'lab' | 'library'
  | 'activity' | 'security_deposit' | 'one_time' | 'arrears' | 'custom';

export interface FeeHead {
  id: number;
  school_id: number;
  code: string;
  title: string;
  category: FeeHeadCategory;
  is_refundable: boolean;
  priority_order: number;
  gl_account_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FeeFrequency = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'one_time';

export interface FeeRate {
  id: number;
  school_id: number;
  fee_head_id: number;
  session_id: number;
  class_id: number | null;
  section_id: number | null;
  amount: number;
  frequency: FeeFrequency;
  billing_months: number[];
  due_day: number;
  allow_partial: boolean;
  allow_concession: boolean;
  /** Postgres daterange text, e.g. "[2026-01-01,)" */
  valid_during: string;
  created_at: string;
  // joined
  head_title?: string;
  head_code?: string;
  class_name?: string;
}

export type LateFineType = 'fixed' | 'per_day' | 'percentage';

export interface FeeLateRule {
  id: number;
  school_id: number;
  fee_head_id: number | null;
  grace_days: number;
  fine_type: LateFineType;
  fine_value: number;
  max_fine: number | null;
  is_active: boolean;
  created_at: string;
  head_title?: string;
}

export type ConcessionKind = 'sibling' | 'staff_child' | 'scholarship' | 'need_based' | 'merit' | 'other';
export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface FeeConcession {
  id: number;
  school_id: number;
  student_id: number;
  fee_head_id: number | null;
  kind: ConcessionKind;
  value_type: 'percent' | 'fixed';
  value: number;
  valid_during: string;
  reason: string;
  status: ApprovalState;
  requested_by: number | null;
  approved_by: number | null;
  decided_at: string | null;
  created_at: string;
  // joined
  head_title?: string;
  student_name?: string;
}

export interface StudentFeeOverride {
  id: number;
  school_id: number;
  student_id: number;
  session_id: number;
  fee_head_id: number;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: number | null;
  approved_by: number | null;
  created_at: string;
  head_title?: string;
  student_name?: string;
}

export type ShiftStatus = 'open' | 'closed' | 'reconciled';

export interface CashierShift {
  id: number;
  school_id: number;
  cashier_user_id: number;
  opened_at: string;
  closed_at: string | null;
  opening_float: number;
  counted_cash: number | null;
  expected_cash: number | null;
  variance: number | null;
  status: ShiftStatus;
  reconciled_by: number | null;
  notes: string | null;
  cashier_name?: string;
}

export interface ShiftSummary {
  shift_id: number;
  status: ShiftStatus;
  opening_float: number;
  cash: number;
  bank: number;
  online: number;
  receipt_count: number;
  expected_cash: number;
}

export type PayStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface DemandSnapshot {
  student_id?: number;
  student_name?: string;
  father_name?: string;
  class_id?: number;
  class_name?: string;
  section_id?: number | null;
  section_name?: string | null;
  roll_number?: string | null;
  phone?: string | null;
}

export interface FeeDemandLine {
  line_id: number;
  demand_id: number;
  fee_head_id: number;
  line_type: 'charge' | 'late_fine';
  title: string;
  priority_order: number;
  gross_amount: number;
  amount?: number;
  concession_amount: number;
  waived_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
}

/** A challan with balances derived from lines + allocations. */
export interface FeeDemand {
  demand_id: number;
  school_id: number;
  challan_no: string;
  account_id: number;
  student_id: number;
  session_id: number;
  period_month: number | null;
  period_year: number;
  kind: 'regular' | 'arrears' | 'adhoc';
  issue_date: string;
  due_date: string;
  doc_status: 'issued' | 'cancelled';
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  pay_status: PayStatus;
  snapshot?: DemandSnapshot;
  lines?: FeeDemandLine[];
}

export type PaymentMethod =
  | 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa' | 'jazzcash' | 'pos_card';

export interface FeeReceipt {
  id: number;
  school_id: number;
  receipt_no: string;
  account_id: number;
  shift_id: number | null;
  payment_method: PaymentMethod | 'wallet';
  amount: number;
  allocated_amount: number;
  wallet_amount: number;
  reference_no: string | null;
  bank_name: string | null;
  payer_name: string | null;
  collector_user_id: number | null;
  status: 'posted' | 'voided';
  void_reason: string | null;
  paid_at: string;
  snapshot: any;
}

export interface StatementEntry {
  entry_id: number;
  entry_date: string;
  entry_type: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  challan_no: string | null;
  receipt_no: string | null;
  performed_by_name: string | null;
}

export type AdjustmentKind = 'waiver' | 'refund' | 'void';

export interface FeeAdjustment {
  id: number;
  school_id: number;
  kind: AdjustmentKind;
  demand_line_id: number | null;
  receipt_id: number | null;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: number;
  approved_by: number | null;
  decided_at: string | null;
  created_at: string;
  requester_name?: string;
  receipt_no?: string;
}

export interface AgingRow {
  student_id: number;
  student_name: string;
  father_name: string | null;
  class_name: string | null;
  class_id?: number | null;
  roll_number?: string | null;
  phone?: string | null;
  not_due: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  total_due: number;
}

// ---------------- RPC params / results ----------------

export interface GenerateDemandsParams {
  sessionId: number;
  month: number;
  year: number;
  issueDate: string;
  dueDate: string;
  classId?: number | null;
  sectionId?: number | null;
  studentId?: number | null;
}

export interface GenerateDemandsResult {
  success: boolean;
  generated_count: number;
  already_exists_count: number;
  skipped_no_applicable_rates?: number;
  wallet_applied?: number;
  message: string;
}

export interface CollectPaymentParams {
  studentId: number;
  amount: number;
  method: PaymentMethod;
  /** UUID created ONCE per payment attempt (not per click). */
  idempotencyKey: string;
  shiftId?: number | null;
  demandIds?: number[] | null;
  referenceNo?: string | null;
  bankName?: string | null;
  payerName?: string | null;
  instrumentDate?: string | null;
}

export interface CollectPaymentResult {
  success: boolean;
  is_duplicate?: boolean;
  receipt_id: number;
  receipt_no: string;
  amount: number;
  allocated_amount: number;
  wallet_amount: number;
  balance_after: number;
  snapshot: any;
  payment_method?: string;
  allocations?: Array<{ demand_id: number; challan_no: string; amount: number; balance_remaining?: number }>;
  student_name?: string;
  father_name?: string;
  class_name?: string;
  roll_number?: string;
}

export interface FeePlanRevisionEntry {
  id: string;
  fee_head_id: number;
  head_title?: string;
  head_code?: string;
  previous_amount: number;
  new_amount: number;
  delta_amount: number;
  change_mode: 'initial_plan' | 'manual_revision' | 'increment_percent' | 'increment_fixed';
  change_value: number;
  effective_from: string;
  applied_at: string;
  applied_by: number;
  reason: string;
}

export interface StudentPlanHeadDetail {
  fee_head_id: number;
  head_title: string;
  head_code: string;
  standard_amount: number;
  custom_amount: number | null;
  has_override: boolean;
  base_amount?: number;
  increment_amount?: number;
  effective_from?: string | null;
  clean_reason?: string;
  revisions?: FeePlanRevisionEntry[];
}

export interface StudentFeePlanRow {
  student_id: number;
  student_name: string;
  father_name: string | null;
  roll_number: string;
  class_id: number | null;
  class_name: string | null;
  section_id: number | null;
  section_name: string | null;
  standard_monthly: number;
  base_monthly?: number;
  increment_monthly?: number;
  last_increment_effective_from?: string | null;
  last_increment_label?: string | null;
  custom_monthly: number;
  concession_monthly: number;
  net_monthly: number;
  plan_status: string;
  heads_detail: StudentPlanHeadDetail[];
  concessions_list?: FeeConcession[];
  revisions_history?: FeePlanRevisionEntry[];
  past_demands_count?: number;
  past_demands_total?: number;
}

export interface SetStudentFeePlanParams {
  studentId: number;
  sessionId: number;
  items: Array<{ fee_head_id: number; amount: number; reason?: string }>;
  notes?: string;
  effectiveFrom?: string;
}

export interface BulkSetClassFeePlanParams {
  classId: number;
  sessionId: number;
  items: Array<{ fee_head_id: number; amount: number; reason?: string }>;
  overwriteCustom?: boolean;
  effectiveFrom?: string;
}

export interface ApplyFeeIncrementParams {
  sessionId: number;
  studentIds: number[];
  targetHeadIds: number[];
  incrementType: 'percent' | 'fixed';
  incrementValue: number;
  roundingMode?: 'exact' | 'nearest_10' | 'nearest_50' | 'nearest_100';
  effectiveFrom: string;
  reason: string;
}

export interface GrantStudentConcessionParams {
  studentIds: number[];
  feeHeadId: number | null;
  kind: ConcessionKind;
  valueType: 'percent' | 'fixed';
  value: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason: string;
  autoApprove?: boolean;
}

// ---------------- Family-Wise Fee & Payment Types ----------------

export interface FamilySiblingFeeProfile {
  student_id: number;
  name: string;
  father_name: string | null;
  roll_number: string | null;
  class_id: number | null;
  class_name: string | null;
  section_id: number | null;
  section_name: string | null;
  status: string | null;
  is_primary_contact: boolean;
  total_billed: number;
  total_paid: number;
  balance_due: number;
  overdue_amount: number;
  wallet_balance: number;
  unpaid_demands: FeeDemand[];
  all_demands: FeeDemand[];
  receipts: FeeReceipt[];
}

export interface FamilyFeeSummary {
  family_id: number;
  school_id: number;
  family_name: string;
  contact_person: string | null;
  contact_number: string | null;
  address: string | null;
  avatar_url: string | null;
  members: FamilySiblingFeeProfile[];
  active_siblings_count: number;
  total_billed: number;
  total_paid: number;
  total_due: number;
  total_overdue: number;
  total_wallet: number;
  unpaid_challans_count: number;
  receipts_count: number;
  last_payment_date: string | null;
  last_payment_amount: number;
}

export interface FamilyMemberPaymentAllocation {
  studentId: number;
  studentName: string;
  fatherName?: string | null;
  rollNumber?: string | null;
  className?: string | null;
  amount: number;
  balanceBefore?: number;
  demandIds?: number[] | null;
}

export interface CollectFamilyPaymentParams {
  familyId: number;
  familyName: string;
  contactNumber?: string | null;
  address?: string | null;
  allocations: FamilyMemberPaymentAllocation[];
  method: PaymentMethod;
  idempotencyKey: string;
  shiftId?: number | null;
  referenceNo?: string | null;
  bankName?: string | null;
  payerName?: string | null;
  instrumentDate?: string | null;
}

export interface FamilyMemberReceiptItem
  extends Omit<CollectPaymentResult, 'student_name' | 'father_name' | 'class_name' | 'roll_number'> {
  student_id: number;
  student_name: string;
  father_name?: string | null;
  class_name?: string | null;
  roll_number?: string | null;
  balance_before?: number;
}

export interface CollectFamilyPaymentResult {
  success: boolean;
  batch_ref: string;
  family_id: number;
  family_name: string;
  contact_number?: string | null;
  address?: string | null;
  paid_at: string;
  payment_method: PaymentMethod | string;
  payer_name: string | null;
  reference_no: string | null;
  total_amount: number;
  total_allocated: number;
  total_wallet: number;
  total_balance_after: number;
  member_receipts: FamilyMemberReceiptItem[];
}

export interface FamilyStatementEntry extends StatementEntry {
  student_id: number;
  student_name: string;
  roll_number?: string | null;
  class_name?: string | null;
  family_running_balance: number;
}

export interface FamilyAgingRow {
  family_id: number;
  family_name: string;
  contact_number: string | null;
  address: string | null;
  siblings_count: number;
  siblings_summary: string;
  members: AgingRow[];
  not_due: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  total_due: number;
}

