import jsPDF from 'jspdf';
import { payrollService } from '../../services/payrollService';
import { supabase } from '../../supabaseClient';
import type { PayrollGeneration, PayrollPayment } from '../../types/payroll';
import { formatPayrollCurrency } from './utils';
import { formatAppDate, formatAppDateTime } from '../../utils/dateUtils';

type SchoolReceiptProfile = {
  name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  logoUrl?: string | null;
};

const monthLabel = (month: number, year: number) =>
  new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
const shortMonthLabel = (month: number, year: number) =>
  new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' }) + `-${String(year).slice(-2)}`;

const paymentModeLabel = (mode?: string) => (mode || 'other').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const formatReceiptDate = (dateValue?: string | null) => {
  return formatAppDate(dateValue);
};

const safeText = (value?: string | null) => value?.trim() || '-';

const loadSchoolReceiptProfile = async (schoolId: number): Promise<SchoolReceiptProfile> => {
  try {
    const { data: profileData } = await supabase
      .from('institute_profile')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    const { data: schoolData } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    return {
      name: profileData?.name || profileData?.short_name || schoolData?.name || 'School',
      tagline: profileData?.tagline || schoolData?.name || '',
      address: profileData?.address || schoolData?.address || '',
      phone: profileData?.phone || schoolData?.contact_number || schoolData?.contact || '',
      logoUrl: profileData?.logo_url || schoolData?.logo_url || null,
    };
  } catch (error) {
    console.error('Error loading school receipt profile:', error);
    return {
      name: 'School',
    };
  }
};

const getGenerationPeriodNumber = (generation: PayrollGeneration) => generation.payrollYear * 100 + generation.payrollMonth;

const buildSalaryMonthsLabel = (latestGeneration: PayrollGeneration, oldMonthCount: number) => {
  const latestLabel = shortMonthLabel(latestGeneration.payrollMonth, latestGeneration.payrollYear);
  return oldMonthCount > 0 ? `${latestLabel} + ${oldMonthCount} more` : latestLabel;
};

