import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  PointOfSale,
  Search,
  Person,
  Receipt,
  AccountBalanceWallet,
  CheckCircle,
  Lock,
  LockOpen,
  Print,
  Refresh,
  History,
  Description,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { isDark } from '../../../styles/DesignSystem';
import {
  CashierShift,
  FeeDemand,
  PaymentMethod,
  CollectPaymentResult,
  FeeReceipt,
} from '../../../types/feeLedger';
import {
  getActiveShift,
  openShift,
  closeShift,
  fetchDemands,
  collectPayment,
  newIdempotencyKey,
  fetchReceipts,
} from '../../../services/feeLedgerService';
import {
  HubCard,
  HubFilterRow,
  ModernInput,
  ModernSelect,
  ModernButton,
  ModernTable,
  TableWrapper,
  ModernBadge,
  ModalBackdrop,
  ModalDialog,
  ShiftNoticeBanner,
  SearchDropdown,
  SearchDropdownItem,
  POSGrid,
  formatFeeCurrency,
  formatFeeDate,
} from '../FeeHubStyles';
import PrintReceiptModal from '../components/PrintReceiptModal';

const ViewToggleGroup = styled.div`
  display: inline-flex;
  background: ${({ theme }) => (isDark(theme) ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9')};
  padding: 3px;
  border-radius: 6px;
  gap: 3px;
`;

const ViewToggleBtn = styled.button<{ $active: boolean }>`
  border: none;
  background: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#334155' : '#ffffff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#f8fafc' : '#0f172a') : isDark(theme) ? '#94a3b8' : '#64748b'};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-size: 0.76rem;
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s ease;
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none')};

  &:hover {
    color: ${({ theme }) => (isDark(theme) ? '#ffffff' : '#0f172a')};
  }

  .count-badge {
    font-size: 0.65rem;
    padding: 0.08rem 0.35rem;
    border-radius: 999px;
    background: ${({ $active }) => ($active ? '#2563eb' : 'rgba(148, 163, 184, 0.25)')};
    color: ${({ $active }) => ($active ? '#ffffff' : 'inherit')};
  }
`;

const StickyPaymentCard = styled(HubCard)`
  position: sticky;
  top: 80px;

  @media (max-width: 900px) {
    position: relative;
    top: 0;
  }
`;

interface CounterTabProps {
  onPaymentCollected?: () => void;
}

