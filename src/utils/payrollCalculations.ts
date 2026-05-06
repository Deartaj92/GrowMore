/**
 * Payroll Calculation Utilities
 * Functions for calculating salaries, deductions, and related payroll operations
 */

import {
  PayrollPlan,
  PayrollPlanItem,
  AttendanceSummary,
  SalaryCalculationResult,
  PayrollAdvance,
  PayrollAdjustment,
} from '../types/payroll';

/**
 * Calculate gross salary from payroll plan
 */
export const calculateGrossSalary = (
  plan: PayrollPlan,
  planItems: PayrollPlanItem[]
): number => {
  let grossSalary = plan.basicPay;

  // Calculate allowances
  const allowances = planItems.filter(item => item.itemType === 'allowance');
  allowances.forEach(item => {
    if (item.amountType === 'fixed') {
      grossSalary += item.amount;
    } else if (item.amountType === 'percentage') {
      const basis = item.calculationBasis === 'basic_pay' ? plan.basicPay : grossSalary;
      grossSalary += (basis * item.amount) / 100;
    }
  });

  return Math.round(grossSalary * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate deductions from payroll plan
 */
export const calculateDeductions = (
  plan: PayrollPlan,
  planItems: PayrollPlanItem[],
  grossSalary: number
): { name: string; amount: number }[] => {
  const deductions: { name: string; amount: number }[] = [];
  const deductionItems = planItems.filter(item => item.itemType === 'deduction');

  deductionItems.forEach(item => {
    let amount = 0;
    if (item.amountType === 'fixed') {
      amount = item.amount;
    } else if (item.amountType === 'percentage') {
      const basis = item.calculationBasis === 'basic_pay' ? plan.basicPay : grossSalary;
      amount = (basis * item.amount) / 100;
    }
    deductions.push({
      name: item.name,
      amount: Math.round(amount * 100) / 100,
    });
  });

  return deductions;
};

/**
 * Calculate allowances from payroll plan
 */
export const calculateAllowances = (
  plan: PayrollPlan,
  planItems: PayrollPlanItem[]
): { name: string; amount: number }[] => {
  const allowances: { name: string; amount: number }[] = [];
  const allowanceItems = planItems.filter(item => item.itemType === 'allowance');

  allowanceItems.forEach(item => {
    let amount = 0;
    if (item.amountType === 'fixed') {
      amount = item.amount;
    } else if (item.amountType === 'percentage') {
      const basis = item.calculationBasis === 'basic_pay' ? plan.basicPay : plan.basicPay;
      amount = (basis * item.amount) / 100;
    }
    allowances.push({
      name: item.name,
      amount: Math.round(amount * 100) / 100,
    });
  });

  return allowances;
};

/**
 * Calculate leave deductions based on attendance (Full mode only)
 * In Full mode: Deduct for excess leaves (leaves beyond allowed)
 * Absents are always deducted separately
 */
export const calculateLeaveDeductions = (
  attendance: AttendanceSummary,
  allowedLeavesPerMonth: number,
  dailyRate: number,
  leaveDeductionMethod: 'full_day' | 'half_day' | 'proportional' = 'full_day'
): number => {
  // Calculate excess leaves (leaves beyond allowed)
  const excessLeaves = Math.max(0, attendance.leaveDays - allowedLeavesPerMonth);

  if (excessLeaves === 0) {
    return 0;
  }

  let deduction = 0;

  switch (leaveDeductionMethod) {
    case 'full_day':
      deduction = excessLeaves * dailyRate;
      break;
    case 'half_day':
      // Half day leaves count as 0.5 days
      deduction = excessLeaves * dailyRate * 0.5;
      break;
    case 'proportional':
      // Proportional to actual leave days
      deduction = (excessLeaves / attendance.workingDays) * dailyRate * attendance.workingDays;
      break;
  }

  return Math.round(deduction * 100) / 100;
};

/**
 * Calculate late attendance deductions
 * Partial mode: Deduct for ALL late days (no allowed limit)
 * Full mode: Deduct only for excess late days (beyond allowed)
 */
export const calculateLateDeductions = (
  attendance: AttendanceSummary,
  lateDeductionEnabled: boolean,
  allowedLateDaysPerMonth: number,
  lateDeductionAmount: number,
  lateDeductionType: 'fixed' | 'percentage',
  dailyRate: number,
  calculationMode: 'full' | 'partial' = 'partial'
): number => {
  if (!lateDeductionEnabled || attendance.lateDays === 0) {
    return 0;
  }

  let deduction = 0;
  let lateDaysToDeduct = 0;

  if (calculationMode === 'partial') {
    // Partial mode: Deduct for ALL late days (no allowed limit)
    lateDaysToDeduct = attendance.lateDays;
  } else {
    // Full mode: Deduct only for excess late days (beyond allowed)
    lateDaysToDeduct = Math.max(0, attendance.lateDays - allowedLateDaysPerMonth);
  }

  if (lateDaysToDeduct === 0) {
    return 0;
  }

  if (lateDeductionType === 'fixed') {
    // Fixed amount per late day
    deduction = lateDaysToDeduct * lateDeductionAmount;
  } else if (lateDeductionType === 'percentage') {
    // Percentage of daily rate per late day
    const deductionPerLate = (dailyRate * lateDeductionAmount) / 100;
    deduction = lateDaysToDeduct * deductionPerLate;
  }

  return Math.round(deduction * 100) / 100;
};

/**
 * Calculate daily rate from monthly salary
 */
export const calculateDailyRate = (
  monthlySalary: number,
  workingDays: number
): number => {
  if (workingDays <= 0) return 0;
  return Math.round((monthlySalary / workingDays) * 100) / 100;
};

/**
 * Calculate advance deductions
 */
export const calculateAdvanceDeductions = (
  advances: PayrollAdvance[],
  repaymentAmountPerMonth?: number
): number => {
  const activeAdvances = advances.filter(advance => advance.status === 'active');
  
  if (activeAdvances.length === 0) {
    return 0;
  }

  let totalDeduction = 0;

  activeAdvances.forEach(advance => {
    // Use repayment amount per month from advance, or provided amount
    const deduction = repaymentAmountPerMonth || advance.repaymentAmountPerMonth;
    
    // Don't deduct more than remaining balance
    const actualDeduction = Math.min(deduction, advance.remainingBalance);
    totalDeduction += actualDeduction;
  });

  return Math.round(totalDeduction * 100) / 100;
};

/**
 * Get attendance counts directly from saved attendance records.
 * This is used for display/audit so the UI reflects actual marked entries,
 * independent of payroll calculation mode.
 */
export const getAttendanceRecordSummary = (
  attendanceRecords: Array<{ status: string; date: string; paidLeave?: boolean }>,
  workingDays: number,
  halfLeavesMap?: Map<string, 'first_half' | 'second_half'>
): AttendanceSummary => {
  let presentDaysOnly = 0;
  let leaveDays = 0;
  let absentDays = 0;
  let halfDayLeaves = 0;
  let lateDays = 0;
  let paidLeaveDays = 0;

  const datesWithHalfLeaves = new Set<string>();

  if (halfLeavesMap) {
    halfLeavesMap.forEach((leaveType, date) => {
      datesWithHalfLeaves.add(date);
      halfDayLeaves++;
      if (leaveType === 'first_half') {
        presentDaysOnly += 0.5;
        absentDays += 0.5;
      } else if (leaveType === 'second_half') {
        presentDaysOnly += 0.5;
        leaveDays += 0.5;
      }
    });
  }

  attendanceRecords.forEach(record => {
    if (datesWithHalfLeaves.has(record.date)) {
      return;
    }

    switch (record.status.toLowerCase()) {
      case 'present':
        presentDaysOnly++;
        break;
      case 'leave':
        leaveDays++;
        if (record.paidLeave) {
          paidLeaveDays++;
        }
        break;
      case 'absent':
        absentDays++;
        break;
      case 'half_day':
        halfDayLeaves++;
        presentDaysOnly += 0.5;
        leaveDays += 0.5;
        break;
      case 'late':
        lateDays++;
        presentDaysOnly++;
        break;
    }
  });

  return {
    workingDays: Math.round(workingDays),
    presentDays: Math.round(presentDaysOnly),
    leaveDays: Math.round(leaveDays),
    absentDays: Math.round(absentDays),
    halfDayLeaves: Math.round(halfDayLeaves),
    lateDays: Math.round(lateDays),
    paidLeaveDays: Math.round(paidLeaveDays),
  };
};

/**
 * Get attendance summary from attendance records
 */
export const getAttendanceSummary = (
  attendanceRecords: Array<{ status: string; date: string; paidLeave?: boolean }>,
  workingDays: number,
  halfLeavesMap?: Map<string, 'first_half' | 'second_half'>,
  calculationMode: 'full' | 'partial' = 'partial'
): AttendanceSummary => {
  const recordSummary = getAttendanceRecordSummary(attendanceRecords, workingDays, halfLeavesMap);
  let presentDaysOnly = recordSummary.presentDays; // already includes late
  let leaveDays = recordSummary.leaveDays;
  let explicitlyAbsentDays = recordSummary.absentDays;
  let halfDayLeaves = recordSummary.halfDayLeaves;
  let lateDays = recordSummary.lateDays;
  let paidLeaveDays = recordSummary.paidLeaveDays || 0;

  // Track which dates have attendance records or half leaves
  const datesWithRecords = new Set<string>();

  if (halfLeavesMap) {
    halfLeavesMap.forEach((_, date) => {
      datesWithRecords.add(date);
    });
  }

  attendanceRecords.forEach(record => {
    datesWithRecords.add(record.date);
  });

  // Count actual number of unique days with records (not fractional days)
  // This is important for Partial mode calculation - we need to know how many actual dates have records
  const actualDaysWithRecords = datesWithRecords.size;
  
  // Handle calculation mode:
  // - Full: Days without records are counted as present (only count late/absent from records)
  // - Partial: Days without records are counted as absent (only generate salary for days with records)
  let finalPresentDays: number;
  let finalAbsentDays: number;
  
  if (calculationMode === 'full') {
    // Full mode: Only count late and absent from records, non-recorded days = present
    // So absentDays = only explicitly marked absent days (from records)
    finalAbsentDays = explicitlyAbsentDays;
    // Adjust totalPresentDays to include unaccounted days (days without any records = present)
    const unaccountedDays = workingDays - actualDaysWithRecords;
    finalPresentDays = presentDaysOnly + Math.max(0, unaccountedDays);
  } else {
    // Partial mode: All non-recorded days = absent
    // Only generate salary for days that have records (actualDaysWithRecords)
    // All other days (workingDays - actualDaysWithRecords) are counted as absent
    const unaccountedDays = workingDays - actualDaysWithRecords;
    // Absent days = explicitly marked absent + all unrecorded days
    finalAbsentDays = explicitlyAbsentDays + Math.max(0, unaccountedDays);
    // totalPresentDays already includes both present and late
    finalPresentDays = presentDaysOnly;
  }

  // finalPresentDays already includes both Present and Late records
  // (because when we count 'late', we do both lateDays++ and presentDaysOnly++)
  // So we just use finalPresentDays directly - it already has the sum
  
  return {
    workingDays: Math.round(workingDays),
    presentDays: Math.round(finalPresentDays), // Present + Late combined (already includes late) - round to integer
    leaveDays: Math.round(leaveDays), // Round to integer
    absentDays: Math.round(finalAbsentDays), // Round to integer
    halfDayLeaves: Math.round(halfDayLeaves), // Round to integer
    lateDays: Math.round(lateDays), // Keep lateDays separate to show how many of the present days were late - round to integer
    paidLeaveDays: Math.round(paidLeaveDays),
  };
};

/**
 * Calculate net salary with all components
 */
export const calculateNetSalary = (
  grossSalary: number,
  deductions: { name: string; amount: number }[],
  leaveDeductions: number,
  lateDeductions: number,
  advanceDeductions: number,
  adjustments: { name: string; amount: number; type: string }[]
): number => {
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalAdjustments = adjustments.reduce((sum, a) => {
    // Bonuses add to salary, fines/cuts subtract
    if (a.type === 'bonus') {
      return sum + a.amount;
    } else {
      return sum - a.amount;
    }
  }, 0);

  const netSalary = grossSalary - totalDeductions - leaveDeductions - lateDeductions - advanceDeductions + totalAdjustments;

  return Math.max(0, Math.round(netSalary * 100) / 100); // Ensure non-negative
};

/**
 * Calculate complete salary breakdown
 * Supports both Partial and Full calculation modes
 */
export const calculateSalaryBreakdown = (
  plan: PayrollPlan,
  planItems: PayrollPlanItem[],
  attendance: AttendanceSummary,
  allowedLeavesPerMonth: number,
  leaveDeductionMethod: 'full_day' | 'half_day' | 'proportional',
  advances: PayrollAdvance[],
  adjustments: PayrollAdjustment[],
  lateDeductionEnabled: boolean = false,
  allowedLateDaysPerMonth: number = 0,
  lateDeductionAmount: number = 0,
  lateDeductionType: 'fixed' | 'percentage' = 'fixed',
  calculationMode: 'full' | 'partial' = 'partial',
  leaveBonusDays: number = 0 // 0 means no bonus, 1 or 2 means bonus days
): SalaryCalculationResult => {
  // Calculate full gross salary from plan (includes full basic + full allowances)
  const fullGrossSalary = calculateGrossSalary(plan, planItems);

  // Calculate full allowances and deductions from plan
  const fullAllowances = calculateAllowances(plan, planItems);
  const fullDeductions = calculateDeductions(plan, planItems, fullGrossSalary);

  // Calculate daily rates
  const dailyRate = calculateDailyRate(fullGrossSalary, attendance.workingDays);
  const basicDailyRate = calculateDailyRate(plan.basicPay, attendance.workingDays);
  
  // Debug: Log calculation mode and gross salary
  console.log(`[Payroll Calculation] Mode: ${calculationMode}, Full Gross Salary: ${fullGrossSalary}, Daily Rate: ${dailyRate}`);

  // Convert half leaves to full days (2 half leaves = 1 full day)
  const halfLeavesAsFullDays = Math.floor(attendance.halfDayLeaves / 2);
  const remainingHalfLeaves = attendance.halfDayLeaves % 2;

  // Calculate leave bonus: Add bonus days if employee has no absentees AND no leaves
  let bonusLeaveDays = 0;
  if (leaveBonusDays > 0 && attendance.absentDays === 0 && attendance.leaveDays === 0) {
    bonusLeaveDays = leaveBonusDays;
  }
  const leaveBonusAmount = bonusLeaveDays * basicDailyRate;

  let earnedGrossSalary: number;
  let earnedAllowances: { name: string; amount: number }[];
  let earnedDeductions: { name: string; amount: number }[];
  let absentDeductions: number = 0;
  let leaveDeductions: number = 0;
  let lateDeductions: number = 0;

  if (calculationMode === 'partial') {
    // PARTIAL MODE: Only pay for days with records
    // Payable Days = Present + Late (+ half leaves converted if needed) + Paid Leaves
    // Note: attendance.presentDays already includes lateDays (late is counted as present)
    const payableDaysWithoutBonus = attendance.presentDays + halfLeavesAsFullDays + (remainingHalfLeaves * 0.5) + (attendance.paidLeaveDays || 0);
    
    // Calculate prorated factor for basic pay, allowances and deductions
    const prorateFactor = attendance.workingDays > 0 ? (payableDaysWithoutBonus / attendance.workingDays) : 0;
    
    // Prorate everything
    earnedGrossSalary = Math.round(fullGrossSalary * prorateFactor * 100) / 100;
    earnedAllowances = fullAllowances.map(a => ({
      name: a.name,
      amount: Math.round(a.amount * prorateFactor * 100) / 100
    }));
    earnedDeductions = fullDeductions.map(d => ({
      name: d.name,
      amount: Math.round(d.amount * prorateFactor * 100) / 100
    }));

    console.log(`[Partial Mode] Payable Days (excl bonus): ${payableDaysWithoutBonus}, Prorate Factor: ${prorateFactor}, Earned Gross: ${earnedGrossSalary}`);
    
    // In Partial mode: No absent/leave deductions, only late deductions (for ALL late days)
    absentDeductions = 0;
    leaveDeductions = 0;
    lateDeductions = calculateLateDeductions(
      attendance,
      lateDeductionEnabled,
      allowedLateDaysPerMonth,
      lateDeductionAmount,
      lateDeductionType,
      dailyRate,
      'partial'
    );
  } else {
    // FULL MODE: Use full gross salary, apply deductions
    earnedGrossSalary = fullGrossSalary;
    earnedAllowances = fullAllowances;
    earnedDeductions = fullDeductions;
    
    console.log(`[Full Mode] Full Gross Salary: ${fullGrossSalary}`);
    
    // Absent deductions: ALWAYS deducted (even the first one)
    absentDeductions = attendance.absentDays * dailyRate;
    
    // Leave deductions: Only for excess leaves (beyond allowed + bonus)
    const totalAllowedLeaves = allowedLeavesPerMonth + (attendance.paidLeaveDays || 0);
    const excessLeaves = Math.max(0, attendance.leaveDays - totalAllowedLeaves);
    if (excessLeaves > 0) {
      switch (leaveDeductionMethod) {
        case 'full_day':
          leaveDeductions = excessLeaves * dailyRate;
          break;
        case 'half_day':
          leaveDeductions = excessLeaves * dailyRate * 0.5;
          break;
        case 'proportional':
          leaveDeductions = (excessLeaves / attendance.workingDays) * dailyRate * attendance.workingDays;
          break;
      }
      leaveDeductions = Math.round(leaveDeductions * 100) / 100;
    } else {
      leaveDeductions = 0;
    }
    
    // Late deductions: Only for excess late days (beyond allowed)
    lateDeductions = calculateLateDeductions(
      attendance,
      lateDeductionEnabled,
      allowedLateDaysPerMonth,
      lateDeductionAmount,
      lateDeductionType,
      dailyRate,
      'full'
    );
  }

  // Calculate advance deductions (same for both modes)
  const advanceDeductions = calculateAdvanceDeductions(advances);

  // Process adjustments
  const adjustmentItems = adjustments
    .filter(adj => !adj.isApplied)
    .map(adj => ({
      name: `${adj.adjustmentType}: ${adj.reason}`,
      amount: adj.amount,
      type: adj.adjustmentType,
    }));

  // Calculate total earnings: Earned Gross (incl allowances) + Leave Bonus + Bonus Adjustments
  const bonusAdjustments = adjustmentItems.filter(a => a.type === 'bonus').reduce((sum, a) => sum + a.amount, 0);
  const totalEarnings = earnedGrossSalary + leaveBonusAmount + bonusAdjustments;

  // Calculate total deductions: Earned Deductions + Absent + Leave + Late + Advance + Fine Adjustments
  const planDeductionsAmount = earnedDeductions.reduce((sum, d) => sum + d.amount, 0);
  const fineAdjustments = adjustmentItems.filter(a => a.type !== 'bonus').reduce((sum, a) => sum + a.amount, 0);
  const totalDeductions = planDeductionsAmount + absentDeductions + leaveDeductions + lateDeductions + advanceDeductions + fineAdjustments;

  // Calculate net salary
  const netSalary = totalEarnings - totalDeductions;

  return {
    grossSalary: earnedGrossSalary, // Now returns earned amount (prorated in partial mode)
    allowances: earnedAllowances,
    deductions: earnedDeductions, // Now returns earned amount (prorated in partial mode)
    leaveDeductions: leaveDeductions,
    lateDeductions,
    advanceDeductions,
    adjustments: adjustmentItems,
    netSalary: Math.max(0, Math.round(netSalary * 100) / 100),
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    attendanceSummary: attendance,
    absentDeductions: absentDeductions,
    leaveBonusAmount: leaveBonusAmount > 0 ? Math.round(leaveBonusAmount * 100) / 100 : undefined,
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Get month name from number
 */
export const getMonthName = (monthNumber: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
};

/**
 * Get month number from name
 */
export const getMonthNumber = (monthName: string): number => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.indexOf(monthName) + 1;
};
