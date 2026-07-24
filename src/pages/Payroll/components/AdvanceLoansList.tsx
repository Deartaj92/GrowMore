import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  AccountBalanceWallet as WalletIcon,
  Add as AddIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material';
import {
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

const Card = styled.div<{ theme: any }>`
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const Title = styled.h2<{ theme: any }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AddButton = styled.button<{ theme: any }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const Table = styled.table<{ theme: any }>`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;

  th,
  td {
    padding: 0.85rem 1rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    font-size: 0.85rem;
  }

  th {
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-size: 0.72rem;
  }

  td {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.35rem;

  div {
    height: 100%;
    background: #10b981;
  }
`;

interface AdvanceItem {
  id: number;
  staffName: string;
  amount: number;
  monthlyInstallment: number;
  repaidAmount: number;
  remainingBalance: number;
  reason: string;
  status: string;
  createdAt: string;
}

const AdvanceLoansList: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();

  const [advances, setAdvances] = useState<AdvanceItem[]>([]);
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Issue modal
  const [openIssue, setOpenIssue] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.school_id]);

  const loadData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name', { ascending: true });

      if (staffData) setStaffList(staffData);

      const { data: advData } = await supabase
        .from('payroll_advances')
        .select('*, staff:staff_id (name)')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (advData) {
        setAdvances(
          advData.map(a => {
            const amt = parseFloat(a.amount || '0');
            const inst = parseFloat(a.repayment_amount_per_month || a.monthly_installment || '0') || amt;
            const rem = parseFloat(a.remaining_balance !== undefined && a.remaining_balance !== null ? a.remaining_balance : (amt - parseFloat(a.repaid_amount || '0')));
            const repaid = parseFloat(a.repaid_amount || '0') || (amt - rem);
            return {
              id: a.id,
              staffName: a.staff?.name || `Staff #${a.staff_id}`,
              amount: amt,
              monthlyInstallment: inst,
              repaidAmount: repaid,
              remainingBalance: Math.max(0, rem),
              reason: a.reason || 'Salary Advance',
              status: rem > 0 ? 'active' : 'completed',
              createdAt: a.created_at,
            };
          })
        );
      }
    } catch (err: any) {
      console.error('Error loading advances:', err);
      showToast('Error loading advances & loans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAdvance = async () => {
    if (!selectedStaffId || advanceAmount <= 0 || !user?.school_id) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const advanceDate = new Date().toISOString().split('T')[0];
      const inst = monthlyInstallment || advanceAmount;
      const { error } = await supabase.from('payroll_advances').insert({
        school_id: user.school_id,
        staff_id: selectedStaffId,
        advance_date: advanceDate,
        amount: advanceAmount,
        repayment_amount_per_month: inst,
        remaining_balance: advanceAmount,
        reason: reason || 'Advance Salary',
        status: 'active',
        created_by: user.id,
      });

      if (error) throw error;
      showToast('Advance loan issued successfully!', 'success');
      setOpenIssue(false);
      setSelectedStaffId('');
      setAdvanceAmount(0);
      setMonthlyInstallment(0);
      setReason('');
      await loadData();
    } catch (err: any) {
      console.error('Error issuing advance:', err);
      showToast('Failed to issue advance loan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card theme={theme}>
      <HeaderRow>
        <Title theme={theme}>
          <WalletIcon style={{ color: theme.ACCENT }} /> Staff Advances & Loans Ledger
        </Title>
        <AddButton theme={theme} onClick={() => setOpenIssue(true)}>
          <AddIcon style={{ fontSize: 16 }} /> Issue Advance Loan
        </AddButton>
      </HeaderRow>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <CircularProgress size={32} color="primary" />
        </div>
      ) : advances.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
          No active advances or loans recorded.
        </div>
      ) : (
        <Table theme={theme}>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Total Advance</th>
              <th>Monthly Recovery</th>
              <th>Repaid Amount</th>
              <th>Remaining Loan</th>
              <th>Recovery Progress</th>
            </tr>
          </thead>
          <tbody>
            {advances.map(item => {
              const pct = Math.min(100, Math.round((item.repaidAmount / (item.amount || 1)) * 100));
              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.staffName}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td style={{ color: theme.ACCENT, fontWeight: 700 }}>
                    {formatCurrency(item.monthlyInstallment)}/mo
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>
                    {formatCurrency(item.repaidAmount)}
                  </td>
                  <td style={{ color: item.remainingBalance > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {formatCurrency(item.remainingBalance)}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{pct}% Repaid</div>
                    <ProgressBar>
                      <div style={{ width: `${pct}%` }} />
                    </ProgressBar>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Issue Modal */}
      <Dialog open={openIssue} onClose={() => setOpenIssue(false)} maxWidth="xs" fullWidth>
        <DialogTitle style={{ fontWeight: 700, fontSize: '1rem' }}>Issue Advance Loan</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Select Staff</InputLabel>
              <Select
                value={selectedStaffId}
                label="Select Staff"
                onChange={e => setSelectedStaffId(Number(e.target.value))}
              >
                {staffList.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Total Advance Amount (Rs.)"
              type="number"
              fullWidth
              value={advanceAmount}
              onChange={e => setAdvanceAmount(Number(e.target.value))}
              size="small"
            />

            <TextField
              label="Monthly Recovery Deduction (Rs./month)"
              type="number"
              fullWidth
              value={monthlyInstallment}
              onChange={e => setMonthlyInstallment(Number(e.target.value))}
              size="small"
              helperText="Amount automatically deducted from monthly salary"
            />

            <TextField
              label="Reason / Notes"
              fullWidth
              value={reason}
              onChange={e => setReason(e.target.value)}
              size="small"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenIssue(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleIssueAdvance} variant="contained" color="primary" disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Issue Loan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AdvanceLoansList;
