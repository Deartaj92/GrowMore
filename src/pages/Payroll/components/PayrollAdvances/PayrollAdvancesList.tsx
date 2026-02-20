import React, { useState, useEffect, useContext, useCallback } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollAdvance, CreatePayrollAdvanceInput } from '../../../../types/payroll';
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import CreateAdvanceModal from './CreateAdvanceModal';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  
  @media (max-width: 768px) {
    margin-bottom: 8px;
    gap: 6px;
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const FiltersCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
  
  @media (max-width: 768px) {
    padding: 8px 10px;
    margin-bottom: 8px;
    gap: 8px;
    border-radius: 4px;
    flex-direction: column;
    align-items: stretch;
  }
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  overflow: hidden;
  
  @media (max-width: 768px) {
    border-radius: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

const StyledTable = styled(Table)`
  & .MuiTableCell-root {
    padding: 6px 10px;
    font-size: 0.8125rem;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    
    @media (max-width: 768px) {
      padding: 4px 6px;
      font-size: 0.75rem;
      white-space: nowrap;
    }
  }
  
  & .MuiTableCell-head {
    font-weight: 600;
    font-size: 0.75rem;
    background: ${({ theme }) => theme.BG};
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 8px 10px;
    
    @media (max-width: 768px) {
      padding: 6px 8px;
      font-size: 0.6875rem;
    }
  }
  
  & .MuiTableRow-root {
    &:hover {
      background: ${({ theme }) => theme.BG};
    }
  }
  
  @media (max-width: 768px) {
    min-width: 700px;
  }
`;

const PayrollAdvancesList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState<PayrollAdvance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<PayrollAdvance | null>(null);
  const [checkingDeletable, setCheckingDeletable] = useState<Set<number>>(new Set());
  const [deletableStatus, setDeletableStatus] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    if (user?.school_id) {
      loadAdvances();
    }
  }, [user?.school_id, statusFilter]);

  const loadAdvances = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getAdvances(
        user.school_id,
        undefined,
        statusFilter === 'active'
      );
      setAdvances(data);
    } catch (error: any) {
      console.error('Error loading advances:', error);
      showToast('Failed to load advances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkIfDeletable = useCallback(async (advanceId: number) => {
    if (!user?.school_id) return;
    
    setCheckingDeletable(prev => {
      if (prev.has(advanceId)) return prev;
      return new Set(prev).add(advanceId);
    });
    
    try {
      const isUsed = await payrollService.isAdvanceUsedInPayroll(user.school_id, advanceId);
      setDeletableStatus(prev => new Map(prev).set(advanceId, !isUsed));
    } catch (error) {
      console.error('Error checking if advance is deletable:', error);
    } finally {
      setCheckingDeletable(prev => {
        const newSet = new Set(prev);
        newSet.delete(advanceId);
        return newSet;
      });
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (user?.school_id && advances.length > 0) {
      advances.forEach(advance => {
        checkIfDeletable(advance.id);
      });
    }
  }, [advances, user?.school_id, checkIfDeletable]);

  const handleDelete = async (advanceId: number) => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    const isDeletable = deletableStatus.get(advanceId);
    if (isDeletable === false) {
      showToast('Cannot delete advance. It has been used (partially or fully) in a payroll generation.', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this advance?')) {
      return;
    }

    try {
      await payrollService.deleteAdvance(user.school_id, advanceId, user.id);
      showToast('Advance deleted successfully', 'success');
      loadAdvances();
    } catch (error: any) {
      console.error('Error deleting advance:', error);
      showToast(error.message || 'Failed to delete advance', 'error');
    }
  };

  const filteredAdvances = advances.filter(advance => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      advance.staff?.name?.toLowerCase().includes(searchLower) ||
      advance.reason?.toLowerCase().includes(searchLower)
    );
  });

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
        <Title>Payroll Advances</Title>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon style={{ fontSize: 16 }} />}
          onClick={() => {
            setEditingAdvance(null);
            setCreateModalOpen(true);
          }}
          sx={{ 
            fontSize: '0.8125rem',
            height: '32px',
            padding: '4px 12px',
          }}
        >
          Create Advance
        </Button>
      </Header>

      <FiltersCard>
          <TextField
            size="small"
            placeholder="Search by employee, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: { xs: 16, sm: 18 }, marginRight: { xs: 6, sm: 8 }, color: theme.TEXT_SECONDARY }} />,
            }}
            sx={{ 
              flex: 1, 
              minWidth: { xs: '100%', sm: 200 },
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                height: { xs: '36px', sm: '32px' },
              },
            }}
            variant="outlined"
          />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            label="Status"
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              height: { xs: '36px', sm: '32px' },
            }}
          >
            <MenuItem value="all" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>All</MenuItem>
            <MenuItem value="active" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Active</MenuItem>
            <MenuItem value="completed" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>Completed</MenuItem>
          </Select>
        </FormControl>
      </FiltersCard>

      <TableContainer>
        <StyledTable size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Advance Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Repayment/Month</TableCell>
              <TableCell>Remaining Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell width={100} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdvances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" style={{ padding: '32px' }}>
                  {searchTerm ? 'No advances found matching your search' : 'No advances recorded yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAdvances.map((advance) => (
                <TableRow key={advance.id} hover>
                  <TableCell style={{ fontWeight: 500 }}>
                    {advance.staff?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{new Date(advance.advanceDate).toLocaleDateString()}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>
                    Rs. {advance.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    Rs. {advance.repaymentAmountPerMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell style={{ fontWeight: 600 }}>
                    Rs. {advance.remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={advance.status}
                      size="small"
                      color={advance.status === 'active' ? 'warning' : 'success'}
                      style={{ fontSize: '0.75rem', height: '22px' }}
                    />
                  </TableCell>
                  <TableCell style={{ color: theme.TEXT_SECONDARY, fontSize: '0.8rem' }}>
                    {advance.reason || '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" gap={0.5} justifyContent="flex-end">
                      <Tooltip 
                        title={
                          deletableStatus.get(advance.id) === false
                            ? 'Cannot delete: Advance has been used in a payroll generation'
                            : checkingDeletable.has(advance.id)
                            ? 'Checking...'
                            : 'Delete'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(advance.id)}
                            color="error"
                            disabled={deletableStatus.get(advance.id) === false || checkingDeletable.has(advance.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </StyledTable>
      </TableContainer>

      {createModalOpen && (
        <CreateAdvanceModal
          open={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingAdvance(null);
          }}
          onSuccess={() => {
            loadAdvances();
            setCreateModalOpen(false);
            setEditingAdvance(null);
          }}
          editingAdvance={editingAdvance}
        />
      )}
    </PageContainer>
  );
};

export default PayrollAdvancesList;

