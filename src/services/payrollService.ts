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
} from '../utils/payrollCalculations';

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
    
    const { data, error } = await query;
    if (error) throw error;
    
    const plans: PayrollPlan[] = (data || []).map(item => ({
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
    const { data, error } = await supabase
      .from('payroll_plans')
      .select(`
        *,
        staff:staff_id (id, name, role)
      `)
      .eq('school_id', schoolId)
      .eq('id', planId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
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
    const { data, error } = await supabase
      .from('payroll_plan_items')
      .select('*')
      .eq('school_id', schoolId)
      .eq('plan_id', planId)
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
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
    
    query = query.order('effective_from', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(item => ({
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
    
    query = query.order('payroll_year', { ascending: false })
      .order('payroll_month', { ascending: false })
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    const generations: PayrollGeneration[] = (data || []).map(item => ({
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
    calculationMode: 'full' | 'partial' = 'partial'
  ): Promise<PayrollGeneration> {
    if (userId) await setAuditUser(userId);
    
    // Get payroll settings
    const settings = await this.getPayrollSettings(schoolId);
    if (!settings) {
      throw new Error('Payroll settings not configured. Please configure settings first.');
    }
    
    // Get employee's active payroll plan
    const employeePlans = await this.getEmployeePayrollPlans(schoolId, staffId);
    const activePlan = employeePlans.find(ep => ep.isActive);
    if (!activePlan || !activePlan.plan) {
      throw new Error('No active payroll plan assigned to employee');
    }
    
    const plan = await this.getPayrollPlan(schoolId, activePlan.planId);
    if (!plan) {
      throw new Error('Payroll plan not found');
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
    
    // Fetch attendance records for the selected month and year only
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('staff_attendance_records')
      .select('*')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('session_id', sessionData.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    if (attendanceError) {
      throw attendanceError;
    }
    
    const attendanceRecords = (attendanceData || []).map(ar => ({
      status: ar.status,
      date: ar.date,
    }));
    
    // Fetch half leaves for the selected month and year
    const { data: halfLeavesData } = await supabase
      .from('half_leaves')
      .select('date, leave_type')
      .eq('person_type', 'staff')
      .eq('person_id', staffId)
      .eq('session_id', sessionData.id)
      .eq('school_id', schoolId)
      .gte('date', startDate)
      .lte('date', endDate);
    
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
    
    // Get active advances
    const advances = await this.getAdvances(schoolId, staffId, true);
    
    // Get unapplied adjustments for this month
    const adjustments = await this.getAdjustments(schoolId, {
      staffId,
      payrollMonth,
      payrollYear,
    });
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
      calculationMode
    );
    
    // Check if generation already exists
    const existing = await supabase
      .from('payroll_generations')
      .select('id')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .eq('payroll_month', payrollMonth)
      .eq('payroll_year', payrollYear)
      .single();
    
    const generationData: any = {
      school_id: schoolId,
      staff_id: staffId,
      payroll_month: payrollMonth,
      payroll_year: payrollYear,
      total_earnings: breakdown.grossSalary + breakdown.allowances.reduce((sum, a) => sum + a.amount, 0),
      total_deductions: breakdown.deductions.reduce((sum, d) => sum + d.amount, 0) + breakdown.leaveDeductions + breakdown.advanceDeductions,
      net_salary: breakdown.netSalary,
      working_days: attendanceSummary.workingDays,
      present_days: attendanceSummary.presentDays,
      leave_days: attendanceSummary.leaveDays,
      absent_days: attendanceSummary.absentDays,
      status: settings.autoApprovePayroll ? 'approved' : 'draft',
      generated_by: userId,
    };
    
    if (settings.autoApprovePayroll && userId) {
      generationData.approved_by = userId;
      generationData.approved_at = new Date().toISOString();
    }
    
    let generationId: number;
    
    if (existing.data) {
      // Update existing
      const { data, error } = await supabase
        .from('payroll_generations')
        .update(generationData)
        .eq('id', existing.data.id)
        .select()
        .single();
      
      if (error) throw error;
      generationId = data.id;
      
      // Delete old items
      await supabase
        .from('payroll_generation_items')
        .delete()
        .eq('generation_id', generationId);
    } else {
      // Create new
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
    
    // Add leave deductions
    if (breakdown.leaveDeductions > 0) {
      itemsData.push({
        school_id: schoolId,
        generation_id: generationId,
        item_name: 'Leave Deduction',
        item_type: 'deduction',
        amount: breakdown.leaveDeductions,
        calculation_basis: `Excess leaves: ${attendanceSummary.leaveDays - settings.allowedLeavesPerMonth} days`,
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
    
    // Mark adjustments as applied
    for (const adj of unappliedAdjustments) {
      await supabase
        .from('payroll_adjustments')
        .update({
          is_applied: true,
          applied_to_generation_id: generationId,
        })
        .eq('id', adj.id);
    }
    
    // Update advance balances
    for (const advance of advances.filter(a => a.status === 'active')) {
      const deduction = Math.min(advance.repaymentAmountPerMonth, advance.remainingBalance);
      if (deduction > 0) {
        const newBalance = Math.max(0, advance.remainingBalance - deduction);
        await supabase
          .from('payroll_advances')
          .update({
            remaining_balance: newBalance,
            status: newBalance === 0 ? 'completed' : 'active',
          })
          .eq('id', advance.id);
      }
    }
    
    await logAudit(
      schoolId,
      'payroll_generation',
      generationId,
      existing.data ? 'update' : 'create',
      existing.data ? await this.getPayrollGeneration(schoolId, generationId) : undefined,
      generationData,
      userId
    );
    
    return await this.getPayrollGeneration(schoolId, generationId) as PayrollGeneration;
  },

  async getPayrollGenerationItems(
    schoolId: number,
    generationId: number
  ): Promise<PayrollGenerationItem[]> {
    const { data, error } = await supabase
      .from('payroll_generation_items')
      .select('*')
      .eq('school_id', schoolId)
      .eq('generation_id', generationId)
      .order('item_type', { ascending: true })
      .order('id', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
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

  // Payroll Payments
  async getPayrollPayments(
    schoolId: number,
    filters: PayrollFilters = {}
  ): Promise<PayrollPayment[]> {
    let query = supabase
      .from('payroll_payments')
      .select(`
        *,
        payroll_generations (*, staff (id, name, role)),
        users!payroll_payments_received_by_fkey (id, name, email)
      `)
      .eq('school_id', schoolId);
    
    if (filters.staffId) {
      query = query.eq('payroll_generations.staff_id', filters.staffId);
    }
    
    query = query.order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      generationId: item.generation_id,
      paymentDate: item.payment_date,
      amount: parseFloat(item.amount),
      paymentMode: item.payment_mode,
      referenceNo: item.reference_no,
      remarks: item.remarks,
      status: item.status,
      receivedBy: item.received_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      generation: item.payroll_generations ? {
        id: item.payroll_generations.id,
        schoolId: item.payroll_generations.school_id,
        staffId: item.payroll_generations.staff_id,
        payrollMonth: item.payroll_generations.payroll_month,
        payrollYear: item.payroll_generations.payroll_year,
        totalEarnings: parseFloat(item.payroll_generations.total_earnings || '0'),
        totalDeductions: parseFloat(item.payroll_generations.total_deductions || '0'),
        netSalary: parseFloat(item.payroll_generations.net_salary),
        status: item.payroll_generations.status,
        staff: item.payroll_generations.staff ? {
          id: item.payroll_generations.staff.id,
          name: item.payroll_generations.staff.name,
          role: item.payroll_generations.staff.role,
        } : undefined,
      } : undefined,
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
    if (userId) await setAuditUser(userId);
    
    // Verify generation exists and is approved
    const generation = await this.getPayrollGeneration(schoolId, paymentInput.generationId);
    if (!generation) {
      throw new Error('Payroll generation not found');
    }
    if (generation.status !== 'approved') {
      throw new Error('Only approved payrolls can be paid');
    }
    
    // Create payment
    const { data, error } = await supabase
      .from('payroll_payments')
      .insert({
        school_id: schoolId,
        generation_id: paymentInput.generationId,
        payment_date: paymentInput.paymentDate,
        amount: paymentInput.amount,
        payment_mode: paymentInput.paymentMode,
        reference_no: paymentInput.referenceNo,
        remarks: paymentInput.remarks,
        status: 'completed',
        received_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Update generation status to paid
    await supabase
      .from('payroll_generations')
      .update({ status: 'paid' })
      .eq('id', paymentInput.generationId);
    
    await logAudit(
      schoolId,
      'payroll_payment',
      data.id,
      'create',
      undefined,
      paymentInput,
      userId
    );
    
    return {
      id: data.id,
      schoolId: data.school_id,
      generationId: data.generation_id,
      paymentDate: data.payment_date,
      amount: parseFloat(data.amount),
      paymentMode: data.payment_mode,
      referenceNo: data.reference_no,
      remarks: data.remarks,
      status: data.status,
      receivedBy: data.received_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Payroll Advances
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
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(item => ({
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
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(item => ({
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
    const paidGenerations = generations.filter(g => g.status === 'paid');
    const totalPaid = paidGenerations.reduce((sum, g) => sum + parseFloat(g.net_salary), 0);
    const pendingGenerations = generations.filter(g => g.status === 'approved');
    const totalPending = pendingGenerations.reduce((sum, g) => sum + parseFloat(g.net_salary), 0);
    
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
      pendingCount: pendingGenerations.length,
    };
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
    const { data: plansData, error: plansError } = await supabase
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
    
    if (plansError) throw plansError;
    
    // Filter plans that are effective for the selected month/year
    const currentDate = new Date(payrollYear, payrollMonth - 1, 1);
    const activePlans = (plansData || []).filter(plan => {
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
    
    const existingMap = new Map(
      existingGenerations.map(gen => [gen.staffId, gen.id])
    );
    
    // Map to eligible staff format
    return activePlans.map(plan => {
      // Handle staff as array (Supabase returns related data as arrays)
      const staff = Array.isArray(plan.staff) ? plan.staff[0] : plan.staff;
      
      return {
        staffId: plan.staff_id,
        staffName: staff?.name || 'Unknown',
        staffRole: staff?.role || 'Unknown',
        planId: plan.id,
        planName: plan.name || 'Unknown',
        basicPay: parseFloat(plan.basic_pay) || 0,
        hasExistingGeneration: existingMap.has(plan.staff_id),
        existingGenerationId: existingMap.get(plan.staff_id),
      };
    });
  },
};

