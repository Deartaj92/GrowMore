import React, { useState, useEffect, useContext, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollPayment, PayrollFilters } from '../../../../types/payroll';
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl as MuiFormControl,
  InputLabel,
  Button,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import { formatPayrollDate } from '../../utils';
import { usePayrollDisplaySettings } from '../../PayrollDisplaySettingsContext';
import { generateCombinedPayrollPaymentReceipt, generatePayrollPaymentReceipt } from '../../paymentReceipt';
import {
  PayrollContainer,
  ToolbarCard,
  ToolbarRow,
  ToolbarGroup,
  TableWrapper,
  StyledTable,
  StatusBadge,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
  IconButton,
  PageHeading,
  PageTitle,
  PageSubtitle,
  SecondaryButton,
} from '../../styles';

interface GenerationWithBalance {
  generation: {
    id: number;
    staffId: number;
    payrollMonth: number;
    payrollYear: number;
    grossSalary?: number;
    totalEarnings: number;
    totalDeductions: number;
    netSalary: number;
  };
  totalPaid: number;
  remainingBalance: number;
}

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    align-items: stretch;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.75rem;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.375rem;
  }
`;

const PaginationButton = styled(SecondaryButton)`
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  min-width: 32px;
  justify-content: center;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.active {
    background: ${({ theme }) => theme.ACCENT};
    color: #fff;
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    padding: 0.375rem 0.5rem;
    min-width: 28px;
    font-size: 0.75rem;
  }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex-wrap: nowrap;
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

interface GroupedPaymentHistoryItem {
  key: string;
  paymentIds: number[];
  paymentGroupId?: string;
  paymentDate: string;
  amount: number;
  paymentMode: PayrollPayment['paymentMode'];
  referenceNo?: string;
  remarks?: string;
  status: PayrollPayment['status'];
  employeeName: string;
  periods: string[];
  paymentCount: number;
  latestCreatedAt?: string;
  netAmount: number;
  remainingAfter: number;
}

interface PayrollHistoryEditPaymentFormState {
  paymentDate: string;
  paymentMode: PayrollPayment['paymentMode'];
  referenceNo: string;
  remarks: string;
}

