import React, { useState, useEffect, useContext } from 'react';
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

const FiltersCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
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

  const handleDelete = async (advanceId: number) => {
    if (!window.confirm('Are you sure you want to delete this advance?')) {
      return;
    }

    try {
      // TODO: Add delete method to service
      showToast('Delete functionality will be implemented', 'success');
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
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingAdvance(null);
            setCreateModalOpen(true);
          }}
          size="small"
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
            startAdornment: <SearchIcon style={{ fontSize: 18, marginRight: 8, color: theme.TEXT_SECONDARY }} />,
          }}
          style={{ flex: 1, minWidth: 200 }}
          variant="outlined"
        />
        <FormControl size="small" style={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            label="Status"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
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
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(advance.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
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

