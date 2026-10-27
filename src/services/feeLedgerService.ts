import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import {
  FeeHead,
  FeeRate,
  FeeLateRule,
  FeeConcession,
  StudentFeeOverride,
  CashierShift,
  ShiftSummary,
  FeeDemand,
  FeeDemandLine,
  FeeReceipt,
  StatementEntry,
  FeeAdjustment,
  AdjustmentKind,
  AgingRow,
  GenerateDemandsParams,
  GenerateDemandsResult,
  CollectPaymentParams,
  CollectPaymentResult,
  StudentFeePlanRow,
  SetStudentFeePlanParams,
  BulkSetClassFeePlanParams,
} from '../types/feeLedger';

/**
 * Fee System v2 service layer.
 *
 * Rules:
 *  - ALL money writes go through SECURITY DEFINER RPCs (never direct table writes).
 *  - Every RPC takes the acting user id and re-checks permissions in the database.
 *  - Balances are derived (views); there are no stored running balances.
 */

type Ctx = { schoolId: number; userId: number };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    // Postgres RAISE EXCEPTION text arrives in error.message – show it to the user as-is.
    throw new Error(error.message || `${fn} failed`);
  }
  return data as T;
}

/** Create ONCE per payment attempt (when the payment form is prepared), not per click. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ==============================================================================
// DEMANDS
// ==============================================================================

export async function generateDemands(ctx: Ctx, p: GenerateDemandsParams): Promise<GenerateDemandsResult> {
  return rpc<GenerateDemandsResult>('fn_generate_demands', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_session_id: p.sessionId,
    p_month: p.month,
    p_year: p.year,
    p_issue_date: p.issueDate,
    p_due_date: p.dueDate,
    p_class_id: p.classId ?? null,
    p_section_id: p.sectionId ?? null,
    p_student_id: p.studentId ?? null,
  });
}

export async function generateFamilyDemands(
  ctx: Ctx,
  p: { familyId: number; sessionId: number; month: number; year: number; issueDate: string; dueDate: string }
): Promise<GenerateDemandsResult> {
  return rpc<GenerateDemandsResult>('fn_generate_family_demands', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_family_id: p.familyId,
    p_session_id: p.sessionId,
    p_month: p.month,
    p_year: p.year,
    p_issue_date: p.issueDate,
    p_due_date: p.dueDate,
  });
}

export async function cancelDemand(ctx: Ctx, demandId: number, reason: string) {
  return rpc<{ success: boolean; message: string }>('fn_cancel_demand', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_demand_id: demandId,
    p_reason: reason,
  });
}

export async function fetchDemands(
  schoolId: number,
  f: { sessionId?: number; classId?: number; payStatus?: string; challanNo?: string; studentId?: number; limit?: number } = {}
): Promise<FeeDemand[]> {
  const build = () => {
    let q = supabase.from('v_fee_demand_balances').select('*').eq('school_id', schoolId).order('demand_id', { ascending: false });
    if (f.sessionId) q = q.eq('session_id', f.sessionId);
    if (f.studentId) q = q.eq('student_id', f.studentId);
    if (f.payStatus) q = q.eq('pay_status', f.payStatus);
    if (f.challanNo) q = q.ilike('challan_no', `%${f.challanNo.trim()}%`);
    if (f.classId) q = q.filter('snapshot->>class_id', 'eq', String(f.classId));
    return q;
  };
  if (f.limit) {
    const { data, error } = await build().limit(f.limit);
    if (error) throw error;
    return (data || []) as FeeDemand[];
  }
  const rows = await fetchAllRows(async (from: number, to: number) => await build().range(from, to));
  return (rows || []) as FeeDemand[];
}

export async function fetchDemandLines(demandIds: number[]): Promise<Record<number, FeeDemandLine[]>> {
  const out: Record<number, FeeDemandLine[]> = {};
  if (demandIds.length === 0) return out;
  const { data, error } = await supabase
    .from('v_fee_line_balances')
    .select('*')
    .in('demand_id', demandIds)
    .order('priority_order', { ascending: true })
    .order('line_id', { ascending: true });
  if (error) throw error;
  (data || []).forEach((l: any) => {
    (out[l.demand_id] = out[l.demand_id] || []).push(l as FeeDemandLine);
  });
  return out;
}

/** All issued challans of a student with outstanding balance (oldest due first) incl. lines. */
export async function fetchStudentOutstanding(schoolId: number, studentId: number): Promise<FeeDemand[]> {
  const { data, error } = await supabase
    .from('v_fee_demand_balances')
    .select('*')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .eq('doc_status', 'issued')
    .gt('balance_amount', 0)
    .order('due_date', { ascending: true })
    .order('demand_id', { ascending: true });
  if (error) throw error;
  const demands = (data || []) as FeeDemand[];
  const lines = await fetchDemandLines(demands.map((d) => d.demand_id));
  return demands.map((d) => ({ ...d, lines: lines[d.demand_id] || [] }));
}

