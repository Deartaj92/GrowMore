import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import {
  FeeHead,
  FeePolicyVersion,
  FeeDemand,
  FeeReceipt,
  FeeLedgerEntry,
  CashierShift,
  CollectPaymentParams,
  CollectPaymentResult,
  CollectMultiPaymentParams,
  CollectMultiPaymentResult,
  VoidPaymentParams,
  VoidPaymentResult,
  GenerateDemandsParams,
  GenerateDemandsResult,
  CarryArrearsParams,
  CarryArrearsResult,
  StudentConcession,
  StudentFeePlan,
} from '../types/feeLedger';

/**
 * Service layer for the Enterprise Ledger-Based Fee System.
 * Guarantees that all writes run via atomic database RPCs.
 */

// ==============================================================================
// 1. TRANSACTIONAL FINANCIAL RPCs
// ==============================================================================

/**
 * Collect payment atomically through the database transaction engine.
 * Locks rows, enforces idempotency, generates sequential receipts, executes
 * waterfall line-item allocations, and posts double-entry subledger credits.
 */
export async function collectFeePayment(
  params: CollectPaymentParams
): Promise<CollectPaymentResult> {
  const { data, error } = await supabase.rpc('fn_collect_fee_payment', {
    p_school_id: params.p_school_id,
    p_demand_id: params.p_demand_id,
    p_received_amount: params.p_received_amount,
    p_payment_method: params.p_payment_method,
    p_collector_user_id: params.p_collector_user_id,
    p_idempotency_key: params.p_idempotency_key,
    p_reference_no: params.p_reference_no || null,
    p_bank_name: params.p_bank_name || null,
    p_payer_name: params.p_payer_name || null,
    p_shift_id: params.p_shift_id || null,
  });

  if (error) {
    console.error('Error collecting fee payment:', error);
    throw new Error(error.message || 'Payment collection failed.');
  }

  return data as CollectPaymentResult;
}

/**
 * Collect multi-challan payment for a student atomically.
 * Waterfalls lump sum payment across all active unpaid demands (oldest due date first).
 */
export async function collectStudentMultiPayment(
  params: CollectMultiPaymentParams
): Promise<CollectMultiPaymentResult> {
  const { data, error } = await supabase.rpc('fn_collect_student_multi_payment', {
    p_school_id: params.p_school_id,
    p_student_id: params.p_student_id,
    p_received_amount: params.p_received_amount,
    p_payment_method: params.p_payment_method,
    p_collector_user_id: params.p_collector_user_id,
    p_idempotency_key: params.p_idempotency_key,
    p_reference_no: params.p_reference_no || null,
    p_bank_name: params.p_bank_name || null,
    p_payer_name: params.p_payer_name || null,
    p_shift_id: params.p_shift_id || null,
    p_selected_demand_ids: params.p_selected_demand_ids || null,
  });

  if (error) {
    console.error('Error collecting multi-challan fee payment:', error);
    throw new Error(error.message || 'Multi-challan payment collection failed.');
  }

  return data as CollectMultiPaymentResult;
}

