import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../components/Layout/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { newPayrollService, NewPayrollGeneration } from '../services/newPayrollService';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import { usePageFooter } from '../../../components/Layout/contexts/PageFooterContext';
import SalaryStatementDialog from './SalaryStatementDialog';
import {
  Payment as PaymentIcon,
  CalendarMonth as CalendarIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  AccountBalanceWallet as WalletIcon,
  Lock as LockIcon,
  History as HistoryIcon,
  CheckCircle as CheckIcon,
  Tune as AdjustmentsIcon,
} from '@mui/icons-material';
import {
  CircularProgress,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';

import { clayCardStyle } from '../../../styles/DesignSystem';

/* ── Styled Components ── */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Card = styled.div<{ theme: any }>`
  ${clayCardStyle}
  padding: 0.85rem;
`;

const SectionTitle = styled.div<{ theme: any }>`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2<{ theme: any }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
`;

const ControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const SelectGroup = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0,0,0,0.03)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ $status }) =>
    $status === 'paid'
      ? 'rgba(16,185,129,0.12)'
      : $status === 'partially_paid'
      ? 'rgba(245,158,11,0.12)'
      : 'rgba(239,68,68,0.12)'};
  color: ${({ $status }) =>
    $status === 'paid'
      ? '#10b981'
      : $status === 'partially_paid'
      ? '#f59e0b'
      : '#ef4444'};
  border: 1px solid
    ${({ $status }) =>
      $status === 'paid'
        ? 'rgba(16,185,129,0.25)'
        : $status === 'partially_paid'
        ? 'rgba(245,158,11,0.25)'
        : 'rgba(239,68,68,0.25)'};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
`;

const StatBox = styled.div<{ theme: any; $accent?: string }>`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border: 1px solid ${({ theme }) => theme.BORDER};

  label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }

  span {
    font-size: 0.92rem;
    font-weight: 700;
    color: ${({ $accent, theme }) => $accent || theme.TEXT_PRIMARY};
  }
