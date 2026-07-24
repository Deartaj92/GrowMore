import React, { useContext, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollGeneration, PayrollPayment } from '../../../../types/payroll';
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  FormControl as MuiFormControl,
  InputLabel,
  TextField,
  Typography,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  AccountBalance as BankIcon,
  AttachMoney as CashIcon,
  ConfirmationNumber as ChequeIcon,
  PhoneAndroid as MobileIcon,
  Notes as NotesIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Cancel as UnpaidIcon,
  ReceiptLong as ReceiptIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import PayrollDateField from '../PayrollDateField';
import { generateCombinedPayrollPaymentReceipt, generatePayrollPaymentReceipt } from '../../paymentReceipt';
import { usePayrollDisplaySettings } from '../../PayrollDisplaySettingsContext';
import {
  blockNumberArrowKey,
  blockNumberWheelChange,
  formatPayrollDate,
  isoToDisplayDate,
  isValidDisplayDate,
  payrollAmountInputSx,
} from '../../utils';
import {
  ContentCard,
  TableWrapper,
  StyledTable,
  PrimaryButton,
  IconButton,
  StatusBadge,
} from '../../styles';

interface GenerationWithBalance {
  generation: PayrollGeneration;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  payments: PayrollPayment[];
}

interface AllocationPreviewItem extends GenerationWithBalance {
  allocationAmount: number;
  balanceAfterAllocation: number;
}

interface PaymentHistoryGroup {
  key: string;
  paymentIds: number[];
  paymentGroupId?: string;
  paymentDate: string;
  createdAt?: string;
  amount: number;
  paymentMode: PayrollPayment['paymentMode'];
  referenceNo?: string;
  remarks?: string;
  status: PayrollPayment['status'];
  periods: string[];
  employeeName: string;
}

interface PayrollEditPaymentFormState {
  paymentDate: string;
  paymentMode: PayrollPayment['paymentMode'];
  referenceNo: string;
  remarks: string;
}

const SummaryCard = styled(ContentCard)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const SummaryLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const SummaryValue = styled.div<{ $color?: string }>`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
`;

const MonthDrawerCard = styled.div<{ $status: 'unpaid' | 'partial' | 'paid' }>`
  border-radius: 12px;
  background: ${({ theme }) => theme.CARD || (theme.BG === '#252525' ? '#2c303b' : '#ffffff')};
  border: 1px solid ${({ $status, theme }) =>
    $status === 'paid'
      ? (theme.BG === '#252525' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.4)')
      : $status === 'partial'
      ? (theme.BG === '#252525' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.4)')
      : (theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.3)')};
  margin-bottom: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.04)'};
`;

const MonthDrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.1rem;
  cursor: pointer;
  user-select: none;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.01)'};

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.025)'};
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.65rem;
  }
`;

const MonthDrawerLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const MonthTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const MonthSubtext = styled.div`
  font-size: 0.73rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const MonthDrawerRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const MonthStatPill = styled.div<{ $color?: string; $bg?: string }>`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  background: ${({ $bg, theme }) => $bg || (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc')};
  border: 1px solid ${({ theme }) => theme.BORDER};

  @media (max-width: 768px) {
    align-items: flex-start;
  }
`;

const MonthStatLabel = styled.span`
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  letter-spacing: 0.06em;
`;

const MonthStatValue = styled.span<{ $color?: string }>`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
`;

const DrawerBody = styled.div`
  padding: 0.85rem 1.1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(248, 250, 252, 0.65)'};
  animation: slideDown 0.2s ease-out;

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const PaymentItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: ${({ theme }) => theme.CARD || (theme.BG === '#252525' ? '#252525' : '#ffffff')};
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 0.5rem;
  gap: 0.75rem;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
  gap: 1rem;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
`;

const CardHeading = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const CardSubtext = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.2rem;
`;

const PaymentForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const InfoStrip = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(79, 70, 229, 0.12)' : 'rgba(59, 130, 246, 0.08)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 0.9rem 1rem;
`;

const MiniStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
`;

const MiniStat = styled.div`
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2b3140' : '#f8fafc'};
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const MiniLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.35rem;
`;

const MiniValue = styled.div<{ $color?: string }>`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
`;

const HintBox = styled.div`
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.07)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.5;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;

  svg {
    font-size: 3.5rem;
    margin-bottom: 0.9rem;
    opacity: 0.55;
  }

  h3 {
    font-size: 1.05rem;
    margin: 0 0 0.45rem 0;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  p {
    font-size: 0.84rem;
    margin: 0;
  }
`;

const InlineSection = styled.div`
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
`;

const EditModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(0, 0, 0, 0.5)'
    : 'rgba(255, 255, 255, 0.5)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  animation: fade-in 0.2s ease-out;

  @keyframes fade-in {
    from { opacity: 0; backdrop-filter: blur(0); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  }
`;

const EditModalCard = styled.div`
  background: ${({ theme }) => theme.CARD || (theme.BG === '#252525' ? '#2a2a2a' : '#fff')};
  border-radius: 14px;
  padding: 0;
  width: 90vw;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 24px 80px rgba(0, 0, 0, 0.55)'
    : '0 24px 80px rgba(15, 23, 42, 0.14)'};
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.06)'
    : '1px solid rgba(15, 23, 42, 0.08)'};
  margin: 32px 16px;
  position: relative;
  z-index: 1301;
  overflow: hidden;
  animation: slide-up 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);

  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @media (max-width: 768px) {
    width: calc(100% - 32px);
    margin: 16px;
    max-height: 85vh;
    border-radius: 12px;
  }
`;

const EditModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.06)'
    : '1px solid rgba(15, 23, 42, 0.06)'};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 0.9rem 1rem;
  }
`;

const EditModalTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
`;

const EditModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.1rem 1.25rem 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const EditFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EditFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
`;

const EditFullWidthField = styled(EditFormGroup)`
  grid-column: 1 / -1;
`;

const EditLabel = styled.label`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  font-size: 0.82rem;
`;

const EditInput = styled.input`
  width: 100%;
  padding: 0.72rem 0.85rem;
  border-radius: 8px;
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(15, 23, 42, 0.09)'};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.035)'
    : 'rgba(248, 250, 252, 0.95)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.BG === '#252525'
      ? 'rgba(99, 102, 241, 0.16)'
      : 'rgba(99, 102, 241, 0.12)'};
  }
`;

const EditTextarea = styled.textarea`
  width: 100%;
  padding: 0.72rem 0.85rem;
  border-radius: 8px;
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(15, 23, 42, 0.09)'};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.035)'
    : 'rgba(248, 250, 252, 0.95)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  min-height: 74px;
  outline: none;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.BG === '#252525'
      ? 'rgba(99, 102, 241, 0.16)'
      : 'rgba(99, 102, 241, 0.12)'};
  }
