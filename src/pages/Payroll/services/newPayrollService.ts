import { supabase } from '../../../supabaseClient';
import { fetchAllRows } from '../../../utils/paginationHelper';

export interface SalaryPlanItem {
  id?: string;
  name: string;
  amount: number;
  startMonth?: string;
  endMonth?: string;
}

export interface StaffSalaryProfile {
  id: number;
  schoolId: number;
  staffId: number;
  name: string;
  role: string;
  planName: string;
  phone?: string;
  basicPay: number;
  hasPlan: boolean;
  allowances: SalaryPlanItem[];
  fixedDeductions: SalaryPlanItem[];
  planId: number;
  status: string;
  updatedAt?: string;
}

export interface StaffAdjustment {
  id: number;
  schoolId: number;
  staffId: number;
  staffName?: string;
  role?: string;
  month: number;
  year: number;
  type: 'addition' | 'subtraction';
  title: string;
  amount: number;
  remarks?: string;
  createdAt?: string;
}

export interface NewPayrollGeneration {
  id: number;
  schoolId: number;
  staffId: number;
  planId?: number;
  planName?: string;
  payrollMonth: number;
  payrollYear: number;
  basicPay: number;
  hasPlan?: boolean;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  paidAmount: number;
  remainingBalance: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateDays: number;
  absentDeductions: number;
  lateDeductions: number;
  advanceDeductions: number;
  oldBalanceAmount: number;
  leaveBonusAmount: number;
  status: 'draft' | 'locked' | 'unpaid' | 'partially_paid' | 'paid';
  earningsItems: Array<{ name: string; amount: number }>;
  deductionItems: Array<{ name: string; amount: number }>;
  staff?: {
    id: number;
    name: string;
    role: string;
  };
  isLocked?: boolean;
  createdAt?: string;
}

export interface PayrollPaymentRecord {
  id: number;
  schoolId: number;
  generationId: number;
  staffId: number;
  amount: number;
  paymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other';
  referenceNo?: string;
  remarks?: string;
  paymentDate: string;
  createdAt?: string;
}

export interface StaffAdvanceLoan {
  id: number;
  schoolId: number;
  staffId: number;
  totalAmount: number;
  monthlyInstallment: number;
  repaidAmount: number;
  remainingBalance: number;
  reason?: string;
  status: 'active' | 'completed';
  createdAt?: string;
}