export const CounterTab: React.FC<CounterTabProps> = ({ onPaymentCollected }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  // Active cashier shift
  const [shift, setShift] = useState<CashierShift | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);

  // Shift Modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(0);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  // Student Search
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentDemands, setStudentDemands] = useState<FeeDemand[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [studentReceipts, setStudentReceipts] = useState<FeeReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [activeStudentView, setActiveStudentView] = useState<'demands' | 'history'>('demands');

  // Payment Form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [refNo, setRefNo] = useState('');
  const [payerName, setPayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptResult, setReceiptResult] = useState<CollectPaymentResult | null>(null);

  const idempotencyKey = useRef<string>(newIdempotencyKey());

  useEffect(() => {
    loadActiveShift();
  }, [schoolId, userId]);

  const loadActiveShift = async () => {
    try {
      setLoadingShift(true);
      const s = await getActiveShift(schoolId, userId);
      setShift(s);
    } catch (err: any) {
      console.error('Error loading shift:', err);
    } finally {
      setLoadingShift(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openShift({ schoolId, userId }, openingFloat);
      showToast('Cashier shift opened successfully!', 'success');
      setOpenShiftModal(false);
      loadActiveShift();
    } catch (err: any) {
      showToast(err.message || 'Failed to open shift.', 'error');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;
    try {
      const summary = await closeShift({ schoolId, userId }, shift.id, countedCash, closeNotes);
      showToast(
        `Shift closed! Variance: ${summary.variance >= 0 ? '+' : ''}${summary.variance} Rs`,
        'success'
      );
      setCloseShiftModal(false);
      loadActiveShift();
    } catch (err: any) {
      showToast(err.message || 'Failed to close shift.', 'error');
    }
  };

  // Search students
  const handleSearchStudents = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setStudentSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from('students')
      .select('id, name, father_name, roll_number, class_id, classes:class_id(name)')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .or(`name.ilike.%${q}%,father_name.ilike.%${q}%,roll_number.ilike.%${q}%`)
      .limit(10);
    setStudentSuggestions(data || []);
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setStudentSuggestions([]);
    idempotencyKey.current = newIdempotencyKey(); // fresh key for new student

    try {
      // Load unpaid / partially paid demands
      const demands = await fetchDemands(schoolId, {
        studentId: student.id,
        limit: 20,
      });
      const pending = demands.filter((d) => d.pay_status !== 'paid' && d.doc_status !== 'cancelled');
      setStudentDemands(pending);

      // Auto-populate total outstanding as default payment amount
      const totalDue = pending.reduce((s, d) => s + (d.balance_amount || 0), 0);
      setPayAmount(totalDue);
      setPayerName(student.father_name || student.name);

      // Fetch wallet balance
      const { data: acct } = await supabase
        .from('fee_accounts')
        .select('advance_balance')
        .eq('school_id', schoolId)
        .eq('account_type', 'student')
        .eq('student_id', student.id)
        .maybeSingle();
      setWalletBalance(Number(acct?.advance_balance || 0));

      // Fetch student payment history / receipts
      setLoadingReceipts(true);
      const receipts = await fetchReceipts(schoolId, {
        studentId: student.id,
        limit: 50,
      });
      setStudentReceipts(receipts);
    } catch (err: any) {
      showToast(err.message || 'Failed to load student fee data.', 'error');
    } finally {
      setLoadingReceipts(false);
    }
  };

  const handlePrintPastReceipt = (r: FeeReceipt) => {
    const res: CollectPaymentResult = {
      success: true,
      receipt_id: r.id,
      receipt_no: r.receipt_no,
      amount: Number(r.amount),
      allocated_amount: Number(r.allocated_amount),
      wallet_amount: Number(r.wallet_amount),
      balance_after: r.snapshot?.balance_after ?? 0,
      payment_method: r.payment_method,
      student_name: r.snapshot?.student_name || selectedStudent?.name,
      father_name: r.snapshot?.father_name || selectedStudent?.father_name,
      roll_number: r.snapshot?.roll_number || selectedStudent?.roll_number,
      allocations: r.snapshot?.allocations || [],
      snapshot: {
        ...r.snapshot,
        paid_at: r.paid_at,
      },
    };
    setReceiptResult(res);
  };

  // Submit Payment
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) {
      showToast('You must open a cashier shift before collecting fees.', 'error');
      setOpenShiftModal(true);
      return;
    }
    if (!selectedStudent) {
      showToast('Please select a student first.', 'error');
      return;
    }
    if (payAmount <= 0) {
      showToast('Payment amount must be greater than zero.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await collectPayment(
        { schoolId, userId },
        {
          studentId: selectedStudent.id,
          amount: payAmount,
          method: payMethod,
          idempotencyKey: idempotencyKey.current,
          shiftId: shift.id,
          referenceNo: refNo.trim() || null,
          payerName: payerName.trim() || null,
        }
      );

      showToast(`Payment received! Receipt #${res.receipt_no}`, 'success');
      setReceiptResult(res);
      onPaymentCollected?.();

      // Refresh student demands
      handleSelectStudent(selectedStudent);
    } catch (err: any) {
      showToast(err.message || 'Payment collection failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstanding = studentDemands.reduce((s, d) => s + (d.balance_amount || 0), 0);

  return (
    <div>
      {/* Shift Banner */}
      <ShiftNoticeBanner $isOpen={Boolean(shift)}>
        <div className="shift-info">
          {shift ? (
            <>
              <LockOpen fontSize="small" />
              <span>
                Active Cashier Shift <strong>#{shift.id}</strong> (Opened at{' '}
                {new Date(shift.opened_at).toLocaleTimeString()}) • Float:{' '}
                {formatFeeCurrency(shift.opening_float)}
              </span>
            </>
          ) : (
            <>
              <Lock fontSize="small" />
              <span>Cashier Drawer is Currently Closed. Open shift to process collections.</span>
            </>
          )}
        </div>

        <div>
          {shift ? (
            <ModernButton $variant="danger" $size="sm" onClick={() => setCloseShiftModal(true)}>
              Close Shift Drawer
            </ModernButton>
          ) : (
            <ModernButton $variant="success" $size="sm" onClick={() => setOpenShiftModal(true)}>
              Open Drawer Shift
            </ModernButton>
          )}
        </div>
      </ShiftNoticeBanner>

      {/* Main Two-Column POS Layout */}
      <POSGrid>
        {/* Left Column: Student Search & Unpaid Challans */}
        <div>
          {/* Search Box */}
          <HubCard>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
              LOOKUP STUDENT (BARCODE / NAME / ROLL / FATHER):
            </label>
            <div style={{ position: 'relative' }}>
              <ModernInput
                type="text"
                placeholder="Scan barcode or type name/roll..."
                value={searchQuery}
                onChange={(e) => handleSearchStudents(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
                autoFocus
              />

              {studentSuggestions.length > 0 && (
                <SearchDropdown>
                  {studentSuggestions.map((s) => (
                    <SearchDropdownItem
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                    >
                      <div>
                        <div className="primary-text">{s.name}</div>
                        <div className="sub-text">
                          s/o {s.father_name} • Class: {s.classes?.name || '—'} • Roll: {s.roll_number || 'N/A'} • ID: #{s.id}
                        </div>
                      </div>
                      <ModernBadge $variant="info">Select</ModernBadge>
                    </SearchDropdownItem>
                  ))}
                </SearchDropdown>
              )}
            </div>
          </HubCard>

          {/* Student Profile & Outstanding Demands */}
          {selectedStudent && (
            <HubCard>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {selectedStudent.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    s/o {selectedStudent.father_name} • Class: {selectedStudent.classes?.name || '—'} • Roll: {selectedStudent.roll_number || 'N/A'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    NET OUTSTANDING DUE
                  </div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      color: totalOutstanding > 0 ? '#dc2626' : '#059669',
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatFeeCurrency(totalOutstanding)}
                  </div>
                </div>
              </div>

              {walletBalance > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.82rem',
                    color: '#059669',
                  }}
                >
                  <AccountBalanceWallet fontSize="small" />
                  <span>
                    Advance Wallet Credit Available:{' '}
                    <strong>{formatFeeCurrency(walletBalance)}</strong> (will auto-consume on next billing)
                  </span>
                </div>
              )}

              {/* Sub-view Toggle */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.85rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <ViewToggleGroup>
                  <ViewToggleBtn
                    type="button"
                    $active={activeStudentView === 'demands'}
                    onClick={() => setActiveStudentView('demands')}
                  >
                    <Description fontSize="inherit" />
                    <span>Pending Demands</span>
                    <span className="count-badge">{studentDemands.length}</span>
                  </ViewToggleBtn>

                  <ViewToggleBtn
                    type="button"
                    $active={activeStudentView === 'history'}
                    onClick={() => setActiveStudentView('history')}
                  >
                    <History fontSize="inherit" />
                    <span>Payment History</span>
                    <span className="count-badge">{studentReceipts.length}</span>
                  </ViewToggleBtn>
                </ViewToggleGroup>

                <span style={{ fontSize: '0.74rem', opacity: 0.65 }}>
                  {activeStudentView === 'demands'
                    ? `${studentDemands.length} pending demand${studentDemands.length === 1 ? '' : 's'}`
                    : `${studentReceipts.length} past receipt${studentReceipts.length === 1 ? '' : 's'}`}
                </span>
              </div>

              {/* View 1: Pending Demands */}
              {activeStudentView === 'demands' && (
                <div>
                  {studentDemands.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', opacity: 0.65, fontSize: '0.85rem' }}>
                      ✓ All dues are fully settled! No pending challans.
                    </div>
                  ) : (
                    <TableWrapper>
                      <ModernTable>
                        <thead>
                          <tr>
                            <th>Challan #</th>
                            <th>Due Date</th>
                            <th style={{ textAlign: 'right' }}>Billed</th>
                            <th style={{ textAlign: 'right' }}>Paid</th>
                            <th style={{ textAlign: 'right' }}>Balance Due</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentDemands.map((d) => (
                            <tr key={d.demand_id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{d.challan_no}</td>
                              <td>{formatFeeDate(d.due_date)}</td>
                              <td style={{ textAlign: 'right' }}>{formatFeeCurrency(d.net_amount)}</td>
                              <td style={{ textAlign: 'right', color: '#059669' }}>
                                {formatFeeCurrency(d.paid_amount)}
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 800,
                                  color: '#dc2626',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {formatFeeCurrency(d.balance_amount)}
                              </td>
                              <td>
                                <ModernBadge
                                  $variant={
                                    d.pay_status === 'overdue'
                                      ? 'danger'
                                      : d.pay_status === 'partially_paid'
                                      ? 'warning'
                                      : 'neutral'
                                  }
                                >
                                  {d.pay_status}
                                </ModernBadge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </ModernTable>
                    </TableWrapper>
                  )}
                </div>
              )}

              {/* View 2: Payment History (Receipts) */}
              {activeStudentView === 'history' && (
                <div>
                  {loadingReceipts ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', opacity: 0.65, fontSize: '0.85rem' }}>
                      Loading payment history...
                    </div>
                  ) : studentReceipts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', opacity: 0.65, fontSize: '0.85rem' }}>
                      No payment receipts recorded yet for this student.
                    </div>
                  ) : (
                    <TableWrapper>
                      <ModernTable>
                        <thead>
                          <tr>
                            <th>Receipt #</th>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Settled Challans</th>
                            <th style={{ textAlign: 'right' }}>Amount Paid</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentReceipts.map((r) => {
                            const allocations: any[] = r.snapshot?.allocations || [];
                            const allocSummary =
                              allocations.length > 0
                                ? allocations.map((a: any) => `#${a.challan_no || a.demand_id}`).join(', ')
                                : 'Deposit / Wallet';

                            return (
                              <tr key={r.id}>
                                <td>
                                  <ModernBadge $variant="success" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                                    {r.receipt_no}
                                  </ModernBadge>
                                </td>
                                <td style={{ fontSize: '0.76rem' }}>
                                  <div>{formatFeeDate(r.paid_at)}</div>
                                </td>
                                <td>
                                  <ModernBadge $variant="info" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                                    {r.payment_method.replace('_', ' ')}
                                  </ModernBadge>
                                </td>
                                <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                  {allocSummary}
                                </td>
                                <td
                                  style={{
                                    textAlign: 'right',
                                    fontWeight: 800,
                                    color: '#059669',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {formatFeeCurrency(r.amount)}
                                </td>
                                <td>
                                  <ModernBadge $variant={r.status === 'posted' ? 'success' : 'danger'}>
                                    {r.status.toUpperCase()}
                                  </ModernBadge>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <ModernButton
                                    type="button"
                                    $size="sm"
                                    $variant="ghost"
                                    onClick={() => handlePrintPastReceipt(r)}
                                    title="View & Re-print Official Receipt"
                                  >
                                    <Print fontSize="inherit" /> Receipt
                                  </ModernButton>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </ModernTable>
                    </TableWrapper>
                  )}
                </div>
              )}
            </HubCard>
          )}
        </div>

        {/* Right Column: Payment Collection Box */}
        <div>
          <StickyPaymentCard>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PointOfSale style={{ color: '#2563eb' }} /> Collect Payment
            </h3>

            {!selectedStudent ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.6, fontSize: '0.85rem' }}>
                Search and select a student on the left to receive fees.
              </div>
            ) : (
              <form onSubmit={handleCollectPayment} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    PAYMENT AMOUNT (RS):
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      fontSize: '1.3rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color: '#2563eb',
                      padding: '0.6rem 0.75rem',
                    }}
                    required
                  />
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem' }}>
                    <ModernButton
                      type="button"
                      $size="sm"
                      $variant="ghost"
                      onClick={() => setPayAmount(totalOutstanding)}
                    >
                      Full Due ({formatFeeCurrency(totalOutstanding)})
                    </ModernButton>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    PAYMENT METHOD:
                  </label>
                  <ModernSelect
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    style={{ width: '100%' }}
                  >
                    <option value="cash">Cash (Counter Drawer)</option>
                    <option value="bank_transfer">Bank Transfer / Deposit Slip</option>
                    <option value="pos_card">Credit / Debit POS Card</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="cheque">Bank Cheque</option>
                  </ModernSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    REFERENCE / TRANSACTION ID (OPTIONAL):
                  </label>
                  <ModernInput
                    type="text"
                    placeholder="e.g. Bank slip #, Stan ID, Cheque #"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    PAYER NAME / DEPOSITOR:
                  </label>
                  <ModernInput
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <ModernButton
                  type="submit"
                  $variant="success"
                  $size="lg"
                  disabled={submitting || payAmount <= 0}
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  <CheckCircle fontSize="small" />
                  {submitting ? 'Allocating Payment...' : `Receive ${formatFeeCurrency(payAmount)}`}
                </ModernButton>
              </form>
            )}
          </StickyPaymentCard>
        </div>
      </POSGrid>

      {/* Modal: Open Shift */}
      {openShiftModal && (
        <ModalBackdrop onClick={() => setOpenShiftModal(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="440px">
            <h3 className="modal-title">Open Cashier Drawer Shift</h3>
            <p className="modal-subtitle">
              Start your shift to process counter fee collections and track cash physical drawer custody.
            </p>

            <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  OPENING CASH FLOAT (RS):
                </label>
                <ModernInput
                  type="number"
                  min="0"
                  step="1"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 800 }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setOpenShiftModal(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="success">
                  Open Drawer Shift
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: Close Shift */}
      {closeShiftModal && shift && (
        <ModalBackdrop onClick={() => setCloseShiftModal(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="460px">
            <h3 className="modal-title">Close Shift #{shift.id}</h3>
            <p className="modal-subtitle">
              Declare physical cash counted in drawer. The system will compute drawer variance against logged receipts.
            </p>

            <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  PHYSICAL CASH COUNTED IN DRAWER (RS):
                </label>
                <ModernInput
                  type="number"
                  min="0"
                  step="1"
                  value={countedCash}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: '1.15rem', fontWeight: 800 }}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  CLOSING NOTES / REMARKS (OPTIONAL):
                </label>
                <ModernInput
                  type="text"
                  placeholder="e.g. Handed over safe envelope #404"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setCloseShiftModal(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="danger">
                  Count & Close Shift
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Printable Receipt Modal */}
      {receiptResult && (
        <PrintReceiptModal receipt={receiptResult} onClose={() => setReceiptResult(null)} />
      )}
    </div>
  );
};
export default CounterTab;
