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
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import {
  PayrollContainer,
  ContentCard,
  TableWrapper,
  StyledTable,
  StatusBadge,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
  IconButton,
} from '../../styles';

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

const PaginationButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 32px;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  }
  
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

const PayrollHistoryList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [filters, setFilters] = useState<PayrollFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

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
    } catch (error: any) {
      console.error('Error loading history:', error);
      showToast('Failed to load payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.generation?.staff?.name?.toLowerCase().includes(searchLower) ||
        payment.referenceNo?.toLowerCase().includes(searchLower)
      );
    });
  }, [payments, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  const handleDeletePayment = async (paymentId: number) => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingPaymentId(paymentId);
      await payrollService.deletePayment(user.school_id, paymentId, user.id);
      showToast('Payment deleted successfully', 'success');
      await loadHistory();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <PayrollContainer>
      {/* Header matching Generate Payroll tab style */}
      <ContentCard style={{ padding: '0.75rem 1rem', marginBottom: '0.375rem' }}>
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
      </ContentCard>

      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Payment Date</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Payment Mode</th>
              <th>Reference</th>
              <th>Month/Year</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayments.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyStateContainer>
                    <EmptyStateIcon><DownloadIcon /></EmptyStateIcon>
                    <EmptyStateTitle>{searchTerm ? 'No payments found matching your search' : 'No payment history available'}</EmptyStateTitle>
                    {!searchTerm && <EmptyStateText>Payments made to employees will appear here.</EmptyStateText>}
                  </EmptyStateContainer>
                </td>
              </tr>
            ) : (
              paginatedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td style={{ fontWeight: 500 }}>
                    {payment.generation?.staff?.name || 'N/A'}
                  </td>
                  <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    Rs. {payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <StatusBadge>
                      {payment.paymentMode.replace('_', ' ')}
                    </StatusBadge>
                  </td>
                  <td style={{ color: theme.TEXT_SECONDARY, fontSize: '0.8rem' }}>
                    {payment.referenceNo || '-'}
                  </td>
                  <td>
                    {payment.generation?.payrollMonth}/{payment.generation?.payrollYear}
                  </td>
                  <td>
                    <StatusBadge 
                      status={payment.status === 'completed' ? 'paid' : payment.status === 'pending' ? 'pending' : 'rejected'}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <IconButton
                      onClick={() => handleDeletePayment(payment.id)}
                      disabled={deletingPaymentId === payment.id}
                      title="Delete Payment"
                      style={{ 
                        color: '#ef4444',
                        fontSize: '0.875rem',
                        padding: '0.25rem',
                        width: '28px',
                        height: '28px',
                      }}
                    >
                      {deletingPaymentId === payment.id ? (
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