const drawCopy = (
  doc: jsPDF,
  startY: number,
  copyLabel: 'OFFICE COPY' | 'EMPLOYEE COPY',
  school: SchoolReceiptProfile,
  payment: PayrollPayment,
  generation: PayrollGeneration,
  oldBalance: number,
  netPayroll: number,
  currentPaymentAmount: number,
  remainingAfterThisReceipt: number,
  roundUpAmounts: boolean,
  priorPaymentsThisMonth: number = 0,
  salaryMonthsLabel?: string
) => {
  const pageWidth = 210;
  const left = 10;
  const right = pageWidth - 10;
  const sectionHeight = 136;
  const sectionTop = startY + 6;
  const sectionBottom = sectionTop + sectionHeight;
  const period = monthLabel(generation.payrollMonth, generation.payrollYear);
  const attendance = generation.attendanceData?.summary;
  const receiptNo = `PR-${String(payment.id).padStart(5, '0')}`;
  const issueTime = payment.createdAt
    ? formatAppDateTime(payment.createdAt)
    : formatReceiptDate(payment.paymentDate);
  const employeeName = generation.staff?.name || 'Employee';
  const employeeRole = generation.staff?.role || '-';
  const planName = generation.planSnapshot?.planName || 'Payroll Plan';
  const currentMonthGross = payment.currentMonthGross ?? generation.grossSalary ?? generation.totalEarnings ?? 0;
  const currentMonthDeductions = payment.currentMonthDeductions ?? generation.totalDeductions ?? 0;
  const salaryMonthsDisplay = salaryMonthsLabel || shortMonthLabel(generation.payrollMonth, generation.payrollYear);
  const contentWidth = pageWidth - 20;
  const innerLeft = left + 2;
  const innerRight = right - 2;
  const innerWidth = innerRight - innerLeft;
  const panelGap = 2;
  const attendanceRecords = generation.attendanceData?.records || [];
  const attendanceFromRecords = attendanceRecords.length > 0
    ? attendanceRecords.reduce(
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
      )
    : null;

  const drawPanel = (
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    fill: [number, number, number] = [255, 255, 255]
  ) => {
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, width, height, 2.6, 2.6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(title.toUpperCase(), x + 2.5, y + 4.8);
  };

  const drawDetailRow = (
    x: number,
    y: number,
    label: string,
    value: string,
    width: number,
    strong: boolean = false,
    labelWidth: number = 18,
    valueColor: [number, number, number] = [15, 23, 42],
    valueAlign: 'left' | 'right' = 'left'
  ) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, y);
    doc.setFont('helvetica', strong ? 'bold' : 'normal');
    doc.setFontSize(strong ? 8.2 : 7.1);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    if (valueAlign === 'right') {
      doc.text(value, x + width, y, { align: 'right', maxWidth: Math.max(8, width - labelWidth) });
    } else {
      doc.text(value, x + labelWidth, y, { maxWidth: Math.max(8, width - labelWidth), align: 'left' });
    }
  };

  const drawMetric = (
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    accent: boolean = false
  ) => {
    const fill: [number, number, number] = accent ? [37, 99, 235] : [248, 250, 252];
    const labelColor: [number, number, number] = accent ? [191, 219, 254] : [100, 116, 139];
    const valueColor: [number, number, number] = accent ? [255, 255, 255] : [15, 23, 42];
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(accent ? 37 : 226, accent ? 99 : 232, accent ? 235 : 240);
    doc.roundedRect(x, y, width, 14, 2.4, 2.4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(label.toUpperCase(), x + 2.3, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(accent ? 10.8 : 8.7);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(value, x + 2.3, y + 10.4);
  };

  doc.setDrawColor(59, 130, 246);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(left, sectionTop, contentWidth, sectionHeight, 4, 4, 'S');

  doc.setFillColor(30, 64, 175);
  doc.roundedRect(left + 1, sectionTop + 1, contentWidth - 2, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(school.name, left + 6, sectionTop + 8.2);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (school.tagline) {
    doc.text(school.tagline, left + 6, sectionTop + 13.1);
  }
  const topRightMeta = [
    copyLabel,
    `Receipt No: ${receiptNo}`,
    `Issue: ${issueTime}`,
  ];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  topRightMeta.forEach((line, index) => {
    doc.text(line, right - 5, sectionTop + 5.8 + index * 3.8, { align: 'right' });
  });

  doc.setFillColor(248, 250, 252);
  doc.rect(left + 1, sectionTop + 19.2, contentWidth - 2, 6.5, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const schoolLine = [school.address, school.phone ? `Phone: ${school.phone}` : ''].filter(Boolean).join('  |  ');
  if (schoolLine) {
    doc.text(schoolLine, left + 4, sectionTop + 23.7);
  }

  const employeePanelWidth = 84;
  const paymentPanelX = innerLeft + employeePanelWidth + panelGap;
  const paymentPanelWidth = innerRight - paymentPanelX;
  drawPanel(innerLeft, sectionTop + 26, employeePanelWidth, 26, 'Employee & Payroll');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(employeeName, innerLeft + 3, sectionTop + 35.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.text(employeeRole, innerLeft + 3, sectionTop + 40.2);
  doc.text(`Plan: ${planName}`, innerLeft + 3, sectionTop + 44.9);
  doc.text(`Payroll Period: ${period}`, innerLeft + 3, sectionTop + 49.6);

  drawPanel(paymentPanelX, sectionTop + 26, paymentPanelWidth, 26, 'Payment Receipt', [239, 246, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPayrollCurrency(payment.amount, roundUpAmounts), paymentPanelX + 3, sectionTop + 38.8);
  drawDetailRow(paymentPanelX + 3, sectionTop + 48, 'Date', formatReceiptDate(payment.paymentDate), 24, false, 11);
  drawDetailRow(paymentPanelX + 29, sectionTop + 48, 'Mode', paymentModeLabel(payment.paymentMode), 32, false, 12);
  drawDetailRow(paymentPanelX + 63, sectionTop + 48, 'Ref', safeText(payment.referenceNo), paymentPanelWidth - 66, false, 8);

  const metricWidth = (innerWidth - panelGap * 4) / 5;
  drawMetric(innerLeft, sectionTop + 55, metricWidth, 'Old Balance', formatPayrollCurrency(oldBalance, roundUpAmounts));
  drawMetric(innerLeft + (metricWidth + panelGap), sectionTop + 55, metricWidth, 'Current Gross', formatPayrollCurrency(currentMonthGross, roundUpAmounts));
  drawMetric(innerLeft + (metricWidth + panelGap) * 2, sectionTop + 55, metricWidth, 'Deductions', formatPayrollCurrency(currentMonthDeductions, roundUpAmounts));
  drawMetric(innerLeft + (metricWidth + panelGap) * 3, sectionTop + 55, metricWidth, 'Prior Payments', formatPayrollCurrency(priorPaymentsThisMonth, roundUpAmounts));
  drawMetric(innerLeft + (metricWidth + panelGap) * 4, sectionTop + 55, metricWidth, 'Net Amount', formatPayrollCurrency(netPayroll, roundUpAmounts), true);

  const attendancePanelWidth = 82;
  const paymentFlowX = innerLeft + attendancePanelWidth + panelGap;
  const paymentFlowWidth = innerRight - paymentFlowX;
  drawPanel(innerLeft, sectionTop + 72, attendancePanelWidth, 24, 'Attendance Snapshot');
  const attendanceItems = [
    { label: 'Present', value: String(payment.attendancePresent ?? attendanceFromRecords?.present ?? attendance?.presentDays ?? generation.presentDays ?? 0) },
    { label: 'Leave', value: String(payment.attendanceLeave ?? attendanceFromRecords?.leave ?? attendance?.leaveDays ?? generation.leaveDays ?? 0) },
    { label: 'Absent', value: String(payment.attendanceAbsent ?? attendanceFromRecords?.absent ?? attendance?.absentDays ?? generation.absentDays ?? 0) },
    { label: 'Late', value: String(payment.attendanceLate ?? attendanceFromRecords?.late ?? attendance?.lateDays ?? generation.lateDays ?? 0) },
  ];
  const attendanceCellWidth = 16.8;
  const attendanceCellGap = 1.6;
  attendanceItems.forEach((item, index) => {
    const cellX = innerLeft + 3 + index * (attendanceCellWidth + attendanceCellGap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cellX, sectionTop + 78.2, attendanceCellWidth, 12.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), cellX + attendanceCellWidth / 2, sectionTop + 82.1, { align: 'center' });
    doc.setFontSize(9.4);
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, cellX + attendanceCellWidth / 2, sectionTop + 88.1, { align: 'center' });
  });

  drawPanel(paymentFlowX, sectionTop + 72, paymentFlowWidth, 24, 'Payment Flow');
  const flowInnerX = paymentFlowX + 3;
  const flowInnerWidth = paymentFlowWidth - 6;
  const flowPairGap = 5;
  const flowPairWidth = (flowInnerWidth - flowPairGap) / 2;
  drawDetailRow(flowInnerX, sectionTop + 80.5, 'Salary Months', salaryMonthsDisplay, flowPairWidth, false, 23);
  drawDetailRow(flowInnerX + flowPairWidth + flowPairGap, sectionTop + 80.5, 'Current Payment', formatPayrollCurrency(currentPaymentAmount, roundUpAmounts), flowPairWidth, true, 27, [15, 23, 42], 'right');
  drawDetailRow(flowInnerX, sectionTop + 88.9, 'Issued', issueTime, flowPairWidth, false, 13);
  drawDetailRow(flowInnerX + flowPairWidth + flowPairGap, sectionTop + 88.9, 'Remaining', formatPayrollCurrency(remainingAfterThisReceipt, roundUpAmounts), flowPairWidth, true, 27, [220, 38, 38], 'right');

  drawPanel(innerLeft, sectionTop + 99, innerWidth, 18, 'Deduction Breakdown');
  const deductionItems = [
    { label: 'Absent Ded.', value: formatPayrollCurrency(payment.absentDeductionAmount ?? generation.absentDeductions ?? 0, roundUpAmounts) },
    { label: 'Leave Ded.', value: formatPayrollCurrency(payment.leaveDeductionAmount ?? generation.leaveDeductions ?? 0, roundUpAmounts) },
    { label: 'Late Ded.', value: formatPayrollCurrency(payment.lateDeductionAmount ?? generation.lateDeductions ?? 0, roundUpAmounts) },
    { label: 'Advance Ded.', value: formatPayrollCurrency(payment.advanceDeductionAmount ?? generation.advanceDeductions ?? 0, roundUpAmounts) },
  ];
  const deductionWidth = innerWidth / 4;
  deductionItems.forEach((item, index) => {
    const boxX = innerLeft + 3 + index * deductionWidth;
    doc.setDrawColor(226, 232, 240);
    if (index > 0) {
      doc.line(boxX - 1.5, sectionTop + 104.2, boxX - 1.5, sectionTop + 114.8);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), boxX, sectionTop + 105.8);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, boxX, sectionTop + 111.8);
  });

  drawPanel(innerLeft, sectionTop + 120, innerWidth, 10, 'Remarks');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(safeText(payment.remarks), innerLeft + 16, sectionTop + 126.2, { maxWidth: innerWidth - 20 });

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Computer generated payroll payment receipt', left + contentWidth / 2, sectionBottom - 3.8, { align: 'center' });
};

export const generatePayrollPaymentReceipt = async (
  schoolId: number,
  paymentId: number,
  roundUpAmounts: boolean = false
) => {
  const [school, allPayments] = await Promise.all([
    loadSchoolReceiptProfile(schoolId),
    payrollService.getPayrollPayments(schoolId, {}),
  ]);

  const payment = allPayments.find(item => item.id === paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  const generation = await payrollService.getPayrollGeneration(schoolId, payment.generationId);
  if (!generation) {
    throw new Error('Payroll generation not found');
  }

  if (payment.items && payment.items.length > 0) {
    const olderTouchedMonths = payment.items
      .filter(item => (item.generation?.payrollYear || 0) * 100 + (item.generation?.payrollMonth || 0) < getGenerationPeriodNumber(generation))
      .length;
    const inferredOlderMonthCount = Math.max(
      olderTouchedMonths,
      (payment.oldBalanceAmount || 0) > 0 ? 1 : 0
    );
    const salaryMonthsLabel = buildSalaryMonthsLabel(generation, inferredOlderMonthCount);
    const netPayroll = payment.netAmount
      ?? ((payment.oldBalanceAmount || 0)
      + (payment.currentMonthGross || generation.grossSalary || generation.totalEarnings || 0)
      - (payment.currentMonthDeductions || generation.totalDeductions || 0)
      - (payment.priorPaymentsCurrentMonth || 0));

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    drawCopy(
      doc,
      0,
      'OFFICE COPY',
      school,
      payment,
      generation,
      payment.oldBalanceAmount || 0,
      netPayroll,
      payment.amount,
      payment.remainingAfterPayment ?? Math.max(0, netPayroll - payment.amount),
      roundUpAmounts,
      payment.priorPaymentsCurrentMonth || 0,
      salaryMonthsLabel
    );

    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(10, 148.5, 200, 148.5);
    doc.setLineDashPattern([], 0);

    drawCopy(
      doc,
      148.5,
      'EMPLOYEE COPY',
      school,
      payment,
      generation,
      payment.oldBalanceAmount || 0,
      netPayroll,
      payment.amount,
      payment.remainingAfterPayment ?? Math.max(0, netPayroll - payment.amount),
      roundUpAmounts,
      payment.priorPaymentsCurrentMonth || 0,
      salaryMonthsLabel
    );

    const filePeriod = `${generation.payrollYear}_${String(generation.payrollMonth).padStart(2, '0')}`;
    const fileName = `Payroll_Receipt_${filePeriod}_${String(payment.id).padStart(5, '0')}.pdf`;
    doc.save(fileName);
    return;
  }

  const generationsWithBalance = await payrollService.getEmployeePayrollGenerationsWithBalance(schoolId, generation.staffId);
  const latestGenerationWithBalance = [...generationsWithBalance].sort((a, b) => getGenerationPeriodNumber(b.generation) - getGenerationPeriodNumber(a.generation))[0];
  const latestGeneration = latestGenerationWithBalance?.generation || generation;
  const latestPeriod = getGenerationPeriodNumber(latestGeneration);

  const appliedToOldPeriods = payment.generationId !== latestGeneration.id ? payment.amount : 0;
  const oldBalance = generationsWithBalance
    .filter(item => getGenerationPeriodNumber(item.generation) < latestPeriod)
    .reduce((sum, item) => sum + item.remainingBalance, 0) + appliedToOldPeriods;

  const priorPaymentsThisMonth = allPayments
    .filter(item => item.generationId === latestGeneration.id && item.status === 'completed' && item.id !== payment.id)
    .reduce((sum, item) => sum + item.amount, 0);

  const oldMonthCount = generationsWithBalance.filter(item => {
    const isOlder = getGenerationPeriodNumber(item.generation) < latestPeriod;
    return isOlder && (item.remainingBalance > 0 || item.generation.id === payment.generationId);
  }).length;
  const salaryMonthsLabel = buildSalaryMonthsLabel(latestGeneration, oldMonthCount);

  const receiptNetAmount = oldBalance + (latestGeneration.grossSalary || latestGeneration.totalEarnings || 0) - (latestGeneration.totalDeductions || 0) - priorPaymentsThisMonth;
  const remainingAfterThisReceipt = Math.max(0, receiptNetAmount - payment.amount);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawCopy(doc, 0, 'OFFICE COPY', school, payment, latestGeneration, oldBalance, receiptNetAmount, payment.amount, remainingAfterThisReceipt, roundUpAmounts, priorPaymentsThisMonth, salaryMonthsLabel);

  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, 148.5, 200, 148.5);
  doc.setLineDashPattern([], 0);

  drawCopy(doc, 148.5, 'EMPLOYEE COPY', school, payment, latestGeneration, oldBalance, receiptNetAmount, payment.amount, remainingAfterThisReceipt, roundUpAmounts, priorPaymentsThisMonth, salaryMonthsLabel);

  const filePeriod = `${latestGeneration.payrollYear}_${String(latestGeneration.payrollMonth).padStart(2, '0')}`;
  const fileName = `Payroll_Receipt_${filePeriod}_${String(payment.id).padStart(5, '0')}.pdf`;
  doc.save(fileName);
};

export const generateCombinedPayrollPaymentReceipt = async (
  schoolId: number,
  paymentIds: number[],
  roundUpAmounts: boolean = false
) => {
  const uniquePaymentIds = Array.from(new Set(paymentIds)).filter(Boolean);
  if (uniquePaymentIds.length === 0) {
    throw new Error('No payment records found for combined receipt');
  }

  const [school, allPayments] = await Promise.all([
    loadSchoolReceiptProfile(schoolId),
    payrollService.getPayrollPayments(schoolId, {}),
  ]);

  const selectedPayments = uniquePaymentIds
    .map(id => allPayments.find(item => item.id === id))
    .filter(Boolean) as PayrollPayment[];

  if (selectedPayments.length !== uniquePaymentIds.length) {
    throw new Error('Some payment records were not found');
  }

  const generationEntries = await Promise.all(
    selectedPayments.map(async payment => {
      const generation = await payrollService.getPayrollGeneration(schoolId, payment.generationId);
      if (!generation) {
        throw new Error('Payroll generation not found for one of the selected payments');
      }
      return { payment, generation };
    })
  );

  const firstGeneration = generationEntries[0].generation;
  const staffId = firstGeneration.staffId;
  if (generationEntries.some(entry => entry.generation.staffId !== staffId)) {
    throw new Error('Combined receipt can only be generated for one employee at a time');
  }

  const staffBalances = await payrollService.getEmployeePayrollGenerationsWithBalance(schoolId, staffId);
  const balanceMap = new Map(staffBalances.map(item => [item.generation.id, item]));

  const touchedRows = generationEntries.map(({ payment, generation }) => {
    const balanceInfo = balanceMap.get(generation.id);
    const remainingAfter = balanceInfo?.remainingBalance ?? 0;
    return {
      generation,
      payment,
      remainingAfter,
    };
  });
  const latestGenerationWithBalance = [...staffBalances].sort((a, b) => getGenerationPeriodNumber(b.generation) - getGenerationPeriodNumber(a.generation))[0];
  const latestGeneration = latestGenerationWithBalance?.generation || generationEntries[0].generation;
  const latestPeriod = getGenerationPeriodNumber(latestGeneration);
  const lastPayment = [...selectedPayments].sort((a, b) => {
    const dateDiff = String(a.paymentDate).localeCompare(String(b.paymentDate));
    if (dateDiff !== 0) return dateDiff;
    const createdDiff = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    if (createdDiff !== 0) return createdDiff;
    return a.id - b.id;
  })[selectedPayments.length - 1];
  const totalPaidThisSlip = selectedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const oldBalanceCollected = touchedRows
    .filter(row => getGenerationPeriodNumber(row.generation) < latestPeriod)
    .reduce((sum, row) => sum + row.payment.amount + row.remainingAfter, 0);
  const priorPaymentsThisMonth = allPayments
    .filter(item => item.generationId === latestGeneration.id && item.status === 'completed' && !uniquePaymentIds.includes(item.id))
    .reduce((sum, item) => sum + item.amount, 0);
  const latestMonthNetAmount = oldBalanceCollected + (latestGeneration.grossSalary || latestGeneration.totalEarnings || 0) - (latestGeneration.totalDeductions || 0) - priorPaymentsThisMonth;
  const latestMonthRemainingAfter = Math.max(0, latestMonthNetAmount - totalPaidThisSlip);
  const oldMonthCount = staffBalances.filter(item => getGenerationPeriodNumber(item.generation) < latestPeriod).length;
  const salaryMonthsLabel = buildSalaryMonthsLabel(latestGeneration, oldMonthCount);
  const combinedPayment: PayrollPayment = {
    ...lastPayment,
    id: lastPayment.id,
    amount: totalPaidThisSlip,
    referenceNo: lastPayment.referenceNo,
    remarks: lastPayment.remarks || undefined,
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawCopy(
    doc,
    0,
    'OFFICE COPY',
    school,
    combinedPayment,
    latestGeneration,
    oldBalanceCollected,
    latestMonthNetAmount,
    totalPaidThisSlip,
    latestMonthRemainingAfter,
    roundUpAmounts
    ,
    priorPaymentsThisMonth,
    salaryMonthsLabel
  );
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, 148.5, 200, 148.5);
  doc.setLineDashPattern([], 0);
  drawCopy(
    doc,
    148.5,
    'EMPLOYEE COPY',
    school,
    combinedPayment,
    latestGeneration,
    oldBalanceCollected,
    latestMonthNetAmount,
    totalPaidThisSlip,
    latestMonthRemainingAfter,
    roundUpAmounts
    ,
    priorPaymentsThisMonth,
    salaryMonthsLabel
  );

  const periodPart = `${latestGeneration.payrollYear}_${String(latestGeneration.payrollMonth).padStart(2, '0')}`;
  const employeeName = latestGeneration.staff?.name || 'Employee';
  const fileName = `Payroll_Receipt_${periodPart}_${employeeName.replace(/[^a-z0-9]+/gi, '_')}.pdf`;
  doc.save(fileName);
};