export async function fetchStudentUnpaidDemands(
  schoolId: number,
  studentId: number
): Promise<FeeDemand[]> {
  const { data, error } = await supabase
    .from('fee_demands')
    .select(`
      *,
      fee_demand_items (*)
    `)
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .neq('status', 'void')
    .gt('total_balance_amount', 0)
    .order('due_date', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;

  return (data || []).map((d: any) => ({
    ...d,
    items: d.fee_demand_items || [],
  })) as FeeDemand[];
}

/**
 * Void/Reverse a payment atomically.
 * Reverts line-item allocations, restores demand balances, posts compensating
 * debit entry to ledger, and logs reversal with mandatory justification.
 */
export async function voidFeePayment(
  params: VoidPaymentParams
): Promise<VoidPaymentResult> {
  const { data, error } = await supabase.rpc('fn_void_fee_payment', {
    p_school_id: params.p_school_id,
    p_receipt_id: params.p_receipt_id,
    p_reason: params.p_reason,
    p_authorized_by: params.p_authorized_by,
  });

  if (error) {
    console.error('Error voiding fee payment:', error);
    throw new Error(error.message || 'Payment voiding failed.');
  }

  return data as VoidPaymentResult;
}

/**
 * Generate monthly demands (challans) in bulk.
 * Evaluates active enrollments, versioned policies, custom fee plans,
 * approved concessions, and creates itemized demands and initial ledger debits.
 */
export async function generateMonthlyDemands(
  params: GenerateDemandsParams
): Promise<GenerateDemandsResult> {
  const { data, error } = await supabase.rpc('fn_generate_monthly_demands', {
    p_school_id: params.p_school_id,
    p_session_id: params.p_session_id,
    p_class_id: params.p_class_id || null,
    p_section_id: params.p_section_id || null,
    p_billing_month: params.p_billing_month,
    p_billing_year: params.p_billing_year,
    p_issue_date: params.p_issue_date,
    p_due_date: params.p_due_date,
    p_validity_date: params.p_validity_date,
    p_created_by: params.p_created_by,
    p_student_id: params.p_student_id || null,
  });

  if (error) {
    console.error('Error generating fee demands:', error);
    throw new Error(error.message || 'Fee demand generation failed.');
  }

  return data as GenerateDemandsResult;
}

/**
 * Generate monthly demands for all siblings belonging to a family.
 */
export async function generateFamilyMonthlyDemands(
  params: import('../types/feeLedger').GenerateFamilyDemandsParams
): Promise<GenerateDemandsResult> {
  const { data, error } = await supabase.rpc('fn_generate_family_monthly_demands', {
    p_school_id: params.p_school_id,
    p_family_id: params.p_family_id,
    p_session_id: params.p_session_id,
    p_billing_month: params.p_billing_month,
    p_billing_year: params.p_billing_year,
    p_issue_date: params.p_issue_date || new Date().toISOString().split('T')[0],
    p_due_date: params.p_due_date || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    p_validity_date: params.p_validity_date || new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    p_created_by: params.p_created_by || null,
  });

  if (error) {
    console.error('Error generating family fee demands:', error);
    throw new Error(error.message || 'Family fee demand generation failed.');
  }

  return data as GenerateDemandsResult;
}

/**
 * Carry forward arrears across academic sessions.
 * Finds students with active enrollments in target session and outstanding balance in source session,
 * creates opening arrears demands, and initializes their new session ledger.
 */
export async function carryForwardArrears(
  params: CarryArrearsParams
): Promise<CarryArrearsResult> {
  const { data, error } = await supabase.rpc('fn_carry_forward_arrears', {
    p_school_id: params.p_school_id,
    p_source_session_id: params.p_source_session_id,
    p_target_session_id: params.p_target_session_id,
    p_performed_by: params.p_performed_by,
  });

  if (error) {
    console.error('Error carrying forward arrears:', error);
    throw new Error(error.message || 'Arrears carryover failed.');
  }

  return data as CarryArrearsResult;
}

/**
 * Delete an uncollected fee demand. Allowed ONLY if total_paid_amount is 0 and no payments exist.
 */
export async function deleteFeeDemand(
  schoolId: number,
  demandId: number,
  performedBy?: number
): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('fn_delete_fee_demand', {
    p_school_id: schoolId,
    p_demand_id: demandId,
    p_performed_by: performedBy || null,
  });

  if (error) {
    console.error('Error deleting fee demand:', error);
    throw new Error(error.message || 'Failed to delete fee demand.');
  }

  return data as { success: boolean; message: string };
}

/**
 * Fetch the complete, chronological student financial ledger statement.
 */
export async function getStudentLedger(
  schoolId: number,
  studentId: number
): Promise<FeeLedgerEntry[]> {
  const { data, error } = await supabase.rpc('fn_get_student_ledger', {
    p_school_id: schoolId,
    p_student_id: studentId,
  });

  if (error) {
    console.error('Error fetching student ledger:', error);
    throw new Error(error.message || 'Failed to fetch student ledger.');
  }

  return (data || []) as FeeLedgerEntry[];
}

// ==============================================================================
// 2. FEE CATALOG & POLICY MANAGEMENT
// ==============================================================================

export async function fetchFeeHeads(schoolId: number): Promise<FeeHead[]> {
  const { data, error } = await supabase
    .from('fee_heads')
    .select('*')
    .eq('school_id', schoolId)
    .order('id', { ascending: true });

  if (error) throw error;
  return data as FeeHead[];
}

