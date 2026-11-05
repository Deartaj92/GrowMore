import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../components/Layout/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { newPayrollService } from '../services/newPayrollService';
import { generatePayrollPaymentReceipt } from '../paymentReceipt';
import { usePayrollDisplaySettings } from '../PayrollDisplaySettingsContext';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  AccountBalance as BankIcon,
  Payments as CashIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
  FolderSpecial as GroupViewIcon,
  ViewList as FlatViewIcon,
  CalendarMonth as CalendarIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
} from '@mui/icons-material';
import {
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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

const GroupCard = styled.div<{ theme: any }>`
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  margin-bottom: 0.9rem;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}66;
  }
`;

const GroupHeader = styled.div<{ theme: any; $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.1rem;
  cursor: pointer;
  background: ${({ theme, $expanded }) =>
    $expanded
      ? (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)')
      : 'transparent'};
  user-select: none;
  gap: 1rem;
  flex-wrap: wrap;

  &:hover {
    background: ${({ theme }) =>
      theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.035)'};
  }
`;

const AvatarCircle = styled.div<{ theme: any }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT}22;
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.92rem;
  flex-shrink: 0;
`;

const PeriodChip = styled.span<{ theme: any }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const InstallmentCountChip = styled.span`
  font-size: 0.73rem;
  font-weight: 600;
  padding: 0.22rem 0.55rem;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
`;

const Table = styled.table<{ theme: any }>`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;

  th,
  td {
    padding: 0.8rem 0.85rem;
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

interface StaffMonthGroup {
  key: string;
  staffId: number;
  staffName: string;
  role: string;
  payrollMonth: number;
  payrollYear: number;
  periodLabel: string;
  totalAmount: number;
  payments: PaymentRecord[];
  latestPaymentDate: string;
}

const PaymentHistoryList: React.FC = () => {
  const { theme: themeMode } = useTheme();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const { formatCurrency } = usePayrollDisplaySettings();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  // Edit modal states
  const [editingRecord, setEditingRecord] = useState<PaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [editMethod, setEditMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'easypaisa_jazzcash' | 'other'>('cash');
  const [editRefNo, setEditRefNo] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

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

  const handleOpenEdit = (p: PaymentRecord) => {
    setEditingRecord(p);
    setEditAmount(p.amount);
    setEditDate(p.paymentDate ? p.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    const methodNorm = p.paymentMethod.toLowerCase().replace(/ /g, '_');
    setEditMethod(
      ['cash', 'bank_transfer', 'cheque', 'easypaisa_jazzcash'].includes(methodNorm)
        ? (methodNorm as any)
        : 'other'
    );
    setEditRefNo(p.referenceNumber || '');
    setEditNotes(p.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || editAmount <= 0 || !user?.school_id) {
      showToast('Please enter a valid disbursement amount', 'error');
      return;
    }
    setSubmittingEdit(true);
    try {
      await newPayrollService.updatePayment(user.school_id, editingRecord.id, {
        amount: editAmount,
        payment_date: editDate,
        payment_mode: editMethod,
        reference_no: editRefNo || null,
        remarks: editNotes || null,
      });
      showToast('Disbursement record updated successfully!', 'success');
      setEditingRecord(null);
      await loadHistory();
    } catch (err: any) {
      console.error('Error updating disbursement:', err);
      showToast(err.message || 'Failed to update disbursement', 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async (paymentId: number) => {
    if (!user?.school_id) return;
    if (!window.confirm("Are you sure you want to delete this disbursement record? This will restore the staff member's unpaid balance.")) {
      return;
    }
    try {
      await newPayrollService.deletePayment(user.school_id, paymentId);
      showToast('Disbursement record deleted', 'success');
      await loadHistory();
    } catch (err: any) {
      console.error('Error deleting disbursement:', err);
      showToast('Failed to delete disbursement', 'error');
    }
  };

  // Derive unique months available in payments
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => {
      if (p.payrollMonth > 0 && p.payrollYear > 0) {
        set.add(`${p.payrollYear}-${p.payrollMonth}`);
      }
    });
    return Array.from(set)
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return {
          key,
          year,
          month,
          label: `${MONTHS[month - 1]} ${year}`,
        };
      })
      .sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month));
  }, [payments]);

  // Filter payments
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch =
        (p.staffName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMethod =
        methodFilter === 'ALL' ||
        p.paymentMethod.toLowerCase() === methodFilter.toLowerCase();

      const matchesMonth =
        monthFilter === 'ALL' ||
        `${p.payrollYear}-${p.payrollMonth}` === monthFilter;

      return matchesSearch && matchesMethod && matchesMonth;
    });
  }, [payments, searchQuery, methodFilter, monthFilter]);

  // Group payments by Staff Member and Payroll Period (Month & Year)
  const grouped = useMemo(() => {
    const map = new Map<string, StaffMonthGroup>();

    filtered.forEach(p => {
      const key = `${p.staffId || p.staffName}_${p.payrollYear}_${p.payrollMonth}`;
      let group = map.get(key);
      if (!group) {
        const periodLabel =
          p.payrollMonth > 0 && p.payrollYear > 0
            ? `${MONTHS[p.payrollMonth - 1]} ${p.payrollYear}`
            : 'Unassigned Period';
        group = {
          key,
          staffId: p.staffId,
          staffName: p.staffName,
          role: p.role,
          payrollMonth: p.payrollMonth,
          payrollYear: p.payrollYear,
          periodLabel,
          totalAmount: 0,
          payments: [],
          latestPaymentDate: p.paymentDate,
        };
        map.set(key, group);
      }
      group.totalAmount += p.amount;
      group.payments.push(p);
      if (new Date(p.paymentDate).getTime() > new Date(group.latestPaymentDate).getTime()) {
        group.latestPaymentDate = p.paymentDate;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestPaymentDate).getTime() - new Date(a.latestPaymentDate).getTime()
    );
  }, [filtered]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupExpanded = (key: string) => !!expandedGroups[key];

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    grouped.forEach(g => {
      allExpanded[g.key] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedGroups({});
  };

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
            style={{ width: '240px' }}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ color: theme.TEXT_SECONDARY, marginRight: 6 }} />,
            }}
          />

          <Select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            size="small"
            style={{ width: '160px' }}
          >
            <MenuItem value="ALL">All Payroll Months</MenuItem>
            {availableMonths.map(m => (
              <MenuItem key={m.key} value={m.key}>
                {m.label}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            size="small"
            style={{ width: '150px' }}
          >
            <MenuItem value="ALL">All Methods</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="EasyPaisa/JazzCash">EasyPaisa / JazzCash</MenuItem>
          </Select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: `1px solid ${theme.BORDER}`, borderRadius: '8px', overflow: 'hidden' }}>
            <Button
              size="small"
              variant={viewMode === 'grouped' ? 'contained' : 'text'}
              color="primary"
              onClick={() => setViewMode('grouped')}
              startIcon={<GroupViewIcon fontSize="small" />}
              style={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderRadius: 0 }}
            >
              Grouped
            </Button>
            <Button
              size="small"
              variant={viewMode === 'flat' ? 'contained' : 'text'}
              color="primary"
              onClick={() => setViewMode('flat')}
              startIcon={<FlatViewIcon fontSize="small" />}
              style={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderRadius: 0 }}
            >
              Flat List
            </Button>
          </div>

          {viewMode === 'grouped' && grouped.length > 0 && (
            <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleExpandAll}
                startIcon={<ExpandAllIcon fontSize="small" />}
                style={{ textTransform: 'none', fontSize: '0.76rem', fontWeight: 600 }}
              >
                Expand
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCollapseAll}
                startIcon={<CollapseAllIcon fontSize="small" />}
                style={{ textTransform: 'none', fontSize: '0.76rem', fontWeight: 600 }}
              >
                Collapse
              </Button>
            </div>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={loadHistory}
            style={{ textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
        </div>
      </ControlsCard>

      <SummaryStrip>
        <SummaryCard theme={theme} $color="#10b981">
          <label>Total Disbursed (Filtered)</label>
          <div>{formatCurrency(totalDisbursed)}</div>
        </SummaryCard>

        <SummaryCard theme={theme}>
          <label>Total Staff Periods</label>
          <div>{grouped.length} Month Group(s) ({filtered.length} Installment{filtered.length === 1 ? '' : 's'})</div>
        </SummaryCard>

        <SummaryCard theme={theme} $color={theme.ACCENT}>
          <label>Avg. Monthly Disbursed / Staff</label>
          <div>{grouped.length > 0 ? formatCurrency(Math.round(totalDisbursed / grouped.length)) : 'Rs. 0'}</div>
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
        ) : viewMode === 'grouped' ? (
          /* GROUPED VIEW: By Staff Member and Month */
          <div>
            {grouped.map(group => {
              const expanded = isGroupExpanded(group.key);
              return (
                <GroupCard key={group.key} theme={theme}>
                  <GroupHeader
                    theme={theme}
                    $expanded={expanded}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <IconButton size="small" style={{ padding: 2, color: theme.TEXT_SECONDARY }}>
                        {expanded ? <ArrowDownIcon fontSize="small" /> : <ArrowRightIcon fontSize="small" />}
                      </IconButton>

                      <AvatarCircle theme={theme}>
                        {group.staffName ? group.staffName.charAt(0).toUpperCase() : 'S'}
                      </AvatarCircle>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: theme.TEXT_PRIMARY }}>
                          {group.staffName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: theme.TEXT_SECONDARY }}>
                          {group.role}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <PeriodChip theme={theme}>
                        <CalendarIcon style={{ fontSize: 14, color: theme.ACCENT }} />
                        {group.periodLabel}
                      </PeriodChip>

                      <InstallmentCountChip>
                        {group.payments.length} installment{group.payments.length > 1 ? 's' : ''}
                      </InstallmentCountChip>

                      <div style={{ textAlign: 'right', minWidth: '110px' }}>
                        <div style={{ fontSize: '0.68rem', color: theme.TEXT_SECONDARY, textTransform: 'uppercase', fontWeight: 700 }}>
                          Total Month Paid
                        </div>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem' }}>
                          {formatCurrency(group.totalAmount)}
                        </div>
                      </div>
                    </div>
                  </GroupHeader>

                  {expanded && (
                    <div style={{ padding: '0 1rem 1rem 1rem', overflowX: 'auto' }}>
                      <Table theme={theme}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Date & Time</th>
                            <th>Payment Method</th>
                            <th>Reference / Notes</th>
                            <th>Amount Disbursed</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.payments.map((p, idx) => (
                            <tr key={p.id}>
                              <td style={{ color: theme.TEXT_SECONDARY }}>{idx + 1}</td>

                              <td style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY }}>
                                {new Date(p.paymentDate).toLocaleString()}
                              </td>

                              <td>
                                <MethodBadge $method={p.paymentMethod}>
                                  {p.paymentMethod.toLowerCase().includes('bank') ? (
                                    <BankIcon fontSize="inherit" />
                                  ) : (
                                    <CashIcon fontSize="inherit" />
                                  )}
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

                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center' }}>
                                  <IconButton size="small" onClick={() => setSelectedReceipt(p)} title="View Payment Voucher">
                                    <ReceiptIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleOpenEdit(p)} title="Edit Disbursement" style={{ color: theme.ACCENT }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleDelete(p.id)} title="Delete Disbursement" style={{ color: '#ef4444' }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </GroupCard>
              );
            })}
          </div>
        ) : (
          /* FLAT LIST VIEW */
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
                    <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center' }}>
                      <IconButton size="small" onClick={() => setSelectedReceipt(p)} title="View Payment Voucher">
                        <ReceiptIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpenEdit(p)} title="Edit Disbursement" style={{ color: theme.ACCENT }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(p.id)} title="Delete Disbursement" style={{ color: '#ef4444' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>

      {/* Edit Disbursement Dialog */}
      <Dialog
        open={!!editingRecord}
        onClose={() => !submittingEdit && setEditingRecord(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.TEXT_PRIMARY }}>
          Edit Disbursement
        </DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          <TextField
            label="Disbursement Date"
            type="date"
            size="small"
            fullWidth
            value={editDate}
            onChange={e => setEditDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Amount (Rs.)"
            type="number"
            size="small"
            fullWidth
            value={editAmount}
            onChange={e => setEditAmount(Number(e.target.value))}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Mode</InputLabel>
            <Select
              value={editMethod}
              label="Mode"
              onChange={e => setEditMethod(e.target.value as any)}
            >
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="cheque">Cheque</MenuItem>
              <MenuItem value="easypaisa_jazzcash">EasyPaisa / JazzCash</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Reference No."
            size="small"
            fullWidth
            value={editRefNo}
            onChange={e => setEditRefNo(e.target.value)}
          />
          <TextField
            label="Remarks"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={editNotes}
            onChange={e => setEditNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions style={{ padding: '0.75rem 1.25rem' }}>
          <Button
            onClick={() => setEditingRecord(null)}
            disabled={submittingEdit}
            style={{ textTransform: 'none', color: theme.TEXT_SECONDARY }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveEdit}
            disabled={submittingEdit || editAmount <= 0}
            style={{ textTransform: 'none', fontWeight: 700 }}
          >
            {submittingEdit ? <CircularProgress size={16} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

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
            <Button
              onClick={() => {
                if (user?.school_id && selectedReceipt) {
                  generatePayrollPaymentReceipt(user.school_id, selectedReceipt.id);
                }
              }}
              color="primary"
              variant="contained"
              size="small"
            >
              Download PDF Receipt
            </Button>
            <Button onClick={() => setSelectedReceipt(null)} color="primary" variant="outlined" size="small">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default PaymentHistoryList;
