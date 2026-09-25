/**
 * TypeScript Type Definitions for the Enterprise Ledger-Based Fee System
 * Matches database schema defined in 20260911100000_create_ledger_fee_system.sql
 */

export type EnrollmentType = 'new_admission' | 'promoted' | 'demoted' | 'retained' | 'transfer';
export type EnrollmentStatus = 'active' | 'completed' | 'transferred' | 'withdrawn' | 'suspended';

export interface StudentEnrollment {
  id: number;
  school_id: number;
  student_id: number;
  session_id: number;
  class_id: number;
  section_id: number | null;
  roll_number: string | null;
  enrollment_type: EnrollmentType;
  start_date: string;
  exit_date: string | null;
  status: EnrollmentStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_name?: string;
  father_name?: string;
  class_name?: string;
  section_name?: string;
}

export interface FamilyBillingAccount {
  id: number;
  school_id: number;
  account_code: string;
  primary_payer_name: string;
  primary_phone: string | null;
  primary_cnic: string | null;
  address: string | null;
  created_at: string;
}

export type FeeHeadCategory = 
  | 'academic'
  | 'admission'
  | 'transport'
  | 'hostel'
  | 'lab'
  | 'library'
  | 'activity'
  | 'fine'
  | 'security_deposit'
  | 'one_time'
  | 'custom';

