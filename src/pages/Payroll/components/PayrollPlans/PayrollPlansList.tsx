import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollPlan, PayrollPlanWithItems } from '../../../../types/payroll';
import { calculateGrossSalary, calculateDeductions } from '../../../../utils/payrollCalculations';
import {
  Box,
  TextField,
  Button,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import CreatePayrollPlanModal from './CreatePayrollPlanModal';
import {
  ContentCard,
  TableWrapper,
  StyledTable,
  IconButton,
  StatusBadge,
} from '../../styles';


const ActionCell = styled.td`
  width: 120px;
  text-align: right;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
  
  @media (max-width: 768px) {
    gap: 0.2rem;
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
    padding: 0.3rem 0.4rem;
    font-size: 0.6875rem;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    
    @media (max-width: 768px) {
      padding: 0.25rem 0.35rem;
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

const PayrollPlansList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PayrollPlanWithItems[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PayrollPlan | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadPlans();
    }
  }, [user?.school_id]);

  const loadPlans = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getPayrollPlans(user.school_id, true); // Include items
      setPlans(data as PayrollPlanWithItems[]);
    } catch (error: any) {
      console.error('Error loading plans:', error);
      showToast('Failed to load payroll plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (planId: number) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const calculateTotalSalary = (plan: PayrollPlanWithItems): number => {
    if (!plan.items || plan.items.length === 0) {
      return plan.basicPay;
    }
    const grossSalary = calculateGrossSalary(plan, plan.items);
    const deductions = calculateDeductions(plan, plan.items, grossSalary);
    return Math.round((grossSalary - deductions.reduce((sum, d) => sum + d.amount, 0)) * 100) / 100;
  };

  const handleDelete = async (planId: number) => {
    if (!window.confirm('Are you sure you want to delete this payroll plan?')) {
      return;
    }

    try {
      await payrollService.deletePayrollPlan(user.school_id, planId, user.id);
      showToast('Payroll plan deleted successfully', 'success');
      loadPlans();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      showToast(error.message || 'Failed to delete payroll plan', 'error');
    }
  };

  const handleDuplicate = async (plan: PayrollPlan) => {
    try {
      const planWithItems = await payrollService.getPayrollPlan(user.school_id, plan.id);
      if (!planWithItems) return;

      if (!planWithItems.staffId) {
        showToast('Cannot duplicate plan: Employee information missing', 'error');
        return;
      }

      const duplicateData = {
        staffId: planWithItems.staffId,
        name: `${plan.name} (Copy)`,
        description: plan.description,
        basicPay: plan.basicPay,
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: plan.effectiveTo,
        items: (planWithItems.items || []).map(item => ({
          itemType: item.itemType,
          name: item.name,
          amountType: item.amountType,
          amount: item.amount,
          isTaxable: item.isTaxable,
          calculationBasis: item.calculationBasis,
          displayOrder: item.displayOrder,
        })),
      };

      await payrollService.createPayrollPlan(user.school_id, duplicateData, user.id);
      showToast('Payroll plan duplicated successfully', 'success');
      loadPlans();
    } catch (error: any) {
      console.error('Error duplicating plan:', error);
      showToast(error.message || 'Failed to duplicate payroll plan', 'error');
    }
  };

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.staff?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.staff?.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
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
            <TextField
              size="small"
              placeholder="Search plans..."
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
              onClick={() => loadPlans()}
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
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                setEditingPlan(null);
                setCreateModalOpen(true);
              }}
              sx={{ 
                fontSize: '0.75rem',
                height: '30px',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                '@media (max-width: 768px)': { width: '100%' },
              }}
            >
              Create Plan
            </Button>
          </Box>
        </Box>
      </ContentCard>

      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ width: '32px', padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}></th>
              <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Employee</th>
              <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Plan Name</th>
              <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Total Salary</th>
              <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Effective From</th>
              <th style={{ padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Status</th>
              <th style={{ textAlign: 'right', width: '100px', padding: '0.5rem 0.625rem', fontSize: '0.6875rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8125rem' }}>
                  {searchTerm ? 'No plans found matching your search' : 'No payroll plans created yet'}
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => {
                const isExpanded = expandedPlans.has(plan.id);
                const totalSalary = calculateTotalSalary(plan);
                return (
                  <React.Fragment key={plan.id}>
                    <ExpandableRow 
                      $expanded={isExpanded}
                      onClick={() => toggleExpand(plan.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()} style={{ padding: '0.625rem 0.625rem' }}>
                        <ExpandIcon
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(plan.id);
                          }}
                          style={{ width: '20px', height: '20px' }}
                        >
                          {isExpanded ? <ExpandLessIcon style={{ fontSize: '1rem' }} /> : <ExpandMoreIcon style={{ fontSize: '1rem' }} />}
                        </ExpandIcon>
                      </td>
                      <td style={{ fontWeight: 500, padding: '0.625rem 0.625rem', fontSize: '0.8125rem' }}>
                        {plan.staff ? `${plan.staff.name} (${plan.staff.role})` : 'N/A'}
                      </td>
                      <td style={{ fontWeight: 500, padding: '0.625rem 0.625rem', fontSize: '0.8125rem' }}>{plan.name}</td>
                      <td style={{ fontWeight: 600, color: theme.ACCENT, padding: '0.625rem 0.625rem', fontSize: '0.8125rem' }}>
                        Rs. {totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.625rem 0.625rem', fontSize: '0.8125rem' }}>{new Date(plan.effectiveFrom).toLocaleDateString()}</td>
                      <td style={{ padding: '0.625rem 0.625rem' }}>
                        <StatusBadge status={plan.status} style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem' }} />
                      </td>
                      <ActionCell onClick={(e) => e.stopPropagation()} style={{ padding: '0.625rem 0.625rem' }}>
                        <ActionButtons>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlan(plan);
                              setCreateModalOpen(true);
                            }}
                            title="Edit"
                            style={{ width: '28px', height: '28px' }}
                          >
                            <EditIcon style={{ fontSize: '0.9rem' }} />
                          </IconButton>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(plan.id);
                            }}
                            title="Delete"
                            style={{ color: '#ef4444', width: '28px', height: '28px' }}
                          >
                            <DeleteIcon style={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        </ActionButtons>
                      </ActionCell>
                    </ExpandableRow>
                    <tr>
                      <ExpandedContent $expanded={isExpanded} colSpan={7}>
                        {isExpanded && (
                          <div style={{ padding: '0.375rem 0' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.375rem', fontSize: '0.6875rem', flexWrap: 'wrap' }}>
                              <div>
                                <span style={{ color: theme.TEXT_SECONDARY }}>Basic: </span>
                                <span style={{ fontWeight: 500 }}>Rs. {plan.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              {plan.description && (
                                <div>
                                  <span style={{ color: theme.TEXT_SECONDARY }}>Desc: </span>
                                  <span>{plan.description}</span>
                                </div>
                              )}
                            </div>
                            {plan.items && plan.items.length > 0 ? (
                              <ExpandedInnerTable>
                                <thead>
                                  <tr>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {plan.items.map((item) => {
                                    const amountDisplay = item.amountType === 'percentage' 
                                      ? `${item.amount}%`
                                      : `Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                                    return (
                                      <tr key={item.id}>
                                        <td>
                                          <StatusBadge 
                                            status={item.itemType === 'allowance' ? 'paid' : 'rejected'}
                                            bgColor={item.itemType === 'allowance' ? '#22c55e20' : '#ef444420'}
                                            color={item.itemType === 'allowance' ? '#22c55e' : '#ef4444'}
                                          >
                                            {item.itemType === 'allowance' ? 'A' : 'D'}
                                          </StatusBadge>
                                        </td>
                                        <td>{item.name}</td>
                                        <td style={{ textAlign: 'right' }}>{amountDisplay}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </ExpandedInnerTable>
                            ) : (
                              <div style={{ fontSize: '0.6875rem', color: theme.TEXT_SECONDARY, fontStyle: 'italic', padding: '0.2rem 0' }}>
                                No items configured
                              </div>
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

      {createModalOpen && (
        <CreatePayrollPlanModal
          open={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingPlan(null);
          }}
          onSuccess={() => {
            loadPlans();
            setCreateModalOpen(false);
            setEditingPlan(null);
          }}
          editingPlan={editingPlan}
        />
      )}
    </>
  );
};

export default PayrollPlansList;