const PayrollHistoryList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency, roundUpAmounts } = usePayrollDisplaySettings();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [filters, setFilters] = useState<PayrollFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const [savingEditPaymentId, setSavingEditPaymentId] = useState<number | null>(null);
  const [editingPayment, setEditingPayment] = useState<GroupedPaymentHistoryItem | null>(null);
  const [editFormData, setEditFormData] = useState<PayrollHistoryEditPaymentFormState>({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'bank_transfer',
    referenceNo: '',
    remarks: '',
  });
  const [employeeBalanceMap, setEmployeeBalanceMap] = useState<Record<number, GenerationWithBalance[]>>({});

  useEffect(() => {
    if (user?.school_id) {
      loadHistory();
    }
  }, [user?.school_id, filters]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const loadHistory = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getPayrollPayments(user.school_id, filters);
      setPayments(data);
      const staffIds = Array.from(new Set(
        data
          .map(payment => payment.generation?.staffId)
          .filter((staffId): staffId is number => Boolean(staffId))
      ));
      const balances = await Promise.all(
        staffIds.map(async staffId => ({
          staffId,
          balances: await payrollService.getEmployeePayrollGenerationsWithBalance(user.school_id, staffId),
        }))
      );
      setEmployeeBalanceMap(
        balances.reduce<Record<number, GenerationWithBalance[]>>((acc, item) => {
          acc[item.staffId] = item.balances as GenerationWithBalance[];
          return acc;
        }, {})
      );
    } catch (error: any) {
      console.error('Error loading history:', error);
      showToast('Failed to load payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    const grouped = new Map<string, GroupedPaymentHistoryItem>();
    const paymentsByGroup = new Map<string, PayrollPayment[]>();

    payments.forEach(payment => {
      const key = payment.paymentGroupId || `single-${payment.id}`;
      const groupPayments = paymentsByGroup.get(key) || [];
      groupPayments.push(payment);
      paymentsByGroup.set(key, groupPayments);
      const periodLabels = (payment.items && payment.items.length > 0
        ? payment.items.map(item => item.generation || payments.find(p => p.generation?.id === item.generationId)?.generation).filter(Boolean)
        : [payment.generation]
      )
        .filter(Boolean)
        .sort((a: any, b: any) => {
          if (a.payrollYear !== b.payrollYear) {
            return a.payrollYear - b.payrollYear;
          }
          return a.payrollMonth - b.payrollMonth;
        })
        .map((generation: any) =>
          new Date(generation.payrollYear, generation.payrollMonth - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' })
        );
      const existing = grouped.get(key);

      if (existing) {
        existing.paymentIds.push(payment.id);
        existing.amount += payment.amount;
        existing.paymentCount += 1;
        periodLabels.forEach(periodLabel => {
          if (!existing.periods.includes(periodLabel)) {
            existing.periods.push(periodLabel);
          }
        });
        if (String(payment.paymentDate) > String(existing.paymentDate)) {
          existing.paymentDate = payment.paymentDate;
        }
        if (String(payment.createdAt || '') > String(existing.latestCreatedAt || '')) {
          existing.latestCreatedAt = payment.createdAt;
        }
      } else {
        grouped.set(key, {
          key,
          paymentIds: [payment.id],
          paymentGroupId: payment.paymentGroupId,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          paymentMode: payment.paymentMode,
          referenceNo: payment.referenceNo,
          remarks: payment.remarks,
          status: payment.status,
          employeeName: payment.generation?.staff?.name || 'N/A',
          periods: periodLabels.length > 0 ? periodLabels : ['-'],
          paymentCount: 1,
          latestCreatedAt: payment.createdAt,
          netAmount: 0,
          remainingAfter: 0,
        });
      }
    });

    return Array.from(grouped.values())
      .map(item => ({
        ...item,
        periods: [...item.periods].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
        ...(() => {
          const groupPayments = paymentsByGroup.get(item.key) || [];
          const latestGroupPayment = [...groupPayments].sort((a, b) => {
            const createdDiff = String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
            if (createdDiff !== 0) return createdDiff;
            const dateDiff = String(b.paymentDate).localeCompare(String(a.paymentDate));
            if (dateDiff !== 0) return dateDiff;
            return b.id - a.id;
          })[0];

          if (groupPayments.length === 1 && latestGroupPayment?.items && latestGroupPayment.items.length > 0) {
            return {
              netAmount: latestGroupPayment.netAmount ?? item.amount,
              remainingAfter: latestGroupPayment.remainingAfterPayment ?? 0,
            };
          }

          const staffId = groupPayments[0]?.generation?.staffId;
          const employeeBalances = staffId ? employeeBalanceMap[staffId] || [] : [];
          const latestGeneration = [...employeeBalances].sort((a, b) =>
            (b.generation.payrollYear * 100 + b.generation.payrollMonth) -
            (a.generation.payrollYear * 100 + a.generation.payrollMonth)
          )[0]?.generation;

          if (!latestGeneration) {
            return {
              netAmount: item.amount,
              remainingAfter: 0,
            };
          }

          const latestPeriod = latestGeneration.payrollYear * 100 + latestGeneration.payrollMonth;
          const oldBalance = employeeBalances
            .filter(balance => balance.generation.payrollYear * 100 + balance.generation.payrollMonth < latestPeriod)
            .reduce((sum, balance) => {
              const appliedInThisGroup = groupPayments
                .filter(payment => payment.generation?.id === balance.generation.id)
                .reduce((innerSum, payment) => innerSum + payment.amount, 0);
              return sum + balance.remainingBalance + appliedInThisGroup;
            }, 0);

          const priorPaymentsThisMonth = payments
            .filter(payment =>
              payment.status === 'completed' &&
              payment.generation?.id === latestGeneration.id &&
              !groupPayments.some(groupPayment => groupPayment.id === payment.id)
            )
            .reduce((sum, payment) => sum + payment.amount, 0);

          const netAmount = oldBalance
            + (latestGeneration.netSalary || 0)
            - priorPaymentsThisMonth;

          return {
            netAmount,
            remainingAfter: Math.max(0, netAmount - item.amount),
          };
        })(),
      }))
      .filter(payment => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.employeeName?.toLowerCase().includes(searchLower) ||
        payment.referenceNo?.toLowerCase().includes(searchLower) ||
        payment.periods.some(period => period.toLowerCase().includes(searchLower))
      );
      }).sort((a, b) => {
      const createdDiff = String(b.latestCreatedAt || '').localeCompare(String(a.latestCreatedAt || ''));
      if (createdDiff !== 0) return createdDiff;
      const dateDiff = String(b.paymentDate).localeCompare(String(a.paymentDate));
      if (dateDiff !== 0) return dateDiff;
      return (b.paymentIds[0] || 0) - (a.paymentIds[0] || 0);
      });
  }, [payments, searchTerm, employeeBalanceMap]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  const handleDeletePayment = async (paymentId: number, paymentGroupId?: string) => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingPaymentId(paymentId);
      if (paymentGroupId) {
        await payrollService.deletePaymentGroup(user.school_id, paymentGroupId, user.id);
      } else {
        await payrollService.deletePayment(user.school_id, paymentId, user.id);
      }
      showToast('Payment deleted successfully', 'success');
      await loadHistory();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleOpenEditPayment = (payment: GroupedPaymentHistoryItem) => {
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
      paymentMode: 'bank_transfer',
      referenceNo: '',
      remarks: '',
    });
  };

  const handleSaveEditedPayment = async () => {
    if (!user?.school_id || !editingPayment) return;

    try {
      setSavingEditPaymentId(editingPayment.paymentIds[0] || null);
      await Promise.all(
        editingPayment.paymentIds.map(paymentId =>
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
      await loadHistory();
    } catch (error: any) {
      console.error('Error updating payroll payment:', error);
      showToast(error.message || 'Failed to update payroll payment', 'error');
    } finally {
      setSavingEditPaymentId(null);
    }
  };

  const handleDownloadReceipt = async (paymentIds: number[]) => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

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

  if (loading) {
    return <Loader />;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <PayrollContainer>
      <ToolbarCard>
        <ToolbarRow>
          <ToolbarGroup>
            <PageHeading>
              <PageTitle>Payroll History</PageTitle>
              <PageSubtitle>Review payment activity with the same global clay panels, filters, and table treatment used across the app.</PageSubtitle>
            </PageHeading>
          </ToolbarGroup>
        </ToolbarRow>
      </ToolbarCard>

      <ToolbarCard>
        <Box display="flex" gap={1} alignItems="flex-end" flexWrap="wrap" justifyContent="space-between" sx={{ 
          '@media (max-width: 768px)': { 
            gap: 0.75,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'stretch',
          } 
        }}>
          <Box display="flex" gap={1} alignItems="flex-end" flexWrap="wrap" sx={{ 
            '@media (max-width: 768px)': { 
              width: '100%',
              flexDirection: 'column',
              alignItems: 'stretch',
            } 
          }}>
            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 110 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Month</InputLabel>
              <Select
                value={filters.payrollMonth || ''}
                onChange={(e) => setFilters({ ...filters, payrollMonth: e.target.value ? Number(e.target.value) : undefined })}
                label="Month"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                <MenuItem value="" sx={{ fontSize: '0.75rem' }}>All</MenuItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <MenuItem key={month} value={month} sx={{ fontSize: '0.75rem' }}>
                    {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'short' })}
                  </MenuItem>
                ))}
              </Select>
            </MuiFormControl>

            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 90 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Year</InputLabel>
              <Select
                value={filters.payrollYear || ''}
                onChange={(e) => setFilters({ ...filters, payrollYear: e.target.value ? Number(e.target.value) : undefined })}
                label="Year"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                <MenuItem value="" sx={{ fontSize: '0.75rem' }}>All</MenuItem>
                {years.map((year) => (
                  <MenuItem key={year} value={year} sx={{ fontSize: '0.75rem' }}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </MuiFormControl>
          </Box>

          <Box display="flex" gap={0.75} alignItems="flex-end" sx={{ 
            '@media (max-width: 768px)': { 
              width: '100%',
              flexDirection: 'column',
              alignItems: 'stretch',
            } 
          }}>
            <TextField
              size="small"
              placeholder="Search by employee, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: theme.TEXT_SECONDARY, fontSize: 16 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: { xs: '100%', sm: 200 },
                '& .MuiInputBase-root': {
                  height: '30px',
                  fontSize: '0.75rem',
                },
              }}
            />

            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                loadHistory();
                showToast('Data refreshed', 'success');
              }}
              disabled={loading}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              Refresh
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
              onClick={() => showToast('Export feature coming soon', 'success')}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              Export
            </Button>
          </Box>
        </Box>
      </ToolbarCard>

      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th>Employee / Transaction</th>
              <th>Payment Date</th>
              <th>Salary Months</th>
              <th>Reference / Mode</th>
              <th style={{ textAlign: 'right' }}>Net Payment</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Remaining</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayments.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyStateContainer>
                    <EmptyStateIcon><DownloadIcon /></EmptyStateIcon>
                    <EmptyStateTitle>{searchTerm ? 'No payments found matching your search' : 'No payment history available'}</EmptyStateTitle>
                    {!searchTerm && <EmptyStateText>Payments made to employees will appear here.</EmptyStateText>}
                  </EmptyStateContainer>
                </td>
              </tr>
            ) : (
              paginatedPayments.map((payment) => (
                <tr key={payment.key}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.83rem' }}>
                      {payment.employeeName || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '0.18rem' }}>
                      {payment.paymentGroupId
                        ? `Combined payment · ${payment.paymentCount} entries`
                        : 'Single payroll payment'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{formatPayrollDate(payment.paymentDate)}</div>
                    <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '0.18rem' }}>
                      {payment.latestCreatedAt ? new Date(payment.latestCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {payment.periods.length > 1
                        ? `${payment.periods[0]} to ${payment.periods[payment.periods.length - 1]}`
                        : payment.periods[0]}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '0.18rem' }}>
                      {payment.periods.length > 1
                        ? `${payment.periods.length} salary months covered`
                        : '1 salary month covered'}
                    </div>
                  </td>
                  <td>
                    <div style={{ color: theme.TEXT_SECONDARY, fontSize: '0.8rem' }}>
                      {payment.referenceNo || '-'}
                    </div>
                    <div style={{ marginTop: '0.32rem' }}>
                      <StatusBadge>
                        {payment.paymentMode.replace(/_/g, ' ')}
                      </StatusBadge>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: theme.ACCENT }}>
                      {formatCurrency(payment.netAmount)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '0.18rem' }}>
                      receipt basis
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#10b981' }}>
                      {formatCurrency(payment.amount)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '0.18rem' }}>
                      {payment.paymentCount > 1 ? `Grouped total` : `Single entry`}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: payment.remainingAfter > 0 ? '#ef4444' : '#10b981' }}>
                      {formatCurrency(payment.remainingAfter)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '0.18rem' }}>
                      after payment
                    </div>
                  </td>
                  <td>
                    <StatusBadge 
                      status={payment.status === 'completed' ? 'paid' : payment.status === 'pending' ? 'pending' : 'rejected'}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <ActionRow>
                      <IconButton
                        onClick={() => handleOpenEditPayment(payment)}
                        title="Edit Payment"
                        style={{
                          color: theme.ACCENT,
                          fontSize: '0.875rem',
                          padding: '0.25rem',
                          width: '28px',
                          height: '28px',
                        }}
                      >
                        <EditIcon style={{ fontSize: '1rem' }} />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDownloadReceipt(payment.paymentIds)}
                        title="Download Receipt"
                        style={{
                          color: theme.ACCENT,
                          fontSize: '0.875rem',
                          padding: '0.25rem',
                          width: '28px',
                          height: '28px',
                        }}
                      >
                        <PictureAsPdfIcon style={{ fontSize: '1rem' }} />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeletePayment(payment.paymentIds[0], payment.paymentGroupId)}
                        disabled={deletingPaymentId === payment.paymentIds[0]}
                        title="Delete Payment"
                        style={{ 
                          color: '#ef4444',
                          fontSize: '0.875rem',
                          padding: '0.25rem',
                          width: '28px',
                          height: '28px',
                        }}
                      >
                        {deletingPaymentId === payment.paymentIds[0] ? (
                          <div style={{ 
                            width: '14px', 
                            height: '14px', 
                            border: '2px solid #ef4444', 
                            borderTopColor: 'transparent', 
                            borderRadius: '50%', 
                            animation: 'spin 0.6s linear infinite' 
                          }} />
                        ) : (
                          <DeleteIcon style={{ fontSize: '1rem' }} />
                        )}
                      </IconButton>
                    </ActionRow>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </StyledTable>
      </TableWrapper>

      {/* Pagination */}
      {filteredPayments.length > 0 && (
        <PaginationContainer>
          <PaginationInfo>
            Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
          </PaginationInfo>
          <PaginationControls>
            <MuiFormControl size="small" sx={{ minWidth: 'auto', margin: 0 }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Items per page</InputLabel>
              <Select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                label="Items per page"
                sx={{ fontSize: '0.75rem', height: '30px', minWidth: 100 }}
              >
                <MenuItem value={10} sx={{ fontSize: '0.75rem' }}>10</MenuItem>
                <MenuItem value={25} sx={{ fontSize: '0.75rem' }}>25</MenuItem>
                <MenuItem value={50} sx={{ fontSize: '0.75rem' }}>50</MenuItem>
                <MenuItem value={100} sx={{ fontSize: '0.75rem' }}>100</MenuItem>
              </Select>
            </MuiFormControl>
            <PaginationButton
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              ««
            </PaginationButton>
            <PaginationButton
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              title="Previous page"
            >
              ‹
            </PaginationButton>
            <PaginationButton
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              ›
            </PaginationButton>
            <PaginationButton
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              »»
            </PaginationButton>
            <div style={{ fontSize: '0.8125rem', color: theme.TEXT_SECONDARY, padding: '0 0.5rem' }}>
              Page {currentPage} of {totalPages}
            </div>
          </PaginationControls>
        </PaginationContainer>
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
    </PayrollContainer>
  );
};

export default PayrollHistoryList;
