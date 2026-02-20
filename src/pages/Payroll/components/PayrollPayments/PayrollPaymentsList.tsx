import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollPayment, PayrollGeneration } from '../../../../types/payroll';
import {
  Box,
  Select,
  MenuItem,
  FormControl as MuiFormControl,
  InputLabel,
  Button,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import ProcessPaymentModal from './ProcessPaymentModal';
import {
  ContentCard,
  StatsGrid,
  StatCard,
  StatCardHeader,
  StatCardTitle,
  StatCardValue,
  StatCardSubtext,
  TableWrapper,
  StyledTable,
  PrimaryButton,
  IconButton,
  StatusBadge,
} from '../../styles';


const SummaryCard = styled(ContentCard)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.375rem;
  }
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SummaryLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.625rem;
  }
`;

const SummaryValue = styled.div<{ color?: string }>`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.TEXT_PRIMARY};
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ExpandableRow = styled.tr<{ $expanded: boolean }>`
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f3f4f8'};
  }
`;

const ExpandedContent = styled.td<{ $expanded: boolean }>`
  padding: ${({ $expanded }) => $expanded ? '0.75rem 1rem' : '0'} !important;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fafafa'};
  border-top: ${({ $expanded }) => $expanded ? '1px solid' : 'none'};
  border-color: ${({ theme }) => theme.BORDER};
  max-height: ${({ $expanded }) => $expanded ? '5000px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
`;

const ExpandedInnerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#fff'};
  border-radius: 6px;
  
  th, td {
    padding: 0.375rem 0.5rem;
    font-size: 0.7rem;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    
    @media (max-width: 768px) {
      padding: 0.3rem 0.4rem;
      font-size: 0.65rem;
    }
  }
  
  th {
    font-weight: 600;
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb'};
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const ExpandIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  transition: color 0.2s;
  
  &:hover {
    color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
    
    svg {
      font-size: 1rem;
    }
  }
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
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
  
  p {
    font-size: 0.875rem;
    margin: 0;
  }
  
  @media (max-width: 768px) {
    padding: 2rem 1rem;
    
    svg {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }
    
    h3 {
      font-size: 1rem;
    }
    
    p {
      font-size: 0.8rem;
    }
  }
`;

interface GenerationWithBalance {
  generation: PayrollGeneration;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  payments: PayrollPayment[];
}

const PayrollPaymentsList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  const [generationsWithBalance, setGenerationsWithBalance] = useState<GenerationWithBalance[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadStaffList();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (user?.school_id && selectedStaffId) {
      console.log('[PayrollPaymentsList] Loading generations for staffId:', selectedStaffId);
      loadEmployeeGenerations();
    } else {
      setGenerationsWithBalance([]);
    }
  }, [user?.school_id, selectedStaffId]);

  const loadStaffList = async () => {
    if (!user?.school_id) return;

    try {
      setLoadingStaff(true);
      const data = await payrollService.getAllStaffWithPayrollPlans(user.school_id);
      setStaffList(data);
    } catch (error: any) {
      console.error('Error loading staff list:', error);
      showToast('Failed to load employees', 'error');
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadEmployeeGenerations = async () => {
    if (!user?.school_id || !selectedStaffId) return;

    try {
      setLoading(true);
      const data = await payrollService.getEmployeePayrollGenerationsWithBalance(
        user.school_id,
        selectedStaffId as number
      );
      console.log('Loaded generations with balance:', data);
      setGenerationsWithBalance(data);
    } catch (error: any) {
      console.error('Error loading employee generations:', error);
      showToast(error.message || 'Failed to load payroll data', 'error');
      setGenerationsWithBalance([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (generationId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(generationId)) {
      newExpanded.delete(generationId);
    } else {
      newExpanded.add(generationId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPaymentStatusColor = (status: 'unpaid' | 'partial' | 'paid') => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'unpaid': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusLabel = (status: 'unpaid' | 'partial' | 'paid') => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'unpaid': return 'Unpaid';
      default: return 'Unknown';
    }
  };

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
      await loadEmployeeGenerations();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);
  const totalPending = generationsWithBalance
    .filter(g => g.paymentStatus !== 'paid')
    .reduce((sum, g) => sum + g.remainingBalance, 0);
  const totalPaid = generationsWithBalance.reduce((sum, g) => sum + g.totalPaid, 0);
  const unpaidCount = generationsWithBalance.filter(g => g.paymentStatus === 'unpaid').length;
  const partialCount = generationsWithBalance.filter(g => g.paymentStatus === 'partial').length;

  if (loadingStaff) {
    return <Loader />;
  }

  return (
    <>
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
            <MuiFormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Select Employee</InputLabel>
              <Select
                value={selectedStaffId || ''}
                onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : '')}
                label="Select Employee"
                sx={{ fontSize: '0.75rem', height: '30px' }}
              >
                <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Select an employee...</MenuItem>
                {staffList.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id} sx={{ fontSize: '0.75rem' }}>
                    {staff.name} ({staff.role})
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
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                loadStaffList();
                if (selectedStaffId) {
                  loadEmployeeGenerations();
                }
              }}
              disabled={loadingStaff}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </ContentCard>

      {selectedStaffId && selectedStaff && (
        <>
          <SummaryCard>
            <SummaryItem>
              <SummaryLabel>Employee</SummaryLabel>
              <SummaryValue>{selectedStaff.name}</SummaryValue>
              <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                {selectedStaff.role}
              </div>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Total Paid</SummaryLabel>
              <SummaryValue color="#10b981">{formatCurrency(totalPaid)}</SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Pending Amount</SummaryLabel>
              <SummaryValue color="#ef4444">{formatCurrency(totalPending)}</SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Unpaid Payrolls</SummaryLabel>
              <SummaryValue>{unpaidCount}</SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>Partial Payments</SummaryLabel>
              <SummaryValue>{partialCount}</SummaryValue>
            </SummaryItem>
          </SummaryCard>

          {loading ? (
            <Loader />
          ) : (
            <TableWrapper>
              <StyledTable>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Period</th>
                    <th style={{ textAlign: 'right' }}>Net Salary</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generationsWithBalance.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ color: theme.TEXT_SECONDARY, marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                          No approved payroll generations found for this employee
                        </div>
                        <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY }}>
                          Generate and approve payrolls in the "Generate Payroll" tab to make payments.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    generationsWithBalance.map((item) => {
                      const isExpanded = expandedRows.has(item.generation.id);
                      const monthName = new Date(2000, item.generation.payrollMonth - 1, 1).toLocaleString('default', { month: 'short' });
                      
                      return (
                        <React.Fragment key={item.generation.id}>
                          <ExpandableRow 
                            $expanded={isExpanded}
                            onClick={() => toggleExpand(item.generation.id)}
                          >
                            <td onClick={(e) => e.stopPropagation()}>
                              <ExpandIcon
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(item.generation.id);
                                }}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </ExpandIcon>
                            </td>
                            <td>
                              <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                                  {monthName} {item.generation.payrollYear}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY }}>
                                  {item.generation.staff?.role || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 600, color: theme.ACCENT }}>
                              {formatCurrency(item.generation.netSalary)}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#10b981' }}>
                              {formatCurrency(item.totalPaid)}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 600, color: item.remainingBalance > 0 ? '#ef4444' : '#10b981' }}>
                              {formatCurrency(item.remainingBalance)}
                            </td>
                            <td>
                              <StatusBadge status={item.paymentStatus} />
                            </td>
                            <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              {item.remainingBalance > 0 && (
                                <PrimaryButton
                                  onClick={() => {
                                    setSelectedGeneration(item.generation.id);
                                    setProcessModalOpen(true);
                                  }}
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', height: '28px' }}
                                >
                                  <PaymentIcon style={{ fontSize: '0.875rem' }} />
                                  Pay
                                </PrimaryButton>
                              )}
                            </td>
                          </ExpandableRow>
                          <tr>
                            <ExpandedContent $expanded={isExpanded} colSpan={7}>
                              {isExpanded && (
                                <div style={{ padding: '0.75rem 0' }}>
                                  <div style={{ 
                                    marginBottom: '0.5rem', 
                                    fontWeight: 600, 
                                    fontSize: '0.8125rem',
                                    '@media (max-width: 768px)': { marginBottom: '0.375rem' },
                                  } as any}>
                                    Payment History
                                  </div>
                                  {item.payments.length === 0 ? (
                                    <div style={{ 
                                      padding: '0.75rem', 
                                      textAlign: 'center', 
                                      fontSize: '0.75rem',
                                      color: theme.TEXT_SECONDARY,
                                    }}>
                                      No payments recorded yet
                                    </div>
                                  ) : (
                                    <ExpandedInnerTable>
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th style={{ textAlign: 'right' }}>Amount</th>
                                          <th>Mode</th>
                                          <th>Reference</th>
                                          <th>Status</th>
                                          <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.payments.map((payment) => (
                                          <tr key={payment.id}>
                                            <td>
                                              {new Date(payment.paymentDate).toLocaleDateString()}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                              {formatCurrency(payment.amount)}
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
                                              <StatusBadge status={payment.status === 'completed' ? 'paid' : 'pending'} />
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                              <IconButton
                                                onClick={() => handleDeletePayment(payment.id)}
                                                disabled={deletingPaymentId === payment.id}
                                                title="Delete Payment"
                                                style={{ color: '#ef4444' }}
                                              >
                                                {deletingPaymentId === payment.id ? (
                                                  <div style={{ width: '16px', height: '16px', border: '2px solid #ef4444', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                                ) : (
                                                  <DeleteIcon style={{ fontSize: '0.875rem' }} />
                                                )}
                                              </IconButton>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </ExpandedInnerTable>
                                  )}
                                </div>
                              )}
                            </ExpandedContent>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </StyledTable>
            </TableWrapper>
          )}
        </>
      )}

      {!selectedStaffId && (
        <EmptyState>
          <PaymentIcon />
          <h3>Select an Employee</h3>
          <p>Choose an employee from the dropdown above to view their payroll payments and make payments</p>
        </EmptyState>
      )}

      {processModalOpen && selectedGeneration && (
        <ProcessPaymentModal
          open={processModalOpen}
          onClose={() => {
            setProcessModalOpen(false);
            setSelectedGeneration(null);
          }}
          onSuccess={() => {
            loadEmployeeGenerations();
            setProcessModalOpen(false);
            setSelectedGeneration(null);
          }}
          generationId={selectedGeneration}
        />
      )}
    </>
  );
};

export default PayrollPaymentsList;
