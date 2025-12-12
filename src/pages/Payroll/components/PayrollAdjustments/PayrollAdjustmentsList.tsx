import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollAdjustment, CreatePayrollAdjustmentInput } from '../../../../types/payroll';
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
  Delete as DeleteIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import CreateAdjustmentModal from './CreateAdjustmentModal';

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

const PayrollAdjustmentsList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (user?.school_id) {
      loadAdjustments();
    }
  }, [user?.school_id]);

  const loadAdjustments = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getAdjustments(user.school_id, {});
      setAdjustments(data);
    } catch (error: any) {
      console.error('Error loading adjustments:', error);
      showToast('Failed to load adjustments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdjustments = adjustments.filter(adjustment => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!(
        adjustment.staff?.name?.toLowerCase().includes(searchLower) ||
        adjustment.reason?.toLowerCase().includes(searchLower)
      )) {
        return false;
      }
    }
    if (typeFilter !== 'all' && adjustment.adjustmentType !== typeFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <PageContainer>
        <Loader />
      </PageContainer>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bonus': return 'success';
      case 'fine': return 'error';
      case 'extra_cut': return 'warning';
      default: return 'default';
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>Payroll Adjustments</Title>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          size="small"
        >
          Create Adjustment
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
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            label="Type"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="bonus">Bonus</MenuItem>
            <MenuItem value="fine">Fine</MenuItem>
            <MenuItem value="extra_cut">Extra Cut</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>
      </FiltersCard>

      <TableContainer>
        <StyledTable size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Month/Year</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdjustments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" style={{ padding: '32px' }}>
                  {searchTerm ? 'No adjustments found matching your search' : 'No adjustments recorded yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAdjustments.map((adjustment) => (
                <TableRow key={adjustment.id} hover>
                  <TableCell style={{ fontWeight: 500 }}>
                    {adjustment.staff?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={adjustment.adjustmentType.replace('_', ' ')}
                      size="small"
                      color={getTypeColor(adjustment.adjustmentType) as any}
                      style={{ fontSize: '0.75rem', height: '22px', textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell style={{ fontWeight: 600 }}>
                    {adjustment.adjustmentType === 'bonus' ? '+' : '-'}
                    Rs. {adjustment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {adjustment.payrollMonth}/{adjustment.payrollYear}
                  </TableCell>
                  <TableCell style={{ color: theme.TEXT_SECONDARY, fontSize: '0.8rem' }}>
                    {adjustment.reason}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={adjustment.isApplied ? 'Applied' : 'Pending'}
                      size="small"
                      color={adjustment.isApplied ? 'success' : 'warning'}
                      style={{ fontSize: '0.75rem', height: '22px' }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </StyledTable>
      </TableContainer>

      {createModalOpen && (
        <CreateAdjustmentModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            loadAdjustments();
            setCreateModalOpen(false);
          }}
        />
      )}
    </PageContainer>
  );
};

export default PayrollAdjustmentsList;

