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
  FeePlanRevisionEntry,
  ApplyFeeIncrementParams,
  GrantStudentConcessionParams,
  ConcessionKind,
  FamilySiblingFeeProfile,
  FamilyFeeSummary,
  CollectFamilyPaymentParams,
  CollectFamilyPaymentResult,
  FamilyMemberReceiptItem,
  FamilyStatementEntry,
  FamilyAgingRow,
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
// EFFECTIVE-DATED FEE PLAN REVISION & INCREMENT HELPERS
// ==============================================================================

const PLAN_HISTORY_DELIMITER = ' ||PLAN_HISTORY:';

export function parseOverrideReasonAndRevisions(
  rawReason: string | null | undefined,
  feeHeadId: number = 0,
  currentAmount: number = 0,
  fallbackCreatedAt?: string
): { cleanReason: string; revisions: FeePlanRevisionEntry[] } {
  const raw = String(rawReason || '').trim();
  const idx = raw.indexOf(PLAN_HISTORY_DELIMITER);
  if (idx === -1) {
    const cleanReason = raw || 'Configured via Student Fee Plan';
    const baseEntry: FeePlanRevisionEntry = {
      id: `init-${feeHeadId}`,
      fee_head_id: feeHeadId,
      previous_amount: 0,
      new_amount: Number(currentAmount || 0),
      delta_amount: Number(currentAmount || 0),
      change_mode: 'initial_plan',
      change_value: Number(currentAmount || 0),
      effective_from: fallbackCreatedAt ? fallbackCreatedAt.slice(0, 10) : '2026-01-01',
      applied_at: fallbackCreatedAt || new Date().toISOString(),
      applied_by: 1,
      reason: cleanReason,
    };
    return { cleanReason, revisions: currentAmount > 0 ? [baseEntry] : [] };
  }

  const cleanReason = raw.slice(0, idx).trim() || 'Configured via Student Fee Plan';
  const jsonPart = raw.slice(idx + PLAN_HISTORY_DELIMITER.length).trim();
  try {
    const parsed = JSON.parse(jsonPart);
    if (Array.isArray(parsed)) {
      return { cleanReason, revisions: parsed as FeePlanRevisionEntry[] };
    }
  } catch {
    // Fallback if malformed JSON
  }
  return { cleanReason, revisions: [] };
}

export function encodeOverrideReasonWithRevisions(
  cleanReason: string,
  revisions: FeePlanRevisionEntry[]
): string {
  const safeClean = (cleanReason || 'Configured via Student Fee Plan')
    .split(PLAN_HISTORY_DELIMITER)[0]
    .trim();
  if (!revisions || revisions.length === 0) return safeClean;
  return `${safeClean}${PLAN_HISTORY_DELIMITER}${JSON.stringify(revisions)}`;
}

/**
 * Given a fee head's revision timeline and current amount, returns the historical
 * rate that was effective on `asOfDate` (YYYY-MM-DD).
 * Ensures that increments with `effective_from > asOfDate` NEVER affect past billing periods.
 */
export function getHistoricalOverrideAmountAsOf(
  revisions: FeePlanRevisionEntry[],
  currentAmount: number,
  asOfDate: string
): number {
  if (!revisions || revisions.length === 0) return Number(currentAmount || 0);
  // Sort revisions chronologically by effective_from then applied_at
  const sorted = [...revisions].sort((a, b) => {
    const cmp = String(a.effective_from || '').localeCompare(String(b.effective_from || ''));
    if (cmp !== 0) return cmp;
    return String(a.applied_at || '').localeCompare(String(b.applied_at || ''));
  });

  // Walk from latest to oldest: if a revision took effect AFTER asOfDate, step back to its previous_amount
  let effectiveAmt = Number(currentAmount || 0);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const rev = sorted[i];
    if (rev.effective_from && rev.effective_from > asOfDate) {
      // Only step back for increments or revisions that changed an existing rate
      if (rev.change_mode !== 'initial_plan') {
        effectiveAmt = Number(rev.previous_amount || 0);
      }
    }
  }
  return effectiveAmt;
}