export async function upsertFeeHead(
  schoolId: number,
  feeHead: Partial<FeeHead>
): Promise<FeeHead> {
  const payload = {
    ...feeHead,
    school_id: schoolId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('fee_heads')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as FeeHead;
}

export async function fetchFeePolicyVersions(
  schoolId: number,
  sessionId: number
): Promise<FeePolicyVersion[]> {
  const { data, error } = await supabase
    .from('fee_policy_versions')
    .select(`
      *,
      fee_heads ( title, code ),
      classes ( name )
    `)
    .eq('school_id', schoolId)
    .eq('session_id', sessionId)
    .order('id', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    head_title: row.fee_heads?.title,
    head_code: row.fee_heads?.code,
    class_name: row.classes?.name,
  })) as FeePolicyVersion[];
}

export async function createFeePolicyVersion(
  schoolId: number,
  policy: Partial<FeePolicyVersion>
): Promise<FeePolicyVersion> {
  const { data, error } = await supabase
    .from('fee_policy_versions')
    .insert({
      ...policy,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as FeePolicyVersion;
}

// ==============================================================================
// 3. DEMANDS & RECEIPTS LOOKUP
// ==============================================================================

export async function fetchFeeDemands(
  schoolId: number,
  filters?: {
    studentId?: number;
    sessionId?: number;
    classId?: number;
    status?: string;
    challanNo?: string;
    limit?: number;
  }
): Promise<FeeDemand[]> {
  if (filters?.limit) {
    let query = supabase
      .from('fee_demands')
      .select(`
        *,
        fee_demand_items (*)
      `)
      .eq('school_id', schoolId)
      .order('id', { ascending: false });

    if (filters?.studentId) query = query.eq('student_id', filters.studentId);
    if (filters?.sessionId) query = query.eq('session_id', filters.sessionId);
    if (filters?.classId) query = query.or(`snapshot_data->>class_id.eq.${filters.classId}`);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.challanNo) query = query.ilike('challan_no', `%${filters.challanNo}%`);
    query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((d: any) => ({
      ...d,
      items: d.fee_demand_items || [],
    })) as FeeDemand[];
  }

  // Auto-paginate through ALL matching rows to prevent 250/1000 row truncation
  const rawData = await fetchAllRows(async (from, to) => {
    let query = supabase
      .from('fee_demands')
      .select(`
        *,
        fee_demand_items (*)
      `)
      .eq('school_id', schoolId)
      .order('id', { ascending: false });

    if (filters?.studentId) query = query.eq('student_id', filters.studentId);
    if (filters?.sessionId) query = query.eq('session_id', filters.sessionId);
    if (filters?.classId) query = query.or(`snapshot_data->>class_id.eq.${filters.classId}`);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.challanNo) query = query.ilike('challan_no', `%${filters.challanNo}%`);

    return await query.range(from, to);
  });

  return (rawData || []).map((d: any) => ({
    ...d,
    items: d.fee_demand_items || [],
  })) as FeeDemand[];
}

export async function searchPosDemands(
  schoolId: number,
  queryStr: string
): Promise<FeeDemand[]> {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return [];

  const resultMap = new Map<number, FeeDemand>();

  // 1. Direct search on fee_demands (challan_no, snapshot fields)
  const { data: demandMatches } = await supabase
    .from('fee_demands')
    .select(`
      *,
      fee_demand_items (*)
    `)
    .eq('school_id', schoolId)
    .neq('status', 'void')
    .or(`challan_no.ilike.%${cleanQuery}%,snapshot_data->>student_name.ilike.%${cleanQuery}%,snapshot_data->>father_name.ilike.%${cleanQuery}%,snapshot_data->>roll_number.ilike.%${cleanQuery}%`)
    .order('id', { ascending: false })
    .limit(30);

  if (demandMatches) {
    demandMatches.forEach((d: any) => {
      resultMap.set(d.id, {
        ...d,
        items: d.fee_demand_items || [],
      });
    });
  }

  // 2. If query is numeric, check student_id or demand id directly
  if (!isNaN(Number(cleanQuery))) {
    const numId = Number(cleanQuery);
    const { data: numMatches } = await supabase
      .from('fee_demands')
      .select(`
        *,
        fee_demand_items (*)
      `)
      .eq('school_id', schoolId)
      .neq('status', 'void')
      .or(`student_id.eq.${numId},id.eq.${numId}`)
      .order('id', { ascending: false })
      .limit(30);

    if (numMatches) {
      numMatches.forEach((d: any) => {
        if (!resultMap.has(d.id)) {
          resultMap.set(d.id, {
            ...d,
            items: d.fee_demand_items || [],
          });
        }
      });
    }
  }

  // 3. Search students table by name, father_name, roll_number
  const { data: matchingStudents } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId)
    .or(`name.ilike.%${cleanQuery}%,father_name.ilike.%${cleanQuery}%,roll_number.ilike.%${cleanQuery}%`)
    .limit(20);

  if (matchingStudents && matchingStudents.length > 0) {
    const studentIds = matchingStudents.map((s) => s.id);
    const { data: stDemands } = await supabase
      .from('fee_demands')
      .select(`
        *,
        fee_demand_items (*)
      `)
      .eq('school_id', schoolId)
      .neq('status', 'void')
      .in('student_id', studentIds)
      .order('id', { ascending: false })
      .limit(30);

    if (stDemands) {
      stDemands.forEach((d: any) => {
        if (!resultMap.has(d.id)) {
          resultMap.set(d.id, {
            ...d,
            items: d.fee_demand_items || [],
          });
        }
      });
    }
  }

  return Array.from(resultMap.values());
}