`;

const EditModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.9rem 1.25rem;
  border-top: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.06)'
    : '1px solid rgba(15, 23, 42, 0.06)'};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.025)'
    : 'rgba(248, 250, 252, 0.72)'};
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 0.85rem 1rem;
  }
`;

const EditButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.72rem 1rem;
  border-radius: 8px;
  border: ${({ $variant, theme }) => $variant === 'secondary'
    ? (theme.BG === '#252525'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(15, 23, 42, 0.1)')
    : 'none'};
  font-size: 0.88rem;
  font-weight: ${({ $variant }) => $variant === 'secondary' ? 500 : 600};
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $variant, theme }) =>
    $variant === 'secondary'
      ? (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(248, 250, 252, 0.96)')
      : (theme.ACCENT || '#6366f1')};
  color: ${({ $variant }) => $variant === 'secondary' ? 'inherit' : 'white'};

  &:hover {
    background: ${({ $variant, theme }) =>
      $variant === 'secondary'
        ? (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)')
        : theme.ACCENT || '#6366f1'};
    transform: ${({ $variant }) => $variant === 'secondary' ? 'none' : 'translateY(-1px)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const formatPeriod = (generation: PayrollGeneration) =>
  new Date(generation.payrollYear, generation.payrollMonth - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

const sortByOldestPeriod = (items: GenerationWithBalance[]) =>
  [...items].sort((a, b) => {
    if (a.generation.payrollYear !== b.generation.payrollYear) {
      return a.generation.payrollYear - b.generation.payrollYear;
    }
    return a.generation.payrollMonth - b.generation.payrollMonth;
  });

const getBreakdownLists = (gen: PayrollGeneration) => {
  const earningsList: Array<{ name: string; amount: number }> = [];
  const deductionsList: Array<{ name: string; amount: number }> = [];

  const normalizeKey = (str: string) =>
    str.toLowerCase().replace(/^(bonus:|adjustment:|allowance:)\s*/i, '').trim();

  const isDuplicateEarning = (name: string, amount: number) => {
    const key = normalizeKey(name);
    return earningsList.some(
      e => normalizeKey(e.name) === key && Math.abs(e.amount - amount) < 0.01
    );
  };

  const isDuplicateDeduction = (name: string, amount: number) => {
    const key = normalizeKey(name);
    return deductionsList.some(
      d => normalizeKey(d.name) === key && Math.abs(d.amount - amount) < 0.01
    );
  };

  // 1. Basic Pay
  const basicPay = gen.planSnapshot?.basicPay || 0;
  if (basicPay > 0) {
    earningsList.push({ name: 'Basic Pay', amount: basicPay });
  }

  // 2. Plan Snapshot Allowances
  const planItems = gen.planSnapshot?.items || [];
  planItems.filter(i => i.itemType === 'allowance').forEach(item => {
    if (!isDuplicateEarning(item.name, item.amount)) {
      earningsList.push({ name: item.name, amount: item.amount });
    }
  });

  // 3. Calculation Details Allowances
  const calcAllowances = gen.calculationDetails?.allowances || [];
  calcAllowances.forEach(allow => {
    if (!isDuplicateEarning(allow.name, allow.amount)) {
      earningsList.push({ name: allow.name, amount: allow.amount });
    }
  });

  // 4. Generation Items
  const genItems = gen.items || [];
  genItems.filter(i => i.itemType === 'allowance').forEach(item => {
    if (!isDuplicateEarning(item.itemName, item.amount)) {
      earningsList.push({ name: item.itemName, amount: item.amount });
    }
  });

  // 5. Bonus Adjustments
  const adjustments = gen.calculationDetails?.adjustments || [];
  adjustments.filter(a => a.type === 'bonus' || a.amount > 0).forEach(adj => {
    const rawName = adj.name || 'Bonus Adjustment';
    const cleanName = rawName.replace(/^bonus:\s*/i, 'Bonus: ');
    if (!isDuplicateEarning(cleanName, adj.amount)) {
      earningsList.push({ name: cleanName, amount: adj.amount });
    }
  });

  // 6. Applied Adjustments
  const appliedAdjs = gen.calculationDetails?.appliedAdjustments || [];
  appliedAdjs.forEach(adj => {
    const cleanName = adj.reason ? `Adjustment: ${adj.reason}` : `Adjustment (${adj.adjustmentType})`;
    if (adj.amount > 0 && !isDuplicateEarning(cleanName, adj.amount)) {
      earningsList.push({ name: cleanName, amount: adj.amount });
    }
  });

  // 7. Leave Bonus
  const leaveBonus = gen.leaveBonusAmount ?? gen.calculationDetails?.leaveBonusAmount ?? 0;
  if (leaveBonus > 0 && !isDuplicateEarning('Leave Bonus', leaveBonus)) {
    earningsList.push({ name: 'Leave Bonus', amount: leaveBonus });
  }

  // 8. Old Balance
  const oldBalance = gen.oldBalanceAmount ?? gen.calculationDetails?.oldBalanceAmount ?? 0;
  if (oldBalance > 0 && !isDuplicateEarning('Old Balance Carry Forward', oldBalance)) {
    earningsList.push({ name: 'Old Balance Carry Forward', amount: oldBalance });
  }

  // 9. Unallocated earnings check
  const targetEarnings = gen.totalEarnings || gen.grossSalary || 0;
  const subtotalEarnings = earningsList.reduce((sum, e) => sum + e.amount, 0);
  const diffEarnings = targetEarnings - subtotalEarnings;
  if (diffEarnings > 0.01) {
    earningsList.push({ name: 'Other Allowances / Earnings', amount: diffEarnings });
  }

  // ── DEDUCTIONS EXTRACTION ─────────────────────────────────────────
  const absentCut = gen.absentDeductions ?? gen.calculationDetails?.absentDeductions ?? 0;
  if (absentCut > 0 && !isDuplicateDeduction('Absent Deduction', absentCut)) {
    deductionsList.push({ name: 'Absent Deduction', amount: absentCut });
  }

  const leaveCut = gen.leaveDeductions ?? gen.calculationDetails?.leaveDeductions ?? 0;
  if (leaveCut > 0 && !isDuplicateDeduction('Excess Leave Deduction', leaveCut)) {
    deductionsList.push({ name: 'Excess Leave Deduction', amount: leaveCut });
  }

  const lateCut = gen.lateDeductions ?? gen.calculationDetails?.lateDeductions ?? 0;
  if (lateCut > 0 && !isDuplicateDeduction('Late Deduction', lateCut)) {
    deductionsList.push({ name: 'Late Deduction', amount: lateCut });
  }

  const advanceCut = gen.advanceDeductions ?? gen.calculationDetails?.advanceDeductions ?? 0;
  if (advanceCut > 0 && !isDuplicateDeduction('Salary Advance Repayment', advanceCut)) {
    deductionsList.push({ name: 'Salary Advance Repayment', amount: advanceCut });
  }

  planItems.filter(i => i.itemType === 'deduction').forEach(item => {
    if (!isDuplicateDeduction(item.name, item.amount)) {
      deductionsList.push({ name: item.name, amount: item.amount });
    }
  });

  const calcDeductions = gen.calculationDetails?.deductions || [];
  calcDeductions.forEach(ded => {
    if (!isDuplicateDeduction(ded.name, ded.amount)) {
      deductionsList.push({ name: ded.name, amount: ded.amount });
    }
  });

  genItems.filter(i => i.itemType === 'deduction').forEach(item => {
    if (!isDuplicateDeduction(item.itemName, item.amount)) {
      deductionsList.push({ name: item.itemName, amount: item.amount });
    }
  });

  adjustments.filter(a => a.type === 'fine' || a.type === 'extra_cut').forEach(adj => {
    const rawName = adj.name || 'Fine / Cut';
    if (!isDuplicateDeduction(rawName, adj.amount)) {
      deductionsList.push({ name: rawName, amount: adj.amount });
    }
  });

  const targetDeductions = gen.totalDeductions || 0;
  const subtotalDeductions = deductionsList.reduce((sum, d) => sum + d.amount, 0);
  const diffDeductions = targetDeductions - subtotalDeductions;
  if (diffDeductions > 0.01) {
    deductionsList.push({ name: 'Other Deductions', amount: diffDeductions });
  }

  return { earningsList, deductionsList, targetEarnings, targetDeductions };
};

const PayrollPaymentsList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency, roundUpAmounts } = usePayrollDisplaySettings();

  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const [savingEditPaymentId, setSavingEditPaymentId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  const [generationsWithBalance, setGenerationsWithBalance] = useState<GenerationWithBalance[]>([]);
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other'>('bank_transfer');
  const [paymentDateDisplay, setPaymentDateDisplay] = useState(isoToDisplayDate(new Date().toISOString().split('T')[0]));
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMode: 'bank_transfer' as 'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other',
    referenceNo: '',
    remarks: '',
  });
  const [editingPayment, setEditingPayment] = useState<PaymentHistoryGroup | null>(null);
  const [editFormData, setEditFormData] = useState<PayrollEditPaymentFormState>({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'bank_transfer',
    referenceNo: '',
    remarks: '',
  });
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<PaymentHistoryGroup | null>(null);
  const [expandedMonthIds, setExpandedMonthIds] = useState<Record<number, boolean>>({});
  const [selectedGenerationDetails, setSelectedGenerationDetails] = useState<PayrollGeneration | null>(null);

  const breakdownDetails = useMemo(() => {
    return selectedGenerationDetails ? getBreakdownLists(selectedGenerationDetails) : null;
  }, [selectedGenerationDetails]);

  const toggleMonthExpand = (generationId: number) => {
    setExpandedMonthIds(prev => ({
      ...prev,
      [generationId]: !prev[generationId],
    }));
  };

  useEffect(() => {
    if (user?.school_id) {
      loadInitialData();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (user?.school_id && selectedStaffId) {
      loadEmployeeGenerations(selectedStaffId as number);
    } else {
      setGenerationsWithBalance([]);
      setFormData(prev => ({ ...prev, amount: 0, referenceNo: '', remarks: '' }));
    }
  }, [user?.school_id, selectedStaffId]);

  const loadInitialData = async () => {
    if (!user?.school_id) return;

    try {
      setLoadingStaff(true);
      const [staffData, settings] = await Promise.all([
        payrollService.getAllStaffWithPayrollPlans(user.school_id),
        payrollService.getPayrollSettings(user.school_id),
      ]);
      const paymentMode = settings?.defaultPaymentMode || 'bank_transfer';
      setStaffList(staffData);
      setDefaultPaymentMode(paymentMode);
      setFormData(prev => ({ ...prev, paymentMode }));
    } catch (error: any) {
      console.error('Error loading payroll payment setup:', error);
      showToast(error.message || 'Failed to load employees', 'error');
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadEmployeeGenerations = async (staffId: number) => {
    if (!user?.school_id) return;

    try {
      setLoadingData(true);
      const data = await payrollService.getEmployeePayrollGenerationsWithBalance(user.school_id, staffId);
      setGenerationsWithBalance(data);
      setFormData(prev => ({ ...prev, amount: 0 }));
    } catch (error: any) {
      console.error('Error loading employee payroll balances:', error);
      setGenerationsWithBalance([]);
      showToast(error.message || 'Failed to load payroll balances', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleRefresh = async () => {
    await loadInitialData();
    if (selectedStaffId) {
      await loadEmployeeGenerations(selectedStaffId as number);
    }
  };

  const handleDeletePaymentClick = (payment: PaymentHistoryGroup) => {
    setConfirmDeletePayment(payment);
  };

  const handleConfirmDelete = async () => {
    if (!user?.school_id || !confirmDeletePayment) return;
    const paymentId = confirmDeletePayment.paymentIds[0];
    const paymentGroupId = confirmDeletePayment.paymentGroupId;

    try {
      setDeletingPaymentId(paymentId);
      if (paymentGroupId) {
        await payrollService.deletePaymentGroup(user.school_id, paymentGroupId, user.id);
      } else {
        await payrollService.deletePayment(user.school_id, paymentId, user.id);
      }
      showToast('Payment deleted successfully', 'success');
      setConfirmDeletePayment(null);
      if (selectedStaffId) {
        await loadEmployeeGenerations(selectedStaffId as number);
      }
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleOpenEditPayment = (payment: PaymentHistoryGroup) => {
    setEditingPayment(payment);
    setEditFormData({
      paymentDate: payment.paymentDate,
      paymentMode: payment.paymentMode,
      referenceNo: payment.referenceNo || '',
      remarks: payment.remarks || '',
    });
  };

  const handleCloseEditPayment = () => {
    setEditingPayment(null);
    setEditFormData({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: defaultPaymentMode,
      referenceNo: '',
      remarks: '',
    });
  };

  const handleSaveEditedPayment = async () => {
    if (!user?.school_id || !editingPayment) return;

    try {
      setSavingEditPaymentId(editingPayment.paymentIds[0] || null);
      const targetPaymentIds = editingPayment.paymentIds;

      await Promise.all(
        targetPaymentIds.map(paymentId =>
          payrollService.updatePayment(
            user.school_id,
            paymentId,
            {
              paymentDate: editFormData.paymentDate,
              paymentMode: editFormData.paymentMode,
              referenceNo: editFormData.referenceNo || undefined,
              remarks: editFormData.remarks || undefined,
            },
            user.id
          )
        )
      );

      showToast('Payroll payment updated successfully', 'success');
      handleCloseEditPayment();
      if (selectedStaffId) {
        await loadEmployeeGenerations(selectedStaffId as number);
      }
    } catch (error: any) {
      console.error('Error updating payroll payment:', error);
      showToast(error.message || 'Failed to update payroll payment', 'error');
    } finally {
      setSavingEditPaymentId(null);
    }
  };

  const handleDownloadReceipt = async (paymentIds: number[]) => {
    if (!user?.school_id) return;

    try {
      if (paymentIds.length > 1) {
        await generateCombinedPayrollPaymentReceipt(user.school_id, paymentIds, roundUpAmounts);
      } else if (paymentIds[0]) {
        await generatePayrollPaymentReceipt(user.school_id, paymentIds[0], roundUpAmounts);
      }
    } catch (error: any) {
      console.error('Error generating payroll receipt:', error);
      showToast(error.message || 'Failed to generate payroll receipt', 'error');
    }
  };

  const selectedStaff = staffList.find(staff => staff.id === selectedStaffId);

  const dueRows = useMemo(
    () => sortByOldestPeriod(generationsWithBalance.filter(item => item.remainingBalance > 0)),
    [generationsWithBalance]
  );

  const totalPending = useMemo(
    () => dueRows.reduce((sum, item) => sum + item.remainingBalance, 0),
    [dueRows]
  );

  const totalPaid = useMemo(
    () => generationsWithBalance.reduce((sum, item) => sum + item.totalPaid, 0),
    [generationsWithBalance]
  );

  const paymentHistory = useMemo<PaymentHistoryGroup[]>(() => {
    const grouped = new Map<string, PaymentHistoryGroup>();
    const uniquePayments = Array.from(
      new Map(
        generationsWithBalance
          .flatMap(item => item.payments)
          .map(payment => [payment.id, payment] as const)
      ).values()
    );

    uniquePayments.forEach(payment => {
      const key = payment.paymentGroupId || `single-${payment.id}`;
      const periods = (payment.items && payment.items.length > 0
        ? payment.items.map(item => item.generation || generationsWithBalance.find(row => row.generation.id === item.generationId)?.generation).filter(Boolean)
        : [payment.generation]
      )
        .filter(Boolean)
        .sort((a: any, b: any) => {
          if (a.payrollYear !== b.payrollYear) {
            return a.payrollYear - b.payrollYear;
          }
          return a.payrollMonth - b.payrollMonth;
        })
        .map((generation: any) => formatPeriod(generation));
      const existing = grouped.get(key);

      if (existing) {
        existing.paymentIds.push(payment.id);
        existing.amount += payment.amount;
        periods.forEach(period => {
          if (!existing.periods.includes(period)) {
            existing.periods.push(period);
          }
        });
        if (String(payment.paymentDate) > String(existing.paymentDate)) {
          existing.paymentDate = payment.paymentDate;
        }
        if (String(payment.createdAt || '') > String(existing.createdAt || '')) {
          existing.createdAt = payment.createdAt;
        }
      } else {
        grouped.set(key, {
          key,
          paymentIds: [payment.id],
          paymentGroupId: payment.paymentGroupId,
          paymentDate: payment.paymentDate,
          createdAt: payment.createdAt,
          amount: payment.amount,
          paymentMode: payment.paymentMode,
          referenceNo: payment.referenceNo,
          remarks: payment.remarks,
          status: payment.status,
          periods: periods.length > 0 ? periods : ['-'],
          employeeName: payment.generation?.staff?.name || selectedStaff?.name || 'Employee',
        });
      }
    });

    return Array.from(grouped.values())
      .map(item => ({
        ...item,
        periods: [...item.periods].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
      }))
      .sort((a, b) => {
      const createdDiff = String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      if (createdDiff !== 0) return createdDiff;
      const dateDiff = String(b.paymentDate).localeCompare(String(a.paymentDate));
      if (dateDiff !== 0) return dateDiff;
      return (b.paymentIds[0] || 0) - (a.paymentIds[0] || 0);
      });
  }, [generationsWithBalance, selectedStaff]);

  const allocationPreview = useMemo<AllocationPreviewItem[]>(() => {
    let remaining = Math.max(0, formData.amount || 0);

    return dueRows.map(item => {
      const allocationAmount = Math.min(item.remainingBalance, remaining);
      remaining -= allocationAmount;
      return {
        ...item,
        allocationAmount,
        balanceAfterAllocation: Math.max(0, item.remainingBalance - allocationAmount),
      };
    });
  }, [dueRows, formData.amount]);

  const allocatedAmount = allocationPreview.reduce((sum, item) => sum + item.allocationAmount, 0);
  const overflowAmount = Math.max(0, (formData.amount || 0) - totalPending);
  const pendingMonths = dueRows.length;
  const paidMonths = generationsWithBalance.filter(item => item.paymentStatus === 'paid').length;

  const handleProcessPayment = async () => {
    if (!user?.school_id || !selectedStaffId) {
      showToast('Please select an employee', 'error');
      return;
    }

    if (!isValidDisplayDate(paymentDateDisplay)) {
      showToast('Payment date must be in dd-mm-yyyy format', 'error');
      return;
    }

    if (formData.amount <= 0) {
      showToast('Payment amount must be greater than 0', 'error');
      return;
    }

    if (formData.amount > totalPending) {
      showToast(`Payment amount cannot exceed pending balance of ${formatCurrency(totalPending)}`, 'error');
      return;
    }

    try {
      setProcessingPayment(true);
      const payments = await payrollService.processCombinedPayment(
        user.school_id,
        {
          staffId: selectedStaffId as number,
          paymentDate: formData.paymentDate,
          amount: formData.amount,
          paymentMode: formData.paymentMode,
          referenceNo: formData.referenceNo || undefined,
          remarks: formData.remarks || undefined,
        },
        user.id
      );

      const createdPayment = payments[0];
      const touchedMonths = createdPayment?.items?.filter(item => item.paidAmount > 0).length || 1;
      showToast(
        `Payment recorded across ${touchedMonths} month${touchedMonths === 1 ? '' : 's'} in oldest-first order`,
        'success'
      );

      if (createdPayment?.id) {
        await generatePayrollPaymentReceipt(user.school_id, createdPayment.id, roundUpAmounts);
      }

      await loadEmployeeGenerations(selectedStaffId as number);
      setFormData(prev => ({
        ...prev,
        amount: 0,
        referenceNo: '',
        remarks: '',
        paymentMode: defaultPaymentMode,
      }));
    } catch (error: any) {
      console.error('Error processing combined payroll payment:', error);
      showToast(error.message || 'Failed to process payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loadingStaff) {
    return <Loader />;
  }

  return (
    <>
      <ContentCard style={{ padding: '0.8rem 1rem', marginBottom: '0.6rem' }}>
        <Box
          display="flex"
          gap={1}
          alignItems="flex-end"
          justifyContent="space-between"
          flexWrap="wrap"
          sx={{ '@media (max-width: 768px)': { flexDirection: 'column', alignItems: 'stretch' } }}
        >
          <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 250 } }}>
            <InputLabel sx={{ fontSize: '0.8rem' }}>Select Employee</InputLabel>
            <Select
              value={selectedStaffId || ''}
              onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : '')}
              label="Select Employee"
              sx={{ fontSize: '0.82rem', height: '34px' }}
            >
              <MenuItem value="" sx={{ fontSize: '0.82rem' }}>Select an employee...</MenuItem>
              {staffList.map((staff) => (
                <MenuItem key={staff.id} value={staff.id} sx={{ fontSize: '0.82rem' }}>
                  {staff.name} ({staff.role})
                </MenuItem>
              ))}
            </Select>
          </MuiFormControl>

          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
            onClick={handleRefresh}
            sx={{ fontSize: '0.8rem', height: '34px', px: 1.5 }}
          >
            Refresh
          </Button>
        </Box>
      </ContentCard>

      {!selectedStaffId && (
        <EmptyState>
          <PaymentIcon />
          <h3>Select an Employee</h3>
          <p>Choose an employee to collect payroll against all unpaid months in one flow.</p>
        </EmptyState>
      )}

      {selectedStaffId && selectedStaff && (
        <>
          <SummaryCard>
            <SummaryItem>
              <SummaryLabel>Employee</SummaryLabel>
              <SummaryValue>{selectedStaff.name}</SummaryValue>
              <div style={{ fontSize: '0.76rem', color: theme.TEXT_SECONDARY }}>{selectedStaff.role}</div>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Total Paid</SummaryLabel>
              <SummaryValue $color="#10b981">{formatCurrency(totalPaid)}</SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Pending Balance</SummaryLabel>
              <SummaryValue $color="#ef4444">{formatCurrency(totalPending)}</SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Pending Months</SummaryLabel>
              <SummaryValue>{pendingMonths}</SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Paid Months</SummaryLabel>
              <SummaryValue>{paidMonths}</SummaryValue>
            </SummaryItem>
          </SummaryCard>

          {loadingData ? (
            <Loader />
          ) : (
            <>
              <ContentGrid>
                <ContentCard>
                  <CardTitle>
                    <div>
                      <CardHeading>Salary Months & Payment History</CardHeading>
                      <CardSubtext>
                        Click any salary month to expand its collapsible payment drawer and view individual installments.
                      </CardSubtext>
                    </div>
                  </CardTitle>

                  {generationsWithBalance.length === 0 ? (
                    <EmptyState style={{ padding: '2rem 1rem' }}>
                      <PaymentIcon />
                      <h3>No Payroll Generations Found</h3>
                      <p>Generate salary for this employee first to collect or view payments.</p>
                    </EmptyState>
                  ) : (
                    generationsWithBalance.map((item) => {
                      const isExpanded = !!expandedMonthIds[item.generation.id];
                      const statusColor = item.paymentStatus === 'paid' ? '#10b981' : item.paymentStatus === 'partial' ? '#f59e0b' : '#ef4444';
                      const statusLabel = item.paymentStatus === 'paid' ? 'PAID' : item.paymentStatus === 'partial' ? 'PARTIAL' : 'UNPAID';
                      const allocatedItem = allocationPreview.find(a => a.generation.id === item.generation.id);

                      return (
                        <MonthDrawerCard key={item.generation.id} $status={item.paymentStatus} theme={theme}>
                          <MonthDrawerHeader theme={theme} onClick={() => toggleMonthExpand(item.generation.id)}>
                            <MonthDrawerLeft>
                              <StatusBadge style={{
                                background: item.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.15)' : item.paymentStatus === 'partial' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: statusColor,
                                border: `1px solid ${statusColor}40`,
                                fontWeight: 800,
                              }}>
                                {statusLabel}
                              </StatusBadge>
                              <div>
                                <MonthTitle theme={theme}>{formatPeriod(item.generation)}</MonthTitle>
                                <MonthSubtext theme={theme}>
                                  {item.generation.planSnapshot?.planName || item.generation.staff?.role || 'Payroll Plan'}
                                </MonthSubtext>
                              </div>
                            </MonthDrawerLeft>

                            <MonthDrawerRight theme={theme}>
                              <MonthStatPill
                                theme={theme}
                                $bg="rgba(99, 102, 241, 0.08)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGenerationDetails(item.generation);
                                }}
                                style={{ cursor: 'pointer', border: `1px solid ${theme.ACCENT}40` }}
                                title="Click to view full salary payroll breakdown & calculation details"
                              >
                                <MonthStatLabel theme={theme} style={{ color: theme.ACCENT, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  Net Salary 🔍
                                </MonthStatLabel>
                                <MonthStatValue theme={theme} $color={theme.ACCENT}>
                                  {formatCurrency(item.generation.netSalary)}
                                </MonthStatValue>
                              </MonthStatPill>

                              <MonthStatPill theme={theme} $bg={item.totalPaid > 0 ? 'rgba(16, 185, 129, 0.08)' : undefined}>
                                <MonthStatLabel theme={theme}>Paid So Far</MonthStatLabel>
                                <MonthStatValue $color="#10b981">{formatCurrency(item.totalPaid)}</MonthStatValue>
                              </MonthStatPill>

                              <MonthStatPill theme={theme} $bg={item.remainingBalance > 0 ? 'rgba(239, 68, 68, 0.08)' : undefined}>
                                <MonthStatLabel theme={theme}>Remaining</MonthStatLabel>
                                <MonthStatValue $color={item.remainingBalance > 0 ? '#ef4444' : '#10b981'}>
                                  {formatCurrency(item.remainingBalance)}
                                </MonthStatValue>
                              </MonthStatPill>

                              {allocatedItem && allocatedItem.allocationAmount > 0 && (
                                <MonthStatPill theme={theme} $bg="rgba(99, 102, 241, 0.12)">
                                  <MonthStatLabel theme={theme}>Pay Now</MonthStatLabel>
                                  <MonthStatValue $color={theme.ACCENT}>
                                    +{formatCurrency(allocatedItem.allocationAmount)}
                                  </MonthStatValue>
                                </MonthStatPill>
                              )}

                              <StatusBadge style={{ background: theme.BG === '#252525' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                                {item.payments.length} {item.payments.length === 1 ? 'Installment' : 'Installments'}
                              </StatusBadge>

                              <IconButton style={{ padding: 4 }}>
                                {isExpanded ? <CollapseIcon sx={{ fontSize: 20 }} /> : <ExpandIcon sx={{ fontSize: 20 }} />}
                              </IconButton>
                            </MonthDrawerRight>
                          </MonthDrawerHeader>

                          {isExpanded && (
                            <DrawerBody theme={theme}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.TEXT_PRIMARY }}>
                                  Payment Installment History for {formatPeriod(item.generation)}
                                </Typography>
                                {item.payments.length > 0 && (
                                  <StatusBadge style={{ fontSize: '0.7rem' }}>
                                    {item.payments.length} transaction{item.payments.length === 1 ? '' : 's'} recorded
                                  </StatusBadge>
                                )}
                              </div>

                              {item.payments.length === 0 ? (
                                <div style={{
                                  padding: '1.25rem 1rem',
                                  textAlign: 'center',
                                  color: theme.TEXT_SECONDARY,
                                  fontSize: '0.8rem',
                                  background: theme.CARD,
                                  borderRadius: '8px',
                                  border: `1px dashed ${theme.BORDER}`,
                                }}>
                                  No payment installments recorded for this salary month yet.
                                </div>
                              ) : (
                                item.payments.map((payment) => {
                                  const matchingGroup = paymentHistory.find(g => g.paymentIds.includes(payment.id));
                                  const renderModeIcon = () => {
                                    switch (payment.paymentMode) {
                                      case 'cash': return <CashIcon style={{ fontSize: 14, color: '#10b981' }} />;
                                      case 'bank_transfer': return <BankIcon style={{ fontSize: 14, color: '#6366f1' }} />;
                                      case 'cheque': return <ChequeIcon style={{ fontSize: 14, color: '#f59e0b' }} />;
                                      case 'easypaisa_jazzcash': return <MobileIcon style={{ fontSize: 14, color: '#0ea5e9' }} />;
                                      default: return <PaymentIcon style={{ fontSize: 14 }} />;
                                    }
                                  };

                                  return (
                                    <PaymentItemRow key={payment.id} theme={theme}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <StatusBadge style={{ textTransform: 'capitalize', gap: '4px' }}>
                                          {renderModeIcon()}
                                          {payment.paymentMode.replace(/_/g, ' ')}
                                        </StatusBadge>

                                        <div>
                                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.TEXT_PRIMARY }}>
                                            {formatPayrollDate(payment.paymentDate)}
                                          </div>
                                          <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {payment.referenceNo ? <span>Ref: <b>{payment.referenceNo}</b></span> : <span>No Reference</span>}
                                            {payment.remarks && (
                                              <span style={{
                                                background: theme.BG === '#252525' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.68rem',
                                              }}>
                                                💬 {payment.remarks}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>
                                            +{formatCurrency(payment.amount)}
                                          </div>
                                          <div style={{ fontSize: '0.68rem', color: theme.TEXT_SECONDARY }}>
                                            Installment Paid
                                          </div>
                                        </div>

                                        <Box display="flex" gap={0.5}>
                                          <IconButton
                                            onClick={() => handleDownloadReceipt([payment.id])}
                                            title="Download Receipt"
                                            style={{ color: theme.ACCENT }}
                                          >
                                            <PictureAsPdfIcon style={{ fontSize: '0.9rem' }} />
                                          </IconButton>
                                          {matchingGroup && (
                                            <>
                                              <IconButton
                                                onClick={() => handleOpenEditPayment(matchingGroup)}
                                                title="Edit Payment"
                                                style={{ color: theme.ACCENT }}
                                              >
                                                <EditIcon style={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton
                                                onClick={() => handleDeletePaymentClick(matchingGroup)}
                                                title="Delete Payment"
                                                disabled={deletingPaymentId === payment.id}
                                                style={{ color: '#ef4444' }}
                                              >
                                                <DeleteIcon style={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                            </>
                                          )}
                                        </Box>
                                      </div>
                                    </PaymentItemRow>
                                  );
                                })
                              )}
                            </DrawerBody>
                          )}
                        </MonthDrawerCard>
                      );
                    })
                  )}
                </ContentCard>

                <ContentCard>
                  <CardTitle>
                    <div>
                      <CardHeading>Collect Payment</CardHeading>
                      <CardSubtext>One payment, split cleanly across pending months in chronological order.</CardSubtext>
                    </div>
                  </CardTitle>

                  <PaymentForm>
                    <InfoStrip>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: theme.TEXT_PRIMARY, mb: 0.3 }}>
                        Allocation Order
                      </Typography>
                      <Typography sx={{ fontSize: '0.76rem', color: theme.TEXT_SECONDARY, lineHeight: 1.5 }}>
                        The system pays the earliest unpaid payroll first, then continues into the next months automatically.
                      </Typography>
                    </InfoStrip>

                    <FormGroup>
                      <Label>Payment Date</Label>
                      <PayrollDateField
                        value={paymentDateDisplay}
                        onChange={(isoValue, displayValue) => {
                          setPaymentDateDisplay(displayValue);
                          setFormData(prev => ({ ...prev, paymentDate: isoValue }));
                        }}
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Payment Amount</Label>
                      <TextField
                        type="number"
                        size="small"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        onKeyDown={blockNumberArrowKey}
                        onWheelCapture={blockNumberWheelChange}
                        fullWidth
                        inputProps={{ min: 0, max: totalPending, step: 0.01 }}
                        helperText={`Maximum collectible: ${formatCurrency(totalPending)}`}
                        sx={payrollAmountInputSx}
                      />
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Button size="small" variant="outlined" onClick={() => setFormData(prev => ({ ...prev, amount: totalPending }))} disabled={totalPending === 0}>
                          Pay All Pending
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => setFormData(prev => ({ ...prev, amount: dueRows[0]?.remainingBalance || 0 }))} disabled={dueRows.length === 0}>
                          Pay Earliest Month
                        </Button>
                      </Box>
                    </FormGroup>

                    <FormGroup>
                      <MuiFormControl fullWidth size="small">
                        <InputLabel sx={{ fontSize: '0.82rem' }}>Payment Mode</InputLabel>
                        <Select
                          value={formData.paymentMode}
                          onChange={(e) => setFormData(prev => ({ ...prev, paymentMode: e.target.value as any }))}
                          label="Payment Mode"
                          sx={{ fontSize: '0.82rem', height: '36px' }}
                        >
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                          <MenuItem value="cheque">Cheque</MenuItem>
                          <MenuItem value="easypaisa_jazzcash">EasyPaisa/JazzCash</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </MuiFormControl>
                    </FormGroup>

                    <FormGroup>
                      <Label>Reference Number</Label>
                      <TextField
                        size="small"
                        value={formData.referenceNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, referenceNo: e.target.value }))}
                        placeholder="Transaction ID, cheque no, etc."
                        fullWidth
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Remarks</Label>
                      <TextField
                        size="small"
                        value={formData.remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                        multiline
                        rows={2}
                        fullWidth
                      />
                    </FormGroup>

                    <MiniStats>
                      <MiniStat>
                        <MiniLabel>Will Be Applied</MiniLabel>
                        <MiniValue $color="#10b981">{formatCurrency(allocatedAmount)}</MiniValue>
                      </MiniStat>
                      <MiniStat>
                        <MiniLabel>Unallocated</MiniLabel>
                        <MiniValue $color={overflowAmount > 0 ? '#ef4444' : theme.TEXT_PRIMARY}>{formatCurrency(overflowAmount)}</MiniValue>
                      </MiniStat>
                      <MiniStat>
                        <MiniLabel>Months Touched</MiniLabel>
                        <MiniValue>{allocationPreview.filter(item => item.allocationAmount > 0).length}</MiniValue>
                      </MiniStat>
                      <MiniStat>
                        <MiniLabel>Balance After Entry</MiniLabel>
                        <MiniValue>{formatCurrency(Math.max(0, totalPending - allocatedAmount))}</MiniValue>
                      </MiniStat>
                    </MiniStats>

                    <HintBox>
                      This payment will be distributed in order from the oldest payroll month to the newest one, keeping the ledger clean and easy to follow.
                    </HintBox>

                    <PrimaryButton
                      onClick={handleProcessPayment}
                      disabled={processingPayment || totalPending === 0 || formData.amount <= 0 || overflowAmount > 0}
                      style={{ width: '100%', justifyContent: 'center', height: '40px', fontSize: '0.85rem' }}
                    >
                      <PaymentIcon style={{ fontSize: '1rem' }} />
                      {processingPayment ? 'Processing Payment...' : 'Collect Payroll Payment'}
                    </PrimaryButton>
                  </PaymentForm>
                </ContentCard>
              </ContentGrid>

            </>
          )}
        </>
      )}

      {editingPayment && ReactDOM.createPortal(
        <EditModalOverlay theme={theme} onClick={handleCloseEditPayment}>
          <EditModalCard theme={theme} onClick={(e) => e.stopPropagation()}>
            <EditModalHeader theme={theme}>
              <EditModalTitle theme={theme}>
                <EditIcon style={{ fontSize: 20, color: theme.ACCENT }} />
                Edit Salary Payment
              </EditModalTitle>
              <IconButton onClick={handleCloseEditPayment} title="Close">
                <CloseIcon style={{ fontSize: '0.95rem' }} />
              </IconButton>
            </EditModalHeader>

            <EditModalBody theme={theme}>
              <div style={{
                color: theme.TEXT_SECONDARY,
                fontSize: '0.82rem',
                padding: '0.1rem 0 0.35rem',
                borderBottom: theme.BG === '#252525'
                  ? '1px solid rgba(255,255,255,0.05)'
                  : '1px solid rgba(15,23,42,0.06)',
              }}>
                {editingPayment.employeeName} for {editingPayment.periods.length > 1 ? `${editingPayment.periods.length} salary months` : editingPayment.periods[0]}
              </div>

              <EditFormGrid>
                <EditFormGroup>
                  <EditLabel theme={theme}>Amount</EditLabel>
                  <EditInput theme={theme} value={formatCurrency(editingPayment.amount)} readOnly />
                </EditFormGroup>

                <EditFormGroup>
                  <EditLabel theme={theme}>Payment Date</EditLabel>
                  <EditInput
                    theme={theme}
                    type="date"
                    value={editFormData.paymentDate}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </EditFormGroup>

                <EditFormGroup>
                  <EditLabel theme={theme}>Payment Mode</EditLabel>
                  <EditInput
                    as="select"
                    theme={theme}
                    value={editFormData.paymentMode}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, paymentMode: e.target.value as PayrollPayment['paymentMode'] }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="easypaisa_jazzcash">EasyPaisa/JazzCash</option>
                    <option value="other">Other</option>
                  </EditInput>
                </EditFormGroup>

                <EditFormGroup>
                  <EditLabel theme={theme}>Reference Number</EditLabel>
                  <EditInput
                    theme={theme}
                    value={editFormData.referenceNo}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, referenceNo: e.target.value }))}
                    placeholder="Transaction ID, cheque no, etc."
                  />
                </EditFormGroup>

                <EditFullWidthField>
                  <EditLabel theme={theme}>Remarks</EditLabel>
                  <EditTextarea
                    theme={theme}
                    rows={3}
                    value={editFormData.remarks}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Enter payment remarks"
                  />
                </EditFullWidthField>
              </EditFormGrid>
            </EditModalBody>

            <EditModalFooter theme={theme}>
              <EditButton type="button" $variant="secondary" onClick={handleCloseEditPayment}>
                <CloseIcon style={{ fontSize: 16 }} />
                Cancel
              </EditButton>
              <EditButton
                type="button"
                onClick={handleSaveEditedPayment}
                disabled={savingEditPaymentId === editingPayment.paymentIds[0]}
              >
                {savingEditPaymentId === editingPayment.paymentIds[0] ? (
                  <CircularProgress size={16} />
                ) : (
                  <SaveIcon style={{ fontSize: 16 }} />
                )}
                Save Changes
              </EditButton>
            </EditModalFooter>
          </EditModalCard>
        </EditModalOverlay>,
        document.body
      )}

      {confirmDeletePayment && ReactDOM.createPortal(
        <EditModalOverlay theme={theme} onClick={() => setConfirmDeletePayment(null)}>
          <EditModalCard theme={theme} style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <EditModalHeader theme={theme}>
              <EditModalTitle theme={theme} style={{ color: '#ef4444' }}>
                <DeleteIcon style={{ fontSize: 20 }} />
                Confirm Deletion
              </EditModalTitle>
              <IconButton onClick={() => setConfirmDeletePayment(null)} title="Close">
                <CloseIcon style={{ fontSize: '0.95rem' }} />
              </IconButton>
            </EditModalHeader>

            <EditModalBody theme={theme} style={{ textAlign: 'center', padding: '1.5rem 1.25rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: theme.TEXT_PRIMARY }}>
                Are you sure you want to delete this payment?
              </div>
              <div style={{ fontSize: '0.82rem', color: theme.TEXT_SECONDARY, lineHeight: 1.5 }}>
                {confirmDeletePayment.employeeName} for {confirmDeletePayment.periods.join(', ')} ( {formatCurrency(confirmDeletePayment.amount)} )
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}>
                This action cannot be undone and will restore the pending balance for the affected months.
              </div>
            </EditModalBody>

            <EditModalFooter theme={theme}>
              <EditButton type="button" $variant="secondary" onClick={() => setConfirmDeletePayment(null)}>
                <CloseIcon style={{ fontSize: 16 }} />
                Cancel
              </EditButton>
              <EditButton
                type="button"
                style={{ background: '#ef4444' }}
                onClick={handleConfirmDelete}
                disabled={deletingPaymentId === confirmDeletePayment.paymentIds[0]}
              >
                {deletingPaymentId === confirmDeletePayment.paymentIds[0] ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DeleteIcon style={{ fontSize: 16 }} />
                )}
                Yes, Delete Payment
              </EditButton>
            </EditModalFooter>
          </EditModalCard>
        </EditModalOverlay>,
        document.body
      )}

      {selectedGenerationDetails && breakdownDetails && ReactDOM.createPortal(
        <EditModalOverlay theme={theme} onClick={() => setSelectedGenerationDetails(null)}>
          <EditModalCard theme={theme} style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <EditModalHeader theme={theme}>
              <EditModalTitle theme={theme}>
                <ReceiptIcon style={{ fontSize: 22, color: theme.ACCENT }} />
                Salary Payroll Details ({formatPeriod(selectedGenerationDetails)})
              </EditModalTitle>
              <IconButton onClick={() => setSelectedGenerationDetails(null)} title="Close">
                <CloseIcon style={{ fontSize: '0.95rem' }} />
              </IconButton>
            </EditModalHeader>

            <EditModalBody theme={theme}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.65rem', borderBottom: `1px solid ${theme.BORDER}` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: theme.TEXT_PRIMARY }}>
                    {selectedGenerationDetails.staff?.name || selectedStaff?.name || 'Employee'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: theme.TEXT_SECONDARY }}>
                    Role: {selectedGenerationDetails.staff?.role || selectedStaff?.role || 'Staff'} • Plan: {selectedGenerationDetails.planSnapshot?.planName || 'Standard Payroll'}
                  </div>
                </div>
                <StatusBadge style={{
                  background: selectedGenerationDetails.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                  color: selectedGenerationDetails.status === 'paid' ? '#10b981' : theme.ACCENT,
                  fontWeight: 700,
                }}>
                  Status: {selectedGenerationDetails.status.toUpperCase()}
                </StatusBadge>
              </div>

              {selectedGenerationDetails.attendanceData?.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.65rem' }}>
                  <MiniStat theme={theme}>
                    <MiniLabel theme={theme}>Working Days</MiniLabel>
                    <MiniValue theme={theme}>{selectedGenerationDetails.attendanceData.summary.workingDays}</MiniValue>
                  </MiniStat>
                  <MiniStat theme={theme}>
                    <MiniLabel theme={theme}>Present Days</MiniLabel>
                    <MiniValue $color="#10b981">{selectedGenerationDetails.attendanceData.summary.presentDays}</MiniValue>
                  </MiniStat>
                  <MiniStat theme={theme}>
                    <MiniLabel theme={theme}>Absent Days</MiniLabel>
                    <MiniValue $color="#ef4444">{selectedGenerationDetails.attendanceData.summary.absentDays}</MiniValue>
                  </MiniStat>
                  <MiniStat theme={theme}>
                    <MiniLabel theme={theme}>Leave Days</MiniLabel>
                    <MiniValue $color="#f59e0b">{selectedGenerationDetails.attendanceData.summary.leaveDays}</MiniValue>
                  </MiniStat>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginTop: '0.75rem' }}>
                <div style={{ background: theme.BG === '#252525' ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#10b981', marginBottom: '0.5rem', borderBottom: '1px solid rgba(16,185,129,0.2)', paddingBottom: '0.25rem' }}>
                    ➕ Gross Earnings Breakdown
                  </div>
                  {breakdownDetails.earningsList.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.18rem 0', color: theme.TEXT_PRIMARY }}>
                      <span>{item.name}:</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>+{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, paddingTop: '0.4rem', marginTop: '0.4rem', borderTop: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
                    <span>Total Earnings:</span>
                    <span>{formatCurrency(breakdownDetails.targetEarnings)}</span>
                  </div>
                </div>

                <div style={{ background: theme.BG === '#252525' ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ef4444', marginBottom: '0.5rem', borderBottom: '1px solid rgba(239,68,68,0.2)', paddingBottom: '0.25rem' }}>
                    ➖ Deductions Breakdown
                  </div>
                  {breakdownDetails.deductionsList.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: theme.TEXT_SECONDARY, padding: '0.3rem 0' }}>
                      No deductions recorded for this month.
                    </div>
                  ) : (
                    breakdownDetails.deductionsList.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.18rem 0', color: theme.TEXT_PRIMARY }}>
                        <span>{item.name}:</span>
                        <span style={{ fontWeight: 600, color: '#ef4444' }}>-{formatCurrency(item.amount)}</span>
                      </div>
                    ))
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, paddingTop: '0.4rem', marginTop: '0.4rem', borderTop: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <span>Total Deductions:</span>
                    <span>-{formatCurrency(breakdownDetails.targetDeductions)}</span>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '0.85rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: theme.BG === '#252525' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                border: `1px solid ${theme.ACCENT}40`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: theme.TEXT_SECONDARY }}>
                    Net Payable Salary
                  </div>
                  <div style={{ fontSize: '0.74rem', color: theme.TEXT_SECONDARY }}>
                    Calculated for {formatPeriod(selectedGenerationDetails)}
                  </div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.ACCENT }}>
                  {formatCurrency(selectedGenerationDetails.netSalary)}
                </div>
              </div>
            </EditModalBody>

            <EditModalFooter theme={theme}>
              <EditButton type="button" $variant="secondary" onClick={() => setSelectedGenerationDetails(null)}>
                <CloseIcon style={{ fontSize: 16 }} />
                Close Breakdown
              </EditButton>
            </EditModalFooter>
          </EditModalCard>
        </EditModalOverlay>,
        document.body
      )}
    </>
  );
};

export default PayrollPaymentsList;
