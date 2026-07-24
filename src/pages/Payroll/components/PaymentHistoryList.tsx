import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { newPayrollService } from '../services/newPayrollService';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  AccountBalance as BankIcon,
  Payments as CashIcon,
} from '@mui/icons-material';
import {
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ControlsCard = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const SummaryStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const SummaryCard = styled.div<{ theme: any; $color?: string }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);

  label {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-weight: 700;
    display: block;
    margin-bottom: 0.25rem;
  }

  div {
    font-size: 1.4rem;
    font-weight: 800;
    color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
  }
`;

const TableCard = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
`;

const Table = styled.table<{ theme: any }>`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;

  th,
  td {
    padding: 0.85rem 0.85rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    font-size: 0.83rem;
  }

  th {
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.5px;
  }

  td {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  tbody tr:hover {
    background: ${({ theme }) =>
      theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  }
`;

const MethodBadge = styled.span<{ $method: string }>`
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  font-size: 0.73rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: ${({ $method }) =>
    $method === 'Bank Transfer' || $method === 'bank'
      ? 'rgba(59, 130, 246, 0.12)'
      : $method === 'Cheque' || $method === 'cheque'
      ? 'rgba(168, 85, 247, 0.12)'
      : 'rgba(16, 185, 129, 0.12)'};
  color: ${({ $method }) =>
    $method === 'Bank Transfer' || $method === 'bank'
      ? '#3b82f6'
      : $method === 'Cheque' || $method === 'cheque'
      ? '#a855f7'
      : '#10b981'};
`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface PaymentRecord {
  id: number;
  schoolId: number;
  generationId: number;
  staffId: number;
  staffName: string;
  role: string;
  payrollMonth: number;
  payrollYear: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  status: string;
}

const PaymentHistoryList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    loadHistory();
  }, [user?.school_id]);

  const loadHistory = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const data = await newPayrollService.getPaymentHistory(user.school_id);
      setPayments(data);
    } catch (err: any) {
      console.error('Error loading payment history:', err);
      showToast('Error loading disbursement history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter(p => {
    const matchesSearch =
      (p.staffName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod =
      methodFilter === 'ALL' ||
      p.paymentMethod.toLowerCase() === methodFilter.toLowerCase();

    return matchesSearch && matchesMethod;
  });

  const totalDisbursed = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Container>
      <ControlsCard theme={theme}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by Staff Name, Ref, Notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            size="small"
            style={{ width: '260px' }}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ color: theme.TEXT_SECONDARY, marginRight: 6 }} />,
            }}
          />

          <Select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            size="small"
            style={{ width: '160px' }}
          >
            <MenuItem value="ALL">All Payment Methods</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="Online">Online / Wallet</MenuItem>
          </Select>
        </div>

        <Button
          variant="outlined"
          size="small"
          onClick={loadHistory}
          style={{ textTransform: 'none', fontWeight: 600 }}
        >
          Refresh History
        </Button>
      </ControlsCard>

      <SummaryStrip>
        <SummaryCard theme={theme} $color="#10b981">
          <label>Total Disbursed (Filtered)</label>
          <div>{formatCurrency(totalDisbursed)}</div>
        </SummaryCard>

        <SummaryCard theme={theme}>
          <label>Total Payment Transactions</label>
          <div>{filtered.length} Record(s)</div>
        </SummaryCard>

        <SummaryCard theme={theme} $color={theme.ACCENT}>
          <label>Average Transaction Value</label>
          <div>{filtered.length > 0 ? formatCurrency(Math.round(totalDisbursed / filtered.length)) : 'Rs. 0'}</div>
        </SummaryCard>
      </SummaryStrip>

      <TableCard theme={theme}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <CircularProgress size={32} color="primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
            <HistoryIcon style={{ fontSize: 42, color: theme.BORDER, marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Payment History Found</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Disbursed salary payments will be recorded here chronologically.
            </div>
          </div>
        ) : (
          <Table theme={theme}>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Staff Member</th>
                <th>Payroll Period</th>
                <th>Payment Method</th>
                <th>Reference / Notes</th>
                <th>Amount Disbursed</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                    {new Date(p.paymentDate).toLocaleString()}
                  </td>

                  <td style={{ fontWeight: 600 }}>
                    <div>{p.staffName}</div>
                    <div style={{ fontSize: '0.74rem', color: theme.TEXT_SECONDARY }}>{p.role}</div>
                  </td>

                  <td style={{ fontWeight: 600 }}>
                    {p.payrollMonth > 0 ? `${MONTHS[p.payrollMonth - 1]} ${p.payrollYear}` : '-'}
                  </td>

                  <td>
                    <MethodBadge $method={p.paymentMethod}>
                      {p.paymentMethod.toLowerCase().includes('bank') ? <BankIcon fontSize="inherit" /> : <CashIcon fontSize="inherit" />}
                      {p.paymentMethod}
                    </MethodBadge>
                  </td>

                  <td style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                    {p.referenceNumber && <div><b>Ref:</b> {p.referenceNumber}</div>}
                    {p.notes && <div>{p.notes}</div>}
                    {!p.referenceNumber && !p.notes && '-'}
                  </td>

                  <td style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                    {formatCurrency(p.amount)}
                  </td>

                  <td>
                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                      COMPLETED
                    </span>
                  </td>

                  <td>
                    <IconButton size="small" onClick={() => setSelectedReceipt(p)} title="View Payment Voucher">
                      <ReceiptIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>

      {/* Printable Receipt Voucher Dialog */}
      {selectedReceipt && (
        <Dialog open={true} onClose={() => setSelectedReceipt(null)} maxWidth="xs" fullWidth>
          <DialogTitle style={{ fontWeight: 700, fontSize: '1rem' }}>
            Official Salary Payment Voucher
          </DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.88rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY, textTransform: 'uppercase', fontWeight: 700 }}>
                  Amount Paid
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                  {formatCurrency(selectedReceipt.amount)}
                </div>
              </div>

              <div><b>Voucher ID:</b> #{selectedReceipt.id}</div>
              <div><b>Staff Member:</b> {selectedReceipt.staffName} ({selectedReceipt.role})</div>
              <div><b>Period:</b> {selectedReceipt.payrollMonth > 0 ? `${MONTHS[selectedReceipt.payrollMonth - 1]} ${selectedReceipt.payrollYear}` : '-'}</div>
              <div><b>Date & Time:</b> {new Date(selectedReceipt.paymentDate).toLocaleString()}</div>
              <div><b>Payment Method:</b> {selectedReceipt.paymentMethod}</div>
              {selectedReceipt.referenceNumber && <div><b>Reference / Cheque:</b> {selectedReceipt.referenceNumber}</div>}
              {selectedReceipt.notes && <div><b>Notes:</b> {selectedReceipt.notes}</div>}
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => window.print()} color="primary" variant="outlined" size="small">
              Print Voucher
            </Button>
            <Button onClick={() => setSelectedReceipt(null)} color="primary" variant="contained" size="small">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default PaymentHistoryList;
