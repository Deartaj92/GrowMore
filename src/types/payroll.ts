// Payroll Management Types

export interface PayrollSettings {
  id: number;
  schoolId: number;
  monthlyWorkingDays: number;
  allowedLeavesPerMonth: number;
  leaveDeductionMethod: 'full_day' | 'half_day' | 'proportional';
  salaryCalculationMethod: 'monthly' | 'daily' | 'hourly';
  defaultPaymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other';
  autoApprovePayroll: boolean;
  lateDeductionEnabled?: boolean;
  allowedLateDaysPerMonth?: number;
  lateDeductionAmount?: number;
  lateDeductionType?: 'fixed' | 'percentage';
  allowLeaveBonus?: boolean;
  leaveBonusDays?: number; // 1 or 2 days
  leaveBonusStaffIds?: number[];
  roundUpAmounts?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollPlan {
  id: number;
  schoolId: number;
  staffId?: number; // Employee this plan belongs to
  name: string;
  description?: string;
  basicPay: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'active' | 'inactive' | 'archived';
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  items?: PayrollPlanItem[];
  staff?: {
    id: number;
    name: string;
    role: string;
  };
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PayrollPlanItem {
  id: number;
  schoolId: number;
  planId: number;
  itemType: 'allowance' | 'deduction';
  name: string;
  amountType: 'fixed' | 'percentage';
  amount: number;
  isTaxable: boolean;
  calculationBasis?: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollPlanWithItems extends PayrollPlan {
  items: PayrollPlanItem[];
}

export interface EmployeePayrollPlan {
  id: number;
  schoolId: number;
  staffId: number;
  planId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  plan?: PayrollPlan;
  staff?: {
    id: number;
    name: string;
    role: string;
  };
}

export interface PayrollGeneration {
  id: number;
  schoolId: number;
  staffId: number;
  payrollMonth: number;
  payrollYear: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  workingDays?: number;
  presentDays?: number;
  leaveDays?: number;
  absentDays?: number;
  lateDays?: number;
  halfDayLeaves?: number;
  calculationMode?: 'full' | 'partial';
  grossSalary?: number;
  absentDeductions?: number;
  leaveDeductions?: number;
  lateDeductions?: number;
  advanceDeductions?: number;
  attendanceData?: {
    records: Array<{ status: string; date: string; paidLeave?: boolean }>;
    halfLeaves: Array<{ date: string; type: 'first_half' | 'second_half' }>;
    summary: {
      workingDays: number;
      presentDays: number;
      leaveDays: number;
      absentDays: number;
      lateDays: number;
      halfDayLeaves: number;
      paidLeaveDays?: number;
    };
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  calculationDetails?: {
    calculationMode: 'full' | 'partial';
    grossSalary: number;
    allowances: Array<{ name: string; amount: number }>;
    deductions: Array<{ name: string; amount: number }>;
    absentDeductions: number;
    leaveDeductions: number;
    lateDeductions: number;
    advanceDeductions: number;
    adjustments: Array<{ name: string; amount: number; type: string }>;
    netSalary: number;
    settings: {
      monthlyWorkingDays: number;
      allowedLeavesPerMonth: number;
      leaveDeductionMethod: 'full_day' | 'half_day' | 'proportional';
      lateDeductionEnabled: boolean;
      allowedLateDaysPerMonth: number;
      lateDeductionAmount: number;
      lateDeductionType: 'fixed' | 'percentage';
    };
    advances: Array<{
      id: number;
      amount: number;
      remainingAmount: number;
      deductionAmount: number;
    }>;
    appliedAdjustments: Array<{
      id: number;
      adjustmentType: string;
      amount: number;
      reason: string;
    }>;
  };
  planId?: number;
  planSnapshot?: {
    planId: number;
    planName: string;
    basicPay: number;
    description?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    items: Array<{
      id: number;
      itemType: 'allowance' | 'deduction';
      name: string;
      amountType: 'fixed' | 'percentage';
      amount: number;
      isTaxable: boolean;
      calculationBasis?: string;
    }>;
    capturedAt: string;
  };
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  approvedBy?: number;
  approvedAt?: string;
  generatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  staff?: {
    id: number;
    name: string;
    role: string;
  };
  items?: PayrollGenerationItem[];
  approvedByUser?: {
    id: number;
    name: string;
    email: string;
  };
  generatedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PayrollGenerationItem {
  id: number;
  schoolId: number;
  generationId: number;
  itemName: string;
  itemType: 'allowance' | 'deduction' | 'adjustment';
  amount: number;
  calculationBasis?: string;
  createdAt?: string;
}

export interface PayrollPayment {
  id: number;
  schoolId: number;
  generationId: number;
  paymentGroupId?: string;
  paymentDate: string;
  amount: number;
  totalRemainingBeforePayment?: number;
  remainingAfterPayment?: number;
  oldBalanceAmount?: number;
  currentMonthGross?: number;
  currentMonthDeductions?: number;
  priorPaymentsCurrentMonth?: number;
  netAmount?: number;
  attendancePresent?: number;
  attendanceLeave?: number;
  attendanceAbsent?: number;
  attendanceLate?: number;
  absentDeductionAmount?: number;
  leaveDeductionAmount?: number;
  lateDeductionAmount?: number;
  advanceDeductionAmount?: number;
  paymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other';
  referenceNo?: string;
  remarks?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  receivedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  generation?: PayrollGeneration;
  items?: PayrollPaymentItem[];
  receivedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PayrollPaymentItem {
  id: number;
  schoolId: number;
  paymentId: number;
  generationId: number;
  amountDueBeforePayment: number;
  paidAmount: number;
  remainingAfterPayment: number;
  displayOrder: number;
  createdAt?: string;
  generation?: PayrollGeneration;
}

export interface PayrollAdvance {
  id: number;
  schoolId: number;
  staffId: number;
  advanceDate: string;
  amount: number;
  repaymentAmountPerMonth: number;
  remainingBalance: number;
  status: 'active' | 'completed' | 'cancelled';
  reason?: string;
  approvedBy?: number;
  approvedAt?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  staff?: {
    id: number;
    name: string;
    role: string;
  };
  approvedByUser?: {
    id: number;
    name: string;
    email: string;
  };
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PayrollAdjustment {
  id: number;
  schoolId: number;
  staffId: number;
  adjustmentType: 'bonus' | 'fine' | 'extra_cut' | 'other';
  amount: number;
  reason: string;
  payrollMonth: number;
  payrollYear: number;
  isApplied: boolean;
  appliedToGenerationId?: number;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  staff?: {
    id: number;
    name: string;
    role: string;
  };
  appliedToGeneration?: PayrollGeneration;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PayrollAuditLog {
  id: number;
  schoolId: number;
  entity: string;
  entityId: number;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  oldValues?: any;
  newValues?: any;
  changedBy?: number;
  changedAt: string;
  changedByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

// Filter and query interfaces
export interface PayrollFilters {
  staffId?: number;
  payrollMonth?: number;
  payrollYear?: number;
  status?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface PayrollSummary {
  totalPayroll: number;
  totalPaid: number;
  totalPending: number;
  totalAdvances: number;
  totalAdjustments: number;
  employeeCount: number;
  paidCount: number;
  pendingCount: number;
}

export interface PayrollAnalytics {
  monthlyTotal: { month: string; total: number; paid: number; pending: number }[];
  roleWiseDistribution: { role: string; total: number; count: number }[];
  paymentStatusSummary: { status: string; total: number; count: number }[];
  advanceOutstanding: number;
  recentGeneratedPayrollEmployeeCount: number;
  topEarners: { staffId: number; staffName: string; amount: number }[];
  topPendingAmounts: { staffId: number; staffName: string; amount: number }[];
  deductionAnalysis: { itemName: string; total: number }[];
}

export interface AttendanceSummary {
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  halfDayLeaves: number;
  lateDays: number;
  paidLeaveDays?: number;
}

export interface SalaryCalculationResult {
  grossSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  leaveDeductions: number; // Excess leave deductions (Full mode only)
  lateDeductions: number;
  advanceDeductions: number;
  adjustments: { name: string; amount: number; type: string }[];
  netSalary: number;
  attendanceSummary: AttendanceSummary;
  absentDeductions?: number; // Absent deductions (Full mode only, always deducted)
  leaveBonusAmount?: number; // Leave bonus amount added to gross pay
}

// Form input types
export interface CreatePayrollPlanInput {
  staffId: number; // Required: Employee this plan is for
  name: string;
  description?: string;
  basicPay: number;
  effectiveFrom: string;
  effectiveTo?: string;
  items: Omit<PayrollPlanItem, 'id' | 'schoolId' | 'planId' | 'createdAt' | 'updatedAt'>[];
}

export interface CreatePayrollAdvanceInput {
  staffId: number;
  advanceDate: string;
  amount: number;
  repaymentAmountPerMonth: number;
  reason?: string;
}

export interface CreatePayrollAdjustmentInput {
  staffId: number;
  adjustmentType: 'bonus' | 'fine' | 'extra_cut' | 'other';
  amount: number;
  reason: string;
  payrollMonth: number;
  payrollYear: number;
}

export interface ProcessPaymentInput {
  generationId: number;
  paymentDate: string;
  amount: number;
  paymentMode: 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other';
  paymentGroupId?: string;
  referenceNo?: string;
  remarks?: string;
}

export interface PayslipData extends PayrollGeneration {
  payment?: PayrollPayment;
  plan?: PayrollPlan;
  advances?: PayrollAdvance[];
  adjustments?: PayrollAdjustment[];
}