`;

const PaymentTable = styled.table<{ theme: any }>`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.55rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    font-size: 0.82rem;
  }

  th {
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    font-size: 0.68rem;
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayrollPaymentLedger: React.FC = () => {
  const { theme: themeMode } = useTheme();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();
  const { setFooterContent } = usePageFooter();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [generations, setGenerations] = useState<NewPayrollGeneration[]>([]);
  const [loading, setLoading] = useState(true);

  // Staff selection
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');

  // Payment fields
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash'>('bank_transfer');
  const [refNo, setRefNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Payslip Modal
  const [selectedSlipGen, setSelectedSlipGen] = useState<NewPayrollGeneration | null>(null);

  // Payment history for selected staff
  const [staffPayments, setStaffPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Monthly adjustments for selected staff
  const [staffAdjustments, setStaffAdjustments] = useState<any[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);

  useEffect(() => {
    loadGenerations();
  }, [user?.school_id, selectedMonth, selectedYear]);

  const loadGenerations = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    setSelectedStaffId('');
    setStaffPayments([]);
    try {
      const data = await newPayrollService.getSavedGenerationsForDisbursement(user.school_id, selectedMonth, selectedYear);
      setGenerations(data);
    } catch (err: any) {
      console.error('Failed to load generations:', err);
      showToast('Error loading payment ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedGen = selectedStaffId !== '' ? generations.find(g => g.staffId === selectedStaffId) || null : null;

  // When staff changes, pre-fill amount and fetch payment history & adjustments
  useEffect(() => {
    if (selectedGen) {
      setPayAmount(selectedGen.remainingBalance);
      setPayMode('bank_transfer');
      setRefNo('');
      setRemarks('');
      fetchStaffPayments(selectedGen.id);
      fetchStaffAdjustments(selectedGen.staffId);
    } else {
      setStaffPayments([]);
      setStaffAdjustments([]);
    }
  }, [selectedStaffId, selectedMonth, selectedYear]);

  const fetchStaffPayments = async (generationId: number) => {
    if (!user?.school_id) return;
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('payroll_payments')
        .select('*')
        .eq('generation_id', generationId)
        .eq('school_id', user.school_id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      setStaffPayments(data || []);
    } catch (err) {
      console.error('Error fetching staff payments:', err);
      setStaffPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchStaffAdjustments = async (staffId: number) => {
    if (!user?.school_id) return;
    setLoadingAdjustments(true);
    try {
      const allAdj = await newPayrollService.getMonthlyAdjustments(user.school_id, selectedMonth, selectedYear);
      const filtered = allAdj.filter(a => a.staffId === staffId);
      setStaffAdjustments(filtered);
    } catch (err) {
      console.error('Error fetching staff adjustments:', err);
      setStaffAdjustments([]);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedGen || payAmount <= 0 || !user?.school_id) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }
    if (payAmount > selectedGen.remainingBalance) {
      showToast('Payment amount exceeds remaining balance', 'error');
      return;
    }
    setSubmittingPay(true);
    try {
      await newPayrollService.recordPayment(
        user.school_id,
        selectedGen.id,
        selectedGen.staffId,
        payAmount,
        payMode,
        refNo,
        remarks,
        user.id
      );
      showToast('Payment disbursement recorded successfully!', 'success');
      const staffId = selectedGen.staffId;
      await loadGenerations();
      setSelectedStaffId(staffId);
    } catch (err: any) {
      console.error('Error recording payment:', err);
      showToast('Failed to record payment', 'error');
    } finally {
      setSubmittingPay(false);
    }
  };

  // ── Footer: show payment form in GlobalFooter when staff is selected and has remaining balance ──
  useEffect(() => {
    if (selectedGen && selectedGen.remainingBalance > 0 && !selectedGen.isLocked) {
      setFooterContent({
        visible: true,
        content: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: theme.TEXT_SECONDARY, whiteSpace: 'nowrap' }}>
              {selectedGen.staff?.name} — Remaining: <span style={{ color: '#ef4444' }}>{formatCurrency(selectedGen.remainingBalance)}</span>
            </span>
            <TextField
              label="Amount"
              type="number"
              size="small"
              value={payAmount}
              onChange={e => setPayAmount(Number(e.target.value))}
              style={{ width: 120 }}
              InputProps={{ style: { fontSize: '0.82rem' } }}
            />
            <FormControl size="small" style={{ minWidth: 130 }}>
              <InputLabel style={{ fontSize: '0.82rem' }}>Mode</InputLabel>
              <Select
                value={payMode}
                label="Mode"
                onChange={e => setPayMode(e.target.value as any)}
                style={{ fontSize: '0.82rem' }}
              >
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="easypaisa_jazzcash">EasyPaisa / JazzCash</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ref No."
              size="small"
              value={refNo}
              onChange={e => setRefNo(e.target.value)}
              style={{ width: 120 }}
              InputProps={{ style: { fontSize: '0.82rem' } }}
            />
            <TextField
              label="Remarks"
              size="small"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              style={{ width: 120 }}
              InputProps={{ style: { fontSize: '0.82rem' } }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleRecordPayment}
              disabled={submittingPay || payAmount <= 0}
              style={{ textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              {submittingPay ? <CircularProgress size={16} color="inherit" /> : `Disburse ${formatCurrency(payAmount)}`}
            </Button>
          </div>
        ),
      });
    } else {
      setFooterContent(null);
    }

    return () => {
      setFooterContent(null);
    };
  }, [selectedGen?.id, selectedGen?.remainingBalance, selectedGen?.isLocked, payAmount, payMode, refNo, remarks, submittingPay]);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <Container>
      {/* ── Header Card: Title + Month/Year + Staff Select ── */}
      <Card theme={theme}>
        <HeaderRow>
          <Title theme={theme}>
            <PaymentIcon style={{ color: theme.ACCENT }} /> Disburse Salary
          </Title>
          <ControlsGroup>
            <SelectGroup theme={theme}>
              <CalendarIcon style={{ fontSize: 18, color: theme.TEXT_SECONDARY }} />
              <Select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                variant="standard"
                disableUnderline
                style={{ fontSize: '0.85rem', color: theme.TEXT_PRIMARY }}
              >
                {MONTHS.map((m, idx) => (
                  <MenuItem key={idx} value={idx + 1}>{m}</MenuItem>
                ))}
              </Select>
              <Select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                variant="standard"
                disableUnderline
                style={{ fontSize: '0.85rem', color: theme.TEXT_PRIMARY }}
              >
                {years.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </SelectGroup>
          </ControlsGroup>
        </HeaderRow>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <CircularProgress size={28} />
          </div>
        ) : generations.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
            <PaymentIcon style={{ fontSize: 42, color: theme.BORDER, marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Generated Payrolls for {MONTHS[selectedMonth - 1]} {selectedYear}</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Generate monthly payrolls first in the <b>"Monthly Payroll Generation"</b> tab.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <FormControl fullWidth size="small">
              <InputLabel>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <PersonIcon style={{ fontSize: 16 }} /> Select Staff Member
                </span>
              </InputLabel>
              <Select
                value={selectedStaffId}
                label="Select Staff Member"
                onChange={e => setSelectedStaffId(Number(e.target.value))}
              >
                {generations.map(g => (
                  <MenuItem key={g.staffId} value={g.staffId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 600 }}>{g.staff?.name || `Staff #${g.staffId}`}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#888' }}>{g.staff?.role}</span>
                        <StatusBadge $status={g.status}>
                          {g.status === 'paid' ? 'Paid' : g.status === 'partially_paid' ? 'Partial' : 'Unpaid'}
                        </StatusBadge>
                      </span>
                    </div>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}
      </Card>

      {/* ── Salary Breakdown Card ── */}
      {selectedGen && (
        <Card theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <SectionTitle theme={theme} style={{ marginBottom: 0 }}>
              <WalletIcon style={{ fontSize: 18, color: theme.ACCENT }} />
              {selectedGen.staff?.name} — {selectedGen.staff?.role} — {MONTHS[selectedMonth - 1]} {selectedYear}
            </SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StatusBadge $status={selectedGen.status}>
                {selectedGen.status === 'paid' ? 'Fully Paid' : selectedGen.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid'}
              </StatusBadge>
              <IconButton size="small" onClick={() => setSelectedSlipGen(selectedGen)} title="View Payslip">
                <ReceiptIcon fontSize="small" />
              </IconButton>
            </div>
          </div>

          <StatGrid>
            <StatBox theme={theme}>
              <label>Basic Pay</label>
              <span>{formatCurrency(selectedGen.basicPay)}</span>
            </StatBox>
            <StatBox theme={theme} $accent="#10b981">
              <label>Total Earnings</label>
              <span>{formatCurrency(selectedGen.totalEarnings)}</span>
            </StatBox>
            <StatBox theme={theme} $accent="#ef4444">
              <label>Total Deductions</label>
              <span>{formatCurrency(selectedGen.totalDeductions)}</span>
            </StatBox>
            <StatBox theme={theme}>
              <label>Net Salary</label>
              <span style={{ fontSize: '1rem' }}>{formatCurrency(selectedGen.netSalary)}</span>
            </StatBox>
            <StatBox theme={theme} $accent="#10b981">
              <label>Paid So Far</label>
              <span>{formatCurrency(selectedGen.paidAmount)}</span>
            </StatBox>
            <StatBox theme={theme} $accent={selectedGen.remainingBalance > 0 ? '#ef4444' : '#10b981'}>
              <label>Remaining</label>
              <span>{formatCurrency(selectedGen.remainingBalance)}</span>
            </StatBox>
          </StatGrid>

          {/* Arrears / Deductions Breakdown */}
          {(selectedGen.absentDeductions > 0 || selectedGen.lateDeductions > 0 || selectedGen.advanceDeductions > 0 || selectedGen.oldBalanceAmount > 0) && (
            <>
              <SectionTitle theme={theme} style={{ marginTop: '1rem' }}>
                Arrears & Deductions Breakdown
              </SectionTitle>
              <StatGrid>
                {selectedGen.oldBalanceAmount > 0 && (
                  <StatBox theme={theme} $accent="#f59e0b">
                    <label>Old Balance (Carried)</label>
                    <span>{formatCurrency(selectedGen.oldBalanceAmount)}</span>
                  </StatBox>
                )}
                {selectedGen.absentDeductions > 0 && (
                  <StatBox theme={theme} $accent="#ef4444">
                    <label>Absent Deductions</label>
                    <span>{formatCurrency(selectedGen.absentDeductions)}</span>
                  </StatBox>
                )}
                {selectedGen.lateDeductions > 0 && (
                  <StatBox theme={theme} $accent="#f59e0b">
                    <label>Late Deductions</label>
                    <span>{formatCurrency(selectedGen.lateDeductions)}</span>
                  </StatBox>
                )}
                {selectedGen.advanceDeductions > 0 && (
                  <StatBox theme={theme} $accent="#8b5cf6">
                    <label>Advance Repayment</label>
                    <span>{formatCurrency(selectedGen.advanceDeductions)}</span>
                  </StatBox>
                )}
              </StatGrid>
            </>
          )}
        </Card>
      )}

      {/* ── Monthly Adjustments Card ── */}
      {selectedGen && (
        <Card theme={theme}>
          <SectionTitle theme={theme}>
            <AdjustmentsIcon style={{ fontSize: 18, color: theme.ACCENT }} /> Monthly Adjustments ({staffAdjustments.length})
          </SectionTitle>

          {loadingAdjustments ? (
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <CircularProgress size={20} />
            </div>
          ) : staffAdjustments.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>
              No custom additions or subtractions for {MONTHS[selectedMonth - 1]} {selectedYear}.
            </div>
          ) : (
            <StatGrid>
              {staffAdjustments.map((adj, idx) => (
                <StatBox
                  key={adj.id || idx}
                  theme={theme}
                  $accent={adj.type === 'addition' ? '#10b981' : '#ef4444'}
                >
                  <label>
                    {adj.type === 'addition' ? '[+] Addition' : '[-] Subtraction'}: {adj.title}
                  </label>
                  <span>{formatCurrency(adj.amount)}</span>
                  {adj.remarks && (
                    <div style={{ fontSize: '0.72rem', color: theme.TEXT_SECONDARY, marginTop: '0.2rem', fontStyle: 'italic' }}>
                      "{adj.remarks}"
                    </div>
                  )}
                </StatBox>
              ))}
            </StatGrid>
          )}
        </Card>
      )}

      {/* ── Attendance Card ── */}
      {selectedGen && (
        <Card theme={theme}>
          <SectionTitle theme={theme}>
            <CalendarIcon style={{ fontSize: 18, color: theme.ACCENT }} /> Attendance Summary
          </SectionTitle>
          <StatGrid>
            <StatBox theme={theme}>
              <label>Working Days</label>
              <span>{selectedGen.workingDays}</span>
            </StatBox>
            <StatBox theme={theme}>
              <label>Present</label>
              <span>{selectedGen.presentDays}</span>
            </StatBox>
            <StatBox theme={theme} $accent={selectedGen.absentDays > 0 ? '#ef4444' : undefined}>
              <label>Absent</label>
              <span>{selectedGen.absentDays}</span>
            </StatBox>
            <StatBox theme={theme}>
              <label>Leave</label>
              <span>{selectedGen.leaveDays}</span>
            </StatBox>
            <StatBox theme={theme} $accent={selectedGen.lateDays > 0 ? '#f59e0b' : undefined}>
              <label>Late</label>
              <span>{selectedGen.lateDays}</span>
            </StatBox>
          </StatGrid>
        </Card>
      )}

      {/* ── Payment History Card ── */}
      {selectedGen && (
        <Card theme={theme}>
          <SectionTitle theme={theme}>
            <HistoryIcon style={{ fontSize: 18, color: theme.ACCENT }} /> Payment History ({staffPayments.length})
          </SectionTitle>

          {loadingPayments ? (
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <CircularProgress size={22} />
            </div>
          ) : staffPayments.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: theme.TEXT_SECONDARY, fontSize: '0.85rem' }}>
              No payments recorded yet for this month.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <PaymentTable theme={theme}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Reference</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPayments.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ color: theme.TEXT_SECONDARY }}>{idx + 1}</td>
                      <td>
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {formatCurrency(parseFloat(p.amount || '0'))}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {(p.payment_mode || '').replace(/_/g, ' ')}
                      </td>
                      <td style={{ color: theme.TEXT_SECONDARY }}>{p.reference_no || '—'}</td>
                      <td style={{ color: theme.TEXT_SECONDARY }}>{p.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </PaymentTable>
            </div>
          )}
        </Card>
      )}

      {/* ── Locked / Fully Paid Status Card ── */}
      {selectedGen && selectedGen.isLocked && (
        <Card theme={theme} style={{ textAlign: 'center', background: theme.BG === '#252525' ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)' }}>
          <LockIcon style={{ fontSize: 30, color: '#f59e0b', marginBottom: '0.25rem' }} />
          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.92rem' }}>
            🔒 Payments Locked
          </div>
          <div style={{ fontSize: '0.82rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
            Next month's salary has been generated. Payments for this month are locked.
          </div>
          {selectedGen.remainingBalance > 0 && (
            <div style={{ fontSize: '0.82rem', color: '#ef4444', marginTop: '0.35rem', fontWeight: 600 }}>
              Unpaid balance of {formatCurrency(selectedGen.remainingBalance)} has been carried forward as old balance.
            </div>
          )}
        </Card>
      )}

      {selectedGen && !selectedGen.isLocked && selectedGen.remainingBalance <= 0 && (
        <Card theme={theme} style={{ textAlign: 'center' }}>
          <CheckIcon style={{ fontSize: 30, color: '#10b981', marginBottom: '0.25rem' }} />
          <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.92rem' }}>
            ✅ Salary fully disbursed for this month
          </div>
        </Card>
      )}

      {/* Salary Statement Dialog */}
      <SalaryStatementDialog
        open={!!selectedSlipGen}
        generation={selectedSlipGen}
        onClose={() => setSelectedSlipGen(null)}
      />
    </Container>
  );
};

export default PayrollPaymentLedger;
