import React, { useState, useEffect, useContext, useMemo } from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PictureAsPdfIcon,
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

interface GroupedPaymentHistoryItem {
  key: string;
  paymentIds: number[];
  paymentGroupId?: string;
  paymentDate: string;
  amount: number;
  paymentMode: PayrollPayment['paymentMode'];
  referenceNo?: string;
  status: PayrollPayment['status'];
  employeeName: string;
  periods: string[];
  paymentCount: number;
  latestCreatedAt?: string;
  netAmount: number;
  remainingAfter: number;
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
            + (latestGeneration.grossSalary || latestGeneration.totalEarnings || 0)
            - (latestGeneration.totalDeductions || 0)
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
    </PayrollContainer>
  );
};

export default PayrollHistoryList;
