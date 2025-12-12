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
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import CreatePayrollPlanModal from './CreatePayrollPlanModal';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 400px;
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  overflow: hidden;
`;

const StyledTable = styled(Table)`
  & .MuiTableCell-root {
    padding: 8px 12px;
    font-size: 0.875rem;
  }
  
  & .MuiTableCell-head {
    font-weight: 600;
    font-size: 0.8rem;
    background: ${({ theme }) => theme.BG};
  }
`;

const ActionCell = styled(TableCell)`
  width: 120px;
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
    return (
      <PageContainer>
        <Loader />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>Payroll Plans</Title>
        <Box display="flex" gap={1} alignItems="center" flex={1} maxWidth="400px">
          <SearchContainer>
            <TextField
              size="small"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon style={{ fontSize: 18, marginRight: 8, color: theme.TEXT_SECONDARY }} />,
              }}
              fullWidth
              variant="outlined"
            />
          </SearchContainer>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingPlan(null);
              setCreateModalOpen(true);
            }}
            size="small"
          >
            Create Plan
          </Button>
        </Box>
      </Header>

      <TableContainer>
        <StyledTable size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ width: '40px' }}></TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Plan Name</TableCell>
              <TableCell>Total Salary</TableCell>
              <TableCell>Effective From</TableCell>
              <TableCell>Status</TableCell>
              <ActionCell align="right">Actions</ActionCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" style={{ padding: '32px' }}>
                  {searchTerm ? 'No plans found matching your search' : 'No payroll plans created yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPlans.map((plan) => {
                const isExpanded = expandedPlans.has(plan.id);
                const totalSalary = calculateTotalSalary(plan);
                return (
                  <React.Fragment key={plan.id}>
                    <TableRow 
                      hover 
                      onClick={() => toggleExpand(plan.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(plan.id);
                          }}
                          style={{ padding: '4px' }}
                        >
                          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell style={{ fontWeight: 500 }}>
                        {plan.staff ? `${plan.staff.name} (${plan.staff.role})` : 'N/A'}
                      </TableCell>
                      <TableCell style={{ fontWeight: 500 }}>{plan.name}</TableCell>
                      <TableCell style={{ fontWeight: 600, color: theme.ACCENT }}>
                        Rs. {totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{new Date(plan.effectiveFrom).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={plan.status}
                          size="small"
                          color={plan.status === 'active' ? 'success' : 'default'}
                          style={{ fontSize: '0.75rem', height: '24px' }}
                        />
                      </TableCell>
                      <ActionCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Box display="flex" gap={0.5} justifyContent="flex-end">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPlan(plan);
                                setCreateModalOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(plan.id);
                              }}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ActionCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ padding: '8px 12px' }}>
                            <Box style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '0.75rem' }}>
                              <Box>
                                <span style={{ color: theme.TEXT_SECONDARY }}>Basic: </span>
                                <span style={{ fontWeight: 500 }}>Rs. {plan.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </Box>
                              {plan.description && (
                                <Box>
                                  <span style={{ color: theme.TEXT_SECONDARY }}>Desc: </span>
                                  <span>{plan.description}</span>
                                </Box>
                              )}
                            </Box>
                            {plan.items && plan.items.length > 0 ? (
                              <Table size="small" style={{ backgroundColor: theme.BG }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell style={{ fontSize: '0.7rem', padding: '4px 6px', fontWeight: 600 }}>Type</TableCell>
                                    <TableCell style={{ fontSize: '0.7rem', padding: '4px 6px', fontWeight: 600 }}>Name</TableCell>
                                    <TableCell style={{ fontSize: '0.7rem', padding: '4px 6px', fontWeight: 600 }} align="right">Amount</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {plan.items.map((item) => {
                                    const amountDisplay = item.amountType === 'percentage' 
                                      ? `${item.amount}%`
                                      : `Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                                    return (
                                      <TableRow key={item.id}>
                                        <TableCell style={{ fontSize: '0.7rem', padding: '4px 6px' }}>
                                          <Chip
                                            label={item.itemType === 'allowance' ? 'A' : 'D'}
                                            size="small"
                                            color={item.itemType === 'allowance' ? 'success' : 'error'}
                                            style={{ fontSize: '0.65rem', height: '18px', minWidth: '24px', padding: '0 4px' }}
                                          />
                                        </TableCell>
                                        <TableCell style={{ fontSize: '0.7rem', padding: '4px 6px' }}>{item.name}</TableCell>
                                        <TableCell style={{ fontSize: '0.7rem', padding: '4px 6px' }} align="right">
                                          {amountDisplay}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            ) : (
                              <Box style={{ fontSize: '0.7rem', color: theme.TEXT_SECONDARY, fontStyle: 'italic', padding: '4px 0' }}>
                                No items configured
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </StyledTable>
      </TableContainer>

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
    </PageContainer>
  );
};

export default PayrollPlansList;