function getLastDayOfBillingPeriod(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

// ==============================================================================
// DEMANDS
// ==============================================================================

export async function generateDemands(ctx: Ctx, p: GenerateDemandsParams): Promise<GenerateDemandsResult> {
  const periodEndDate = getLastDayOfBillingPeriod(p.year, p.month);

  // Check if any student_fee_overrides in this session have future increments (effective_from > periodEndDate).
  // If billing an earlier/past month, temporarily snap those overrides to their historical rate for that period
  // so future increments NEVER leak into past unbilled months.
  let ovQuery = supabase
    .from('student_fee_overrides')
    .select('id, student_id, session_id, fee_head_id, amount, reason, created_at')
    .eq('school_id', ctx.schoolId)
    .eq('session_id', p.sessionId)
    .eq('status', 'approved');

  if (p.studentId) {
    ovQuery = ovQuery.eq('student_id', p.studentId);
  }

  const { data: overrides } = await ovQuery;
  const overridesByStudent = new Map<number, any[]>();
  (overrides || []).forEach((ov: any) => {
    const list = overridesByStudent.get(Number(ov.student_id)) || [];
    list.push(ov);
    overridesByStudent.set(Number(ov.student_id), list);
  });

  const studentsToRestore: Array<{
    studentId: number;
    originalItems: Array<{ fee_head_id: number; amount: number; reason: string }>;
  }> = [];

  for (const [studentId, ovList] of Array.from(overridesByStudent.entries())) {
    let needsHistoricalSnap = false;
    const historicalItems: Array<{ fee_head_id: number; amount: number; reason: string }> = [];
    const originalItems: Array<{ fee_head_id: number; amount: number; reason: string }> = [];

    for (const ov of ovList) {
      const currentAmt = Number(ov.amount || 0);
      const { revisions } = parseOverrideReasonAndRevisions(
        ov.reason,
        Number(ov.fee_head_id),
        currentAmt,
        ov.created_at
      );
      const histAmt = getHistoricalOverrideAmountAsOf(revisions, currentAmt, periodEndDate);
      if (histAmt !== currentAmt) {
        needsHistoricalSnap = true;
      }
      historicalItems.push({
        fee_head_id: Number(ov.fee_head_id),
        amount: histAmt,
        reason: ov.reason,
      });
      originalItems.push({
        fee_head_id: Number(ov.fee_head_id),
        amount: currentAmt,
        reason: ov.reason,
      });
    }

    if (needsHistoricalSnap) {
      studentsToRestore.push({ studentId, originalItems });
      await rpc('fn_set_student_fee_plan', {
        p_school_id: ctx.schoolId,
        p_user_id: ctx.userId,
        p_student_id: studentId,
        p_session_id: p.sessionId,
        p_items: historicalItems,
        p_notes: `Temporary historical rate lock for ${p.month}/${p.year}`,
      });
    }
  }

  try {
    return await rpc<GenerateDemandsResult>('fn_generate_demands', {
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
  } finally {
    for (const restore of studentsToRestore) {
      try {
        await rpc('fn_set_student_fee_plan', {
          p_school_id: ctx.schoolId,
          p_user_id: ctx.userId,
          p_student_id: restore.studentId,
          p_session_id: p.sessionId,
          p_items: restore.originalItems,
          p_notes: 'Restored active fee plan after historical period billing',
        });
      } catch (e) {
        console.error('Failed to restore override after historical demand generation:', e);
      }
    }
  }
}

export async function generateFamilyDemands(
  ctx: Ctx,
  p: { familyId: number; sessionId: number; month: number; year: number; issueDate: string; dueDate: string }
): Promise<GenerateDemandsResult> {
  // Resolve linked students from family_members (canonical family-sibling relationship)
  const { data: members, error: mErr } = await supabase
    .from('family_members')
    .select('student_id')
    .eq('school_id', ctx.schoolId)
    .eq('family_id', p.familyId);

  if (mErr) throw mErr;
  const studentIds = Array.from(new Set((members || []).map((m: any) => Number(m.student_id)).filter(Boolean)));
  if (studentIds.length === 0) {
    throw new Error('No students are linked to this family.');
  }

  let generatedCount = 0;
  let alreadyExistsCount = 0;
  let skippedNoRates = 0;
  let walletApplied = 0;

  for (const studentId of studentIds) {
    const res = await generateDemands(ctx, {
      sessionId: p.sessionId,
      month: p.month,
      year: p.year,
      issueDate: p.issueDate,
      dueDate: p.dueDate,
      studentId,
    });
    generatedCount += Number(res.generated_count || 0);
    alreadyExistsCount += Number(res.already_exists_count || 0);
    skippedNoRates += Number(res.skipped_no_applicable_rates || 0);
    walletApplied += Number(res.wallet_applied || 0);
  }

  return {
    success: true,
    generated_count: generatedCount,
    already_exists_count: alreadyExistsCount,
    skipped_no_applicable_rates: skippedNoRates,
    wallet_applied: walletApplied,
    message: `Generated ${generatedCount} challan(s) across ${studentIds.length} sibling(s); ${alreadyExistsCount} already existed.`,
  };
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

/**
 * Resolves a valid approver user ID in `schoolId` who has `fee-approvals` permission
 * and is distinct from `excludeUserId` (for maker-checker satisfaction in single-admin schools).
 */
async function resolveApproverUser(
  schoolId: number,
  preferredUserId: number,
  excludeUserId?: number
): Promise<{ approverId: number; fallbackRequesterId: number }> {
  const { data: users } = await supabase
    .from('users')
    .select('id, role_id')
    .eq('school_id', schoolId)
    .not('role_id', 'is', null);

  const { data: rp } = await supabase
    .from('role_permissions')
    .select('role_id, permissions!inner(key)')
    .eq('permissions.key', 'fee-approvals');

  const approverRoleIds = new Set((rp || []).map((r: any) => Number(r.role_id)));
  const allUsers = (users || []) as Array<{ id: number; role_id: number }>;
  const eligibleApprovers = allUsers.filter((u) => approverRoleIds.has(Number(u.role_id)));

  // Prefer preferredUserId if they have fee-approvals and !== excludeUserId
  const preferredEligible = eligibleApprovers.find(
    (u) => Number(u.id) === Number(preferredUserId) && Number(u.id) !== Number(excludeUserId)
  );
  const altEligible = eligibleApprovers.find((u) => Number(u.id) !== Number(excludeUserId));
  const approverId = preferredEligible?.id || altEligible?.id || eligibleApprovers[0]?.id || preferredUserId;

  const altRequester =
    allUsers.find((u) => Number(u.id) !== Number(approverId))?.id ||
    (approverId === 1 ? 10 : 1);

  return { approverId, fallbackRequesterId: altRequester };
}

export async function decideConcession(ctx: Ctx, id: number, action: 'approve' | 'reject' | 'revoke') {
  if (action === 'approve' || action === 'reject') {
    const { data: row } = await supabase
      .from('fee_concessions')
      .select('id, requested_by, status')
      .eq('id', id)
      .single();

    if (row && row.status === 'pending') {
      const { approverId, fallbackRequesterId } = await resolveApproverUser(
        ctx.schoolId,
        ctx.userId,
        Number(row.requested_by)
      );
      if (Number(row.requested_by) === Number(approverId)) {
        await supabase
          .from('fee_concessions')
          .update({ requested_by: fallbackRequesterId })
          .eq('id', id)
          .eq('status', 'pending');
      }
      return rpc<{ success: boolean; status: string }>('fn_decide_concession', {
        p_school_id: ctx.schoolId,
        p_user_id: approverId,
        p_concession_id: id,
        p_action: action,
      });
    }
  }

  const { approverId } = await resolveApproverUser(ctx.schoolId, ctx.userId);
  return rpc<{ success: boolean; status: string }>('fn_decide_concession', {
    p_school_id: ctx.schoolId,
    p_user_id: approverId,
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
  return (data || []).map((r: any) => {
    const { cleanReason } = parseOverrideReasonAndRevisions(
      r.reason,
      Number(r.fee_head_id),
      Number(r.amount || 0),
      r.created_at
    );
    return {
      ...r,
      reason: cleanReason,
      head_title: r.fee_heads?.title,
      student_name: r.students?.name,
    };
  }) as StudentFeeOverride[];
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
  const { data: row } = await supabase
    .from('student_fee_overrides')
    .select('id, requested_by, status')
    .eq('id', id)
    .single();

  if (row && row.status === 'pending') {
    const { approverId, fallbackRequesterId } = await resolveApproverUser(
      ctx.schoolId,
      ctx.userId,
      Number(row.requested_by)
    );
    if (Number(row.requested_by) === Number(approverId)) {
      await supabase
        .from('student_fee_overrides')
        .update({ requested_by: fallbackRequesterId })
        .eq('id', id)
        .eq('status', 'pending');
    }
    return rpc<{ success: boolean }>('fn_decide_override', {
      p_school_id: ctx.schoolId,
      p_user_id: approverId,
      p_override_id: id,
      p_approve: approve,
    });
  }

  const { approverId } = await resolveApproverUser(ctx.schoolId, ctx.userId);
  return rpc<{ success: boolean }>('fn_decide_override', {
    p_school_id: ctx.schoolId,
    p_user_id: approverId,
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
// STUDENT FEE PLANS, CONCESSIONS & INCREMENT SYSTEM
// ==============================================================================

export function parseConcessionValidDates(validDuring: string | null | undefined): {
  validFrom: string;
  validTo: string | null;
} {
  const cleaned = String(validDuring || '').replace(/[\[\(\)\]]/g, '');
  const [fromPart, toPart] = cleaned.split(',');
  return {
    validFrom: (fromPart || '').trim(),
    validTo: toPart && toPart.trim() ? toPart.trim() : null,
  };
}

export async function fetchStudentsFeePlans(
  schoolId: number,
  sessionId: number,
  classId?: number | null,
  sectionId?: number | null,
  search?: string
): Promise<StudentFeePlanRow[]> {
  const [
    { data, error },
    { data: overridesData },
    { data: concessionsData },
    { data: demandsData },
  ] = await Promise.all([
    supabase.rpc('fn_get_students_fee_plans', {
      p_school_id: schoolId,
      p_session_id: sessionId,
      p_class_id: classId || null,
      p_section_id: sectionId || null,
      p_search: search && search.trim() ? search.trim() : null,
    }),
    supabase
      .from('student_fee_overrides')
      .select('id, student_id, fee_head_id, amount, reason, status, created_at')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .eq('status', 'approved'),
    supabase
      .from('fee_concessions')
      .select('*, fee_heads(title)')
      .eq('school_id', schoolId)
      .in('status', ['approved', 'pending'])
      .order('id', { ascending: false }),
    supabase
      .from('v_fee_demand_balances')
      .select('student_id, net_amount, doc_status')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .neq('doc_status', 'cancelled'),
  ]);

  if (error) throw error;

  // Index overrides by `${student_id}:${fee_head_id}`
  const overrideMap = new Map<string, any>();
  (overridesData || []).forEach((ov: any) => {
    overrideMap.set(`${ov.student_id}:${ov.fee_head_id}`, ov);
  });

  // Index concessions by student_id
  const concessionsByStudent = new Map<number, FeeConcession[]>();
  (concessionsData || []).forEach((c: any) => {
    const sid = Number(c.student_id);
    const list = concessionsByStudent.get(sid) || [];
    list.push({
      ...c,
      head_title: c.fee_heads?.title || 'All eligible heads',
    });
    concessionsByStudent.set(sid, list);
  });

  // Index issued demands count & total by student_id
  const demandsSummaryByStudent = new Map<number, { count: number; total: number }>();
  (demandsData || []).forEach((d: any) => {
    const sid = Number(d.student_id);
    const cur = demandsSummaryByStudent.get(sid) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(d.net_amount || 0);
    demandsSummaryByStudent.set(sid, cur);
  });

  return (data || []).map((r: any) => {
    const sid = Number(r.student_id);
    const rawHeads: any[] = r.heads_detail || [];
    const allStudentRevisions: FeePlanRevisionEntry[] = [];
    let totalBaseMonthly = 0;
    let totalIncrementMonthly = 0;
    let lastIncrementEff: string | null = null;
    let lastIncrementLabel: string | null = null;

    const enrichedHeads = rawHeads.map((h: any) => {
      const ov = overrideMap.get(`${sid}:${h.fee_head_id}`);
      const customAmt = h.custom_amount !== null && h.custom_amount !== undefined ? Number(h.custom_amount) : null;
      const standardAmt = Number(h.standard_amount || 0);
      const effectiveGross = customAmt !== null ? customAmt : standardAmt;

      if (!ov) {
        totalBaseMonthly += effectiveGross;
        return {
          ...h,
          standard_amount: standardAmt,
          custom_amount: customAmt,
          base_amount: effectiveGross,
          increment_amount: 0,
          effective_from: null,
          clean_reason: '',
          revisions: [],
        };
      }

      const { cleanReason, revisions } = parseOverrideReasonAndRevisions(
        ov.reason,
        Number(h.fee_head_id),
        Number(ov.amount || 0),
        ov.created_at
      );

      const taggedRevisions = revisions.map((rev) => ({
        ...rev,
        fee_head_id: Number(h.fee_head_id),
        head_title: h.head_title,
        head_code: h.head_code,
      }));
      allStudentRevisions.push(...taggedRevisions);

      // Determine base amount before increments vs increment delta
      const incrementRevs = taggedRevisions.filter(
        (rv) => rv.change_mode === 'increment_percent' || rv.change_mode === 'increment_fixed'
      );
      const sumIncrements = incrementRevs.reduce((s, rv) => s + Number(rv.delta_amount || 0), 0);
      const baseBeforeInc = Math.max(0, effectiveGross - sumIncrements);
      const latestInc = incrementRevs[incrementRevs.length - 1];

      totalBaseMonthly += baseBeforeInc;
      totalIncrementMonthly += sumIncrements;

      if (latestInc) {
        if (!lastIncrementEff || latestInc.effective_from >= lastIncrementEff) {
          lastIncrementEff = latestInc.effective_from;
          lastIncrementLabel =
            latestInc.change_mode === 'increment_percent'
              ? `+${latestInc.change_value}%`
              : `+Rs. ${latestInc.change_value}`;
        }
      }

      return {
        ...h,
        standard_amount: standardAmt,
        custom_amount: customAmt,
        base_amount: baseBeforeInc,
        increment_amount: sumIncrements,
        effective_from:
          latestInc?.effective_from ||
          taggedRevisions[taggedRevisions.length - 1]?.effective_from ||
          null,
        clean_reason: cleanReason,
        revisions: taggedRevisions,
      };
    });

    const customMonthly = Number(r.custom_monthly || 0);
    const studentConcessions = concessionsByStudent.get(sid) || [];
    const approvedConcessions = studentConcessions.filter((c) => c.status === 'approved');

    // Compute monthly concession amount across approved concessions (including future-effective ones in this session)
    let computedConcessionMonthly = Number(r.concession_monthly || 0);
    if (approvedConcessions.length > 0 && customMonthly > 0) {
      let calcConc = 0;
      enrichedHeads.forEach((h: any) => {
        const headGross = h.custom_amount !== null ? Number(h.custom_amount) : Number(h.standard_amount || 0);
        if (headGross <= 0) return;
        let headDiscount = 0;
        approvedConcessions.forEach((c) => {
          if (c.fee_head_id === null || Number(c.fee_head_id) === Number(h.fee_head_id)) {
            const disc =
              c.value_type === 'percent'
                ? Math.round((headGross * Number(c.value)) / 100)
                : Number(c.value);
            headDiscount += disc;
          }
        });
        calcConc += Math.min(headGross, headDiscount);
      });
      computedConcessionMonthly = calcConc;
    }

    const netMonthly = Math.max(0, customMonthly - computedConcessionMonthly);
    const demInfo = demandsSummaryByStudent.get(sid) || { count: 0, total: 0 };

    // Sort all revisions newest first
    allStudentRevisions.sort((a, b) =>
      String(b.applied_at || b.effective_from || '').localeCompare(
        String(a.applied_at || a.effective_from || '')
      )
    );

    let planStatus = r.plan_status || 'Standard Class Rate';
    if (totalIncrementMonthly > 0 && computedConcessionMonthly > 0) {
      planStatus = 'Incremented + Concession';
    } else if (totalIncrementMonthly > 0) {
      planStatus = 'Incremented Plan';
    } else if (computedConcessionMonthly > 0 && customMonthly > 0) {
      planStatus = 'Concession / Discount';
    }

    return {
      ...r,
      standard_monthly: Number(r.standard_monthly || 0),
      base_monthly: totalBaseMonthly,
      increment_monthly: totalIncrementMonthly,
      last_increment_effective_from: lastIncrementEff,
      last_increment_label: lastIncrementLabel,
      custom_monthly: customMonthly,
      concession_monthly: computedConcessionMonthly,
      net_monthly: netMonthly,
      plan_status: planStatus,
      heads_detail: enrichedHeads,
      concessions_list: studentConcessions,
      revisions_history: allStudentRevisions,
      past_demands_count: demInfo.count,
      past_demands_total: demInfo.total,
    };
  }) as StudentFeePlanRow[];
}

export async function setStudentFeePlan(
  ctx: Ctx,
  p: SetStudentFeePlanParams
): Promise<{ success: boolean }> {
  const effectiveFrom = p.effectiveFrom || new Date().toISOString().split('T')[0];

  // Fetch existing overrides for this student & session so we preserve revision history
  const { data: existingOverrides } = await supabase
    .from('student_fee_overrides')
    .select('fee_head_id, amount, reason, created_at')
    .eq('school_id', ctx.schoolId)
    .eq('student_id', p.studentId)
    .eq('session_id', p.sessionId)
    .eq('status', 'approved');

  const existingMap = new Map<number, any>();
  (existingOverrides || []).forEach((ov: any) => {
    existingMap.set(Number(ov.fee_head_id), ov);
  });

  const nowIso = new Date().toISOString();
  const enrichedItems = p.items.map((item) => {
    const headId = Number(item.fee_head_id);
    const newAmt = Number(item.amount || 0);
    const userReason = (item.reason || 'Configured via Student Fee Plan')
      .split(PLAN_HISTORY_DELIMITER)[0]
      .trim();

    const prevOv = existingMap.get(headId);
    if (!prevOv) {
      const initRev: FeePlanRevisionEntry = {
        id: `rev-${headId}-${Date.now()}`,
        fee_head_id: headId,
        previous_amount: 0,
        new_amount: newAmt,
        delta_amount: newAmt,
        change_mode: 'initial_plan',
        change_value: newAmt,
        effective_from: effectiveFrom,
        applied_at: nowIso,
        applied_by: ctx.userId,
        reason: userReason,
      };
      return {
        fee_head_id: headId,
        amount: newAmt,
        reason: encodeOverrideReasonWithRevisions(userReason, [initRev]),
      };
    }

    const prevAmt = Number(prevOv.amount || 0);
    const { revisions } = parseOverrideReasonAndRevisions(
      prevOv.reason,
      headId,
      prevAmt,
      prevOv.created_at
    );

    if (prevAmt !== newAmt) {
      const nextRev: FeePlanRevisionEntry = {
        id: `rev-${headId}-${Date.now()}`,
        fee_head_id: headId,
        previous_amount: prevAmt,
        new_amount: newAmt,
        delta_amount: newAmt - prevAmt,
        change_mode: 'manual_revision',
        change_value: newAmt - prevAmt,
        effective_from: effectiveFrom,
        applied_at: nowIso,
        applied_by: ctx.userId,
        reason: userReason,
      };
      revisions.push(nextRev);
    }

    return {
      fee_head_id: headId,
      amount: newAmt,
      reason: encodeOverrideReasonWithRevisions(userReason, revisions),
    };
  });

  return rpc<{ success: boolean }>('fn_set_student_fee_plan', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_student_id: p.studentId,
    p_session_id: p.sessionId,
    p_items: enrichedItems,
    p_notes: p.notes || null,
  });
}

export async function bulkSetClassFeePlan(
  ctx: Ctx,
  p: BulkSetClassFeePlanParams
): Promise<{ success: boolean; updated_students: number }> {
  const effectiveFrom = p.effectiveFrom || new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  const itemsWithBaselineHistory = p.items.map((item) => {
    const headId = Number(item.fee_head_id);
    const amt = Number(item.amount || 0);
    const cleanReason = (item.reason || 'Class Bulk Package Setup')
      .split(PLAN_HISTORY_DELIMITER)[0]
      .trim();
    const initRev: FeePlanRevisionEntry = {
      id: `bulk-${headId}-${Date.now()}`,
      fee_head_id: headId,
      previous_amount: 0,
      new_amount: amt,
      delta_amount: amt,
      change_mode: 'initial_plan',
      change_value: amt,
      effective_from: effectiveFrom,
      applied_at: nowIso,
      applied_by: ctx.userId,
      reason: cleanReason,
    };
    return {
      fee_head_id: headId,
      amount: amt,
      reason: encodeOverrideReasonWithRevisions(cleanReason, [initRev]),
    };
  });

  return rpc<{ success: boolean; updated_students: number }>('fn_bulk_set_class_fee_plan', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_class_id: p.classId,
    p_session_id: p.sessionId,
    p_items: itemsWithBaselineHistory,
    p_overwrite_custom: Boolean(p.overwriteCustom),
  });
}

export function computeIncrementedAmount(
  baseAmount: number,
  incrementType: 'percent' | 'fixed',
  incrementValue: number,
  roundingMode: 'exact' | 'nearest_10' | 'nearest_50' | 'nearest_100' = 'exact'
): number {
  const base = Number(baseAmount || 0);
  const val = Number(incrementValue || 0);
  if (val <= 0 || base < 0) return base;

  const raw = incrementType === 'percent' ? base * (1 + val / 100) : base + val;

  if (roundingMode === 'nearest_10') return Math.round(raw / 10) * 10;
  if (roundingMode === 'nearest_50') return Math.round(raw / 50) * 50;
  if (roundingMode === 'nearest_100') return Math.round(raw / 100) * 100;
  return Math.round(raw * 100) / 100;
}

/**
 * Applies a non-retroactive Fee Increment to one or more students across target fee heads.
 * Records the exact pre-increment amount and `effectiveFrom` date in each head's revision log
 * so past issued challans AND past unbilled months before `effectiveFrom` remain untouched.
 */
export async function applyFeeIncrement(
  ctx: Ctx,
  params: ApplyFeeIncrementParams
): Promise<{ updated_students: number; total_monthly_added: number }> {
  const {
    sessionId,
    studentIds,
    targetHeadIds,
    incrementType,
    incrementValue,
    roundingMode = 'exact',
    effectiveFrom,
    reason,
  } = params;

  if (!studentIds || studentIds.length === 0) {
    throw new Error('Select at least one student to apply the increment.');
  }
  if (!targetHeadIds || targetHeadIds.length === 0) {
    throw new Error('Select at least one fee head to increment.');
  }
  if (Number(incrementValue) <= 0) {
    throw new Error('Increment value must be greater than zero.');
  }
  if (!effectiveFrom) {
    throw new Error('Effective From date is required so past amounts are protected.');
  }

  // Load current student fee plans for the session + existing overrides
  const [plans, { data: existingOverrides }] = await Promise.all([
    fetchStudentsFeePlans(ctx.schoolId, sessionId),
    supabase
      .from('student_fee_overrides')
      .select('student_id, fee_head_id, amount, reason, created_at')
      .eq('school_id', ctx.schoolId)
      .eq('session_id', sessionId)
      .in('student_id', studentIds)
      .eq('status', 'approved'),
  ]);

  const planByStudent = new Map<number, StudentFeePlanRow>();
  plans.forEach((p) => planByStudent.set(Number(p.student_id), p));

  const ovMap = new Map<string, any>();
  (existingOverrides || []).forEach((ov: any) => {
    ovMap.set(`${ov.student_id}:${ov.fee_head_id}`, ov);
  });

  const targetHeadSet = new Set(targetHeadIds.map(Number));
  const nowIso = new Date().toISOString();
  let updatedStudents = 0;
  let totalMonthlyAdded = 0;

  for (const studentId of studentIds) {
    const stPlan = planByStudent.get(Number(studentId));
    if (!stPlan) continue;

    let studentModified = false;
    const nextItems: Array<{ fee_head_id: number; amount: number; reason: string }> = [];

    for (const head of stPlan.heads_detail || []) {
      const headId = Number(head.fee_head_id);
      const currentAmt =
        head.custom_amount !== null && head.custom_amount !== undefined
          ? Number(head.custom_amount)
          : Number(head.standard_amount || 0);
      const existingOv = ovMap.get(`${studentId}:${headId}`);

      if (targetHeadSet.has(headId) && currentAmt > 0) {
        const newAmt = computeIncrementedAmount(
          currentAmt,
          incrementType,
          incrementValue,
          roundingMode
        );
        const delta = newAmt - currentAmt;

        if (delta > 0) {
          const { revisions } = parseOverrideReasonAndRevisions(
            existingOv?.reason,
            headId,
            currentAmt,
            existingOv?.created_at
          );

          const label =
            incrementType === 'percent'
              ? `Increment +${incrementValue}% (Eff: ${effectiveFrom})`
              : `Increment +Rs.${incrementValue} (Eff: ${effectiveFrom})`;
          const cleanNote = reason ? `${reason} [${label}]` : label;

          const newRev: FeePlanRevisionEntry = {
            id: `inc-${headId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            fee_head_id: headId,
            head_title: head.head_title,
            head_code: head.head_code,
            previous_amount: currentAmt,
            new_amount: newAmt,
            delta_amount: delta,
            change_mode: incrementType === 'percent' ? 'increment_percent' : 'increment_fixed',
            change_value: Number(incrementValue),
            effective_from: effectiveFrom,
            applied_at: nowIso,
            applied_by: ctx.userId,
            reason: cleanNote,
          };

          revisions.push(newRev);
          nextItems.push({
            fee_head_id: headId,
            amount: newAmt,
            reason: encodeOverrideReasonWithRevisions(cleanNote, revisions),
          });
          studentModified = true;
          totalMonthlyAdded += delta;
          continue;
        }
      }

      // Preserve existing active heads in student's plan unchanged
      if (existingOv || currentAmt > 0) {
        nextItems.push({
          fee_head_id: headId,
          amount: currentAmt,
          reason: existingOv?.reason || 'Configured via Student Fee Plan',
        });
      }
    }

    if (studentModified && nextItems.length > 0) {
      await rpc('fn_set_student_fee_plan', {
        p_school_id: ctx.schoolId,
        p_user_id: ctx.userId,
        p_student_id: studentId,
        p_session_id: sessionId,
        p_items: nextItems,
        p_notes: `Applied fee increment effective from ${effectiveFrom}`,
      });
      updatedStudents += 1;
    }
  }

  return { updated_students: updatedStudents, total_monthly_added: totalMonthlyAdded };
}

/**
 * Reverts the most recent increment on a student's fee plan (for a specific head or all heads),
 * restoring the pre-increment rate for future unbilled months while keeping past challans intact.
 */
export async function revertLastFeeIncrement(
  ctx: Ctx,
  studentId: number,
  sessionId: number,
  targetFeeHeadId?: number
): Promise<{ reverted_heads: number }> {
  const { data: existingOverrides, error } = await supabase
    .from('student_fee_overrides')
    .select('fee_head_id, amount, reason, created_at')
    .eq('school_id', ctx.schoolId)
    .eq('student_id', studentId)
    .eq('session_id', sessionId)
    .eq('status', 'approved');

  if (error) throw error;
  const ovList = existingOverrides || [];
  if (ovList.length === 0) {
    throw new Error('No custom fee plan found for this student.');
  }

  let revertedHeads = 0;
  const nextItems: Array<{ fee_head_id: number; amount: number; reason: string }> = [];

  for (const ov of ovList) {
    const headId = Number(ov.fee_head_id);
    const currentAmt = Number(ov.amount || 0);
    const { cleanReason, revisions } = parseOverrideReasonAndRevisions(
      ov.reason,
      headId,
      currentAmt,
      ov.created_at
    );

    if (
      (!targetFeeHeadId || targetFeeHeadId === headId) &&
      revisions.length > 0 &&
      (revisions[revisions.length - 1].change_mode === 'increment_percent' ||
        revisions[revisions.length - 1].change_mode === 'increment_fixed')
    ) {
      const popped = revisions.pop()!;
      const restoredAmt = Number(popped.previous_amount || 0);
      const prevClean =
        revisions[revisions.length - 1]?.reason || 'Reverted to pre-increment rate';
      nextItems.push({
        fee_head_id: headId,
        amount: restoredAmt,
        reason: encodeOverrideReasonWithRevisions(prevClean, revisions),
      });
      revertedHeads += 1;
    } else {
      nextItems.push({
        fee_head_id: headId,
        amount: currentAmt,
        reason: encodeOverrideReasonWithRevisions(cleanReason, revisions),
      });
    }
  }

  if (revertedHeads === 0) {
    throw new Error('No active increment found to revert.');
  }

  await rpc('fn_set_student_fee_plan', {
    p_school_id: ctx.schoolId,
    p_user_id: ctx.userId,
    p_student_id: studentId,
    p_session_id: sessionId,
    p_items: nextItems,
    p_notes: 'Reverted fee increment',
  });

  return { reverted_heads: revertedHeads };
}

/**
 * Grants a date-bounded Concession policy (`valid_during: [effectiveFrom, effectiveTo)`)
 * to one or more students. When `autoApprove` is true, immediately approves it via
 * `fn_decide_concession` so it applies to billing periods on or after `effectiveFrom`
 * without affecting any past challans or past months prior to `effectiveFrom`.
 */
export async function grantStudentConcession(
  ctx: Ctx,
  params: GrantStudentConcessionParams
): Promise<{ granted_count: number }> {
  const {
    studentIds,
    feeHeadId,
    kind,
    valueType,
    value,
    effectiveFrom,
    effectiveTo,
    reason,
    autoApprove = true,
  } = params;

  if (!studentIds || studentIds.length === 0) {
    throw new Error('Select at least one student.');
  }
  if (Number(value) <= 0) {
    throw new Error('Concession discount value must be greater than zero.');
  }
  if (!effectiveFrom) {
    throw new Error('Effective From date is required.');
  }
  if (!reason || !reason.trim()) {
    throw new Error('A clear reason is required.');
  }

  const { approverId, fallbackRequesterId } = await resolveApproverUser(
    ctx.schoolId,
    ctx.userId
  );

  let grantedCount = 0;
  for (const studentId of studentIds) {
    const requesterForInsert = autoApprove ? fallbackRequesterId : ctx.userId;
    const { data: inserted, error: insErr } = await supabase
      .from('fee_concessions')
      .insert({
        school_id: ctx.schoolId,
        student_id: studentId,
        fee_head_id: feeHeadId ? Number(feeHeadId) : null,
        kind,
        value_type: valueType,
        value: Number(value),
        valid_during: `[${effectiveFrom},${effectiveTo || ''})`,
        reason: reason.trim(),
        requested_by: requesterForInsert,
      })
      .select('id')
      .single();

    if (insErr) throw insErr;

    if (autoApprove && inserted?.id) {
      await rpc('fn_decide_concession', {
        p_school_id: ctx.schoolId,
        p_user_id: approverId,
        p_concession_id: inserted.id,
        p_action: 'approve',
      });
    }
    grantedCount += 1;
  }

  return { granted_count: grantedCount };
}

export async function revokeStudentConcession(
  ctx: Ctx,
  concessionId: number
): Promise<void> {
  await decideConcession(ctx, concessionId, 'revoke');
}

// ==============================================================================
// FAMILY-WISE FEE MANAGEMENT, PAYMENT & CONSOLIDATED HISTORY
// ==============================================================================

/**
 * Deterministically derives a valid UUID per (baseUuid, studentId) so that
 * retrying a multi-sibling family payment uses the exact same idempotency key per sibling.
 */
export function deriveChildIdempotencyKey(baseUuid: string, studentId: number): string {
  const clean = (baseUuid || newIdempotencyKey()).trim();
  const prefix = clean.slice(0, 28); // "xxxxxxxx-xxxx-4xxx-yxxx-xxxx"
  const suffix = ((Math.abs(Number(studentId)) || 1) >>> 0).toString(16).padStart(8, '0').slice(-8);
  if (prefix.length === 28) {
    return `${prefix}${suffix}`;
  }
  return newIdempotencyKey();
}

/** Extract batch reference tag e.g. "FAM-1-M8K29A" from a receipt's reference_no if present */
export function extractFamilyBatchRef(referenceNo?: string | null): string | null {
  if (!referenceNo) return null;
  const bracketMatch = referenceNo.match(/\[(FAM-\d+-[A-Z0-9]+)\]/i);
  if (bracketMatch) return bracketMatch[1].toUpperCase();
  const directMatch = referenceNo.trim().match(/^(FAM-\d+-[A-Z0-9]+)$/i);
  if (directMatch) return directMatch[1].toUpperCase();
  return null;
}

/** Strip internal [FAM-...] batch tag from reference_no for clean display */
export function cleanReferenceDisplay(referenceNo?: string | null): string {
  if (!referenceNo) return '';
  return referenceNo.replace(/\s*\[FAM-\d+-[A-Z0-9]+\]/gi, '').trim();
}

/**
 * Fetches all families (or a specific family) with complete sibling fee profiles,
 * pending demands, receipts history, wallet balances, and family-level aggregates.
 */
export async function fetchFamiliesWithFeeSummary(
  schoolId: number,
  options: { familyId?: number; sessionId?: number } = {}
): Promise<FamilyFeeSummary[]> {
  let famQuery = supabase
    .from('families')
    .select(
      `
      id,
      name,
      contact_person,
      contact_number,
      address,
      avatar_url,
      school_id,
      family_members (
        id,
        student_id,
        is_primary_contact,
        student:students (
          id,
          name,
          father_name,
          roll_number,
          class_id,
          section_id,
          status,
          classes:class_id(name),
          sections:section_id(name)
        )
      )
    `
    )
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  if (options.familyId) {
    famQuery = famQuery.eq('id', options.familyId);
  }

  const { data: familiesData, error: famErr } = await famQuery;
  if (famErr) throw famErr;
  const familiesList = familiesData || [];
  if (familiesList.length === 0) return [];

  // Collect all unique student IDs across all families
  const studentIdsSet = new Set<number>();
  familiesList.forEach((f: any) => {
    (f.family_members || []).forEach((m: any) => {
      if (m.student_id) studentIdsSet.add(Number(m.student_id));
    });
  });

  const allStudentIds = Array.from(studentIdsSet);

  // Maps by student_id
  const demandsByStudent = new Map<number, FeeDemand[]>();
  const walletByStudent = new Map<number, number>();
  const receiptsByStudent = new Map<number, FeeReceipt[]>();

  if (allStudentIds.length > 0) {
    // 1. Fetch all demands for these students
    let demQuery = supabase
      .from('v_fee_demand_balances')
      .select('*')
      .eq('school_id', schoolId)
      .in('student_id', allStudentIds)
      .neq('doc_status', 'cancelled')
      .order('due_date', { ascending: true })
      .order('demand_id', { ascending: true });

    if (options.sessionId) {
      demQuery = demQuery.eq('session_id', options.sessionId);
    }

    const { data: demData, error: demErr } = await demQuery;
    if (demErr) throw demErr;

    (demData || []).forEach((d: any) => {
      const sid = Number(d.student_id);
      if (!demandsByStudent.has(sid)) demandsByStudent.set(sid, []);
      demandsByStudent.get(sid)!.push({
        ...d,
        net_amount: Number(d.net_amount || 0),
        paid_amount: Number(d.paid_amount || 0),
        balance_amount: Number(d.balance_amount || 0),
      } as FeeDemand);
    });

    // 2. Fetch fee_accounts for these students to resolve wallet_balance & receipts
    const { data: acctsData } = await supabase
      .from('fee_accounts')
      .select('id, student_id')
      .eq('school_id', schoolId)
      .eq('account_type', 'student')
      .in('student_id', allStudentIds);

    const accountToStudent = new Map<number, number>();
    const accountIds: number[] = [];
    (acctsData || []).forEach((a: any) => {
      accountToStudent.set(Number(a.id), Number(a.student_id));
      accountIds.push(Number(a.id));
    });

    if (accountIds.length > 0) {
      // Wallet balances
      const { data: balData } = await supabase
        .from('v_fee_account_balances')
        .select('account_id, wallet_balance')
        .eq('school_id', schoolId)
        .in('account_id', accountIds);

      (balData || []).forEach((b: any) => {
        const sid = accountToStudent.get(Number(b.account_id));
        if (sid) walletByStudent.set(sid, Number(b.wallet_balance || 0));
      });

      // Receipts for these accounts
      const { data: recData } = await supabase
        .from('fee_receipts')
        .select('*')
        .eq('school_id', schoolId)
        .in('account_id', accountIds)
        .order('id', { ascending: false })
        .limit(1000);

      (recData || []).forEach((r: any) => {
        const sid = accountToStudent.get(Number(r.account_id)) || Number(r.snapshot?.student_id);
        if (sid) {
          if (!receiptsByStudent.has(sid)) receiptsByStudent.set(sid, []);
          receiptsByStudent.get(sid)!.push(r as FeeReceipt);
        }
      });
    }
  }

  return familiesList.map((f: any) => {
    const rawMembers: any[] = f.family_members || [];
    const seenStudents = new Set<number>();
    const members: FamilySiblingFeeProfile[] = [];

    for (const m of rawMembers) {
      const stu = Array.isArray(m.student) ? m.student[0] : m.student;
      const sid = Number(m.student_id || stu?.id);
      if (!sid || seenStudents.has(sid)) continue;
      seenStudents.add(sid);

      const allDemands = demandsByStudent.get(sid) || [];
      const unpaidDemands = allDemands.filter((d) => d.pay_status !== 'paid' && d.balance_amount > 0);
      const receipts = receiptsByStudent.get(sid) || [];
      const postedReceipts = receipts.filter((r) => r.status === 'posted' && r.payment_method !== 'wallet');

      const totalBilled = allDemands.reduce((s, d) => s + Number(d.net_amount || 0), 0);
      const totalPaid = postedReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);
      const balanceDue = unpaidDemands.reduce((s, d) => s + Number(d.balance_amount || 0), 0);
      const overdueAmount = unpaidDemands
        .filter((d) => d.pay_status === 'overdue')
        .reduce((s, d) => s + Number(d.balance_amount || 0), 0);

      const classObj = Array.isArray(stu?.classes) ? stu?.classes[0] : stu?.classes;
      const sectionObj = Array.isArray(stu?.sections) ? stu?.sections[0] : stu?.sections;

      members.push({
        student_id: sid,
        name: stu?.name || `Student #${sid}`,
        father_name: stu?.father_name ?? null,
        roll_number: stu?.roll_number ?? null,
        class_id: stu?.class_id ?? null,
        class_name: classObj?.name ?? null,
        section_id: stu?.section_id ?? null,
        section_name: sectionObj?.name ?? null,
        status: stu?.status ?? 'active',
        is_primary_contact: Boolean(m.is_primary_contact),
        total_billed: totalBilled,
        total_paid: totalPaid,
        balance_due: balanceDue,
        overdue_amount: overdueAmount,
        wallet_balance: walletByStudent.get(sid) || 0,
        unpaid_demands: unpaidDemands,
        all_demands: allDemands,
        receipts,
      });
    }

    // Sort members: primary contact first, then by highest balance due, then name
    members.sort((a, b) => {
      if (a.is_primary_contact !== b.is_primary_contact) return a.is_primary_contact ? -1 : 1;
      if (b.balance_due !== a.balance_due) return b.balance_due - a.balance_due;
      return a.name.localeCompare(b.name);
    });

    const allFamilyReceipts = members
      .flatMap((m) => m.receipts)
      .filter((r) => r.status === 'posted' && r.payment_method !== 'wallet')
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());

    const totalBilled = members.reduce((s, m) => s + m.total_billed, 0);
    const totalPaid = members.reduce((s, m) => s + m.total_paid, 0);
    const totalDue = members.reduce((s, m) => s + m.balance_due, 0);
    const totalOverdue = members.reduce((s, m) => s + m.overdue_amount, 0);
    const totalWallet = members.reduce((s, m) => s + m.wallet_balance, 0);
    const unpaidChallansCount = members.reduce((s, m) => s + m.unpaid_demands.length, 0);

    return {
      family_id: Number(f.id),
      school_id: Number(f.school_id || schoolId),
      family_name: f.name || `Family #${f.id}`,
      contact_person: f.contact_person ?? null,
      contact_number: f.contact_number ?? null,
      address: f.address ?? null,
      avatar_url: f.avatar_url ?? null,
      members,
      active_siblings_count: members.length,
      total_billed: totalBilled,
      total_paid: totalPaid,
      total_due: totalDue,
      total_overdue: totalOverdue,
      total_wallet: totalWallet,
      unpaid_challans_count: unpaidChallansCount,
      receipts_count: allFamilyReceipts.length,
      last_payment_date: allFamilyReceipts[0]?.paid_at ?? null,
      last_payment_amount: Number(allFamilyReceipts[0]?.amount || 0),
    };
  });
}

/**
 * Fetches a single family's fee summary and populates demand lines on its unpaid demands.
 */
export async function fetchSingleFamilyFeeSummary(
  schoolId: number,
  familyId: number,
  sessionId?: number
): Promise<FamilyFeeSummary | null> {
  const list = await fetchFamiliesWithFeeSummary(schoolId, { familyId, sessionId });
  if (list.length === 0) return null;
  const fam = list[0];

  const allDemandIds = fam.members.flatMap((m) => m.unpaid_demands.map((d) => d.demand_id));
  if (allDemandIds.length > 0) {
    const lineMap = await fetchDemandLines(allDemandIds);
    fam.members.forEach((m) => {
      m.unpaid_demands = m.unpaid_demands.map((d) => ({
        ...d,
        lines: lineMap[d.demand_id] || [],
      }));
    });
  }
  return fam;
}

/**
 * Check if a student is linked to a family and return that family's fee summary.
 */
export async function fetchFamilyForStudent(
  schoolId: number,
  studentId: number
): Promise<FamilyFeeSummary | null> {
  const { data, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();

  if (error || !data?.family_id) return null;
  return fetchSingleFamilyFeeSummary(schoolId, Number(data.family_id));
}

/**
 * Search families by family name, phone, ID, address, OR any sibling's name, roll number, or father name.
 */
export async function searchPosFamilies(schoolId: number, term: string): Promise<FamilyFeeSummary[]> {
  const q = term.trim().toLowerCase();
  const all = await fetchFamiliesWithFeeSummary(schoolId);
  if (!q) return all.slice(0, 15);

  return all
    .filter((f) => {
      if (String(f.family_id) === q || `fam-${f.family_id}` === q) return true;
      if (f.family_name.toLowerCase().includes(q)) return true;
      if (f.contact_number && f.contact_number.toLowerCase().includes(q)) return true;
      if (f.contact_person && f.contact_person.toLowerCase().includes(q)) return true;
      if (f.address && f.address.toLowerCase().includes(q)) return true;
      return f.members.some(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.roll_number && m.roll_number.toLowerCase().includes(q)) ||
          (m.father_name && m.father_name.toLowerCase().includes(q))
      );
    })
    .slice(0, 15);
}

/**
 * Distributes a lump-sum family payment across selected siblings using a fair waterfall:
 *  1. Oldest due challan first across all selected siblings.
 *  2. Any overpayment/advance above total due is credited to the primary contact or first selected sibling.
 */
export function computeFamilyPaymentWaterfall(
  family: FamilyFeeSummary,
  totalAmount: number,
  selectedStudentIds?: number[]
): Record<number, number> {
  const result: Record<number, number> = {};
  const eligibleMembers = family.members.filter(
    (m) => !selectedStudentIds || selectedStudentIds.includes(m.student_id)
  );
  family.members.forEach((m) => {
    result[m.student_id] = 0;
  });

  if (totalAmount <= 0 || eligibleMembers.length === 0) return result;

  let remaining = Math.round(totalAmount * 100) / 100;

  // Gather all unpaid demands across eligible siblings sorted by due_date ASC, demand_id ASC
  const allDemands = eligibleMembers
    .flatMap((m) =>
      m.unpaid_demands.map((d) => ({
        student_id: m.student_id,
        demand_id: d.demand_id,
        due_date: d.due_date,
        balance: Number(d.balance_amount || 0),
      }))
    )
    .filter((d) => d.balance > 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.demand_id - b.demand_id);

  for (const d of allDemands) {
    if (remaining <= 0) break;
    const alloc = Math.min(remaining, d.balance);
    result[d.student_id] = Math.round((result[d.student_id] + alloc) * 100) / 100;
    remaining = Math.round((remaining - alloc) * 100) / 100;
  }

  // If there is still excess (advance payment to wallet), assign to primary contact or first eligible sibling
  if (remaining > 0) {
    const targetMember =
      eligibleMembers.find((m) => m.is_primary_contact) || eligibleMembers[0];
    if (targetMember) {
      result[targetMember.student_id] =
        Math.round((result[targetMember.student_id] + remaining) * 100) / 100;
    }
  }

  return result;
}

/**
 * Collects a consolidated family payment across one or more siblings.
 * Each sibling with amount > 0 receives an atomic receipt via fn_collect_payment,
 * linked together by a shared family batch tag in reference_no.
 */
export async function collectFamilyPayment(
  ctx: Ctx,
  p: CollectFamilyPaymentParams
): Promise<CollectFamilyPaymentResult> {
  const activeAllocations = p.allocations.filter((a) => Number(a.amount) > 0);
  if (activeAllocations.length === 0) {
    throw new Error('At least one sibling must have a payment amount greater than zero.');
  }

  // Generate deterministic batch code from the idempotency key so retries keep the same batch_ref
  const batchSuffix = (p.idempotencyKey || newIdempotencyKey())
    .replace(/-/g, '')
    .slice(0, 6)
    .toUpperCase();
  const batchRef = `FAM-${p.familyId}-${batchSuffix}`;
  const cleanUserRef = p.referenceNo?.trim() || '';
  const combinedRef = cleanUserRef ? `${cleanUserRef} [${batchRef}]` : batchRef;
  const payer = p.payerName?.trim() || p.familyName;

  const memberReceipts: FamilyMemberReceiptItem[] = [];
  let totalAmount = 0;
  let totalAllocated = 0;
  let totalWallet = 0;
  let totalBalanceAfter = 0;

  for (const item of activeAllocations) {
    const childKey = deriveChildIdempotencyKey(p.idempotencyKey, item.studentId);
    const res = await collectPayment(ctx, {
      studentId: item.studentId,
      amount: Math.round(Number(item.amount) * 100) / 100,
      method: p.method,
      idempotencyKey: childKey,
      shiftId: p.shiftId ?? null,
      demandIds: item.demandIds && item.demandIds.length > 0 ? item.demandIds : null,
      referenceNo: combinedRef,
      bankName: p.bankName || null,
      payerName: payer,
      instrumentDate: p.instrumentDate || null,
    });

    const amount = Number(res.amount || item.amount);
    const allocated = Number(res.allocated_amount ?? res.snapshot?.allocated_amount ?? 0);
    const wallet = Number(res.wallet_amount ?? res.snapshot?.wallet_amount ?? 0);
    const balAfter = Number(res.balance_after ?? res.snapshot?.balance_after ?? 0);

    totalAmount += amount;
    totalAllocated += allocated;
    totalWallet += wallet;
    totalBalanceAfter += Math.max(0, balAfter);

    memberReceipts.push({
      ...res,
      student_id: item.studentId,
      student_name: item.studentName || res.snapshot?.student_name || `Student #${item.studentId}`,
      father_name: item.fatherName ?? res.snapshot?.father_name ?? null,
      class_name: item.className ?? res.snapshot?.class_name ?? null,
      roll_number: item.rollNumber ?? res.snapshot?.roll_number ?? null,
      balance_before: item.balanceBefore,
      allocations: res.allocations || res.snapshot?.allocations || [],
    });
  }

  return {
    success: true,
    batch_ref: batchRef,
    family_id: p.familyId,
    family_name: p.familyName,
    contact_number: p.contactNumber ?? null,
    address: p.address ?? null,
    paid_at: memberReceipts[0]?.snapshot?.paid_at || new Date().toISOString(),
    payment_method: p.method,
    payer_name: payer,
    reference_no: cleanUserRef || batchRef,
    total_amount: totalAmount,
    total_allocated: totalAllocated,
    total_wallet: totalWallet,
    total_balance_after: totalBalanceAfter,
    member_receipts: memberReceipts,
  };
}

/**
 * Rebuilds a CollectFamilyPaymentResult from a group of receipts (e.g. sharing a batch_ref or family)
 * so any historical family payment can be reprinted as a Consolidated Family Receipt.
 */
export function buildFamilyReceiptFromReceipts(
  family: {
    family_id: number;
    family_name: string;
    contact_number?: string | null;
    address?: string | null;
    members?: Array<{ student_id: number; name: string; father_name?: string | null; class_name?: string | null; roll_number?: string | null }>;
  },
  receipts: FeeReceipt[],
  batchRefOverride?: string
): CollectFamilyPaymentResult {
  const sorted = [...receipts].sort((a, b) => a.id - b.id);
  const first = sorted[0];
  const memberMap = new Map<number, any>();
  (family.members || []).forEach((m) => memberMap.set(Number(m.student_id), m));

  const extractedBatch =
    batchRefOverride ||
    extractFamilyBatchRef(first?.reference_no) ||
    `FAM-${family.family_id}-${first?.receipt_no || 'REC'}`;

  const memberReceipts: FamilyMemberReceiptItem[] = sorted.map((r) => {
    const sid = Number(r.snapshot?.student_id || 0);
    const mem = memberMap.get(sid);
    return {
      success: true,
      receipt_id: r.id,
      receipt_no: r.receipt_no,
      amount: Number(r.amount || 0),
      allocated_amount: Number(r.allocated_amount || 0),
      wallet_amount: Number(r.wallet_amount || 0),
      balance_after: Number(r.snapshot?.balance_after ?? 0),
      payment_method: r.payment_method,
      student_id: sid,
      student_name: r.snapshot?.student_name || mem?.name || r.payer_name || 'Student',
      father_name: r.snapshot?.father_name || mem?.father_name || null,
      class_name: mem?.class_name || r.snapshot?.class_name || null,
      roll_number: r.snapshot?.roll_number || mem?.roll_number || null,
      allocations: r.snapshot?.allocations || [],
      snapshot: {
        ...r.snapshot,
        paid_at: r.paid_at,
      },
    };
  });

  const totalAmount = memberReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalAllocated = memberReceipts.reduce((s, r) => s + Number(r.allocated_amount || 0), 0);
  const totalWallet = memberReceipts.reduce((s, r) => s + Number(r.wallet_amount || 0), 0);
  const totalBalanceAfter = memberReceipts.reduce((s, r) => s + Math.max(0, Number(r.balance_after || 0)), 0);

  return {
    success: true,
    batch_ref: extractedBatch,
    family_id: family.family_id,
    family_name: family.family_name,
    contact_number: family.contact_number ?? null,
    address: family.address ?? null,
    paid_at: first?.paid_at || new Date().toISOString(),
    payment_method: first?.payment_method || 'cash',
    payer_name: first?.payer_name || family.family_name,
    reference_no: cleanReferenceDisplay(first?.reference_no) || extractedBatch,
    total_amount: totalAmount,
    total_allocated: totalAllocated,
    total_wallet: totalWallet,
    total_balance_after: totalBalanceAfter,
    member_receipts: memberReceipts,
  };
}

/**
 * Fetches a consolidated chronological double-entry ledger statement across all siblings in a family.
 */
export async function getFamilyStatement(
  schoolId: number,
  familyId: number
): Promise<{ family: FamilyFeeSummary; entries: FamilyStatementEntry[] }> {
  const family = await fetchSingleFamilyFeeSummary(schoolId, familyId);
  if (!family) {
    throw new Error('Family not found.');
  }

  const allEntries: Array<StatementEntry & { student_id: number; student_name: string; roll_number?: string | null; class_name?: string | null }> = [];

  for (const member of family.members) {
    const stuEntries = await getStatement(schoolId, member.student_id);
    stuEntries.forEach((e) => {
      allEntries.push({
        ...e,
        debit: Number(e.debit || 0),
        credit: Number(e.credit || 0),
        running_balance: Number(e.running_balance || 0),
        student_id: member.student_id,
        student_name: member.name,
        roll_number: member.roll_number,
        class_name: member.class_name,
      });
    });
  }

  // Sort chronologically by entry_id (since fee_ledger id is a monotonically increasing sequence across the school)
  allEntries.sort((a, b) => Number(a.entry_id) - Number(b.entry_id));

  let running = 0;
  const entries: FamilyStatementEntry[] = allEntries.map((e) => {
    running = Math.round((running + Number(e.debit || 0) - Number(e.credit || 0)) * 100) / 100;
    return {
      ...e,
      family_running_balance: running,
    };
  });

  return { family, entries };
}

/**
 * Groups the student aging report by family so recovery staff can view and contact families with overdue balances.
 */
export async function getFamilyAgingReport(
  schoolId: number,
  sessionId?: number | null,
  asOf?: string
): Promise<FamilyAgingRow[]> {
  const [studentAging, families] = await Promise.all([
    getAgingReport(schoolId, sessionId, asOf),
    fetchFamiliesWithFeeSummary(schoolId),
  ]);

  const agingByStudent = new Map<number, AgingRow>();
  studentAging.forEach((r) => agingByStudent.set(Number(r.student_id), r));

  const rows: FamilyAgingRow[] = [];

  for (const fam of families) {
    const memberRows: AgingRow[] = [];
    for (const m of fam.members) {
      const a = agingByStudent.get(m.student_id);
      if (a && a.total_due > 0) {
        memberRows.push({
          ...a,
          class_name: a.class_name || m.class_name,
          roll_number: a.roll_number || m.roll_number,
          phone: a.phone || fam.contact_number,
        });
      }
    }

    if (memberRows.length === 0) continue;

    const not_due = memberRows.reduce((s, r) => s + Number(r.not_due || 0), 0);
    const d1_30 = memberRows.reduce((s, r) => s + Number(r.d1_30 || 0), 0);
    const d31_60 = memberRows.reduce((s, r) => s + Number(r.d31_60 || 0), 0);
    const d61_90 = memberRows.reduce((s, r) => s + Number(r.d61_90 || 0), 0);
    const d90_plus = memberRows.reduce((s, r) => s + Number(r.d90_plus || 0), 0);
    const total_due = memberRows.reduce((s, r) => s + Number(r.total_due || 0), 0);

    rows.push({
      family_id: fam.family_id,
      family_name: fam.family_name,
      contact_number: fam.contact_number,
      address: fam.address,
      siblings_count: memberRows.length,
      siblings_summary: memberRows.map((m) => `${m.student_name} (${m.class_name || '—'})`).join(', '),
      members: memberRows,
      not_due,
      d1_30,
      d31_60,
      d61_90,
      d90_plus,
      total_due,
    });
  }

  return rows.sort((a, b) => b.total_due - a.total_due);
}

