import { supabase } from '../supabaseClient';
import {
  PayrollSettings,
  PayrollPlan,
  PayrollPlanItem,
  PayrollPlanWithItems,
  EmployeePayrollPlan,
  PayrollGeneration,
  PayrollGenerationItem,
  PayrollPayment,
  PayrollPaymentItem,
  PayrollAdvance,
  PayrollAdjustment,
  PayrollAuditLog,
  PayrollFilters,
  PayrollSummary,
  PayrollAnalytics,
  CreatePayrollPlanInput,
  CreatePayrollAdvanceInput,
  CreatePayrollAdjustmentInput,
  ProcessPaymentInput,
  AttendanceSummary,
} from '../types/payroll';
import {
  calculateSalaryBreakdown,
  getAttendanceSummary,
  getAttendanceRecordSummary,
} from '../utils/payrollCalculations';
import { expenseService } from './expenseService';
import { fetchAllRows } from '../utils/paginationHelper';

// Helper function to set current user for audit logging
const setAuditUser = async (userId?: number) => {
  if (!userId) return;
  
  try {
    // Try to set audit user ID (this RPC should exist)
    const { error } = await supabase.rpc('set_audit_user_id', { user_id: userId });
    if (error) {
      // Silently fail if RPC doesn't exist - audit logging is optional
      console.warn('Failed to set audit user context:', error.message);
    }
  } catch (error) {
    // Silently fail if RPC doesn't exist - audit logging is optional
    console.warn('Audit user context not available:', error);
  }
};

// Helper function to map payroll payment mode to expense payment method
const mapPaymentModeToExpenseMethod = (
  paymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other'
): 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'online' | 'other' => {
  const mapping: Record<string, 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'online' | 'other'> = {
    'cash': 'cash',
    'bank_transfer': 'bank_transfer',
    'cheque': 'cheque',
    'easypaisa_jazzcash': 'online',
    'other': 'other',
  };
  return mapping[paymentMode] || 'other';
};

// Helper function to get or create Payroll expense category
const getOrCreatePayrollExpenseCategory = async (schoolId: number): Promise<number> => {
  try {
    // Try to find existing "Payroll" or "Salary" category
    const categories = await expenseService.getExpenseCategories(schoolId, true);
    const payrollCategory = categories.find(
      cat => cat.name.toLowerCase() === 'payroll' || 
             cat.name.toLowerCase() === 'salary' ||
             cat.name.toLowerCase() === 'salaries'
    );
    
    if (payrollCategory) {
      return payrollCategory.id;
    }
    
    // Create new Payroll category if it doesn't exist
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        school_id: schoolId,
        name: 'Payroll',
        description: 'Employee salary and payroll payments',
        color: '#3b82f6',
        is_active: true,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error getting/creating payroll expense category:', error);
    // If we can't create the category, we'll need to handle this gracefully
    // For now, throw the error so the payment creation fails
    throw new Error('Failed to get or create Payroll expense category');
  }
};

// Helper function to log audit trail
const logAudit = async (
  schoolId: number,
  entity: string,
  entityId: number,
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject',
  oldValues?: any,
  newValues?: any,
  userId?: number
) => {
  if (userId) await setAuditUser(userId);
  
  const { error } = await supabase.from('payroll_audit_logs').insert({
    school_id: schoolId,
    entity,
    entity_id: entityId,
    action,
    old_values: oldValues ? JSON.stringify(oldValues) : null,
    new_values: newValues ? JSON.stringify(newValues) : null,
    changed_by: userId || null,
  });
  
  if (error) console.error('Audit log error:', error);
};

const mapPayrollGenerationSummary = (item: any): PayrollGeneration | undefined => {
  if (!item) return undefined;

  return {
    id: item.id,
    schoolId: item.school_id,
    staffId: item.staff_id,
    payrollMonth: item.payroll_month,
    payrollYear: item.payroll_year,
    totalEarnings: parseFloat(item.total_earnings || '0'),
    totalDeductions: parseFloat(item.total_deductions || '0'),
    netSalary: parseFloat(item.net_salary || '0'),
    workingDays: item.working_days ?? undefined,
    presentDays: item.present_days ?? undefined,
    leaveDays: item.leave_days ?? undefined,
    absentDays: item.absent_days ?? undefined,
    lateDays: item.late_days ?? undefined,
    grossSalary: item.gross_salary !== undefined && item.gross_salary !== null ? parseFloat(item.gross_salary) : undefined,
    absentDeductions: item.absent_deductions !== undefined && item.absent_deductions !== null ? parseFloat(item.absent_deductions) : undefined,
    leaveDeductions: item.leave_deductions !== undefined && item.leave_deductions !== null ? parseFloat(item.leave_deductions) : undefined,
    lateDeductions: item.late_deductions !== undefined && item.late_deductions !== null ? parseFloat(item.late_deductions) : undefined,
    advanceDeductions: item.advance_deductions !== undefined && item.advance_deductions !== null ? parseFloat(item.advance_deductions) : undefined,
    attendanceData: item.attendance_data || undefined,
    calculationDetails: item.calculation_details || undefined,
    calculationMode: item.calculation_mode || undefined,
    halfDayLeaves: item.half_day_leaves ?? undefined,
    planId: item.plan_id ?? undefined,
    planSnapshot: item.plan_snapshot || undefined,
    status: item.status,
    approvedBy: item.approved_by ?? undefined,
    approvedAt: item.approved_at ?? undefined,
    generatedBy: item.generated_by ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    staff: item.staff ? {
      id: item.staff.id,
      name: item.staff.name,
      role: item.staff.role,
    } : undefined,
  };
};

const getPayrollPaymentAppliedAmount = (payment: PayrollPayment, generationId: number): number => {
  if (payment.items && payment.items.length > 0) {
    return payment.items
      .filter(item => item.generationId === generationId)
      .reduce((sum, item) => sum + item.paidAmount, 0);
  }

  return payment.generationId === generationId ? payment.amount : 0;
};

const getCompletedPaymentsForGenerationIds = (
  payments: PayrollPayment[],
  generationIds: number[]
): PayrollPayment[] => {
  if (generationIds.length === 0) {
    return [];
  }

  const generationIdSet = new Set(generationIds);

  return payments.filter(payment => {
    if (payment.status !== 'completed') {
      return false;
    }

    if (payment.items && payment.items.length > 0) {
      return payment.items.some(item => generationIdSet.has(item.generationId));
    }

    return generationIdSet.has(payment.generationId);
  });
};

const buildPaidByGenerationMap = (
  payments: PayrollPayment[],
  generationIds: number[]
): Map<number, number> => {
  const generationIdSet = new Set(generationIds);
  const paidByGeneration = new Map<number, number>();

  payments.forEach(payment => {
    if (payment.items && payment.items.length > 0) {
      payment.items.forEach(item => {
        if (!generationIdSet.has(item.generationId)) {
          return;
        }

        paidByGeneration.set(
          item.generationId,
          (paidByGeneration.get(item.generationId) || 0) + item.paidAmount
        );
      });
      return;
    }

    if (!generationIdSet.has(payment.generationId)) {
      return;
    }

    paidByGeneration.set(
      payment.generationId,
      (paidByGeneration.get(payment.generationId) || 0) + payment.amount
    );
  });

  return paidByGeneration;
};

const isSameOrBeforePayrollMonth = (
  year: number,
  monthIndex: number,
  targetYear: number,
  targetMonthIndex: number
): boolean => {
  return year < targetYear || (year === targetYear && monthIndex <= targetMonthIndex);
};

const getMonthKey = (monthNames: string[], year: number, monthIndex: number): string =>
  `${monthNames[monthIndex]} ${year}`;

const getAttendanceSnapshot = (generation: PayrollGeneration) => {
  const attendanceRecords = generation.attendanceData?.records || [];
  if (attendanceRecords.length > 0) {
    return attendanceRecords.reduce(
      (acc, record) => {
        const status = String(record.status || '').toLowerCase();
        if (status === 'present') acc.present += 1;
        if (status === 'leave') acc.leave += 1;
        if (status === 'absent') acc.absent += 1;
        if (status === 'late') {
          acc.late += 1;
          acc.present += 1;
        }
        return acc;
      },
      { present: 0, leave: 0, absent: 0, late: 0 }
    );
  }

  return {
    present: generation.attendanceData?.summary?.presentDays ?? generation.presentDays ?? 0,
    leave: generation.attendanceData?.summary?.leaveDays ?? generation.leaveDays ?? 0,
    absent: generation.attendanceData?.summary?.absentDays ?? generation.absentDays ?? 0,
    late: generation.attendanceData?.summary?.lateDays ?? generation.lateDays ?? 0,
  };
};