export async function fetchAccountBalance(
  schoolId: number,
  studentId: number
): Promise<{ balance: number; wallet: number }> {
  const { data: acct } = await supabase
    .from('fee_accounts')
    .select('id')
    .eq('school_id', schoolId)
    .eq('account_type', 'student')
    .eq('student_id', studentId)
    .maybeSingle();
  if (!acct) return { balance: 0, wallet: 0 };
  const { data } = await supabase
    .from('v_fee_account_balances')
    .select('balance, wallet_balance')
    .eq('school_id', schoolId)
    .eq('account_id', acct.id)
    .maybeSingle();
  return { balance: Number(data?.balance || 0), wallet: Number(data?.wallet_balance || 0) };
}

// ==============================================================================
// POS: student search, payments, receipts
// ==============================================================================

export interface PosStudent {
  id: number;
  name: string;
  father_name: string | null;
  roll_number: string | null;
  class_name: string | null;
}

export async function searchPosStudents(schoolId: number, term: string): Promise<PosStudent[]> {
  const q = term.trim().replace(/[%,()]/g, ' ');
  if (!q) return [];
  const numeric = /^\d+$/.test(q) ? `,id.eq.${q}` : '';
  const { data, error } = await supabase
    .from('students')
    .select('id, name, father_name, roll_number, classes:class_id(name)')
    .eq('school_id', schoolId)
    .or(`name.ilike.%${q}%,father_name.ilike.%${q}%,roll_number.ilike.%${q}%${numeric}`)
    .order('name', { ascending: true })
    .limit(15);
  if (error) throw error;
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    father_name: s.father_name,
    roll_number: s.roll_number,
    class_name: s.classes?.name ?? null,
  }));
}

/** Resolve a challan number to the student that owns it. */
export async function findStudentByChallan(schoolId: number, challanNo: string): Promise<number | null> {
  const { data } = await supabase
    .from('fee_demands')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('challan_no', challanNo.trim())
    .maybeSingle();
  return data?.student_id ?? null;
}

export async function collectPayment(ctx: Ctx, p: CollectPaymentParams): Promise<CollectPaymentResult> {
  return rpc<CollectPaymentResult>('fn_collect_payment', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_student_id: p.studentId,
    p_amount: p.amount,
    p_method: p.method,
    p_idempotency_key: p.idempotencyKey,
    p_shift_id: p.shiftId ?? null,
    p_demand_ids: p.demandIds && p.demandIds.length > 0 ? p.demandIds : null,
    p_reference_no: p.referenceNo || null,
    p_bank_name: p.bankName || null,
    p_payer_name: p.payerName || null,
    p_instrument_date: p.instrumentDate || null,
  });
}

export async function fetchStudentReceipts(schoolId: number, studentId: number, limit = 30): Promise<FeeReceipt[]> {
  const { data: acct } = await supabase
    .from('fee_accounts')
    .select('id')
    .eq('school_id', schoolId)
    .eq('account_type', 'student')
    .eq('student_id', studentId)
    .maybeSingle();
  if (!acct) return [];
  const { data, error } = await supabase
    .from('fee_receipts')
    .select('*')
    .eq('school_id', schoolId)
    .eq('account_id', acct.id)
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as FeeReceipt[];
}

export async function fetchReceipts(
  schoolId: number,
  f: {
    studentId?: number;
    search?: string;
    method?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  } = {}
): Promise<FeeReceipt[]> {
  if (f.studentId) {
    return fetchStudentReceipts(schoolId, f.studentId, f.limit || 50);
  }
  let query = supabase
    .from('fee_receipts')
    .select('*')
    .eq('school_id', schoolId)
    .order('id', { ascending: false });

  if (f.method && f.method !== 'all') {
    query = query.eq('payment_method', f.method);
  }
  if (f.status && f.status !== 'all') {
    query = query.eq('status', f.status);
  }
  if (f.dateFrom) {
    query = query.gte('paid_at', f.dateFrom);
  }
  if (f.dateTo) {
    query = query.lte('paid_at', f.dateTo);
  }

  const { data, error } = await query.limit(f.limit || 100);
  if (error) throw error;
  return (data || []) as FeeReceipt[];
}