export interface FeeHead {
  id: number;
  school_id: number;
  code: string;
  title: string;
  category: FeeHeadCategory;
  is_refundable: boolean;
  gl_account_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FeeFrequency = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'one_time' | 'custom';
export type FeeAmountRule = 'fixed' | 'class_based' | 'route_based' | 'student_specific';
export type LateFineType = 'none' | 'fixed' | 'daily_rate' | 'percentage';
export type PolicyStatus = 'draft' | 'active' | 'superseded';

export interface FeePolicyVersion {
  id: number;
  school_id: number;
  fee_head_id: number;
  version_number: number;
  session_id: number;
  frequency: FeeFrequency;
  amount_rule: FeeAmountRule;
  base_amount: number;
  class_id: number | null;
  section_id: number | null;
  due_day_of_month: number;
  grace_period_days: number;
  late_fine_type: LateFineType;
  late_fine_amount: number;
  max_late_fine: number;
  allow_partial_payment: boolean;
  allow_concessions: boolean;
  rolls_into_arrears: boolean;
  effective_from: string;
  effective_to: string | null;
  status: PolicyStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  head_title?: string;
  head_code?: string;
  class_name?: string;
}

export interface StudentFeePlan {
  id: number;
  school_id: number;
  student_id: number;
  enrollment_id: number | null;
  session_id: number;
  fee_head_id: number;
  custom_amount: number;
  is_active: boolean;
  reason: string | null;
  approved_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  head_title?: string;
}

export type ConcessionType = 'percentage' | 'fixed_amount' | 'sibling' | 'staff_child' | 'scholarship' | 'need_based';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface StudentConcession {
  id: number;
  school_id: number;
  student_id: number;
  enrollment_id: number | null;
  fee_head_id: number;
  concession_type: ConcessionType;
  concession_value: number;
  reason: string;
  start_date: string;
  end_date: string | null;
  approval_status: ApprovalStatus;
  approved_by: number | null;
  approval_remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  head_title?: string;
}

export type ShiftStatus = 'open' | 'closed' | 'reconciled';

export interface CashierShift {
  id: number;
  school_id: number;
  cashier_user_id: number;
  shift_date: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash_float: number;
  total_cash_collected: number;
  total_bank_collected: number;
  total_online_collected: number;
  actual_cash_counted: number | null;
  variance_amount: number;
  status: ShiftStatus;
  reconciled_by: number | null;
  notes: string | null;
  created_at: string;
  // Joined
  cashier_name?: string;
}

export type DemandStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'void' | 'cancelled';

export interface FeeDemand {
  id: number;
  school_id: number;
  challan_no: string;
  student_id: number;
  enrollment_id: number | null;
  billing_account_id: number | null;
  session_id: number;
  billing_month: number | null;
  billing_year: number;
  issue_date: string;
  due_date: string;
  validity_date: string;
  status: DemandStatus;
  total_gross_amount: number;
  total_concession_amount: number;
  total_late_fine: number;
  total_waiver_amount: number;
  total_net_amount: number;
  total_paid_amount: number;
  total_balance_amount: number;
  snapshot_data: {
    student_id?: number;
    student_name?: string;
    father_name?: string;
    class_id?: number;
    class_name?: string;
    section_id?: number | null;
    section_name?: string | null;
    roll_number?: string | null;
    phone?: string | null;
    [key: string]: any;
  } | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: FeeDemandItem[];
}

export type DemandItemStatus = 'unpaid' | 'partially_paid' | 'paid' | 'waived';

export interface FeeDemandItem {
  id: number;
  school_id: number;
  demand_id: number;
  fee_head_id: number;
  policy_version_id: number | null;
  head_title_snapshot: string;
  priority_order: number;
  gross_amount: number;
  concession_amount: number;
  late_fine_amount: number;
  waiver_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: DemandItemStatus;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 
  | 'cash'
  | 'bank_transfer'
  | 'cheque'
  | 'easypaisa'
  | 'jazzcash'
  | 'pos_card'
  | 'advance_wallet';

export type ReceiptStatus = 'posted' | 'voided' | 'refunded';

export interface FeeReceipt {
  id: number;
  school_id: number;
  receipt_no: string;
  shift_id: number | null;
  student_id: number;
  billing_account_id: number | null;
  demand_id: number | null;
  payment_date: string;
  payment_method: PaymentMethod;
  received_amount: number;
  reference_no: string | null;
  instrument_date: string | null;
  bank_name: string | null;
  payer_name: string | null;
  collector_user_id: number | null;
  idempotency_key: string | null;
  status: ReceiptStatus;
  void_reason: string | null;
  receipt_snapshot: any | null;
  created_at: string;
  // Joined
  allocations?: FeeAllocation[];
  collector_name?: string;
}

export interface FeeAllocation {
  id: number;
  school_id: number;
  receipt_id: number;
  demand_item_id: number;
  allocated_amount: number;
  allocation_timestamp: string;
  // Joined
  head_title?: string;
}

export type LedgerEntryType = 
  | 'DEMAND'
  | 'PAYMENT'
  | 'CONCESSION'
  | 'LATE_FINE'
  | 'WAIVER'
  | 'VOID_REVERSAL'
  | 'REFUND'
  | 'OPENING_BALANCE';

export interface FeeLedgerEntry {
  entry_id: number;
  entry_date: string;
  entry_type: LedgerEntryType;
  description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  challan_no: string | null;
  receipt_no: string | null;
  performed_by_name: string | null;
}

export interface CollectPaymentParams {
  p_school_id: number;
  p_demand_id: number;
  p_received_amount: number;
  p_payment_method: PaymentMethod;
  p_collector_user_id: number;
  p_idempotency_key: string;
  p_reference_no?: string | null;
  p_bank_name?: string | null;
  p_payer_name?: string | null;
  p_shift_id?: number | null;
}

export interface CollectPaymentResult {
  success: boolean;
  is_duplicate?: boolean;
  receipt_id: number;
  receipt_no: string;
  received_amount: number;
  remaining_balance: number;
  message?: string;
  snapshot?: any;
}

export interface CollectMultiPaymentParams {
  p_school_id: number;
  p_student_id: number;
  p_received_amount: number;
  p_payment_method: PaymentMethod;
  p_collector_user_id: number;
  p_idempotency_key: string;
  p_reference_no?: string | null;
  p_bank_name?: string | null;
  p_payer_name?: string | null;
  p_shift_id?: number | null;
  p_selected_demand_ids?: number[] | null;
}

export interface CollectMultiPaymentResult {
  success: boolean;
  is_duplicate?: boolean;
  receipt_id: number;
  receipt_no: string;
  received_amount: number;
  demands_count: number;
  total_due_before: number;
  remaining_due_after: number;
  message?: string;
  snapshot?: any;
}

export interface VoidPaymentParams {
  p_school_id: number;
  p_receipt_id: number;
  p_reason: string;
  p_authorized_by: number;
}

export interface VoidPaymentResult {
  success: boolean;
  receipt_id: number;
  receipt_no: string;
  reversed_amount: number;
  restored_student_balance: number;
}

export interface GenerateDemandsParams {
  p_school_id: number;
  p_session_id: number;
  p_class_id?: number | null;
  p_section_id?: number | null;
  p_billing_month: number;
  p_billing_year: number;
  p_issue_date: string;
  p_due_date: string;
  p_validity_date: string;
  p_created_by: number;
  p_student_id?: number | null;
}

export interface GenerateFamilyDemandsParams {
  p_school_id: number;
  p_family_id: number;
  p_session_id: number;
  p_billing_month: number;
  p_billing_year: number;
  p_issue_date?: string;
  p_due_date?: string;
  p_validity_date?: string;
  p_created_by?: number;
}

export interface GenerateDemandsResult {
  success: boolean;
  generated_count: number;
  message: string;
}

export interface CarryArrearsParams {
  p_school_id: number;
  p_source_session_id: number;
  p_target_session_id: number;
  p_performed_by: number;
}

export interface CarryArrearsResult {
  success: boolean;
  carried_count: number;
  message: string;
}