export const payrollService = {
  // Payroll Settings
  async getPayrollSettings(schoolId: number): Promise<PayrollSettings | null> {
    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    
    if (!data) return null;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      monthlyWorkingDays: data.monthly_working_days,
      allowedLeavesPerMonth: data.allowed_leaves_per_month,
      leaveDeductionMethod: data.leave_deduction_method,
      salaryCalculationMethod: data.salary_calculation_method,
      defaultPaymentMode: data.default_payment_mode,
      autoApprovePayroll: data.auto_approve_payroll,
      lateDeductionEnabled: data.late_deduction_enabled || false,
      allowedLateDaysPerMonth: data.allowed_late_days_per_month || 0,
      lateDeductionAmount: data.late_deduction_amount ? parseFloat(data.late_deduction_amount) : 0,
      lateDeductionType: data.late_deduction_type || 'fixed',
      allowLeaveBonus: data.allow_leave_bonus || false,
      leaveBonusDays: data.leave_bonus_days || 1,
      leaveBonusStaffIds: data.leave_bonus_staff_ids || [],
      roundUpAmounts: data.round_up_amounts || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updatePayrollSettings(
    schoolId: number,
    settings: Partial<PayrollSettings>,
    userId?: number
  ): Promise<PayrollSettings> {
    if (userId) await setAuditUser(userId);
    
    // Check if settings exist
    const existing = await this.getPayrollSettings(schoolId);
    
    const settingsData: any = {
      school_id: schoolId,
      monthly_working_days: settings.monthlyWorkingDays,
      allowed_leaves_per_month: settings.allowedLeavesPerMonth,
      leave_deduction_method: settings.leaveDeductionMethod,
      salary_calculation_method: settings.salaryCalculationMethod,
      default_payment_mode: settings.defaultPaymentMode,
      auto_approve_payroll: settings.autoApprovePayroll,
      late_deduction_enabled: settings.lateDeductionEnabled ?? false,
      allowed_late_days_per_month: settings.allowedLateDaysPerMonth ?? 0,
      late_deduction_amount: settings.lateDeductionAmount ?? 0,
      late_deduction_type: settings.lateDeductionType || 'fixed',
      allow_leave_bonus: settings.allowLeaveBonus ?? false,
      leave_bonus_days: settings.leaveBonusDays ?? 1,
      leave_bonus_staff_ids: settings.leaveBonusStaffIds || [],
      round_up_amounts: settings.roundUpAmounts ?? false,
    };
    
    let data, error;
    
    if (existing) {
      // Update existing
      const oldValues = existing;
      ({ data, error } = await supabase
        .from('payroll_settings')
        .update(settingsData)
        .eq('school_id', schoolId)
        .select()
        .single());
      
      if (error) throw error;
      
      await logAudit(
        schoolId,
        'payroll_settings',
        data.id,
        'update',
        oldValues,
        settings,
        userId
      );
    } else {
      // Create new
      ({ data, error } = await supabase
        .from('payroll_settings')
        .insert(settingsData)
        .select()
        .single());
      
      if (error) throw error;
      
      await logAudit(
        schoolId,
        'payroll_settings',
        data.id,
        'create',
        undefined,
        settings,
        userId
      );
    }
    
    return {
      id: data.id,
      schoolId: data.school_id,
      monthlyWorkingDays: data.monthly_working_days,
      allowedLeavesPerMonth: data.allowed_leaves_per_month,
      leaveDeductionMethod: data.leave_deduction_method,
      salaryCalculationMethod: data.salary_calculation_method,
      defaultPaymentMode: data.default_payment_mode,
      autoApprovePayroll: data.auto_approve_payroll,
      lateDeductionEnabled: data.late_deduction_enabled || false,
      allowedLateDaysPerMonth: data.allowed_late_days_per_month || 0,
      lateDeductionAmount: data.late_deduction_amount ? parseFloat(data.late_deduction_amount) : 0,
      lateDeductionType: data.late_deduction_type || 'fixed',
      allowLeaveBonus: data.allow_leave_bonus || false,
      leaveBonusDays: data.leave_bonus_days || 1,
      leaveBonusStaffIds: data.leave_bonus_staff_ids || [],
      roundUpAmounts: data.round_up_amounts || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Payroll Plans
  async getPayrollPlans(schoolId: number, includeItems: boolean = false, staffId?: number): Promise<PayrollPlan[]> {
    let query = supabase
      .from('payroll_plans')
      .select(`
        *,
        staff:staff_id (id, name, role)
      `)
      .eq('school_id', schoolId);
    
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const data = await fetchAllRows(async (from, to) => {
      return await query.range(from, to);
    });
    
    const plans: PayrollPlan[] = data.map((item: any) => ({
      id: item.id,
      schoolId: item.school_id,
      staffId: item.staff_id,
      name: item.name,
      description: item.description,
      basicPay: parseFloat(item.basic_pay),
      effectiveFrom: item.effective_from,
      effectiveTo: item.effective_to,
      status: item.status,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      staff: item.staff ? {
        id: item.staff.id,
        name: item.staff.name,
        role: item.staff.role,
      } : undefined,
    }));
    
    if (includeItems) {
      for (const plan of plans) {
        plan.items = await this.getPayrollPlanItems(schoolId, plan.id);
      }
    }
    
    return plans;
  },

  async getPayrollPlan(schoolId: number, planId: number): Promise<PayrollPlanWithItems | null> {
    // Try to fetch with staff relationship first
    let { data, error } = await supabase
      .from('payroll_plans')
      .select(`
        *,
        staff:staff_id (id, name, role)
      `)
      .eq('school_id', schoolId)
      .eq('id', planId)
      .single();
    
    // If we get a 406 error (Not Acceptable), try without the relationship
    // Check for 406 by looking at the error message or code
    const is406Error = error && (
      error.code === 'PGRST406' || 
      error.message?.includes('406') ||
      error.message?.includes('Not Acceptable')
    );
    
    if (is406Error) {
      console.warn(`Plan ${planId} query failed with 406, retrying without staff relationship`);
      const { data: planData, error: planError } = await supabase
        .from('payroll_plans')
        .select('*')
        .eq('school_id', schoolId)
        .eq('id', planId)
        .single();
      
      if (planError && planError.code !== 'PGRST116') throw planError;
      if (!planData) return null;
      
      data = planData;
      // Fetch staff separately if needed
      if (planData.staff_id) {
        try {
          const { data: staffData } = await supabase
            .from('staff')
            .select('id, name, role')
            .eq('id', planData.staff_id)
            .single();
          
          if (staffData) {
            data.staff = staffData;
          }
        } catch (staffError) {
          console.warn(`Could not fetch staff for plan ${planId}:`, staffError);
        }
      }
    } else if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!data) return null;
    
    const plan: PayrollPlanWithItems = {
      id: data.id,
      schoolId: data.school_id,
      staffId: data.staff_id,
      name: data.name,
      description: data.description,
      basicPay: parseFloat(data.basic_pay),
      effectiveFrom: data.effective_from,
      effectiveTo: data.effective_to,
      status: data.status,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      staff: data.staff ? {
        id: data.staff.id,
        name: data.staff.name,
        role: data.staff.role,
      } : undefined,
      items: await this.getPayrollPlanItems(schoolId, planId),
    };
    
    return plan;
  },

  async createPayrollPlan(
    schoolId: number,
    planInput: CreatePayrollPlanInput,
    userId?: number
  ): Promise<PayrollPlanWithItems> {
    if (userId) await setAuditUser(userId);
    
    // Create plan
    const { data: planData, error: planError } = await supabase
      .from('payroll_plans')
      .insert({
        school_id: schoolId,
        staff_id: planInput.staffId,
        name: planInput.name,
        description: planInput.description,
        basic_pay: planInput.basicPay,
        effective_from: planInput.effectiveFrom,
        effective_to: planInput.effectiveTo,
        status: 'active',
        created_by: userId,
      })
      .select()
      .single();
    
    if (planError) throw planError;
    
    // Create plan items
    if (planInput.items && planInput.items.length > 0) {
      const itemsData = planInput.items.map((item, index) => ({
        school_id: schoolId,
        plan_id: planData.id,
        item_type: item.itemType,
        name: item.name,
        amount_type: item.amountType,
        amount: item.amount,
        is_taxable: item.isTaxable,
        calculation_basis: item.calculationBasis,
        display_order: item.displayOrder || index,
      }));
      
      const { error: itemsError } = await supabase
        .from('payroll_plan_items')
        .insert(itemsData);
      
      if (itemsError) throw itemsError;
    }
    
    await logAudit(
      schoolId,
      'payroll_plan',
      planData.id,
      'create',
      undefined,
      planInput,
      userId
    );
    
    return await this.getPayrollPlan(schoolId, planData.id) as PayrollPlanWithItems;
  },

  async updatePayrollPlan(
    schoolId: number,
    planId: number,
    updates: Partial<PayrollPlan>,
    userId?: number
  ): Promise<PayrollPlan> {
    if (userId) await setAuditUser(userId);
    
    const oldPlan = await this.getPayrollPlan(schoolId, planId);
    if (!oldPlan) throw new Error('Payroll plan not found');
    
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.basicPay !== undefined) updateData.basic_pay = updates.basicPay;
    if (updates.effectiveFrom !== undefined) updateData.effective_from = updates.effectiveFrom;
    if (updates.effectiveTo !== undefined) updateData.effective_to = updates.effectiveTo;
    if (updates.status !== undefined) updateData.status = updates.status;
    
    const { data, error } = await supabase
      .from('payroll_plans')
      .update(updateData)
      .eq('school_id', schoolId)
      .eq('id', planId)
      .select()
      .single();
    
    if (error) throw error;
    
    await logAudit(
      schoolId,
      'payroll_plan',
      planId,
      'update',
      oldPlan,
      updates,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      name: data.name,
      description: data.description,
      basicPay: parseFloat(data.basic_pay),
      effectiveFrom: data.effective_from,
      effectiveTo: data.effective_to,
      status: data.status,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deletePayrollPlan(schoolId: number, planId: number, userId?: number): Promise<void> {
    if (userId) await setAuditUser(userId);
    
    const oldPlan = await this.getPayrollPlan(schoolId, planId);
    if (!oldPlan) throw new Error('Payroll plan not found');
    
    // Delete plan items first
    const { error: itemsError } = await supabase
      .from('payroll_plan_items')
      .delete()
      .eq('school_id', schoolId)
      .eq('plan_id', planId);
    
    if (itemsError) throw itemsError;
    
    // Delete plan
    const { error } = await supabase
      .from('payroll_plans')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', planId);
    
    if (error) throw error;
    
    await logAudit(
      schoolId,
      'payroll_plan',
      planId,
      'delete',
      oldPlan,
      undefined,
      userId
    );
  },

  async getPayrollPlanItems(schoolId: number, planId: number): Promise<PayrollPlanItem[]> {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('payroll_plan_items')
        .select('*')
        .eq('school_id', schoolId)
        .eq('plan_id', planId)
        .order('display_order', { ascending: true })
        .range(from, to);
    });
    
    return data.map(item => ({
      id: item.id,
      schoolId: item.school_id,
      planId: item.plan_id,
      itemType: item.item_type,
      name: item.name,
      amountType: item.amount_type,
      amount: parseFloat(item.amount),
      isTaxable: item.is_taxable,
      calculationBasis: item.calculation_basis,
      displayOrder: item.display_order,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async addPayrollPlanItem(
    schoolId: number,
    planId: number,
    item: Omit<PayrollPlanItem, 'id' | 'schoolId' | 'planId' | 'createdAt' | 'updatedAt'>,
    userId?: number
  ): Promise<PayrollPlanItem> {
    if (userId) await setAuditUser(userId);
    
    const { data, error } = await supabase
      .from('payroll_plan_items')
      .insert({
        school_id: schoolId,
        plan_id: planId,
        item_type: item.itemType,
        name: item.name,
        amount_type: item.amountType,
        amount: item.amount,
        is_taxable: item.isTaxable,
        calculation_basis: item.calculationBasis,
        display_order: item.displayOrder,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      planId: data.plan_id,
      itemType: data.item_type,
      name: data.name,
      amountType: data.amount_type,
      amount: parseFloat(data.amount),
      isTaxable: data.is_taxable,
      calculationBasis: data.calculation_basis,
      displayOrder: data.display_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updatePayrollPlanItem(
    schoolId: number,
    itemId: number,
    updates: Partial<PayrollPlanItem>,
    userId?: number
  ): Promise<PayrollPlanItem> {
    if (userId) await setAuditUser(userId);
    
    const updateData: any = {};
    if (updates.itemType !== undefined) updateData.item_type = updates.itemType;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.amountType !== undefined) updateData.amount_type = updates.amountType;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.isTaxable !== undefined) updateData.is_taxable = updates.isTaxable;
    if (updates.calculationBasis !== undefined) updateData.calculation_basis = updates.calculationBasis;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
    
    const { data, error } = await supabase
      .from('payroll_plan_items')
      .update(updateData)
      .eq('school_id', schoolId)
      .eq('id', itemId)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      planId: data.plan_id,
      itemType: data.item_type,
      name: data.name,
      amountType: data.amount_type,
      amount: parseFloat(data.amount),
      isTaxable: data.is_taxable,
      calculationBasis: data.calculation_basis,
      displayOrder: data.display_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deletePayrollPlanItem(schoolId: number, itemId: number, userId?: number): Promise<void> {
    if (userId) await setAuditUser(userId);
    
    const { error } = await supabase
      .from('payroll_plan_items')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', itemId);
    
    if (error) throw error;
  },

  // Employee Payroll Plans
  async getEmployeePayrollPlans(
    schoolId: number,
    staffId?: number
  ): Promise<EmployeePayrollPlan[]> {
    const data = await fetchAllRows(async (from, to) => {
      let query = supabase
        .from('employee_payroll_plans')
        .select(`
          *,
          payroll_plans (*),
          staff (id, name, role)
        `)
        .eq('school_id', schoolId);
      
      if (staffId) {
        query = query.eq('staff_id', staffId);
      }
      
      return await query.order('effective_from', { ascending: false }).range(from, to);
    });
    
    return data.map(item => ({
      id: item.id,
      schoolId: item.school_id,
      staffId: item.staff_id,
      planId: item.plan_id,
      effectiveFrom: item.effective_from,
      effectiveTo: item.effective_to,
      isActive: item.is_active,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      plan: item.payroll_plans ? {
        id: item.payroll_plans.id,
        schoolId: item.payroll_plans.school_id,
        name: item.payroll_plans.name,
        description: item.payroll_plans.description,
        basicPay: parseFloat(item.payroll_plans.basic_pay),
        effectiveFrom: item.payroll_plans.effective_from,
        effectiveTo: item.payroll_plans.effective_to,
        status: item.payroll_plans.status,
        createdAt: item.payroll_plans.created_at,
        updatedAt: item.payroll_plans.updated_at,
      } : undefined,
      staff: item.staff ? {
        id: item.staff.id,
        name: item.staff.name,
        role: item.staff.role,
      } : undefined,
    }));
  },

  async assignPlanToEmployee(
    schoolId: number,
    staffId: number,
    planId: number,
    effectiveFrom: string,
    effectiveTo?: string,
    userId?: number
  ): Promise<EmployeePayrollPlan> {
    if (userId) await setAuditUser(userId);
    
    // Deactivate existing active plans for this employee
    await supabase
      .from('employee_payroll_plans')
      .update({ is_active: false })
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('is_active', true);
    
    // Create new assignment
    const { data, error } = await supabase
      .from('employee_payroll_plans')
      .insert({
        school_id: schoolId,
        staff_id: staffId,
        plan_id: planId,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      staffId: data.staff_id,
      planId: data.plan_id,
      effectiveFrom: data.effective_from,
      effectiveTo: data.effective_to,
      isActive: data.is_active,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Payroll Generations
  async getPayrollGenerations(
    schoolId: number,
    filters: PayrollFilters = {}
  ): Promise<PayrollGeneration[]> {
    const data = await fetchAllRows(async (from, to) => {
      let query = supabase
        .from('payroll_generations')
        .select(`
          *,
          staff (id, name, role),
          approved_by_user:users!payroll_generations_approved_by_fkey (id, name, email),
          generated_by_user:users!payroll_generations_generated_by_fkey (id, name, email)
        `)
        .eq('school_id', schoolId);
      
      if (filters.staffId) query = query.eq('staff_id', filters.staffId);
      if (filters.payrollMonth) query = query.eq('payroll_month', filters.payrollMonth);
      if (filters.payrollYear) query = query.eq('payroll_year', filters.payrollYear);
      if (filters.status) query = query.eq('status', filters.status);
      
      return await query.order('payroll_year', { ascending: false })
        .order('payroll_month', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);
    });
    
    const generations: PayrollGeneration[] = data.map(item => ({
      id: item.id,
      schoolId: item.school_id,
      staffId: item.staff_id,
      payrollMonth: item.payroll_month,
      payrollYear: item.payroll_year,
      totalEarnings: parseFloat(item.total_earnings),
      totalDeductions: parseFloat(item.total_deductions),
      netSalary: parseFloat(item.net_salary),
      workingDays: item.working_days,
      presentDays: item.present_days,
      leaveDays: item.leave_days,
      absentDays: item.absent_days,
      lateDays: item.late_days,
      halfDayLeaves: item.half_day_leaves,
      calculationMode: item.calculation_mode,
      grossSalary: item.gross_salary ? parseFloat(item.gross_salary) : undefined,
      absentDeductions: item.absent_deductions ? parseFloat(item.absent_deductions) : undefined,
      leaveDeductions: item.leave_deductions ? parseFloat(item.leave_deductions) : undefined,
      lateDeductions: item.late_deductions ? parseFloat(item.late_deductions) : undefined,
      advanceDeductions: item.advance_deductions ? parseFloat(item.advance_deductions) : undefined,
      attendanceData: item.attendance_data,
      calculationDetails: item.calculation_details,
      planId: item.plan_id,
      planSnapshot: item.plan_snapshot,
      status: item.status,
      approvedBy: item.approved_by,
      approvedAt: item.approved_at,
      generatedBy: item.generated_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      staff: item.staff ? {
        id: item.staff.id,
        name: item.staff.name,
        role: item.staff.role,
      } : undefined,
      approvedByUser: item.approved_by_user ? {
        id: item.approved_by_user.id,
        name: item.approved_by_user.name,
        email: item.approved_by_user.email,
      } : undefined,
      generatedByUser: item.generated_by_user ? {
        id: item.generated_by_user.id,
        name: item.generated_by_user.name,
        email: item.generated_by_user.email,
      } : undefined,
    }));
    
    // Load items for each generation
    for (const gen of generations) {
      gen.items = await this.getPayrollGenerationItems(schoolId, gen.id);
    }
    
    return generations;
  },

  async getPayrollGeneration(schoolId: number, generationId: number): Promise<PayrollGeneration | null> {
    const { data, error } = await supabase
      .from('payroll_generations')
      .select(`
        *,
        staff (id, name, role)
      `)
      .eq('school_id', schoolId)
      .eq('id', generationId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    const generation: PayrollGeneration = {
      id: data.id,
      schoolId: data.school_id,
      staffId: data.staff_id,
      payrollMonth: data.payroll_month,
      payrollYear: data.payroll_year,
      totalEarnings: parseFloat(data.total_earnings),
      totalDeductions: parseFloat(data.total_deductions),
      netSalary: parseFloat(data.net_salary),
      workingDays: data.working_days,
      presentDays: data.present_days,
      leaveDays: data.leave_days,
      absentDays: data.absent_days,
      lateDays: data.late_days,
      halfDayLeaves: data.half_day_leaves,
      calculationMode: data.calculation_mode,
      grossSalary: data.gross_salary ? parseFloat(data.gross_salary) : undefined,
      absentDeductions: data.absent_deductions ? parseFloat(data.absent_deductions) : undefined,
      leaveDeductions: data.leave_deductions ? parseFloat(data.leave_deductions) : undefined,
      lateDeductions: data.late_deductions ? parseFloat(data.late_deductions) : undefined,
      advanceDeductions: data.advance_deductions ? parseFloat(data.advance_deductions) : undefined,
      leaveBonusAmount: data.leave_bonus_amount ? parseFloat(data.leave_bonus_amount) : undefined,
      attendanceData: data.attendance_data,
      calculationDetails: data.calculation_details,
      planId: data.plan_id,
      planSnapshot: data.plan_snapshot,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      generatedBy: data.generated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      staff: data.staff ? {
        id: data.staff.id,
        name: data.staff.name,
        role: data.staff.role,
      } : undefined,
      items: await this.getPayrollGenerationItems(schoolId, data.id),
    };
    
    return generation;
  },

  async generatePayroll(
    schoolId: number,
    staffId: number,
    payrollMonth: number,
    payrollYear: number,
    userId?: number,
    calculationMode: 'full' | 'partial' = 'partial',
    leaveBonusDays: number = 0,
    planId?: number
  ): Promise<PayrollGeneration> {
    if (userId) await setAuditUser(userId);
    
    // Get payroll settings
    const settings = await this.getPayrollSettings(schoolId);
    if (!settings) {
      throw new Error('Payroll settings not configured. Please configure settings first.');
    }
    
    // Get employee's payroll plan - use provided planId if available, otherwise get the first active plan
    let plan;
    if (planId) {
      // Use the specific planId provided
      plan = await this.getPayrollPlan(schoolId, planId);
      if (!plan) {
        throw new Error('Payroll plan not found');
      }
      // Verify the plan belongs to this staff
      if (plan.staffId !== staffId) {
        throw new Error('Payroll plan does not belong to this employee');
      }
      // Verify the plan is active
      if (plan.status !== 'active') {
        throw new Error('Payroll plan is not active');
      }
    } else {
      // Get employee's active payroll plan (plans are now employee-specific via staff_id)
      const { data: planData, error: planError } = await supabase
        .from('payroll_plans')
        .select('*')
        .eq('school_id', schoolId)
        .eq('staff_id', staffId)
        .eq('status', 'active')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      
      if (planError || !planData) {
        throw new Error('No active payroll plan assigned to employee');
      }
      
      plan = await this.getPayrollPlan(schoolId, planData.id);
      if (!plan) {
        throw new Error('Payroll plan not found');
      }
    }
    
    // Get attendance records for the selected month and year
    // Calculate correct date range for the month (payrollMonth is 1-12)
    const startDate = `${payrollYear}-${String(payrollMonth).padStart(2, '0')}-01`;
    // Calculate last day of the month
    // new Date(year, month, 0) gives last day of previous month
    // To get last day of current month: new Date(year, month + 1, 0) where month is 0-indexed
    const monthIndex = payrollMonth - 1; // Convert 1-12 to 0-11
    const lastDay = new Date(payrollYear, monthIndex + 1, 0);
    const endDate = lastDay.toISOString().split('T')[0];
    
    // Get active session
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .single();
    
    if (!sessionData) {
      throw new Error('No active session found');
    }
    
    // Fetch attendance records and half leaves in parallel
    const [attendanceResult, halfLeavesResult] = await Promise.all([
      supabase
        .from('staff_attendance_records')
        .select('*')
        .eq('school_id', schoolId)
        .eq('staff_id', staffId)
        .eq('session_id', sessionData.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true }),
      supabase
        .from('half_leaves')
        .select('date, leave_type')
        .eq('person_type', 'staff')
        .eq('person_id', staffId)
        .eq('session_id', sessionData.id)
        .eq('school_id', schoolId)
        .gte('date', startDate)
        .lte('date', endDate)
    ]);
    
    if (attendanceResult.error) {
      throw attendanceResult.error;
    }
    
    const attendanceRecords = (attendanceResult.data || []).map(ar => ({
      status: ar.status,
      date: ar.date,
      paidLeave: !!ar.paid_leave,
    }));
    
    const halfLeavesData = halfLeavesResult.data || [];
    
    const halfLeavesMap = new Map<string, 'first_half' | 'second_half'>();
    (halfLeavesData || []).forEach((hl: any) => {
      halfLeavesMap.set(hl.date, hl.leave_type);
    });
    
    // Use monthlyWorkingDays from settings (not calculated)
    // This matches how employee profile counts attendance
    const attendanceSummary = getAttendanceSummary(
      attendanceRecords,
      settings.monthlyWorkingDays,
      halfLeavesMap,
      calculationMode
    );
    const attendanceRecordSummary = getAttendanceRecordSummary(
      attendanceRecords,
      settings.monthlyWorkingDays,
      halfLeavesMap
    );
    
    // Get active advances and adjustments in parallel
    const [advances, adjustments] = await Promise.all([
      this.getAdvances(schoolId, staffId, true),
      this.getAdjustments(schoolId, {
        staffId,
        payrollMonth,
        payrollYear,
      })
    ]);
    
    const unappliedAdjustments = adjustments.filter(adj => !adj.isApplied);
    
    // Calculate salary breakdown with calculation mode
    const { calculateSalaryBreakdown } = await import('../utils/payrollCalculations');
    const breakdown = calculateSalaryBreakdown(
      plan,
      plan.items || [],
      attendanceSummary,
      settings.allowedLeavesPerMonth,
      settings.leaveDeductionMethod,
      advances.filter(a => a.status === 'active'),
      unappliedAdjustments,
      settings.lateDeductionEnabled || false,
      settings.allowedLateDaysPerMonth || 0,
      settings.lateDeductionAmount || 0,
      settings.lateDeductionType || 'fixed',
      calculationMode,
      leaveBonusDays
    );
    
    // Check if generation already exists for this specific plan
    const { data: existingGeneration, error: existingError } = await supabase
      .from('payroll_generations')
      .select('id')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('plan_id', plan.id)
      .eq('payroll_month', payrollMonth)
      .eq('payroll_year', payrollYear)
      .maybeSingle();
    
    // Prepare detailed attendance data
    const attendanceDataForStorage = {
      records: attendanceRecords,
      halfLeaves: Array.from(halfLeavesMap.entries()).map(([date, type]) => ({ date, type })),
      summary: {
        workingDays: attendanceRecordSummary.workingDays,
        presentDays: attendanceRecordSummary.presentDays,
        leaveDays: attendanceRecordSummary.leaveDays,
        absentDays: attendanceRecordSummary.absentDays,
        lateDays: attendanceRecordSummary.lateDays,
        halfDayLeaves: attendanceRecordSummary.halfDayLeaves,
        paidLeaveDays: attendanceRecordSummary.paidLeaveDays || 0,
      },
      calculatedSummary: {
        workingDays: attendanceSummary.workingDays,
        presentDays: attendanceSummary.presentDays,
        leaveDays: attendanceSummary.leaveDays,
        absentDays: attendanceSummary.absentDays,
        lateDays: attendanceSummary.lateDays,
        halfDayLeaves: attendanceSummary.halfDayLeaves,
        paidLeaveDays: attendanceSummary.paidLeaveDays || 0,
      },
      dateRange: {
        startDate,
        endDate,
      },
    };

    // Prepare detailed calculation breakdown
    const calculationDetails = {
      calculationMode,
      grossSalary: breakdown.grossSalary,
      allowances: breakdown.allowances,
      deductions: breakdown.deductions,
      absentDeductions: breakdown.absentDeductions || 0,
      leaveDeductions: breakdown.leaveDeductions,
      lateDeductions: breakdown.lateDeductions,
      advanceDeductions: breakdown.advanceDeductions,
      adjustments: breakdown.adjustments,
      leaveBonusAmount: breakdown.leaveBonusAmount,
      netSalary: breakdown.netSalary,
      settings: {
        monthlyWorkingDays: settings.monthlyWorkingDays,
        allowedLeavesPerMonth: settings.allowedLeavesPerMonth,
        leaveDeductionMethod: settings.leaveDeductionMethod,
        lateDeductionEnabled: settings.lateDeductionEnabled || false,
        allowedLateDaysPerMonth: settings.allowedLateDaysPerMonth || 0,
        lateDeductionAmount: settings.lateDeductionAmount || 0,
        lateDeductionType: settings.lateDeductionType || 'fixed',
        leaveBonusAmount: breakdown.leaveBonusAmount,
      },
      advances: advances.filter(a => a.status === 'active').map(a => ({
        id: a.id,
        amount: a.amount,
        remainingAmount: a.remainingBalance,
        deductionAmount: a.repaymentAmountPerMonth,
      })),
      appliedAdjustments: unappliedAdjustments.map(adj => ({
        id: adj.id,
        adjustmentType: adj.adjustmentType,
        amount: adj.amount,
        reason: adj.reason,
      })),
    };

    // Prepare plan snapshot
    const planSnapshot = {
      planId: plan.id,
      planName: plan.name,
      basicPay: plan.basicPay,
      description: plan.description,
      effectiveFrom: plan.effectiveFrom,
      effectiveTo: plan.effectiveTo,
      items: (plan.items || []).map(item => ({
        id: item.id,
        itemType: item.itemType,
        name: item.name,
        amountType: item.amountType,
        amount: item.amount,
        isTaxable: item.isTaxable,
        calculationBasis: item.calculationBasis,
      })),
      capturedAt: new Date().toISOString(),
    };

    const leaveBonusAmount = breakdown.leaveBonusAmount || 0;

    const generationData: any = {
      school_id: schoolId,
      staff_id: staffId,
      payroll_month: payrollMonth,
      payroll_year: payrollYear,
      total_earnings: breakdown.totalEarnings,
      total_deductions: breakdown.totalDeductions,
      net_salary: breakdown.netSalary,
      working_days: Math.round(attendanceRecordSummary.workingDays || 0),
      present_days: Math.round(attendanceRecordSummary.presentDays || 0),
      leave_days: Math.round(attendanceRecordSummary.leaveDays || 0),
      absent_days: Math.round(attendanceRecordSummary.absentDays || 0),
      late_days: Math.round(attendanceRecordSummary.lateDays || 0),
      half_day_leaves: Math.round(attendanceRecordSummary.halfDayLeaves || 0),
      calculation_mode: calculationMode,
      gross_salary: breakdown.grossSalary,
      absent_deductions: breakdown.absentDeductions || 0,
      leave_deductions: breakdown.leaveDeductions,
      late_deductions: breakdown.lateDeductions,
      advance_deductions: breakdown.advanceDeductions,
      leave_bonus_amount: leaveBonusAmount,
      attendance_data: attendanceDataForStorage,
      calculation_details: calculationDetails,
      plan_id: plan.id,
      plan_snapshot: planSnapshot,
      status: settings.autoApprovePayroll ? 'approved' : 'draft',
      generated_by: userId,
    };
    
    if (settings.autoApprovePayroll && userId) {
      generationData.approved_by = userId;
      generationData.approved_at = new Date().toISOString();
    }
    
    let generationId: number;
    
    if (existingGeneration) {
      // Update existing generation
      const { data, error } = await supabase
        .from('payroll_generations')
        .update(generationData)
        .eq('id', existingGeneration.id)
        .select()
        .single();
      
      if (error) throw error;
      generationId = data.id;
      
      // Delete old items to recreate with updated data
      await supabase
        .from('payroll_generation_items')
        .delete()
        .eq('generation_id', generationId);
    } else {
      // Create new generation
      const { data, error } = await supabase
        .from('payroll_generations')
        .insert(generationData)
        .select()
        .single();
      
      if (error) throw error;
      generationId = data.id;
    }
    
    // Create generation items
    const itemsData: any[] = [];
    
    // Add allowances
    breakdown.allowances.forEach(allowance => {
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: allowance.name,
        item_type: 'allowance',
        amount: allowance.amount,
        calculation_basis: `From payroll plan`,
      });
    });
    
    // Add deductions
    breakdown.deductions.forEach(deduction => {
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: deduction.name,
        item_type: 'deduction',
        amount: deduction.amount,
        calculation_basis: `From payroll plan`,
      });
    });
    
    // Add absent deductions
    if (breakdown.absentDeductions && breakdown.absentDeductions > 0) {
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: 'Absent Deduction',
        item_type: 'deduction',
        amount: breakdown.absentDeductions,
        calculation_basis: `Absent days: ${attendanceSummary.absentDays} days`,
      });
    }
    
    // Add leave deductions
    if (breakdown.leaveDeductions > 0) {
      const excessLeaves = Math.max(
        0,
        (attendanceSummary.leaveDays || 0) - settings.allowedLeavesPerMonth - (attendanceSummary.paidLeaveDays || 0)
      );
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: 'Leave Deduction',
        item_type: 'deduction',
        amount: breakdown.leaveDeductions,
        calculation_basis: `Excess leaves: ${excessLeaves} days`,
      });
    }
    
    // Add late deductions
    if (breakdown.lateDeductions > 0) {
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: 'Late Deduction',
        item_type: 'deduction',
        amount: breakdown.lateDeductions,
        calculation_basis: `Late days: ${attendanceSummary.lateDays}, Allowed: ${settings.allowedLateDaysPerMonth || 0}`,
      });
    }
    
    // Add advance deductions
    if (breakdown.advanceDeductions > 0) {
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: 'Advance Deduction',
        item_type: 'deduction',
        amount: breakdown.advanceDeductions,
        calculation_basis: `Automatic deduction from advances`,
      });
    }
    
    // Add adjustments
    breakdown.adjustments.forEach(adjustment => {
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: adjustment.name,
        item_type: 'adjustment',
        amount: adjustment.amount,
        calculation_basis: adjustment.type,
      });
    });
    
    if (itemsData.length > 0) {
      const { error: itemsError } = await supabase
        .from('payroll_generation_items')
        .insert(itemsData);
      
      if (itemsError) throw itemsError;
    }
    
    // Mark adjustments as applied and update advance balances in parallel
    const activeAdvances = advances.filter(a => a.status === 'active');
    const updatePromises: Promise<any>[] = [];
    
    // Mark adjustments as applied
    for (const adj of unappliedAdjustments) {
      updatePromises.push(
        Promise.resolve(
          supabase
            .from('payroll_adjustments')
            .update({
              is_applied: true,
              applied_to_generation_id: generationId,
            })
            .eq('id', adj.id)
            .then(({ error }) => {
              if (error) throw error;
              return null;
            })
        )
      );
    }
    
    // Update advance balances
    for (const advance of activeAdvances) {
      const deduction = Math.min(advance.repaymentAmountPerMonth, advance.remainingBalance);
      if (deduction > 0) {
        const newBalance = Math.max(0, advance.remainingBalance - deduction);
        updatePromises.push(
          (async () => {
            const { error } = await supabase
              .from('payroll_advances')
              .update({
                remaining_balance: newBalance,
                status: newBalance === 0 ? 'completed' : 'active',
              })
              .eq('id', advance.id);
            if (error) throw error;
            return null;
          })()
        );
      }
    }
    
    // Execute all updates in parallel
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    await logAudit(
      schoolId,
      'payroll_generation',
      generationId,
      existingGeneration ? 'update' : 'create',
      existingGeneration ? await this.getPayrollGeneration(schoolId, generationId) : undefined,
      generationData,
      userId
    );
    
    return await this.getPayrollGeneration(schoolId, generationId) as PayrollGeneration;
  },

  async getPayrollGenerationItems(
    schoolId: number,
    generationId: number
  ): Promise<PayrollGenerationItem[]> {
    const data = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('payroll_generation_items')
        .select('*')
        .eq('school_id', schoolId)
        .eq('generation_id', generationId)
        .order('item_type', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
    });
    
    return data.map(item => ({
      id: item.id,
      schoolId: item.school_id,
      generationId: item.generation_id,
      itemName: item.item_name,
      itemType: item.item_type,
      amount: parseFloat(item.amount),
      calculationBasis: item.calculation_basis,
      createdAt: item.created_at,
    }));
  },

  async approvePayroll(
    schoolId: number,
    generationId: number,
    userId: number
  ): Promise<PayrollGeneration> {
    await setAuditUser(userId);
    
    const oldGen = await this.getPayrollGeneration(schoolId, generationId);
    if (!oldGen) throw new Error('Payroll generation not found');
    if (oldGen.status !== 'draft') {
      throw new Error('Only draft payrolls can be approved');
    }
    
    const { data, error } = await supabase
      .from('payroll_generations')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('school_id', schoolId)
      .eq('id', generationId)
      .select()
      .single();
    
    if (error) throw error;
    
    await logAudit(
      schoolId,
      'payroll_generation',
      generationId,
      'approve',
      oldGen,
      { status: 'approved' },
      userId
    );
    
    return await this.getPayrollGeneration(schoolId, generationId) as PayrollGeneration;
  },

  async rejectPayroll(
    schoolId: number,
    generationId: number,
    userId: number
  ): Promise<PayrollGeneration> {
    await setAuditUser(userId);
    
    const oldGen = await this.getPayrollGeneration(schoolId, generationId);
    if (!oldGen) throw new Error('Payroll generation not found');
    if (oldGen.status !== 'draft') {
      throw new Error('Only draft payrolls can be rejected');
    }
    
    const { data, error } = await supabase
      .from('payroll_generations')
      .update({
        status: 'cancelled',
      })
      .eq('school_id', schoolId)
      .eq('id', generationId)
      .select()
      .single();
    
    if (error) throw error;
    
    await logAudit(
      schoolId,
      'payroll_generation',
      generationId,
      'reject',
      oldGen,
      { status: 'cancelled' },
      userId
    );
    
    return await this.getPayrollGeneration(schoolId, generationId) as PayrollGeneration;
  },

  async deletePayrollGeneration(
    schoolId: number,
    generationId: number,
    userId?: number
  ): Promise<void> {
    if (userId) await setAuditUser(userId);

    const generation = await this.getPayrollGeneration(schoolId, generationId);
    if (!generation) {
      throw new Error('Payroll generation not found');
    }

    const hasPayments = await this.hasPayrollPayments(schoolId, generationId);
    if (hasPayments) {
      throw new Error('Cannot delete payroll generation because payment has already been made.');
    }

    const appliedAdjustments = generation.calculationDetails?.appliedAdjustments || [];
    const advanceSnapshots = generation.calculationDetails?.advances || [];

    if (appliedAdjustments.length > 0) {
      const adjustmentIds = appliedAdjustments
        .map((adjustment: any) => adjustment.id)
        .filter((id: unknown): id is number => typeof id === 'number');

      if (adjustmentIds.length > 0) {
        const { error: adjustmentsError } = await supabase
          .from('payroll_adjustments')
          .update({
            is_applied: false,
            applied_to_generation_id: null,
          })
          .eq('school_id', schoolId)
          .in('id', adjustmentIds)
          .eq('applied_to_generation_id', generationId);

        if (adjustmentsError) throw adjustmentsError;
      }
    }

    for (const advanceSnapshot of advanceSnapshots) {
      if (!advanceSnapshot?.id || !advanceSnapshot?.deductionAmount) {
        continue;
      }

      const advance = await this.getAdvance(schoolId, advanceSnapshot.id);
      if (!advance) {
        continue;
      }

      const restoredBalance = Math.min(
        advance.amount,
        advance.remainingBalance + advanceSnapshot.deductionAmount
      );

      const { error: advanceError } = await supabase
        .from('payroll_advances')
        .update({
          remaining_balance: restoredBalance,
          status: restoredBalance > 0 ? 'active' : 'completed',
        })
        .eq('school_id', schoolId)
        .eq('id', advance.id);

      if (advanceError) throw advanceError;
    }

    const { error: itemsError } = await supabase
      .from('payroll_generation_items')
      .delete()
      .eq('school_id', schoolId)
      .eq('generation_id', generationId);

    if (itemsError) throw itemsError;

    const { error } = await supabase
      .from('payroll_generations')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', generationId);

    if (error) throw error;

    await logAudit(
      schoolId,
      'payroll_generation',
      generationId,
      'delete',
      generation,
      undefined,
      userId
    );
  },

  // Payroll Payments
  async getPayrollPayments(
    schoolId: number,
    filters: PayrollFilters = {}
  ): Promise<PayrollPayment[]> {
    const data = await fetchAllRows(async (from, to) => {
      let query = supabase
        .from('payroll_payments')
        .select(`
          *,
          payroll_generations (*, staff (id, name, role)),
          payroll_payment_items (
            *,
            payroll_generations (*, staff (id, name, role))
          ),
          users!payroll_payments_received_by_fkey (id, name, email)
        `)
        .eq('school_id', schoolId);
      
      if (filters.staffId) {
        query = query.eq('payroll_generations.staff_id', filters.staffId);
      }
      
      return await query.order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);
    });
    
    return data.map(item => ({
      id: item.id,
      schoolId: item.school_id,
      generationId: item.generation_id,
      paymentGroupId: item.payment_group_id || undefined,
      paymentDate: item.payment_date,
      amount: parseFloat(item.amount),
      totalRemainingBeforePayment: parseFloat(item.total_remaining_before_payment || '0'),
      remainingAfterPayment: parseFloat(item.remaining_after_payment || '0'),
      oldBalanceAmount: parseFloat(item.old_balance_amount || '0'),
      currentMonthGross: parseFloat(item.current_month_gross || '0'),
      currentMonthDeductions: parseFloat(item.current_month_deductions || '0'),
      priorPaymentsCurrentMonth: parseFloat(item.prior_payments_current_month || '0'),
      netAmount: parseFloat(item.net_amount || '0'),
      attendancePresent: item.attendance_present ?? 0,
      attendanceLeave: item.attendance_leave ?? 0,
      attendanceAbsent: item.attendance_absent ?? 0,
      attendanceLate: item.attendance_late ?? 0,
      absentDeductionAmount: parseFloat(item.absent_deduction_amount || '0'),
      leaveDeductionAmount: parseFloat(item.leave_deduction_amount || '0'),
      lateDeductionAmount: parseFloat(item.late_deduction_amount || '0'),
      advanceDeductionAmount: parseFloat(item.advance_deduction_amount || '0'),
      paymentMode: item.payment_mode,
      referenceNo: item.reference_no,
      remarks: item.remarks,
      status: item.status,
      receivedBy: item.received_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      generation: mapPayrollGenerationSummary(item.payroll_generations),
      items: (item.payroll_payment_items || [])
        .map((paymentItem: any): PayrollPaymentItem => ({
          id: paymentItem.id,
          schoolId: paymentItem.school_id,
          paymentId: paymentItem.payment_id,
          generationId: paymentItem.generation_id,
          amountDueBeforePayment: parseFloat(paymentItem.amount_due_before_payment || '0'),
          paidAmount: parseFloat(paymentItem.paid_amount || '0'),
          remainingAfterPayment: parseFloat(paymentItem.remaining_after_payment || '0'),
          displayOrder: paymentItem.display_order || 0,
          createdAt: paymentItem.created_at,
          generation: mapPayrollGenerationSummary(paymentItem.payroll_generations),
        }))
        .sort((a: PayrollPaymentItem, b: PayrollPaymentItem) => a.displayOrder - b.displayOrder),
      receivedByUser: item.users ? {
        id: item.users.id,
        name: item.users.name,
        email: item.users.email,
      } : undefined,
    }));
  },

  async processPayment(
    schoolId: number,
    paymentInput: ProcessPaymentInput,
    userId?: number
  ): Promise<PayrollPayment> {
    const targetGeneration = await this.getPayrollGeneration(schoolId, paymentInput.generationId);
    if (!targetGeneration) {
      throw new Error('Payroll generation not found');
    }

    const generationsWithBalance = await this.getEmployeePayrollGenerationsWithBalance(schoolId, targetGeneration.staffId);
    const payableGenerations = generationsWithBalance
      .filter(item => item.generation.status === 'approved' || item.generation.status === 'paid');
    const targetBalance = payableGenerations.find(item => item.generation.id === paymentInput.generationId);

    if (!targetBalance) {
      throw new Error('Selected payroll month is not payable');
    }

    if (paymentInput.amount > targetBalance.remainingBalance) {
      throw new Error(`Payment amount cannot exceed remaining balance of Rs. ${targetBalance.remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    }

    const latestGeneration = [...payableGenerations].sort((a, b) =>
      (b.generation.payrollYear * 100 + b.generation.payrollMonth) - (a.generation.payrollYear * 100 + a.generation.payrollMonth)
    )[0]?.generation;

    if (!latestGeneration) {
      throw new Error('No approved payroll month found for this employee');
    }

    const latestPeriod = latestGeneration.payrollYear * 100 + latestGeneration.payrollMonth;
    const oldBalanceAmount = payableGenerations
      .filter(item => item.generation.payrollYear * 100 + item.generation.payrollMonth < latestPeriod)
      .reduce((sum, item) => sum + item.remainingBalance, 0);
    const currentMonthGross = latestGeneration.grossSalary || latestGeneration.totalEarnings || 0;
    const currentMonthDeductions = latestGeneration.totalDeductions || 0;
    const priorPaymentsCurrentMonth = payableGenerations.find(item => item.generation.id === latestGeneration.id)?.totalPaid || 0;
    const totalRemainingBeforePayment = payableGenerations.reduce((sum, item) => sum + item.remainingBalance, 0);
    const netAmount = oldBalanceAmount + currentMonthGross - currentMonthDeductions - priorPaymentsCurrentMonth;
    const remainingAfterPayment = Math.max(0, totalRemainingBeforePayment - paymentInput.amount);
    const attendanceSnapshot = getAttendanceSnapshot(latestGeneration);
    const absentDeductionAmount = latestGeneration.absentDeductions || 0;
    const leaveDeductionAmount = latestGeneration.leaveDeductions || 0;
    const lateDeductionAmount = latestGeneration.lateDeductions || 0;
    const advanceDeductionAmount = latestGeneration.advanceDeductions || 0;

    if (userId) await setAuditUser(userId);

    const { data, error } = await supabase
      .from('payroll_payments')
      .insert({
        school_id: schoolId,
        generation_id: latestGeneration.id,
        payment_group_id: paymentInput.paymentGroupId || null,
        payment_date: paymentInput.paymentDate,
        amount: paymentInput.amount,
        total_remaining_before_payment: totalRemainingBeforePayment,
        remaining_after_payment: remainingAfterPayment,
        old_balance_amount: oldBalanceAmount,
        current_month_gross: currentMonthGross,
        current_month_deductions: currentMonthDeductions,
        prior_payments_current_month: priorPaymentsCurrentMonth,
        net_amount: netAmount,
        attendance_present: attendanceSnapshot.present,
        attendance_leave: attendanceSnapshot.leave,
        attendance_absent: attendanceSnapshot.absent,
        attendance_late: attendanceSnapshot.late,
        absent_deduction_amount: absentDeductionAmount,
        leave_deduction_amount: leaveDeductionAmount,
        late_deduction_amount: lateDeductionAmount,
        advance_deduction_amount: advanceDeductionAmount,
        payment_mode: paymentInput.paymentMode,
        reference_no: paymentInput.referenceNo,
        remarks: paymentInput.remarks,
        status: 'completed',
        received_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: paymentItemsError } = await supabase
      .from('payroll_payment_items')
      .insert({
        school_id: schoolId,
        payment_id: data.id,
        generation_id: paymentInput.generationId,
        amount_due_before_payment: targetBalance.remainingBalance,
        paid_amount: paymentInput.amount,
        remaining_after_payment: Math.max(0, targetBalance.remainingBalance - paymentInput.amount),
        display_order: 0,
      });

    if (paymentItemsError) throw paymentItemsError;

    const newRemainingForTarget = Math.max(0, targetBalance.remainingBalance - paymentInput.amount);
    await supabase
      .from('payroll_generations')
      .update({ status: newRemainingForTarget <= 0 ? 'paid' : 'approved' })
      .eq('id', paymentInput.generationId);

    try {
      const payrollCategoryId = await getOrCreatePayrollExpenseCategory(schoolId);
      const expensePaymentMethod = mapPaymentModeToExpenseMethod(paymentInput.paymentMode);
      const staffName = latestGeneration.staff?.name || targetGeneration.staff?.name || 'Employee';
      const staffRole = latestGeneration.staff?.role || targetGeneration.staff?.role || '';
      const monthName = new Date(latestGeneration.payrollYear, latestGeneration.payrollMonth - 1, 1).toLocaleString('default', { month: 'long' });
      const expenseDescription = `Payroll payment for ${staffName}${staffRole ? ` (${staffRole})` : ''} - ${monthName} ${latestGeneration.payrollYear}${paymentInput.remarks ? `. ${paymentInput.remarks}` : ''}. Payroll Payment ID: ${data.id}`;

      await expenseService.createExpense({
        schoolId,
        categoryId: payrollCategoryId,
        title: `Payroll: ${staffName} - ${monthName} ${latestGeneration.payrollYear}`,
        description: expenseDescription,
        amount: paymentInput.amount,
        expenseDate: paymentInput.paymentDate,
        paymentMethod: expensePaymentMethod,
        referenceNumber: paymentInput.referenceNo,
        vendorName: staffName,
        vendorContact: staffRole,
        status: 'approved',
        createdBy: userId,
      });
    } catch (expenseError) {
      console.error('Failed to create expense entry for payroll payment:', expenseError);
    }

    await logAudit(
      schoolId,
      'payroll_payment',
      data.id,
      'create',
      undefined,
      {
        ...paymentInput,
        totalRemainingBeforePayment,
        remainingAfterPayment,
        oldBalanceAmount,
        currentMonthGross,
        currentMonthDeductions,
        priorPaymentsCurrentMonth,
        netAmount,
        attendanceSnapshot,
        absentDeductionAmount,
        leaveDeductionAmount,
        lateDeductionAmount,
        advanceDeductionAmount,
      },
      userId
    );

    const createdPayment = await this.getPayrollPayments(schoolId, {});
    const payment = createdPayment.find(item => item.id === data.id);
    if (!payment) {
      throw new Error('Payment created but could not be reloaded');
    }
    return payment;
  },

  async processCombinedPayment(
    schoolId: number,
    input: {
      staffId: number;
      paymentDate: string;
      amount: number;
      paymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other';
      referenceNo?: string;
      remarks?: string;
    },
    userId?: number
  ): Promise<PayrollPayment[]> {
    if (input.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const generationsWithBalance = await this.getEmployeePayrollGenerationsWithBalance(schoolId, input.staffId);
    const payableGenerations = generationsWithBalance
      .filter(item => item.remainingBalance > 0)
      .sort((a, b) => {
        if (a.generation.payrollYear !== b.generation.payrollYear) {
          return a.generation.payrollYear - b.generation.payrollYear;
        }
        return a.generation.payrollMonth - b.generation.payrollMonth;
      });

    if (payableGenerations.length === 0) {
      throw new Error('No unpaid payroll months found for this employee');
    }

    const totalPending = payableGenerations.reduce((sum, item) => sum + item.remainingBalance, 0);
    if (input.amount > totalPending) {
      throw new Error(`Payment amount cannot exceed pending balance of Rs. ${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    }

    const latestGeneration = [...payableGenerations].sort((a, b) =>
      (b.generation.payrollYear * 100 + b.generation.payrollMonth) - (a.generation.payrollYear * 100 + a.generation.payrollMonth)
    )[0]?.generation;
    if (!latestGeneration) {
      throw new Error('No approved payroll month found for this employee');
    }

    const latestPeriod = latestGeneration.payrollYear * 100 + latestGeneration.payrollMonth;
    const oldBalanceAmount = payableGenerations
      .filter(item => item.generation.payrollYear * 100 + item.generation.payrollMonth < latestPeriod)
      .reduce((sum, item) => sum + item.remainingBalance, 0);
    const currentMonthGross = latestGeneration.grossSalary || latestGeneration.totalEarnings || 0;
    const currentMonthDeductions = latestGeneration.totalDeductions || 0;
    const priorPaymentsCurrentMonth = payableGenerations.find(item => item.generation.id === latestGeneration.id)?.totalPaid || 0;
    const netAmount = oldBalanceAmount + currentMonthGross - currentMonthDeductions - priorPaymentsCurrentMonth;
    const remainingAfterPayment = Math.max(0, totalPending - input.amount);
    const attendanceSnapshot = getAttendanceSnapshot(latestGeneration);
    const absentDeductionAmount = latestGeneration.absentDeductions || 0;
    const leaveDeductionAmount = latestGeneration.leaveDeductions || 0;
    const lateDeductionAmount = latestGeneration.lateDeductions || 0;
    const advanceDeductionAmount = latestGeneration.advanceDeductions || 0;
    let remainingToAllocate = input.amount;
    const paymentItemsPayload: Array<{
      school_id: number;
      generation_id: number;
      amount_due_before_payment: number;
      paid_amount: number;
      remaining_after_payment: number;
      display_order: number;
    }> = [];

    const sortedPayableGenerations = [...payableGenerations].sort((a, b) => {
      if (a.generation.payrollYear !== b.generation.payrollYear) {
        return a.generation.payrollYear - b.generation.payrollYear;
      }
      return a.generation.payrollMonth - b.generation.payrollMonth;
    });

    for (let index = 0; index < sortedPayableGenerations.length; index += 1) {
      const item = sortedPayableGenerations[index];
      if (remainingToAllocate <= 0) {
        break;
      }
      const allocation = Math.min(item.remainingBalance, remainingToAllocate);
      if (allocation <= 0) {
        continue;
      }

      paymentItemsPayload.push({
        school_id: schoolId,
        generation_id: item.generation.id,
        amount_due_before_payment: item.remainingBalance,
        paid_amount: allocation,
        remaining_after_payment: Math.max(0, item.remainingBalance - allocation),
        display_order: index,
      });
      remainingToAllocate -= allocation;
    }

    if (paymentItemsPayload.length === 0) {
      throw new Error('No payroll amounts were allocated for this payment');
    }

    if (userId) await setAuditUser(userId);

    const { data, error } = await supabase
      .from('payroll_payments')
      .insert({
        school_id: schoolId,
        generation_id: latestGeneration.id,
        payment_date: input.paymentDate,
        amount: input.amount,
        total_remaining_before_payment: totalPending,
        remaining_after_payment: remainingAfterPayment,
        old_balance_amount: oldBalanceAmount,
        current_month_gross: currentMonthGross,
        current_month_deductions: currentMonthDeductions,
        prior_payments_current_month: priorPaymentsCurrentMonth,
        net_amount: netAmount,
        attendance_present: attendanceSnapshot.present,
        attendance_leave: attendanceSnapshot.leave,
        attendance_absent: attendanceSnapshot.absent,
        attendance_late: attendanceSnapshot.late,
        absent_deduction_amount: absentDeductionAmount,
        leave_deduction_amount: leaveDeductionAmount,
        late_deduction_amount: lateDeductionAmount,
        advance_deduction_amount: advanceDeductionAmount,
        payment_mode: input.paymentMode,
        reference_no: input.referenceNo,
        remarks: input.remarks,
        status: 'completed',
        received_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: paymentItemsError } = await supabase
      .from('payroll_payment_items')
      .insert(
        paymentItemsPayload.map(item => ({
          ...item,
          payment_id: data.id,
        }))
      );

    if (paymentItemsError) throw paymentItemsError;

    await Promise.all(
      paymentItemsPayload.map(item =>
        supabase
          .from('payroll_generations')
          .update({ status: item.remaining_after_payment <= 0 ? 'paid' : 'approved' })
          .eq('id', item.generation_id)
      )
    );

    try {
      const payrollCategoryId = await getOrCreatePayrollExpenseCategory(schoolId);
      const expensePaymentMethod = mapPaymentModeToExpenseMethod(input.paymentMode);
      const staffName = latestGeneration.staff?.name || 'Employee';
      const staffRole = latestGeneration.staff?.role || '';
      const monthName = new Date(latestGeneration.payrollYear, latestGeneration.payrollMonth - 1, 1).toLocaleString('default', { month: 'long' });
      const extraMonths = Math.max(0, paymentItemsPayload.length - 1);
      const monthSuffix = extraMonths > 0 ? ` + ${extraMonths} more` : '';
      const expenseDescription = `Payroll payment for ${staffName}${staffRole ? ` (${staffRole})` : ''} - ${monthName} ${latestGeneration.payrollYear}${monthSuffix}${input.remarks ? `. ${input.remarks}` : ''}. Payroll Payment ID: ${data.id}`;

      await expenseService.createExpense({
        schoolId,
        categoryId: payrollCategoryId,
        title: `Payroll: ${staffName} - ${monthName} ${latestGeneration.payrollYear}${monthSuffix}`,
        description: expenseDescription,
        amount: input.amount,
        expenseDate: input.paymentDate,
        paymentMethod: expensePaymentMethod,
        referenceNumber: input.referenceNo,
        vendorName: staffName,
        vendorContact: staffRole,
        status: 'approved',
        createdBy: userId,
      });
    } catch (expenseError) {
      console.error('Failed to create expense entry for payroll payment:', expenseError);
    }

    await logAudit(
      schoolId,
      'payroll_payment',
      data.id,
      'create',
      undefined,
      {
        ...input,
        paymentItemCount: paymentItemsPayload.length,
        totalRemainingBeforePayment: totalPending,
        remainingAfterPayment,
        oldBalanceAmount,
        currentMonthGross,
        currentMonthDeductions,
        priorPaymentsCurrentMonth,
        netAmount,
        attendanceSnapshot,
        absentDeductionAmount,
        leaveDeductionAmount,
        lateDeductionAmount,
        advanceDeductionAmount,
      },
      userId
    );

    const allPayments = await this.getPayrollPayments(schoolId, {});
    const createdPayment = allPayments.find(payment => payment.id === data.id);
    if (!createdPayment) {
      throw new Error('Payment created but could not be reloaded');
    }

    return [createdPayment];
  },

  async deletePayment(
    schoolId: number,
    paymentId: number,
    userId?: number
  ): Promise<void> {
    if (userId) await setAuditUser(userId);

    const payments = await this.getPayrollPayments(schoolId, {});
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    try {
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, description')
        .eq('school_id', schoolId)
        .ilike('description', `%Payroll Payment ID: ${paymentId}%`);
      
      if (!expensesError && expensesData && expensesData.length > 0) {
        for (const expense of expensesData) {
          try {
            await expenseService.deleteExpense(expense.id, schoolId);
          } catch (expenseDeleteError) {
            console.error(`Failed to delete expense ${expense.id} for payroll payment ${paymentId}:`, expenseDeleteError);
          }
        }
      }
    } catch (expenseError) {
      console.error('Error deleting associated expense for payroll payment:', expenseError);
    }

    const affectedGenerationIds = Array.from(new Set(
      (payment.items && payment.items.length > 0
        ? payment.items.map(item => item.generationId)
        : [payment.generationId]
      ).filter(Boolean)
    ));

    const { error: deleteError } = await supabase
      .from('payroll_payments')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', paymentId);

    if (deleteError) throw deleteError;

    const remainingPayments = payments.filter(p => p.id !== paymentId && p.status === 'completed');
    for (const generationId of affectedGenerationIds) {
      const generation = await this.getPayrollGeneration(schoolId, generationId);
      if (!generation) continue;
      const totalPaid = remainingPayments.reduce((sum, existingPayment) => {
        return sum + getPayrollPaymentAppliedAmount(existingPayment, generationId);
      }, 0);
      await supabase
        .from('payroll_generations')
        .update({ status: totalPaid >= generation.netSalary ? 'paid' : 'approved' })
        .eq('id', generationId);
    }

    await logAudit(
      schoolId,
      'payroll_payment',
      paymentId,
      'delete',
      payment,
      undefined,
      userId
    );
  },

  async deletePaymentGroup(
    schoolId: number,
    paymentGroupId: string,
    userId?: number
  ): Promise<void> {
    const payments = await this.getPayrollPayments(schoolId, {});
    const groupedPayments = payments
      .filter(payment => payment.paymentGroupId === paymentGroupId)
      .sort((a, b) => b.id - a.id);

    if (groupedPayments.length === 0) {
      throw new Error('Payment group not found');
    }

    for (const payment of groupedPayments) {
      await this.deletePayment(schoolId, payment.id, userId);
    }
  },

  async updatePayment(
    schoolId: number,
    paymentId: number,
    updates: {
      paymentDate: string;
      paymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other';
      referenceNo?: string;
      remarks?: string;
    },
    userId?: number
  ): Promise<PayrollPayment> {
    if (userId) await setAuditUser(userId);

    const payments = await this.getPayrollPayments(schoolId, {});
    const existingPayment = payments.find(payment => payment.id === paymentId);
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    const updatePayload = {
      payment_date: updates.paymentDate,
      payment_mode: updates.paymentMode,
      reference_no: updates.referenceNo || null,
      remarks: updates.remarks || null,
    };

    const { error } = await supabase
      .from('payroll_payments')
      .update(updatePayload)
      .eq('school_id', schoolId)
      .eq('id', paymentId);

    if (error) throw error;

    await logAudit(
      schoolId,
      'payroll_payment',
      paymentId,
      'update',
      existingPayment,
      updates,
      userId
    );

    const refreshedPayments = await this.getPayrollPayments(schoolId, {});
    const updatedPayment = refreshedPayments.find(payment => payment.id === paymentId);
    if (!updatedPayment) {
      throw new Error('Updated payment could not be reloaded');
    }

    return updatedPayment;
  },

  // Payroll Advances
  async getAdvance(
    schoolId: number,
    advanceId: number
  ): Promise<PayrollAdvance | null> {
    const { data, error } = await supabase
      .from('payroll_advances')
      .select(`
        *,
        staff (id, name, role),
        approved_by_user:users!payroll_advances_approved_by_fkey (id, name, email),
        created_by_user:users!payroll_advances_created_by_fkey (id, name, email)
      `)
      .eq('school_id', schoolId)
      .eq('id', advanceId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    if (!data) return null;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      staffId: data.staff_id,
      advanceDate: data.advance_date,
      amount: parseFloat(data.amount),
      repaymentAmountPerMonth: parseFloat(data.repayment_amount_per_month),
      remainingBalance: parseFloat(data.remaining_balance),
      status: data.status,
      reason: data.reason,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      staff: data.staff ? {
        id: data.staff.id,
        name: data.staff.name,
        role: data.staff.role,
      } : undefined,
      approvedByUser: data.approved_by_user ? {
        id: data.approved_by_user.id,
        name: data.approved_by_user.name,
        email: data.approved_by_user.email,
      } : undefined,
      createdByUser: data.created_by_user ? {
        id: data.created_by_user.id,
        name: data.created_by_user.name,
        email: data.created_by_user.email,
      } : undefined,
    };
  },

  async getAdvances(
    schoolId: number,
    staffId?: number,
    activeOnly: boolean = false
  ): Promise<PayrollAdvance[]> {
    let query = supabase
      .from('payroll_advances')
      .select(`
        *,
        staff (id, name, role),
        approved_by_user:users!payroll_advances_approved_by_fkey (id, name, email),
        created_by_user:users!payroll_advances_created_by_fkey (id, name, email)
      `)
      .eq('school_id', schoolId);
    
    if (staffId) query = query.eq('staff_id', staffId);
    if (activeOnly) query = query.eq('status', 'active');
    
    query = query.order('advance_date', { ascending: false });
    
    const data = await fetchAllRows(async (from, to) => {
      return await query.range(from, to);
    });
    
    return data.map((item: any) => ({
      id: item.id,
      schoolId: item.school_id,
      staffId: item.staff_id,
      advanceDate: item.advance_date,
      amount: parseFloat(item.amount),
      repaymentAmountPerMonth: parseFloat(item.repayment_amount_per_month),
      remainingBalance: parseFloat(item.remaining_balance),
      status: item.status,
      reason: item.reason,
      approvedBy: item.approved_by,
      approvedAt: item.approved_at,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      staff: item.staff ? {
        id: item.staff.id,
        name: item.staff.name,
        role: item.staff.role,
      } : undefined,
      approvedByUser: item.approved_by_user ? {
        id: item.approved_by_user.id,
        name: item.approved_by_user.name,
        email: item.approved_by_user.email,
      } : undefined,
      createdByUser: item.created_by_user ? {
        id: item.created_by_user.id,
        name: item.created_by_user.name,
        email: item.created_by_user.email,
      } : undefined,
    }));
  },

  async createAdvance(
    schoolId: number,
    advanceInput: CreatePayrollAdvanceInput,
    userId?: number
  ): Promise<PayrollAdvance> {
    if (userId) await setAuditUser(userId);
    
    const { data, error } = await supabase
      .from('payroll_advances')
      .insert({
        school_id: schoolId,
        staff_id: advanceInput.staffId,
        advance_date: advanceInput.advanceDate,
        amount: advanceInput.amount,
        repayment_amount_per_month: advanceInput.repaymentAmountPerMonth,
        remaining_balance: advanceInput.amount,
        status: 'active',
        reason: advanceInput.reason,
        created_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    await logAudit(
      schoolId,
      'payroll_advance',
      data.id,
      'create',
      undefined,
      advanceInput,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      staffId: data.staff_id,
      advanceDate: data.advance_date,
      amount: parseFloat(data.amount),
      repaymentAmountPerMonth: parseFloat(data.repayment_amount_per_month),
      remainingBalance: parseFloat(data.remaining_balance),
      status: data.status,
      reason: data.reason,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Payroll Adjustments
  async getAdjustments(
    schoolId: number,
    filters: PayrollFilters = {}
  ): Promise<PayrollAdjustment[]> {
    const data = await fetchAllRows(async (from, to) => {
      let query = supabase
        .from('payroll_adjustments')
        .select(`
          *,
          staff (id, name, role),
          payroll_generations (id, payroll_month, payroll_year),
          users!payroll_adjustments_created_by_fkey (id, name, email)
        `)
        .eq('school_id', schoolId);
      
      if (filters.staffId) query = query.eq('staff_id', filters.staffId);
      if (filters.payrollMonth) query = query.eq('payroll_month', filters.payrollMonth);
      if (filters.payrollYear) query = query.eq('payroll_year', filters.payrollYear);
      
      return await query.order('created_at', { ascending: false }).range(from, to);
    });
    
    return data.map(item => ({
      id: item.id,
      schoolId: item.school_id,
      staffId: item.staff_id,
      adjustmentType: item.adjustment_type,
      amount: parseFloat(item.amount),
      reason: item.reason,
      payrollMonth: item.payroll_month,
      payrollYear: item.payroll_year,
      isApplied: item.is_applied,
      appliedToGenerationId: item.applied_to_generation_id,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      staff: item.staff ? {
        id: item.staff.id,
        name: item.staff.name,
        role: item.staff.role,
      } : undefined,
      appliedToGeneration: item.payroll_generations ? {
        id: item.payroll_generations.id,
        schoolId: item.payroll_generations.school_id,
        staffId: item.payroll_generations.staff_id,
        payrollMonth: item.payroll_generations.payroll_month,
        payrollYear: item.payroll_generations.payroll_year,
        totalEarnings: parseFloat(item.payroll_generations.total_earnings || '0'),
        totalDeductions: parseFloat(item.payroll_generations.total_deductions || '0'),
        netSalary: parseFloat(item.payroll_generations.net_salary || '0'),
        status: item.payroll_generations.status,
      } : undefined,
      createdByUser: item.users ? {
        id: item.users.id,
        name: item.users.name,
        email: item.users.email,
      } : undefined,
    }));
  },

  async createAdjustment(
    schoolId: number,
    adjustmentInput: CreatePayrollAdjustmentInput,
    userId?: number
  ): Promise<PayrollAdjustment> {
    if (userId) await setAuditUser(userId);
    
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .insert({
        school_id: schoolId,
        staff_id: adjustmentInput.staffId,
        adjustment_type: adjustmentInput.adjustmentType,
        amount: adjustmentInput.amount,
        reason: adjustmentInput.reason,
        payroll_month: adjustmentInput.payrollMonth,
        payroll_year: adjustmentInput.payrollYear,
        is_applied: false,
        created_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    await logAudit(
      schoolId,
      'payroll_adjustment',
      data.id,
      'create',
      undefined,
      adjustmentInput,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      staffId: data.staff_id,
      adjustmentType: data.adjustment_type,
      amount: parseFloat(data.amount),
      reason: data.reason,
      payrollMonth: data.payroll_month,
      payrollYear: data.payroll_year,
      isApplied: data.is_applied,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteAdjustment(
    schoolId: number,
    adjustmentId: number,
    userId?: number
  ): Promise<void> {
    if (userId) await setAuditUser(userId);

    const adjustments = await this.getAdjustments(schoolId, {});
    const adjustment = adjustments.find(adj => adj.id === adjustmentId);

    if (!adjustment) {
      throw new Error('Adjustment not found');
    }

    if (adjustment.isApplied || adjustment.appliedToGenerationId) {
      throw new Error('Cannot delete adjustment. It has already been included in a payroll.');
    }

    const { error } = await supabase
      .from('payroll_adjustments')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', adjustmentId)
      .eq('is_applied', false);

    if (error) throw error;

    await logAudit(
      schoolId,
      'payroll_adjustment',
      adjustmentId,
      'delete',
      adjustment,
      undefined,
      userId
    );
  },

  // Analytics and Summary
  async getPayrollSummary(
    schoolId: number,
    month?: number,
    year?: number
  ): Promise<PayrollSummary> {
    let query = supabase
      .from('payroll_generations')
      .select('*')
      .eq('school_id', schoolId);
    
    if (month) query = query.eq('payroll_month', month);
    if (year) query = query.eq('payroll_year', year);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const generations = data || [];
    const totalPayroll = generations.reduce((sum, g) => sum + parseFloat(g.net_salary), 0);
    const generationIds = generations.map(g => g.id);
    const payments = generationIds.length > 0 ? await this.getPayrollPayments(schoolId, {}) : [];
    const completedPayments = getCompletedPaymentsForGenerationIds(payments, generationIds);
    const paidByGeneration = buildPaidByGenerationMap(completedPayments, generationIds);
    const remainingByGeneration = generations.map(generation => {
      const netSalary = parseFloat(generation.net_salary);
      const generationPaid = paidByGeneration.get(generation.id) || 0;
      const remainingBalance = Math.max(0, netSalary - generationPaid);

      return {
        generation,
        remainingBalance,
      };
    });

    const totalPaid = Math.max(0, totalPayroll - remainingByGeneration.reduce((sum, item) => sum + item.remainingBalance, 0));
    const totalPending = Math.max(0, totalPayroll - totalPaid);
    const paidGenerations = remainingByGeneration.filter(item => item.remainingBalance <= 0);
    const pendingStaffIds = new Set(
      remainingByGeneration
        .filter(item => item.remainingBalance > 0)
        .map(item => item.generation.staff_id)
    );
    
    // Get total advances
    const { data: advancesData } = await supabase
      .from('payroll_advances')
      .select('remaining_balance')
      .eq('school_id', schoolId)
      .eq('status', 'active');
    
    const totalAdvances = (advancesData || []).reduce((sum, a) => sum + parseFloat(a.remaining_balance), 0);
    
    // Get total adjustments
    const { data: adjustmentsData } = await supabase
      .from('payroll_adjustments')
      .select('amount, adjustment_type')
      .eq('school_id', schoolId)
      .eq('is_applied', false);
    
    const totalAdjustments = (adjustmentsData || []).reduce((sum, a) => {
      if (a.adjustment_type === 'bonus') {
        return sum + parseFloat(a.amount);
      } else {
        return sum - parseFloat(a.amount);
      }
    }, 0);
    
    const uniqueStaffIds = new Set(generations.map(g => g.staff_id));
    
    return {
      totalPayroll,
      totalPaid,
      totalPending,
      totalAdvances,
      totalAdjustments,
      employeeCount: uniqueStaffIds.size,
      paidCount: paidGenerations.length,
      pendingCount: pendingStaffIds.size,
    };
  },

  async getEmployeePayrollGenerationsWithBalance(
    schoolId: number,
    staffId: number
  ): Promise<Array<{
    generation: PayrollGeneration;
    totalPaid: number;
    remainingBalance: number;
    paymentStatus: 'unpaid' | 'partial' | 'paid';
    payments: PayrollPayment[];
  }>> {
    try {
      // Get all payroll generations for this employee (including draft, approved, paid)
      const generations = await this.getPayrollGenerations(schoolId, { staffId });
      
      console.log(`[getEmployeePayrollGenerationsWithBalance] Found ${generations?.length || 0} generations for staffId ${staffId}:`, 
        generations?.map(g => ({ id: g.id, status: g.status, month: g.payrollMonth, year: g.payrollYear })));
      
      if (!generations || generations.length === 0) {
        console.log(`[getEmployeePayrollGenerationsWithBalance] No generations found for staffId ${staffId}`);
        return [];
      }
      
      // Show all generations (draft, approved, paid) but mark draft ones as non-payable
      // Filter to only show approved or paid generations for payment (draft cannot be paid)
      const approvedGenerations = generations.filter(g => g.status === 'approved' || g.status === 'paid');
      
      console.log(`[getEmployeePayrollGenerationsWithBalance] Found ${approvedGenerations.length} approved/paid generations out of ${generations.length} total`);
      
      if (approvedGenerations.length === 0) {
        console.log(`[getEmployeePayrollGenerationsWithBalance] No approved/paid generations. All generations are:`, 
          generations.map(g => ({ id: g.id, status: g.status, month: g.payrollMonth, year: g.payrollYear })));
        return [];
      }
    
      const allPayments = await this.getPayrollPayments(schoolId, {});
      const completedPayments = allPayments.filter(payment => payment.status === 'completed');

      return approvedGenerations.map(generation => {
      const payments = completedPayments.filter(payment => {
        if (payment.items && payment.items.length > 0) {
          return payment.items.some(item => item.generationId === generation.id);
        }
        return payment.generationId === generation.id;
      });
      const totalPaid = payments.reduce((sum, payment) => sum + getPayrollPaymentAppliedAmount(payment, generation.id), 0);
      const remainingBalance = Math.max(0, generation.netSalary - totalPaid);
      
      let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (totalPaid >= generation.netSalary) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }
      
      return {
        generation,
        totalPaid,
        remainingBalance,
        paymentStatus,
        payments,
      };
      }).sort((a, b) => {
      // Sort by year and month descending (newest first)
      if (a.generation.payrollYear !== b.generation.payrollYear) {
        return b.generation.payrollYear - a.generation.payrollYear;
      }
      return b.generation.payrollMonth - a.generation.payrollMonth;
      });
    } catch (error) {
      console.error('Error in getEmployeePayrollGenerationsWithBalance:', error);
      throw error;
    }
  },

  async getAllStaffWithPayrollPlans(
    schoolId: number
  ): Promise<Array<{
    id: number;
    name: string;
    role: string;
  }>> {
    // Get all staff who have active payroll plans
    const query = supabase
      .from('payroll_plans')
      .select(`
        staff_id,
        staff:staff_id (id, name, role)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'active');
    
    const plansData = await fetchAllRows(async (from, to) => {
      return await query.range(from, to);
    });
    
    // Get unique staff
    const staffMap = new Map<number, { id: number; name: string; role: string }>();
    plansData.forEach((plan: any) => {
      if (plan.staff && plan.staff_id) {
        staffMap.set(plan.staff_id, {
          id: plan.staff.id,
          name: plan.staff.name,
          role: plan.staff.role,
        });
      }
    });
    
    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  async getStaffEligibleForPayroll(
    schoolId: number,
    payrollMonth: number,
    payrollYear: number
  ): Promise<Array<{
    staffId: number;
    staffName: string;
    staffRole: string;
    planId: number;
    planName: string;
    basicPay: number;
    hasExistingGeneration: boolean;
    existingGenerationId?: number;
  }>> {
    // Get all active payroll plans (plans are employee-specific with staff_id)
    const query = supabase
      .from('payroll_plans')
      .select(`
        id,
        staff_id,
        name,
        basic_pay,
        status,
        effective_from,
        effective_to,
        staff:staff_id (id, name, role)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'active');
    
    const plansData = await fetchAllRows(async (from, to) => {
      return await query.range(from, to);
    });
    
    // Filter plans that are effective for the selected month/year
    const currentDate = new Date(payrollYear, payrollMonth - 1, 1);
    const activePlans = plansData.filter((plan: any) => {
      const effectiveFrom = plan.effective_from ? new Date(plan.effective_from) : null;
      const effectiveTo = plan.effective_to ? new Date(plan.effective_to) : null;
      
      if (effectiveFrom && currentDate < effectiveFrom) return false;
      if (effectiveTo && currentDate > effectiveTo) return false;
      
      // Check if staff exists (handle as array)
      const staff = Array.isArray(plan.staff) ? plan.staff[0] : plan.staff;
      return plan.staff_id && staff;
    });
    
    // Get existing generations for this month/year
    const existingGenerations = await this.getPayrollGenerations(schoolId, {
      payrollMonth,
      payrollYear,
    });
    
    // Create a map with key as "staffId-planId" to handle multiple plans per employee
    const existingMap = new Map(
      existingGenerations.map(gen => [`${gen.staffId}-${gen.planId}`, gen.id])
    );
    
    // Map to eligible staff format
    return activePlans.map((plan: any) => {
      // Handle staff as array (Supabase returns related data as arrays)
      const staff = Array.isArray(plan.staff) ? plan.staff[0] : plan.staff;
      const mapKey = `${plan.staff_id}-${plan.id}`;
      
      return {
        staffId: plan.staff_id,
        staffName: staff?.name || 'Unknown',
        staffRole: staff?.role || 'Unknown',
        planId: plan.id,
        planName: plan.name || 'Unknown',
        basicPay: parseFloat(plan.basic_pay) || 0,
        hasExistingGeneration: existingMap.has(mapKey),
        existingGenerationId: existingMap.get(mapKey),
      };
    });
  },

  // Check if a payroll generation has any payments
  async hasPayrollPayments(
    schoolId: number,
    generationId: number
  ): Promise<boolean> {
    const payments = await this.getPayrollPayments(schoolId, {});
    const generationPayments = payments.filter(
      p => p.generationId === generationId && p.status === 'completed'
    );
    const totalPaid = generationPayments.reduce((sum, p) => sum + p.amount, 0);
    return totalPaid > 0;
  },

  // Check if a staff member has a payroll for a specific month/year with payments
  async hasPayrollWithPaymentsForMonth(
    schoolId: number,
    staffId: number,
    payrollMonth: number,
    payrollYear: number
  ): Promise<boolean> {
    const generations = await this.getPayrollGenerations(schoolId, { 
      staffId,
      payrollMonth,
      payrollYear 
    });
    
    if (!generations || generations.length === 0) {
      return false;
    }

    // Check if any generation has payments
    for (const generation of generations) {
      const hasPayments = await this.hasPayrollPayments(schoolId, generation.id);
      if (hasPayments) {
        return true;
      }
    }
    
    return false;
  },

  // Check if an advance has been used (partially or fully) in any payroll generation
  async isAdvanceUsedInPayroll(
    schoolId: number,
    advanceId: number
  ): Promise<boolean> {
    // Get the advance details
    const advance = await this.getAdvance(schoolId, advanceId);
    if (!advance) {
      return false;
    }

    // If remaining balance is less than original amount, it has been used in a payroll generation
    // When payroll is generated, the advance balance is reduced, so this is a reliable indicator
    if (advance.remainingBalance < advance.amount) {
      return true;
    }

    return false;
  },

  // Delete a payroll advance
  async deleteAdvance(
    schoolId: number,
    advanceId: number,
    userId?: number
  ): Promise<void> {
    if (userId) await setAuditUser(userId);

    // Check if advance is used in any payroll generation
    const isUsed = await this.isAdvanceUsedInPayroll(schoolId, advanceId);
    if (isUsed) {
      throw new Error('Cannot delete advance. It has been used (partially or fully) in a payroll generation.');
    }

    // Get advance details for audit log
    const advance = await this.getAdvance(schoolId, advanceId);
    if (!advance) {
      throw new Error('Advance not found');
    }

    // Delete the advance
    const { error } = await supabase
      .from('payroll_advances')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', advanceId);

    if (error) throw error;

    await logAudit(
      schoolId,
      'payroll_advance',
      advanceId,
      'delete',
      advance,
      undefined,
      userId
    );
  },

  async getPayrollAnalytics(
    schoolId: number,
    startYear?: number,
    endYear?: number
  ): Promise<PayrollAnalytics> {
    // Get all payroll generations
    let query = supabase
      .from('payroll_generations')
      .select(`
        *,
        staff (id, name, role)
      `)
      .eq('school_id', schoolId)
      .in('status', ['approved', 'paid']);
    
    if (startYear) {
      query = query.gte('payroll_year', startYear);
    }
    if (endYear) {
      query = query.lte('payroll_year', endYear);
    }
    
    const { data: generationsData, error: generationsError } = await query;
    if (generationsError) throw generationsError;

    const { data: activeStaffData, error: activeStaffError } = await supabase
      .from('staff')
      .select('id')
      .eq('school_id', schoolId)
      .eq('status', 'active');
    if (activeStaffError) throw activeStaffError;
    
    const generations = (generationsData || []).map((g: any) => ({
      ...g,
      netSalary: parseFloat(g.net_salary),
      payrollMonth: g.payroll_month,
      payrollYear: g.payroll_year,
      status: g.status,
    }));
    const activeStaffIds = new Set((activeStaffData || []).map((staff: any) => staff.id));
    const generationIds = generations.map((g: any) => g.id);
    const payments = generationIds.length > 0 ? await this.getPayrollPayments(schoolId, {}) : [];
    const completedPayments = getCompletedPaymentsForGenerationIds(payments, generationIds);
    const paidByGeneration = buildPaidByGenerationMap(completedPayments, generationIds);

    // Monthly totals (last 12 months ending at the latest generated payroll month)
    const monthlyMap = new Map<string, { total: number; paid: number; pending: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let latestGeneratedYear: number | null = null;
    let latestGeneratedMonthIndex: number | null = null;

    generations.forEach((generation: any) => {
      const generationYear = generation.payrollYear;
      const generationMonthIndex = generation.payrollMonth - 1;

      if (
        latestGeneratedYear === null ||
        latestGeneratedMonthIndex === null ||
        generationYear > latestGeneratedYear ||
        (generationYear === latestGeneratedYear && generationMonthIndex > latestGeneratedMonthIndex)
      ) {
        latestGeneratedYear = generationYear;
        latestGeneratedMonthIndex = generationMonthIndex;
      }
    });

    if (latestGeneratedYear !== null && latestGeneratedMonthIndex !== null) {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(latestGeneratedYear, latestGeneratedMonthIndex - i, 1);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        monthlyMap.set(monthKey, { total: 0, paid: 0, pending: 0 });
      }
    }

    const generationMetaById = new Map<number, { payrollYear: number; payrollMonthIndex: number }>();
    generations.forEach((generation: any) => {
      generationMetaById.set(generation.id, {
        payrollYear: generation.payrollYear,
        payrollMonthIndex: generation.payrollMonth - 1,
      });
    });

    const monthlyGenerationMap = new Map<string, number>();
    generations.forEach((generation: any) => {
      const monthKey = getMonthKey(monthNames, generation.payrollYear, generation.payrollMonth - 1);
      monthlyGenerationMap.set(
        monthKey,
        (monthlyGenerationMap.get(monthKey) || 0) + generation.netSalary
      );
    });

    const monthlyKeys = Array.from(monthlyMap.keys());
    let openingPending = 0;

    const monthlyTotal = monthlyKeys.map((month) => {
      const [monthLabel, yearLabel] = month.split(' ');
      const currentMonthIndex = monthNames.indexOf(monthLabel);
      const currentYear = Number(yearLabel);
      const generatedAmount = monthlyGenerationMap.get(month) || 0;
      const total = openingPending + generatedAmount;

      const settlementDate = new Date(currentYear, currentMonthIndex + 1, 1);
      const settlementMonthIndex = settlementDate.getMonth();
      const settlementYear = settlementDate.getFullYear();

      const paidRaw = completedPayments.reduce((sum, payment) => {
        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : null;
        if (!paymentDate || Number.isNaN(paymentDate.getTime())) {
          return sum;
        }

        if (
          paymentDate.getMonth() !== settlementMonthIndex ||
          paymentDate.getFullYear() !== settlementYear
        ) {
          return sum;
        }

        if (payment.items && payment.items.length > 0) {
          const appliedAmount = payment.items.reduce((itemSum, item) => {
            const generationMeta = generationMetaById.get(item.generationId);
            if (!generationMeta) {
              return itemSum;
            }

            if (
              !isSameOrBeforePayrollMonth(
                generationMeta.payrollYear,
                generationMeta.payrollMonthIndex,
                currentYear,
                currentMonthIndex
              )
            ) {
              return itemSum;
            }

            return itemSum + item.paidAmount;
          }, 0);

          return sum + appliedAmount;
        }

        const generationMeta = generationMetaById.get(payment.generationId);
        if (!generationMeta) {
          return sum;
        }

        if (
          !isSameOrBeforePayrollMonth(
            generationMeta.payrollYear,
            generationMeta.payrollMonthIndex,
            currentYear,
            currentMonthIndex
          )
        ) {
          return sum;
        }

        return sum + payment.amount;
      }, 0);

      const paid = Math.min(total, paidRaw);
      const pending = Math.max(0, total - paid);
      openingPending = pending;

      return {
        month,
        total,
        paid,
        pending,
      };
    });

    // Role-wise distribution
    const roleMap = new Map<string, { total: number; count: number }>();
    generations.forEach((g: any) => {
      const role = g.staff?.role || 'Unknown';
      if (!roleMap.has(role)) {
        roleMap.set(role, { total: 0, count: 0 });
      }
      const roleData = roleMap.get(role)!;
      roleData.total += g.netSalary;
      roleData.count += 1;
    });
    
    const roleWiseDistribution = Array.from(roleMap.entries()).map(([role, data]) => ({
      role,
      total: data.total,
      count: data.count,
    })).sort((a, b) => b.total - a.total);

    // Payment status summary
    const statusMap = new Map<string, { total: number; count: number }>();
    generations.forEach((g: any) => {
      const generationPaid = paidByGeneration.get(g.id) || 0;
      let status = 'unpaid';
      if (generationPaid >= g.netSalary) {
        status = 'paid';
      } else if (generationPaid > 0) {
        status = 'partial';
      }

      if (!statusMap.has(status)) {
        statusMap.set(status, { total: 0, count: 0 });
      }
      const statusData = statusMap.get(status)!;
      statusData.total += status === 'paid' ? g.netSalary : Math.max(0, g.netSalary - generationPaid);
      statusData.count += 1;
    });
    
    const paymentStatusSummary = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      total: data.total,
      count: data.count,
    }));

    // Advance outstanding
    const { data: advancesData } = await supabase
      .from('payroll_advances')
      .select('remaining_balance')
      .eq('school_id', schoolId)
      .eq('status', 'active');
    
    const advanceOutstanding = (advancesData || []).reduce((sum, a) => sum + parseFloat(a.remaining_balance), 0);

    // Earnings and remaining balances
    const staffMap = new Map<number, { staffId: number; staffName: string; amount: number }>();
    const pendingStaffMap = new Map<number, { staffId: number; staffName: string; amount: number }>();
    const latestGeneratedMonthKey =
      latestGeneratedYear !== null && latestGeneratedMonthIndex !== null
      ? `${latestGeneratedYear}-${latestGeneratedMonthIndex}`
      : null;
    
    generations.forEach((g: any) => {
      const staffId = g.staff_id;
      const pendingAmount = Math.max(0, g.netSalary - (paidByGeneration.get(g.id) || 0));
      const generationMonthKey = `${g.payrollYear}-${g.payrollMonth - 1}`;

      if (activeStaffIds.has(staffId)) {
        if (!staffMap.has(staffId)) {
          staffMap.set(staffId, {
            staffId,
            staffName: g.staff?.name || 'Unknown',
            amount: 0,
          });
        }
        const staffData = staffMap.get(staffId)!;
        staffData.amount += g.netSalary;
      }

      if (!pendingStaffMap.has(staffId)) {
        pendingStaffMap.set(staffId, {
          staffId,
          staffName: g.staff?.name || 'Unknown',
          amount: 0,
        });
      }
      const pendingStaffData = pendingStaffMap.get(staffId)!;
      pendingStaffData.amount += pendingAmount;
    });
    
    const topEarners = Array.from(staffMap.values())
      .sort((a, b) => b.amount - a.amount);
    const topPendingAmounts = Array.from(pendingStaffMap.values())
      .filter(staff => staff.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const recentGeneratedPayrollEmployeeCount = latestGeneratedMonthKey
      ? new Set(
          generations
            .filter((generation: any) => `${generation.payrollYear}-${generation.payrollMonth - 1}` === latestGeneratedMonthKey)
            .map((generation: any) => generation.staff_id)
        ).size
      : 0;

    // Deduction analysis
    const deductionMap = new Map<string, number>();
    generations.forEach((g: any) => {
      if (g.calculation_details) {
        const details = typeof g.calculation_details === 'string' 
          ? JSON.parse(g.calculation_details) 
          : g.calculation_details;
        
        if (details.deductions) {
          details.deductions.forEach((d: any) => {
            if (!deductionMap.has(d.name)) {
              deductionMap.set(d.name, 0);
            }
            deductionMap.set(d.name, deductionMap.get(d.name)! + d.amount);
          });
        }
      }
    });
    
    const deductionAnalysis = Array.from(deductionMap.entries())
      .map(([itemName, total]) => ({ itemName, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      monthlyTotal,
      roleWiseDistribution,
      paymentStatusSummary,
      advanceOutstanding,
      recentGeneratedPayrollEmployeeCount,
      topEarners,
      topPendingAmounts,
      deductionAnalysis,
    };
  },
};