// ==============================================================================
// SHIFTS
// ==============================================================================

export async function getActiveShift(schoolId: number, userId: number): Promise<CashierShift | null> {
  const { data, error } = await supabase
    .from('cashier_shifts')
    .select('*')
    .eq('school_id', schoolId)
    .eq('cashier_user_id', userId)
    .eq('status', 'open')
    .maybeSingle();
  if (error) throw error;
  return (data as CashierShift) || null;
}

export async function openShift(ctx: Ctx, openingFloat: number) {
  return rpc<{ success: boolean; shift_id: number }>('fn_open_shift', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_opening_float: openingFloat,
  });
}

export async function getShiftSummary(schoolId: number, shiftId: number): Promise<ShiftSummary> {
  return rpc<ShiftSummary>('fn_shift_summary', { p_school_id: schoolId, p_shift_id: shiftId });
}

export async function closeShift(ctx: Ctx, shiftId: number, countedCash: number, notes?: string) {
  return rpc<ShiftSummary & { variance: number; counted_cash: number }>('fn_close_shift', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_shift_id: shiftId,
    p_counted_cash: countedCash,
    p_notes: notes || null,
  });
}

export async function reconcileShift(ctx: Ctx, shiftId: number, notes?: string) {
  return rpc<{ success: boolean }>('fn_reconcile_shift', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_shift_id: shiftId,
    p_notes: notes || null,
  });
}

export async function fetchShifts(schoolId: number, status?: string, limit = 100): Promise<CashierShift[]> {
  let q = supabase
    .from('cashier_shifts')
    .select('*, users:cashier_user_id(name)')
    .eq('school_id', schoolId)
    .order('id', { ascending: false })
    .limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((s: any) => ({ ...s, cashier_name: s.users?.name })) as CashierShift[];
}

// ==============================================================================
// CATALOG: heads, rates, late rules
// ==============================================================================

export async function fetchFeeHeads(schoolId: number): Promise<FeeHead[]> {
  const { data, error } = await supabase.from('fee_heads').select('*').eq('school_id', schoolId).order('priority_order').order('id');
  if (error) throw error;
  return (data || []) as FeeHead[];
}

export async function upsertFeeHead(schoolId: number, head: Partial<FeeHead>): Promise<FeeHead> {
  const payload: any = { ...head, school_id: schoolId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('fee_heads').upsert(payload, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return data as FeeHead;
}

export async function fetchFeeRates(schoolId: number, sessionId: number): Promise<FeeRate[]> {
  const { data, error } = await supabase
    .from('fee_rates')
    .select('*, fee_heads(title, code), classes:class_id(name)')
    .eq('school_id', schoolId)
    .eq('session_id', sessionId)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    head_title: r.fee_heads?.title,
    head_code: r.fee_heads?.code,
    class_name: r.classes?.name,
  })) as FeeRate[];
}

export async function createFeeRate(
  schoolId: number,
  userId: number,
  r: {
    fee_head_id: number;
    session_id: number;
    class_id: number | null;
    section_id?: number | null;
    amount: number;
    frequency: string;
    billing_months: number[];
    due_day: number;
    allow_partial: boolean;
    allow_concession: boolean;
    valid_from: string;
  }
): Promise<void> {
  const { valid_from, ...rest } = r;
  const { error } = await supabase.from('fee_rates').insert({
    ...rest,
    school_id: schoolId,
    created_by: userId,
    valid_during: `[${valid_from},)`,
  });
  if (error) {
    if (error.message?.includes('fee_rates_no_overlap')) {
      throw new Error('A rate for this head/class already exists for an overlapping period. End the old rate first.');
    }
    throw error;
  }
}