export const newPayrollService = {
  /**
   * Fetch all staff salary plans (Only list staff members who have plans)
   */
  async getStaffSalaryProfiles(schoolId: number): Promise<StaffSalaryProfile[]> {
    // 1. Fetch active payroll plans with active staff relation
    const { data: planData, error: planErr } = await supabase
      .from('payroll_plans')
      .select('*, staff:staff_id (id, name, role, mobile, status)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (planErr) throw planErr;
    if (!planData || planData.length === 0) return [];

    // Filter strictly for active staff members
    const activePlanData = planData.filter(p => p.staff && (p.staff.status === 'active' || p.staff.status === undefined));
    if (activePlanData.length === 0) return [];

    const planIds = activePlanData.map(p => p.id);

    // 2. Fetch plan items (Allowances & Deductions)
    const allowancesMap = new Map<number, Array<{ id: string; name: string; amount: number }>>();
    const deductionsMap = new Map<number, Array<{ id: string; name: string; amount: number }>>();

    if (planIds.length > 0) {
      const { data: itemData } = await supabase
        .from('payroll_plan_items')
        .select('*')
        .in('plan_id', planIds);

      if (itemData) {
        itemData.forEach(item => {
          let startMonth = '';
          let endMonth = '';
          if (item.calculation_basis) {
            try {
              const meta = JSON.parse(item.calculation_basis);
              startMonth = meta.startMonth || '';
              endMonth = meta.endMonth || '';
            } catch (e) {}
          }
          const itemObj = {
            id: String(item.id),
            name: item.name,
            amount: parseFloat(item.amount || '0'),
            startMonth,
            endMonth,
          };
          if (item.item_type === 'allowance') {
            if (!allowancesMap.has(item.plan_id)) allowancesMap.set(item.plan_id, []);
            allowancesMap.get(item.plan_id)!.push(itemObj);
          } else if (item.item_type === 'deduction') {
            if (!deductionsMap.has(item.plan_id)) deductionsMap.set(item.plan_id, []);
            deductionsMap.get(item.plan_id)!.push(itemObj);
          }
        });
      }
    }

    return activePlanData.map(p => ({
      id: p.id,
      schoolId: p.school_id,
      staffId: p.staff_id,
      name: p.staff?.name || `Staff #${p.staff_id}`,
      role: p.staff?.role || 'Staff',
      planName: p.name || 'Standard Plan',
      phone: p.staff?.mobile || '',
      basicPay: parseFloat(p.basic_pay || '0'),
      hasPlan: true,
      allowances: allowancesMap.get(p.id) || [],
      fixedDeductions: deductionsMap.get(p.id) || [],
      planId: p.id,
      status: p.status || 'active',
      updatedAt: p.updated_at,
    }));
  },

  /**
   * Create a new custom salary plan for a staff member (Allows multiple plans per staff)
   */
  async createStaffSalaryPlan(
    schoolId: number,
    staffId: number,
    planName: string,
    basicPay: number,
    allowances: Array<{ name: string; amount: number; startMonth?: string; endMonth?: string }> = [],
    fixedDeductions: Array<{ name: string; amount: number; startMonth?: string; endMonth?: string }> = [],
    userId?: number
  ): Promise<void> {
    const { data: inserted, error: planErr } = await supabase
      .from('payroll_plans')
      .insert({
        school_id: schoolId,
        staff_id: staffId,
        name: planName.trim() || 'Salary Plan',
        basic_pay: basicPay,
        status: 'active',
        effective_from: new Date().toISOString().split('T')[0],
        created_by: userId,
      })
      .select('id')
      .single();

    if (planErr) throw planErr;
    const planId = inserted.id;

    const itemsToInsert: any[] = [];

    allowances.forEach((a, idx) => {
      if (a.name.trim() && a.amount > 0) {
        itemsToInsert.push({
          school_id: schoolId,
          plan_id: planId,
          item_type: 'allowance',
          name: a.name.trim(),
          amount_type: 'fixed',
          amount: a.amount,
          calculation_basis: JSON.stringify({ startMonth: a.startMonth || '', endMonth: a.endMonth || '' }),
          is_taxable: false,
          display_order: idx,
        });
      }
    });

    fixedDeductions.forEach((d, idx) => {
      if (d.name.trim() && d.amount > 0) {
        itemsToInsert.push({
          school_id: schoolId,
          plan_id: planId,
          item_type: 'deduction',
          name: d.name.trim(),
          amount_type: 'fixed',
          amount: d.amount,
          calculation_basis: JSON.stringify({ startMonth: d.startMonth || '', endMonth: d.endMonth || '' }),
          is_taxable: false,
          display_order: idx,
        });
      }
    });

    if (itemsToInsert.length > 0) {
      const { error: insertErr } = await supabase.from('payroll_plan_items').insert(itemsToInsert);
      if (insertErr) console.error('Error inserting plan items:', insertErr);
    }
  },

  /**
   * Purge / Remove all salary plans for a fresh reset
   */
  async clearAllSalaryPlans(schoolId: number): Promise<void> {
    // 1. Delete all plan items
    await supabase.from('payroll_plan_items').delete().eq('school_id', schoolId);
    // 2. Delete all plans
    await supabase.from('payroll_plans').delete().eq('school_id', schoolId);
  },

  /**
   * Delete salary plan for a specific staff member
   */
  async deleteStaffSalaryPlan(schoolId: number, planId: number): Promise<void> {
    await supabase.from('payroll_plan_items').delete().eq('school_id', schoolId).eq('plan_id', planId);
    await supabase.from('payroll_plans').delete().eq('school_id', schoolId).eq('id', planId);
  },

  /**
   * Save or update a staff member's full salary plan (Basic Pay, Allowances, Deductions)
   */
  async updateStaffSalaryProfile(
    schoolId: number,
    staffId: number,
    basicPay: number,
    allowances: Array<{ name: string; amount: number }> = [],
    fixedDeductions: Array<{ name: string; amount: number }> = [],
    userId?: number
  ): Promise<void> {
    // 1. Check if plan exists
    const { data: existingPlans } = await supabase
      .from('payroll_plans')
      .select('id')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const existingPlan = existingPlans && existingPlans.length > 0 ? existingPlans[0] : null;

    let planId = existingPlan?.id || 0;

    if (existingPlan) {
      const { error } = await supabase
        .from('payroll_plans')
        .update({ basic_pay: basicPay, updated_at: new Date().toISOString() })
        .eq('id', existingPlan.id);
      if (error) throw error;
    } else {
      const { data: inserted } = await supabase
        .from('payroll_plans')
        .insert({
          school_id: schoolId,
          staff_id: staffId,
          name: `Salary Plan for Staff #${staffId}`,
          basic_pay: basicPay,
          status: 'active',
          effective_from: new Date().toISOString().split('T')[0],
          created_by: userId,
        })
        .select('id')
        .single();
      if (inserted) planId = inserted.id;
    }

    // 2. Refresh Plan Items
    if (planId > 0) {
      // Delete old items
      await supabase
        .from('payroll_plan_items')
        .delete()
        .eq('school_id', schoolId)
        .eq('plan_id', planId);

      const itemsToInsert: any[] = [];

      allowances.forEach((a, idx) => {
        if (a.name.trim() && a.amount > 0) {
          itemsToInsert.push({
            school_id: schoolId,
            plan_id: planId,
            item_type: 'allowance',
            name: a.name.trim(),
            amount_type: 'fixed',
            amount: a.amount,
            is_taxable: false,
            display_order: idx,
          });
        }
      });

      fixedDeductions.forEach((d, idx) => {
        if (d.name.trim() && d.amount > 0) {
          itemsToInsert.push({
            school_id: schoolId,
            plan_id: planId,
            item_type: 'deduction',
            name: d.name.trim(),
            amount_type: 'fixed',
            amount: d.amount,
            is_taxable: false,
            display_order: idx,
          });
        }
      });

      if (itemsToInsert.length > 0) {
        const { error: insertErr } = await supabase.from('payroll_plan_items').insert(itemsToInsert);
        if (insertErr) console.error('Error inserting plan items:', insertErr);
      }
    }
  },

  /**
   * Calculate Attendance Metrics strictly from actual rows in staff_attendance_records table.
   * Based MERELY on data available in the database (no invented/defaulted attendance).
   */
  async getAttendanceSummary(
    schoolId: number,
    staffId: number,
    month: number,
    year: number
  ): Promise<{ workingDays: number; presentDays: number; absentDays: number; leaveDays: number; lateDays: number; halfDayLeaves: number }> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Read saved weekend rule setting
    let weekendRule = 'sunday_only';
    try {
      const stored = localStorage.getItem(`payroll_settings_${schoolId}`);
      if (stored) {
        const p = JSON.parse(stored);
        if (p.weekendRule) weekendRule = p.weekendRule;
      }
    } catch (e) {}

    // Calculate calendar working days in month excluding weekends
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dObj = new Date(year, month - 1, day);
      const dayOfWeek = dObj.getDay(); // 0 = Sunday, 6 = Saturday
      if (weekendRule === 'sat_sun' && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
      if (weekendRule !== 'no_weekend' && dayOfWeek === 0) continue;
      workingDays++;
    }

    // Query staff_attendance_records directly for target staff, school, and date range
    const { data: records, error } = await supabase
      .from('staff_attendance_records')
      .select('date, status')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching staff_attendance_records in getAttendanceSummary:', error);
    }

    let presentDays = 0;
    let lateDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let halfDayLeaves = 0;

    if (records && records.length > 0) {
      const dateMap = new Map<string, string>();
      records.forEach(r => {
        const d = (r.date || '').split('T')[0];
        if (d) {
          dateMap.set(d, (r.status || '').toLowerCase().trim());
        }
      });

      dateMap.forEach(statusStr => {
        if (statusStr === 'present' || statusStr === 'p') {
          presentDays++;
        } else if (statusStr === 'late' || statusStr === 'lt') {
          lateDays++;
          presentDays++; // Late counts as present
        } else if (statusStr === 'leave' || statusStr === 'l') {
          leaveDays++;
        } else if (statusStr === 'absent' || statusStr === 'a') {
          absentDays++;
        } else if (statusStr === 'half_day' || statusStr === 'half' || statusStr === 'h') {
          halfDayLeaves++;
          presentDays += 0.5;
          leaveDays += 0.5;
        }
      });
    }

    return {
      workingDays: Math.max(1, workingDays),
      presentDays: Math.round(presentDays),
      absentDays: Math.round(absentDays),
      leaveDays: Math.round(leaveDays),
      lateDays,
      halfDayLeaves,
    };
  },

  /**
   * Fetch active advance loan for staff
   */
  async getActiveAdvanceLoan(schoolId: number, staffId: number): Promise<StaffAdvanceLoan | null> {
    const { data } = await supabase
      .from('payroll_advances')
      .select('*')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .in('status', ['active', 'approved'])
      .maybeSingle();

    if (!data) return null;

    const totalAmount = parseFloat(data.amount || '0');
    const monthlyInstallment = parseFloat(data.repayment_amount_per_month || data.monthly_installment || '0') || totalAmount;
    const remainingBalance = parseFloat(data.remaining_balance !== undefined && data.remaining_balance !== null ? data.remaining_balance : String(totalAmount - parseFloat(data.repaid_amount || '0')));
    const repaidAmount = parseFloat(data.repaid_amount || '0') || (totalAmount - remainingBalance);

    return {
      id: data.id,
      schoolId: data.school_id,
      staffId: data.staff_id,
      totalAmount,
      monthlyInstallment,
      repaidAmount,
      remainingBalance: Math.max(0, remainingBalance),
      reason: data.reason || 'Salary Advance',
      status: remainingBalance > 0 ? 'active' : 'completed',
    };
  },

  /**
   * Calculate previous unpaid balance / arrears for a staff member prior to month & year
   */
  async getPreviousUnpaidBalance(schoolId: number, staffId: number, month: number, year: number): Promise<number> {
    const { data: gens } = await supabase
      .from('payroll_generations')
      .select('id, net_salary, payroll_month, payroll_year')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId);

    if (!gens || gens.length === 0) return 0;

    const priorGens = gens.filter(g => {
      if (g.payroll_year < year) return true;
      if (g.payroll_year === year && g.payroll_month < month) return true;
      return false;
    });

    if (priorGens.length === 0) return 0;

    const genIds = priorGens.map(g => g.id);

    const { data: payments } = await supabase
      .from('payroll_payments')
      .select('generation_id, amount')
      .eq('school_id', schoolId)
      .in('generation_id', genIds)
      .eq('status', 'completed');

    const paymentsMap = new Map<number, number>();
    if (payments) {
      payments.forEach(p => {
        const cur = paymentsMap.get(p.generation_id) || 0;
        paymentsMap.set(p.generation_id, cur + parseFloat(p.amount || '0'));
      });
    }

    let totalArrears = 0;
    priorGens.forEach(g => {
      const net = parseFloat(g.net_salary || '0');
      const paid = paymentsMap.get(g.id) || 0;
      const unpaid = Math.max(0, net - paid);
      totalArrears += unpaid;
    });

    return Math.round(totalArrears);
  },

  /**
   * Generate or preview Monthly Payroll for a staff member using their full Salary Plan
   */
  async generateMonthlyPayroll(
    schoolId: number,
    staffId: number,
    month: number,
    year: number,
    basicPayInput?: number,
    userId?: number,
    saveToDb: boolean = false
  ): Promise<NewPayrollGeneration & { isGeneratedInDb: boolean }> {
    // 1. Fetch Staff info
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('id', staffId)
      .single();

    // 2. Fetch Plan & Items (Allowances & Fixed Deductions)
    const { data: planList } = await supabase
      .from('payroll_plans')
      .select('id, basic_pay')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const plan = planList && planList.length > 0 ? planList[0] : null;

    const hasPlan = !!plan || basicPayInput !== undefined;
    let basicPay = basicPayInput !== undefined ? basicPayInput : (plan ? parseFloat(plan.basic_pay || '0') : 0);
    let allowances: Array<{ name: string; amount: number }> = [];
    let fixedDeductions: Array<{ name: string; amount: number }> = [];

    const targetKey = `${year}-${String(month).padStart(2, '0')}`;

    if (plan) {
      const { data: items } = await supabase
        .from('payroll_plan_items')
        .select('*')
        .eq('school_id', schoolId)
        .eq('plan_id', plan.id);

      if (items) {
        items.forEach(i => {
          const amt = parseFloat(i.amount || '0');
          let startMonth = '';
          let endMonth = '';
          if (i.calculation_basis) {
            try {
              const meta = JSON.parse(i.calculation_basis);
              startMonth = meta.startMonth || '';
              endMonth = meta.endMonth || '';
            } catch (e) {}
          }

          // Exclude if target month is before startMonth or after endMonth (expired)
          if (startMonth && targetKey < startMonth) return;
          if (endMonth && targetKey > endMonth) return;

          if (i.item_type === 'allowance') allowances.push({ name: i.name, amount: amt });
          else if (i.item_type === 'deduction') fixedDeductions.push({ name: i.name, amount: amt });
        });
      }
    }

    // 3. Attendance
    const att = await this.getAttendanceSummary(schoolId, staffId, month, year);
    const daysInMonth = att.workingDays || 30;
    const dailyRate = basicPay / daysInMonth;

    // Read saved payroll settings
    let absentCutMode = 'prorata';
    let fixedAbsentRate = 500;
    let lateLeniencyCount = 3;
    let lateDeductionDays = 1;
    let lateFineMode = 'days';
    let fixedLateFine = 200;
    let allowedPaidLeaves = 0;
    let autoDeductAdvance = true;

    try {
      const stored = localStorage.getItem(`payroll_settings_${schoolId}`);
      if (stored) {
        const p = JSON.parse(stored);
        if (p.absentCutMode) absentCutMode = p.absentCutMode;
        if (p.fixedAbsentRate !== undefined) fixedAbsentRate = p.fixedAbsentRate;
        if (p.lateLeniencyCount !== undefined) lateLeniencyCount = p.lateLeniencyCount;
        if (p.lateDeductionDays !== undefined) lateDeductionDays = p.lateDeductionDays;
        if (p.lateFineMode) lateFineMode = p.lateFineMode;
        if (p.fixedLateFine !== undefined) fixedLateFine = p.fixedLateFine;
        if (p.allowedPaidLeaves !== undefined) allowedPaidLeaves = p.allowedPaidLeaves;
        if (p.autoDeductAdvance !== undefined) autoDeductAdvance = !!p.autoDeductAdvance;
      }
    } catch (e) {}

    // Calculate leave & absent deductions
    // Paid leaves absorb approved Leave days first, then remaining paid leave allowance absorbs Absent days.
    // Days beyond the allowed quota are deducted.
    const paidLeaveAllowance = allowedPaidLeaves;
    let paidLeaveUsed = 0;
    let unpaidLeaveDays = 0;
    let unpaidAbsentDays = 0;

    // 1. Process Leave days against paid leave allowance
    if (att.leaveDays <= paidLeaveAllowance) {
      paidLeaveUsed = att.leaveDays;
      unpaidLeaveDays = 0;
    } else {
      paidLeaveUsed = paidLeaveAllowance;
      unpaidLeaveDays = att.leaveDays - paidLeaveAllowance;
    }

    // 2. Remaining paid leave quota can cover absent days
    const remainingPaidQuota = Math.max(0, paidLeaveAllowance - paidLeaveUsed);
    if (att.absentDays <= remainingPaidQuota) {
      unpaidAbsentDays = 0;
    } else {
      unpaidAbsentDays = att.absentDays - remainingPaidQuota;
    }

    const totalUnpaidDays = unpaidLeaveDays + unpaidAbsentDays;

    let absentDeductions = 0;
    if (absentCutMode === 'prorata') {
      absentDeductions = Math.round(dailyRate * totalUnpaidDays);
    } else if (absentCutMode === 'fixed') {
      absentDeductions = Math.round(fixedAbsentRate * totalUnpaidDays);
    }

    // Calculate late deductions
    const excessLates = Math.max(0, att.lateDays - lateLeniencyCount);
    let lateDeductions = 0;
    if (excessLates > 0) {
      if (lateFineMode === 'fixed') {
        lateDeductions = Math.round(excessLates * fixedLateFine);
      } else {
        const penalizedDays = Math.ceil(excessLates / 3) * lateDeductionDays;
        lateDeductions = Math.round(dailyRate * penalizedDays);
      }
    }

    // Advance recovery
    let advanceDeductions = 0;
    if (autoDeductAdvance) {
      const advanceLoan = await this.getActiveAdvanceLoan(schoolId, staffId);
      if (advanceLoan && advanceLoan.remainingBalance > 0) {
        advanceDeductions = Math.min(advanceLoan.monthlyInstallment, advanceLoan.remainingBalance);
      }
    }

    // 5. One-Time Monthly Adjustments (Additions & Subtractions)
    const adjustments = await this.getMonthlyAdjustments(schoolId, month, year);
    const staffAdjustments = adjustments.filter(a => a.staffId === staffId);

    // 6. Arrears / Previous Unpaid Salary Balance
    const oldBalanceAmount = await this.getPreviousUnpaidBalance(schoolId, staffId, month, year);

    let totalAdditions = 0;
    let totalSubtractions = 0;

    const earningsItems: Array<{ name: string; amount: number }> = [...allowances];
    const deductionItems: Array<{ name: string; amount: number }> = [...fixedDeductions];

    if (oldBalanceAmount > 0) {
      earningsItems.push({ name: 'Arrears / Previous Unpaid Balance', amount: oldBalanceAmount });
    }

    staffAdjustments.forEach(adj => {
      if (adj.type === 'addition') {
        totalAdditions += adj.amount;
        earningsItems.push({ name: `Adjustment (+) ${adj.title}`, amount: adj.amount });
      } else if (adj.type === 'subtraction') {
        totalSubtractions += adj.amount;
        deductionItems.push({ name: `Adjustment (-) ${adj.title}`, amount: adj.amount });
      }
    });

    // 7. Totals calculation
    const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalFixedDeductions = fixedDeductions.reduce((sum, d) => sum + d.amount, 0);

    const totalEarnings = Math.round(basicPay + totalAllowances + totalAdditions + oldBalanceAmount);
    const totalDeductions = Math.round(totalFixedDeductions + absentDeductions + lateDeductions + advanceDeductions + totalSubtractions);
    const netSalary = Math.max(0, totalEarnings - totalDeductions);

    if (absentDeductions > 0) {
      const parts = [];
      if (unpaidAbsentDays > 0) parts.push(`${unpaidAbsentDays} unapproved absent`);
      if (unpaidLeaveDays > 0) parts.push(`${unpaidLeaveDays} unpaid leave`);
      deductionItems.push({ name: `Leave/Absent Cut (${parts.join(', ') || `${totalUnpaidDays} days`})`, amount: absentDeductions });
    }
    if (lateDeductions > 0) deductionItems.push({ name: `Late Fine (${att.lateDays} late arrivals)`, amount: lateDeductions });
    if (advanceDeductions > 0) deductionItems.push({ name: 'Advance Repayment', amount: advanceDeductions });

    // Check if generation record already exists
    const { data: existingGen } = await supabase
      .from('payroll_generations')
      .select('*')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('payroll_month', month)
      .eq('payroll_year', year)
      .maybeSingle();

    let genId = existingGen?.id || 0;
    const isGeneratedInDb = !!existingGen;

    // Build Immutable Snapshot Object for this month & year
    const planSnapshot = {
      basicPay,
      allowances,
      fixedDeductions,
      totalAllowances,
      totalFixedDeductions,
      generatedAt: new Date().toISOString(),
    };

    const calculationDetails = {
      earningsItems,
      deductionItems,
    };

    // If generation already exists, keep its frozen snapshot basicPay and figures unless overridden
    let finalBasicPay = basicPay;
    let finalTotalEarnings = totalEarnings;
    let finalTotalDeductions = totalDeductions;
    let finalNetSalary = netSalary;
    let finalEarningsItems = earningsItems;
    let finalDeductionItems = deductionItems;

    if (existingGen && existingGen.plan_snapshot) {
      const snap = existingGen.plan_snapshot;
      if (snap.basicPay !== undefined && !basicPayInput) {
        finalBasicPay = snap.basicPay;
        finalTotalEarnings = parseFloat(existingGen.total_earnings || String(totalEarnings));
        finalTotalDeductions = parseFloat(existingGen.total_deductions || String(totalDeductions));
        finalNetSalary = parseFloat(existingGen.net_salary || String(netSalary));
        if (existingGen.calculation_details) {
          finalEarningsItems = existingGen.calculation_details.earningsItems || earningsItems;
          finalDeductionItems = existingGen.calculation_details.deductionItems || deductionItems;
        }
      }
    }

    const payload: any = {
      school_id: schoolId,
      staff_id: staffId,
      payroll_month: month,
      payroll_year: year,
      gross_salary: finalTotalEarnings,
      total_earnings: finalTotalEarnings,
      total_deductions: finalTotalDeductions,
      net_salary: finalNetSalary,
      working_days: att.workingDays,
      present_days: att.presentDays,
      absent_days: att.absentDays,
      leave_days: att.leaveDays,
      late_days: att.lateDays,
      absent_deductions: absentDeductions,
      late_deductions: lateDeductions,
      advance_deductions: advanceDeductions,
      old_balance: oldBalanceAmount,
      plan_snapshot: existingGen?.plan_snapshot || planSnapshot,
      calculation_details: existingGen?.calculation_details || calculationDetails,
      status: existingGen ? existingGen.status : 'approved',
    };

    if (userId) {
      payload.generated_by = userId;
    }

    if (saveToDb) {
      if (existingGen) {
        const { error: updErr } = await supabase.from('payroll_generations').update(payload).eq('id', existingGen.id);
        if (updErr) console.error('Error updating payroll generation:', updErr);
      } else {
        const { data: inserted, error: insErr } = await supabase.from('payroll_generations').insert(payload).select('id').single();
        if (insErr) {
          console.error('Error inserting payroll generation:', insErr);
          throw insErr;
        }
        if (inserted) genId = inserted.id;
      }
    }

    // Fetch payments to calculate paid balance
    let paidAmount = 0;
    if (genId > 0) {
      const { data: payments } = await supabase
        .from('payroll_payments')
        .select('amount, status')
        .eq('school_id', schoolId)
        .eq('generation_id', genId)
        .eq('status', 'completed');

      paidAmount = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) : 0;
    }

    const remainingBalance = Math.max(0, finalNetSalary - paidAmount);

    let status: NewPayrollGeneration['status'] = 'unpaid';
    if (paidAmount >= finalNetSalary && finalNetSalary > 0) status = 'paid';
    else if (paidAmount > 0) status = 'partially_paid';

    return {
      id: genId,
      schoolId,
      staffId,
      payrollMonth: month,
      payrollYear: year,
      basicPay: finalBasicPay,
      totalEarnings: finalTotalEarnings,
      totalDeductions: finalTotalDeductions,
      netSalary: finalNetSalary,
      paidAmount,
      remainingBalance,
      workingDays: att.workingDays,
      presentDays: att.presentDays,
      absentDays: att.absentDays,
      leaveDays: att.leaveDays,
      lateDays: att.lateDays,
      absentDeductions,
      lateDeductions,
      advanceDeductions,
      oldBalanceAmount,
      leaveBonusAmount: 0,
      status,
      earningsItems: finalEarningsItems,
      deductionItems: finalDeductionItems,
      staff: staff ? { id: staff.id, name: staff.name, role: staff.role } : undefined,
      isGeneratedInDb,
    };
  },

  /**
   * Clear / Remove all salary generation and payment records for a clean reset
   */
  async clearAllSalaryRecords(schoolId: number): Promise<void> {
    // 1. Delete all payments
    const { error: payErr } = await supabase
      .from('payroll_payments')
      .delete()
      .eq('school_id', schoolId);
    if (payErr) console.error('Error clearing payments:', payErr);

    // 2. Delete all generations
    const { error: genErr } = await supabase
      .from('payroll_generations')
      .delete()
      .eq('school_id', schoolId);
    if (genErr) console.error('Error clearing generations:', genErr);
  },

  /**
   * Delete a single staff payroll generation if no payment has been made yet
   */
  async deleteSinglePayrollGeneration(schoolId: number, generationId: number): Promise<void> {
    const { data: payments } = await supabase
      .from('payroll_payments')
      .select('id')
      .eq('school_id', schoolId)
      .eq('generation_id', generationId);

    if (payments && payments.length > 0) {
      throw new Error('Cannot delete payroll generation because payment disbursements have already been recorded.');
    }

    const { error } = await supabase
      .from('payroll_generations')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', generationId);

    if (error) throw error;
  },

  /**
   * Fetch all payroll generations for a school & month (Only staff members WITH salary plans)
   * Skips recalculation for staff who ALREADY have a generated payroll record in DB to save time.
   */
  async getMonthlyGenerations(
    schoolId: number,
    month: number,
    year: number
  ): Promise<Array<NewPayrollGeneration & { isGeneratedInDb: boolean }>> {
    const profiles = await this.getStaffSalaryProfiles(schoolId);
    if (!profiles || profiles.length === 0) return [];

    // 1. Single batch query for all existing generated payroll records in DB for target month & year
    const { data: existingGens, error: genErr } = await supabase
      .from('payroll_generations')
      .select('*, staff:staff_id (id, name, role)')
      .eq('school_id', schoolId)
      .eq('payroll_month', month)
      .eq('payroll_year', year);

    if (genErr) console.warn('Error fetching existing payroll_generations batch:', genErr);

    const existingGenMap = new Map<number, any>();
    const genIds: number[] = [];

    if (existingGens) {
      existingGens.forEach(g => {
        existingGenMap.set(g.staff_id, g);
        genIds.push(g.id);
      });
    }

    // 2. Single batch query for completed payments for existing generations
    const paymentsMap = new Map<number, number>();
    if (genIds.length > 0) {
      const { data: payments } = await supabase
        .from('payroll_payments')
        .select('generation_id, amount')
        .eq('school_id', schoolId)
        .in('generation_id', genIds)
        .eq('status', 'completed');

      if (payments) {
        payments.forEach(p => {
          const current = paymentsMap.get(p.generation_id) || 0;
          paymentsMap.set(p.generation_id, current + parseFloat(p.amount || '0'));
        });
      }
    }

    const results: Array<NewPayrollGeneration & { isGeneratedInDb: boolean }> = [];
    const processedStaffIds = new Set<number>();

    for (const prof of profiles) {
      if (processedStaffIds.has(prof.staffId)) continue;
      processedStaffIds.add(prof.staffId);

      const existingGen = existingGenMap.get(prof.staffId);

      if (existingGen) {
        // SKIP RECALCULATION: Map directly from saved DB record
        const netSalary = parseFloat(existingGen.net_salary || '0');
        const paidAmount = paymentsMap.get(existingGen.id) || 0;
        const remainingBalance = Math.max(0, netSalary - paidAmount);

        let status: NewPayrollGeneration['status'] = 'unpaid';
        if (paidAmount >= netSalary && netSalary > 0) status = 'paid';
        else if (paidAmount > 0) status = 'partially_paid';

        const calcDetails = existingGen.calculation_details || {};

        results.push({
          id: existingGen.id,
          schoolId: existingGen.school_id,
          staffId: existingGen.staff_id,
          planId: prof.planId,
          planName: prof.planName,
          payrollMonth: existingGen.payroll_month,
          payrollYear: existingGen.payroll_year,
          basicPay: existingGen.plan_snapshot?.basicPay || prof.basicPay,
          totalEarnings: parseFloat(existingGen.total_earnings || '0'),
          totalDeductions: parseFloat(existingGen.total_deductions || '0'),
          netSalary,
          paidAmount,
          remainingBalance,
          workingDays: existingGen.working_days || 0,
          presentDays: existingGen.present_days || 0,
          absentDays: existingGen.absent_days || 0,
          leaveDays: existingGen.leave_days || 0,
          lateDays: existingGen.late_days || 0,
          absentDeductions: parseFloat(existingGen.absent_deductions || '0'),
          lateDeductions: parseFloat(existingGen.late_deductions || '0'),
          advanceDeductions: parseFloat(existingGen.advance_deductions || '0'),
          oldBalanceAmount: 0,
          leaveBonusAmount: 0,
          status,
          earningsItems: calcDetails.earningsItems || prof.allowances,
          deductionItems: calcDetails.deductionItems || prof.fixedDeductions,
          staff: existingGen.staff
            ? { id: existingGen.staff.id, name: existingGen.staff.name, role: existingGen.staff.role }
            : { id: prof.staffId, name: prof.name, role: prof.role },
          isGeneratedInDb: true,
        });
      } else {
        // Staff member NOT YET generated: Calculate preview
        try {
          const gen = await this.generateMonthlyPayroll(schoolId, prof.staffId, month, year, prof.basicPay);
          gen.planId = prof.planId;
          gen.planName = prof.planName;
          results.push(gen);
        } catch (err) {
          console.error(`Error generating payroll preview for staff ${prof.staffId}:`, err);
        }
      }
    }

    return results;
  },

  /**
   * Fetch all payment history records for a school
   */
  async getPaymentHistory(schoolId: number): Promise<Array<{
    id: number;
    schoolId: number;
    generationId: number;
    staffId: number;
    staffName: string;
    role: string;
    payrollMonth: number;
    payrollYear: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes: string;
    status: string;
  }>> {
    // 1. Fetch payments flat
    const { data: payments, error } = await supabase
      .from('payroll_payments')
      .select('*')
      .eq('school_id', schoolId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payroll_payments history:', error);
      return [];
    }

    if (!payments || payments.length === 0) return [];

    // 2. Fetch staff info
    const staffIds = Array.from(new Set(payments.map(p => p.staff_id).filter(Boolean)));
    const staffMap = new Map<number, { name: string; role: string }>();

    if (staffIds.length > 0) {
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, name, role')
        .in('id', staffIds);

      if (staffList) {
        staffList.forEach(s => {
          staffMap.set(s.id, { name: s.name, role: s.role || 'Staff' });
        });
      }
    }

    // 3. Fetch generation info for month/year
    const genIds = Array.from(new Set(payments.map(p => p.generation_id).filter(Boolean)));
    const genMap = new Map<number, { month: number; year: number }>();

    if (genIds.length > 0) {
      const { data: genList } = await supabase
        .from('payroll_generations')
        .select('id, payroll_month, payroll_year')
        .in('id', genIds);

      if (genList) {
        genList.forEach(g => {
          genMap.set(g.id, { month: g.payroll_month, year: g.payroll_year });
        });
      }
    }

    return payments.map(p => {
      const st = staffMap.get(p.staff_id);
      const gn = genMap.get(p.generation_id);

      return {
        id: p.id,
        schoolId: p.school_id,
        generationId: p.generation_id,
        staffId: p.staff_id,
        staffName: st?.name || `Staff #${p.staff_id}`,
        role: st?.role || 'Staff',
        payrollMonth: gn?.month || p.payroll_month || 0,
        payrollYear: gn?.year || p.payroll_year || 0,
        amount: parseFloat(p.amount || '0'),
        paymentDate: p.payment_date || p.created_at || new Date().toISOString(),
        paymentMethod: p.payment_method || 'Cash',
        referenceNumber: p.reference_number || '',
        notes: p.notes || '',
        status: p.status || 'completed',
      };
    });
  },

  /**
   * Fetch ONLY staff payroll records that have ALREADY been generated & committed to database
   */
  async getSavedGenerationsForDisbursement(
    schoolId: number,
    month: number,
    year: number
  ): Promise<NewPayrollGeneration[]> {
    const { data: dbGens, error } = await supabase
      .from('payroll_generations')
      .select('*, staff:staff_id (id, name, role)')
      .eq('school_id', schoolId)
      .eq('payroll_month', month)
      .eq('payroll_year', year);

    if (error) {
      console.error('Error fetching saved payroll_generations:', error);
      return [];
    }

    if (!dbGens || dbGens.length === 0) return [];

    const genIds = dbGens.map(g => g.id);

    // Fetch payments for current month
    const { data: payments } = await supabase
      .from('payroll_payments')
      .select('generation_id, amount')
      .eq('school_id', schoolId)
      .in('generation_id', genIds)
      .eq('status', 'completed');

    const paymentsMap = new Map<number, number>();
    if (payments) {
      payments.forEach(p => {
        const cur = paymentsMap.get(p.generation_id) || 0;
        paymentsMap.set(p.generation_id, cur + parseFloat(p.amount || '0'));
      });
    }

    // Check if next month's payroll exists for any staff (lock check)
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const { data: nextMonthGens } = await supabase
      .from('payroll_generations')
      .select('staff_id')
      .eq('school_id', schoolId)
      .eq('payroll_month', nextMonth)
      .eq('payroll_year', nextYear);

    const lockedStaffIds = new Set<number>();
    if (nextMonthGens) {
      nextMonthGens.forEach(ng => lockedStaffIds.add(ng.staff_id));
    }

    return dbGens.map(g => {
      const netSalary = parseFloat(g.net_salary || '0');
      const paidAmount = paymentsMap.get(g.id) || 0;
      const remainingBalance = Math.max(0, netSalary - paidAmount);

      let status: NewPayrollGeneration['status'] = 'unpaid';
      if (paidAmount >= netSalary && netSalary > 0) status = 'paid';
      else if (paidAmount > 0) status = 'partially_paid';

      const calcDetails = g.calculation_details || {};

      return {
        id: g.id,
        schoolId: g.school_id,
        staffId: g.staff_id,
        payrollMonth: g.payroll_month,
        payrollYear: g.payroll_year,
        basicPay: g.plan_snapshot?.basicPay || 0,
        totalEarnings: parseFloat(g.total_earnings || '0'),
        totalDeductions: parseFloat(g.total_deductions || '0'),
        netSalary,
        paidAmount,
        remainingBalance,
        workingDays: g.working_days || 0,
        presentDays: g.present_days || 0,
        absentDays: g.absent_days || 0,
        leaveDays: g.leave_days || 0,
        lateDays: g.late_days || 0,
        absentDeductions: parseFloat(g.absent_deductions || '0'),
        lateDeductions: parseFloat(g.late_deductions || '0'),
        advanceDeductions: parseFloat(g.advance_deductions || '0'),
        oldBalanceAmount: parseFloat(g.old_balance || '0'),
        leaveBonusAmount: 0,
        status,
        earningsItems: calcDetails.earningsItems || [],
        deductionItems: calcDetails.deductionItems || [],
        staff: g.staff ? { id: g.staff.id, name: g.staff.name, role: g.staff.role } : { id: g.staff_id, name: `Staff #${g.staff_id}`, role: 'Staff' },
        isLocked: lockedStaffIds.has(g.staff_id),
      };
    });
  },

  /**
   * Commit/save selected staff payroll generations to the database
   */
  async commitPayrollGenerations(
    schoolId: number,
    month: number,
    year: number,
    staffIdsToCommit: number[],
    userId?: number
  ): Promise<void> {
    const errors: string[] = [];
    for (const sId of staffIdsToCommit) {
      try {
        await this.generateMonthlyPayroll(schoolId, sId, month, year, undefined, userId, true);
      } catch (err: any) {
        console.error(`Error committing payroll for staff ${sId}:`, err);
        errors.push(`Staff #${sId}: ${err.message || 'Unknown error'}`);
      }
    }
    if (errors.length > 0 && errors.length === staffIdsToCommit.length) {
      throw new Error(`All payroll commits failed:\n${errors.join('\n')}`);
    }
  },

  /**
   * Record a salary payment installment
   */
  async recordPayment(
    schoolId: number,
    generationId: number,
    staffId: number,
    amount: number,
    paymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other',
    referenceNo?: string,
    remarks?: string,
    userId?: number
  ): Promise<void> {
    const paymentDate = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('payroll_payments').insert({
      school_id: schoolId,
      generation_id: generationId,
      amount,
      payment_mode: paymentMode,
      reference_no: referenceNo || null,
      remarks: remarks || null,
      payment_date: paymentDate,
      status: 'completed',
      received_by: userId,
    });

    if (error) throw error;
  },

  /**
   * Fetch all monthly adjustments for a school & month/year
   */
  async getMonthlyAdjustments(schoolId: number, month: number, year: number): Promise<StaffAdjustment[]> {
    const { data: itemData } = await supabase
      .from('payroll_plan_items')
      .select('*')
      .eq('school_id', schoolId)
      .in('item_type', ['allowance', 'deduction', 'addition', 'subtraction']);

    if (!itemData || itemData.length === 0) return [];

    const results: StaffAdjustment[] = [];
    itemData.forEach(item => {
      if (item.calculation_basis) {
        try {
          const meta = JSON.parse(item.calculation_basis);
          if (meta.isAdjustment && meta.month === month && meta.year === year) {
            results.push({
              id: item.id,
              schoolId: item.school_id,
              staffId: meta.staffId,
              staffName: meta.staffName || `Staff #${meta.staffId}`,
              role: meta.role || 'Staff',
              month: meta.month,
              year: meta.year,
              type: meta.adjType || (item.item_type === 'allowance' ? 'addition' : 'subtraction'),
              title: item.name,
              amount: parseFloat(item.amount || '0'),
              remarks: meta.remarks || '',
              createdAt: item.created_at,
            });
          }
        } catch (e) {}
      }
    });

    return results;
  },

  /**
   * Add a monthly adjustment (Addition or Subtraction)
   */
  async addMonthlyAdjustment(
    schoolId: number,
    staffId: number,
    month: number,
    year: number,
    type: 'addition' | 'subtraction',
    title: string,
    amount: number,
    remarks?: string
  ): Promise<void> {
    const { data: staff } = await supabase.from('staff').select('name, role').eq('id', staffId).single();

    // Fetch staff's active payroll plan for plan_id
    const { data: planList } = await supabase
      .from('payroll_plans')
      .select('id')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const planId = planList && planList.length > 0 ? planList[0].id : null;
    if (!planId) {
      throw new Error('No active payroll plan found for this staff member. Please create a payroll plan first.');
    }

    const dbItemType = type === 'addition' ? 'allowance' : 'deduction';

    const { error: insertErr } = await supabase.from('payroll_plan_items').insert({
      school_id: schoolId,
      plan_id: planId,
      item_type: dbItemType,
      name: title.trim(),
      amount_type: 'fixed',
      amount: amount,
      calculation_basis: JSON.stringify({
        isAdjustment: true,
        adjType: type,
        staffId,
        staffName: staff?.name || '',
        role: staff?.role || '',
        month,
        year,
        remarks: remarks?.trim() || '',
      }),
      is_taxable: false,
    });

    if (insertErr) {
      console.error('Error adding monthly adjustment:', insertErr);
      throw insertErr;
    }
  },

  /**
   * Delete a monthly adjustment
   */
  async deleteMonthlyAdjustment(id: number): Promise<void> {
    const { error } = await supabase.from('payroll_plan_items').delete().eq('id', id);
    if (error) console.error('Error deleting adjustment:', error);
  },
};
