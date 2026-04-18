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

  const handleDeletePayment = async (paymentId: number, paymentGroupId?: string) => {
    if (!user?.school_id) return;
    if (!window.confirm(paymentGroupId ? 'Are you sure you want to delete this combined payroll payment?' : 'Are you sure you want to delete this payroll payment?')) return;

    try {
      setDeletingPaymentId(paymentId);
      if (paymentGroupId) {
        await payrollService.deletePaymentGroup(user.school_id, paymentGroupId, user.id);
      } else {
        await payrollService.deletePayment(user.school_id, paymentId, user.id);
      }
      showToast('Payment deleted successfully', 'success');
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
                      <CardHeading>Outstanding Payroll Months</CardHeading>
                      <CardSubtext>
                        Amount entered on the right is automatically allocated from the earliest unpaid month to the latest.
                      </CardSubtext>
                    </div>
                  </CardTitle>

                  <TableWrapper>
                    <StyledTable>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th style={{ textAlign: 'right' }}>Net Salary</th>
                          <th style={{ textAlign: 'right' }}>Paid</th>
                          <th style={{ textAlign: 'right' }}>Remaining</th>
                          <th style={{ textAlign: 'right' }}>Pay Now</th>
                          <th style={{ textAlign: 'right' }}>After Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocationPreview.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                              <div style={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY }}>
                                No unpaid or partially paid payroll months found for this employee.
                              </div>
                            </td>
                          </tr>
                        ) : (
                          allocationPreview.map((item) => (
                            <tr key={item.generation.id}>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{formatPeriod(item.generation)}</div>
                                <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY }}>
                                  {item.generation.planSnapshot?.planName || item.generation.staff?.role || 'Payroll'}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.generation.netSalary)}</td>
                              <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(item.totalPaid)}</td>
                              <td style={{ textAlign: 'right', color: item.remainingBalance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                {formatCurrency(item.remainingBalance)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: item.allocationAmount > 0 ? theme.ACCENT : theme.TEXT_SECONDARY }}>
                                {item.allocationAmount > 0 ? formatCurrency(item.allocationAmount) : '-'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {formatCurrency(item.balanceAfterAllocation)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </StyledTable>
                  </TableWrapper>

                  <InlineSection>
                    <CardTitle style={{ marginBottom: '0.7rem' }}>
                      <div>
                        <CardHeading style={{ fontSize: '0.88rem' }}>Recent Payment History</CardHeading>
                        <CardSubtext>Compact history for the selected employee.</CardSubtext>
                      </div>
                      <HistoryIcon sx={{ color: theme.TEXT_SECONDARY, fontSize: 18 }} />
                    </CardTitle>

                    <TableWrapper>
                      <StyledTable>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Salary Months</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                            <th>Mode</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '1.25rem 1rem', color: theme.TEXT_SECONDARY }}>
                                No payroll payments recorded yet.
                              </td>
                            </tr>
                          ) : (
                            paymentHistory.slice(0, 8).map((payment) => (
                              <tr key={payment.key}>
                                <td style={{ whiteSpace: 'nowrap' }}>{formatPayrollDate(payment.paymentDate)}</td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '0.79rem' }}>
                                    {payment.periods.length > 1
                                      ? `${payment.periods[0]} to ${payment.periods[payment.periods.length - 1]}`
                                      : payment.periods[0]}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY }}>
                                    {payment.periods.length > 1 ? `${payment.periods.length} months combined` : 'Single month'}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                  {formatCurrency(payment.amount)}
                                </td>
                                <td>
                                  <StatusBadge>{payment.paymentMode.replace(/_/g, ' ')}</StatusBadge>
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <IconButton
                                    onClick={() => handleOpenEditPayment(payment)}
                                    title="Edit Payment"
                                    style={{ color: theme.ACCENT }}
                                  >
                                    <EditIcon style={{ fontSize: '0.9rem' }} />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => handleDownloadReceipt(payment.paymentIds)}
                                    title="Download Receipt"
                                    style={{ color: theme.ACCENT }}
                                  >
                                    <PictureAsPdfIcon style={{ fontSize: '0.9rem' }} />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => handleDeletePayment(payment.paymentIds[0], payment.paymentGroupId)}
                                    title="Delete Payment"
                                    disabled={deletingPaymentId === payment.paymentIds[0]}
                                    style={{ color: '#ef4444' }}
                                  >
                                    <DeleteIcon style={{ fontSize: '0.9rem' }} />
                                  </IconButton>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </StyledTable>
                    </TableWrapper>
                  </InlineSection>
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
    </>
  );
};

export default PayrollPaymentsList;