/** Ends a rate (so a new one can start). Never edits history of already-billed challans. */
export async function endFeeRate(rateId: number, endDate: string): Promise<void> {
  const { data, error } = await supabase.from('fee_rates').select('valid_during').eq('id', rateId).single();
  if (error) throw error;
  const lower = String(data.valid_during).replace(/[\[\("]/g, '').split(',')[0];
  const { error: upErr } = await supabase
    .from('fee_rates')
    .update({ valid_during: `[${lower},${endDate})` })
    .eq('id', rateId);
  if (upErr) throw upErr;
}

export async function fetchLateRules(schoolId: number): Promise<FeeLateRule[]> {
  const { data, error } = await supabase
    .from('fee_late_rules')
    .select('*, fee_heads(title)')
    .eq('school_id', schoolId)
    .order('id');
  if (error) throw error;
  return (data || []).map((r: any) => ({ ...r, head_title: r.fee_heads?.title })) as FeeLateRule[];
}

export async function saveLateRule(schoolId: number, rule: Partial<FeeLateRule>): Promise<void> {
  const { head_title, ...clean } = rule as any;
  const { error } = await supabase.from('fee_late_rules').upsert({ ...clean, school_id: schoolId }, { onConflict: 'id' });
  if (error) throw error;
}

export async function assessLateFines(ctx: Ctx, asOf?: string) {
  return rpc<{ success: boolean; fines_created: number; fines_increased: number; total_fine_added: number }>(
    'fn_assess_late_fines',
    { p_school_id: ctx.schoolId, p_user_id: ctx.userId, p_as_of: asOf || new Date().toISOString().split('T')[0] }
  );
}

// ==============================================================================
// CONCESSIONS & OVERRIDES (maker-checker)
// ==============================================================================

export async function fetchConcessions(
  schoolId: number,
  f: { studentId?: number; status?: string } = {}
): Promise<FeeConcession[]> {
  let q = supabase
    .from('fee_concessions')
    .select('*, fee_heads(title), students:student_id(name)')
    .eq('school_id', schoolId)
    .order('id', { ascending: false })
    .limit(300);
  if (f.studentId) q = q.eq('student_id', f.studentId);
  if (f.status) q = q.eq('status', f.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    head_title: r.fee_heads?.title || 'All eligible heads',
    student_name: r.students?.name,
  })) as FeeConcession[];
}

export async function requestConcession(
  schoolId: number,
  userId: number,
  c: {
    student_id: number;
    fee_head_id: number | null;
    kind: string;
    value_type: 'percent' | 'fixed';
    value: number;
    reason: string;
    valid_from: string;
    valid_to?: string | null;
  }
): Promise<void> {
  const { valid_from, valid_to, ...rest } = c;
  const { error } = await supabase.from('fee_concessions').insert({
    ...rest,
    school_id: schoolId,
    requested_by: userId,
    valid_during: `[${valid_from},${valid_to || ''})`,
  });
  if (error) throw error;
}

export async function decideConcession(ctx: Ctx, id: number, action: 'approve' | 'reject' | 'revoke') {
  return rpc<{ success: boolean; status: string }>('fn_decide_concession', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_concession_id: id,
    p_action: action,
  });
}

export async function fetchOverrides(schoolId: number, status?: string): Promise<StudentFeeOverride[]> {
  let q = supabase
    .from('student_fee_overrides')
    .select('*, fee_heads(title), students:student_id(name)')
    .eq('school_id', schoolId)
    .order('id', { ascending: false })
    .limit(300);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    head_title: r.fee_heads?.title,
    student_name: r.students?.name,
  })) as StudentFeeOverride[];
}

export async function requestOverride(
  schoolId: number,
  userId: number,
  o: { student_id: number; session_id: number; fee_head_id: number; amount: number; reason: string }
): Promise<void> {
  const { error } = await supabase.from('student_fee_overrides').insert({ ...o, school_id: schoolId, requested_by: userId });
  if (error) {
    if (error.code === '23505') throw new Error('An override already exists for this student, session and fee head.');
    throw error;
  }
}

export async function decideOverride(ctx: Ctx, id: number, approve: boolean) {
  return rpc<{ success: boolean }>('fn_decide_override', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_override_id: id,
    p_approve: approve,
  });
}

// ==============================================================================
// ADJUSTMENTS (waiver / void / refund)
// ==============================================================================

export async function requestAdjustment(
  ctx: Ctx,
  p: { kind: AdjustmentKind; reason: string; demandLineId?: number | null; receiptId?: number | null; amount?: number | null }
) {
  return rpc<{ success: boolean; adjustment_id: number }>('fn_request_adjustment', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_kind: p.kind,
    p_reason: p.reason,
    p_demand_line_id: p.demandLineId ?? null,
    p_receipt_id: p.receiptId ?? null,
    p_amount: p.amount ?? null,
  });
}