export async function fetchDemandByChallanNo(
  schoolId: number,
  challanNo: string
): Promise<FeeDemand | null> {
  const { data, error } = await supabase
    .from('fee_demands')
    .select(`
      *,
      fee_demand_items (*)
    `)
    .eq('school_id', schoolId)
    .eq('challan_no', challanNo.trim())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    items: data.fee_demand_items || [],
  } as FeeDemand;
}

export async function fetchReceipts(
  schoolId: number,
  filters?: {
    studentId?: number;
    receiptNo?: string;
    shiftId?: number;
    limit?: number;
  }
): Promise<FeeReceipt[]> {
  let query = supabase
    .from('fee_receipts')
    .select(`
      *,
      fee_allocations (
        *,
        fee_demand_items ( head_title_snapshot )
      )
    `)
    .eq('school_id', schoolId)
    .order('id', { ascending: false });

  if (filters?.studentId) query = query.eq('student_id', filters.studentId);
  if (filters?.receiptNo) query = query.ilike('receipt_no', `%${filters.receiptNo}%`);
  if (filters?.shiftId) query = query.eq('shift_id', filters.shiftId);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: any) => ({
    ...r,
    allocations: (r.fee_allocations || []).map((a: any) => ({
      ...a,
      head_title: a.fee_demand_items?.head_title_snapshot,
    })),
  })) as FeeReceipt[];
}

// ==============================================================================
// 4. CASHIER SHIFTS & DRAWER RECONCILIATION
// ==============================================================================

export async function getActiveShift(
  schoolId: number,
  userId: number
): Promise<CashierShift | null> {
  const { data, error } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('school_id', schoolId)
    .eq('cashier_user_id', userId)
    .eq('status', 'open')
    .order('id', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data as CashierShift | null;
}

export async function openCashierShift(
  schoolId: number,
  userId: number,
  openingCashFloat: number
): Promise<CashierShift> {
  const { data, error } = await supabase
    .from('cashier_shifts')
    .insert({
      school_id: schoolId,
      cashier_user_id: userId,
      opening_cash_float: openingCashFloat,
      status: 'open',
      opened_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as CashierShift;
}

export async function closeCashierShift(
  shiftId: number,
  actualCashCounted: number,
  notes?: string
): Promise<CashierShift> {
  // Fetch current shift totals
  const { data: shift, error: fetchErr } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('id', shiftId)
    .single();

  if (fetchErr || !shift) throw new Error('Shift not found');

  const expectedCash = Number(shift.opening_cash_float || 0) + Number(shift.total_cash_collected || 0);
  const variance = actualCashCounted - expectedCash;

  const { data, error } = await supabase
    .from('cashier_shifts')
    .update({
      actual_cash_counted: actualCashCounted,
      variance_amount: variance,
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq('id', shiftId)
    .select()
    .single();

  if (error) throw error;
  return data as CashierShift;
}

// ==============================================================================
// 5. CONCESSIONS & PLANS
// ==============================================================================

export async function fetchStudentConcessions(
  schoolId: number,
  studentId: number
): Promise<StudentConcession[]> {
  const { data, error } = await supabase
    .from('student_concessions')
    .select(`
      *,
      fee_heads ( title )
    `)
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .order('id', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    head_title: row.fee_heads?.title,
  })) as StudentConcession[];
}

export async function createStudentConcession(
  schoolId: number,
  concession: Partial<StudentConcession>
): Promise<StudentConcession> {
  const { data, error } = await supabase
    .from('student_concessions')
    .insert({
      ...concession,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudentConcession;
}
