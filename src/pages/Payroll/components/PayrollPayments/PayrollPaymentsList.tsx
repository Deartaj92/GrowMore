import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/useToast';
import { payrollService } from '../../../../services/payrollService';
import { PayrollPayment, PayrollFilters } from '../../../../types/payroll';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import Loader from '../../../../components/Loader';
import ProcessPaymentModal from './ProcessPaymentModal';

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

const PayrollPaymentsList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [filters, setFilters] = useState<PayrollFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadPayments();
    }
  }, [user?.school_id, filters]);

  const loadPayments = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);
      const data = await payrollService.getPayrollPayments(user.school_id, filters);
      setPayments(data);
    } catch (error: any) {
      console.error('Error loading payments:', error);
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.generation?.staff?.name?.toLowerCase().includes(searchLower) ||
      payment.referenceNo?.toLowerCase().includes(searchLower) ||
      payment.paymentMode.toLowerCase().includes(searchLower)
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
        <Title>Payroll Payments</Title>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PaymentIcon />}
          onClick={() => {
            setSelectedGeneration(null);
            setProcessModalOpen(true);
          }}
          size="small"
        >
          Process Payment
        </Button>
      </Header>

      <FiltersCard>
        <TextField
          size="small"
          placeholder="Search by employee, reference..."
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
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
      </FiltersCard>

      <TableContainer>
        <StyledTable size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Mode</TableCell>
              <TableCell>Reference No</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Month/Year</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" style={{ padding: '32px' }}>
                  {searchTerm ? 'No payments found matching your search' : 'No payments recorded yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell style={{ fontWeight: 500 }}>
                    {payment.generation?.staff?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>
                    Rs. {payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.paymentMode.replace('_', ' ')}
                      size="small"
                      style={{ fontSize: '0.75rem', height: '22px', textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell style={{ color: theme.TEXT_SECONDARY, fontSize: '0.8rem' }}>
                    {payment.referenceNo || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      size="small"
                      color={payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'error'}
                      style={{ fontSize: '0.75rem', height: '22px' }}
                    />
                  </TableCell>
                  <TableCell>
                    {payment.generation?.payrollMonth}/{payment.generation?.payrollYear}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </StyledTable>
      </TableContainer>

      {processModalOpen && (
        <ProcessPaymentModal
          open={processModalOpen}
          onClose={() => {
            setProcessModalOpen(false);
            setSelectedGeneration(null);
          }}
          onSuccess={() => {
            loadPayments();
            setProcessModalOpen(false);
            setSelectedGeneration(null);
          }}
          generationId={selectedGeneration}
        />
      )}
    </PageContainer>
  );
};

export default PayrollPaymentsList;