export async function decideAdjustment(ctx: Ctx, adjustmentId: number, approve: boolean, remarks?: string) {
  return rpc<{ success: boolean; status: string }>('fn_decide_adjustment', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_adjustment_id: adjustmentId,
    p_approve: approve,
    p_remarks: remarks || null,
  });
}

export async function fetchAdjustments(schoolId: number, status?: string): Promise<FeeAdjustment[]> {
  let q = supabase
    .from('fee_adjustments')
    .select('*, fee_receipts(receipt_no)')
    .eq('school_id', schoolId)
    .order('id', { ascending: false })
    .limit(300);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as any[];

  const userIds = Array.from(new Set(rows.map((r) => r.requested_by).filter(Boolean)));
  const names: Record<number, string> = {};
  if (userIds.length) {
    const { data: us } = await supabase.from('users').select('id, name').in('id', userIds);
    (us || []).forEach((u: any) => (names[u.id] = u.name));
  }
  return rows.map((r) => ({
    ...r,
    receipt_no: r.fee_receipts?.receipt_no,
    requester_name: names[r.requested_by],
  })) as FeeAdjustment[];
}

// ==============================================================================
// REPORTS
// ==============================================================================

export async function getStatement(schoolId: number, studentId: number): Promise<StatementEntry[]> {
  const data = await rpc<any[]>('fn_get_statement', { p_school_id: schoolId, p_student_id: studentId });
  return (data || []) as StatementEntry[];
}

export async function getAgingReport(schoolId: number, sessionId?: number | null, asOf?: string): Promise<AgingRow[]> {
  const data = await rpc<any[]>('fn_aging_report', {
    p_school_id: schoolId,
    p_session_id: sessionId ?? null,
    p_as_of: asOf || new Date().toISOString().split('T')[0],
  });
  return (data || []).map((r) => ({
    ...r,
    not_due: Number(r.not_due),
    d1_30: Number(r.d1_30),
    d31_60: Number(r.d31_60),
    d61_90: Number(r.d61_90),
    d90_plus: Number(r.d90_plus),
    total_due: Number(r.total_due),
  })) as AgingRow[];
}

export async function fetchCollectionSummary(schoolId: number, fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from('fee_receipts')
    .select('amount, payment_method, status, paid_at')
    .eq('school_id', schoolId)
    .eq('status', 'posted')
    .neq('payment_method', 'wallet')
    .gte('paid_at', `${fromDate}T00:00:00`)
    .lte('paid_at', `${toDate}T23:59:59`)
    .limit(5000);
  if (error) throw error;
  const byMethod: Record<string, number> = {};
  let total = 0;
  (data || []).forEach((r: any) => {
    byMethod[r.payment_method] = (byMethod[r.payment_method] || 0) + Number(r.amount);
    total += Number(r.amount);
  });
  return { total, count: (data || []).length, byMethod };
}

// ==============================================================================
// STUDENT FEE PLANS & PACKAGES
// ==============================================================================

export async function fetchStudentsFeePlans(
  schoolId: number,
  sessionId: number,
  classId?: number | null,
  sectionId?: number | null,
  search?: string
): Promise<StudentFeePlanRow[]> {
  const { data, error } = await supabase.rpc('fn_get_students_fee_plans', {
    p_school_id: schoolId,
    p_session_id: sessionId,
    p_class_id: classId || null,
    p_section_id: sectionId || null,
    p_search: search && search.trim() ? search.trim() : null,
  });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    standard_monthly: Number(r.standard_monthly || 0),
    custom_monthly: Number(r.custom_monthly || 0),
    concession_monthly: Number(r.concession_monthly || 0),
    net_monthly: Number(r.net_monthly || 0),
    heads_detail: r.heads_detail || [],
  })) as StudentFeePlanRow[];
}

export async function setStudentFeePlan(
  ctx: Ctx,
  p: SetStudentFeePlanParams
): Promise<{ success: boolean }> {
  return rpc<{ success: boolean }>('fn_set_student_fee_plan', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_student_id: p.studentId,
    p_session_id: p.sessionId,
    p_items: p.items,
    p_notes: p.notes || null,
  });
}

export async function bulkSetClassFeePlan(
  ctx: Ctx,
  p: BulkSetClassFeePlanParams
): Promise<{ success: boolean; updated_students: number }> {
  return rpc<{ success: boolean; updated_students: number }>('fn_bulk_set_class_fee_plan', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_class_id: p.classId,
    p_session_id: p.sessionId,
    p_items: p.items,
    p_overwrite_custom: Boolean(p.overwriteCustom),
  });
}
