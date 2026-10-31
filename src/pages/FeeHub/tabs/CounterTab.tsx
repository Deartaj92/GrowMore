import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import {
  PointOfSale,
  Person,
  FamilyRestroom,
  Receipt,
  AccountBalanceWallet,
  CheckCircle,
  Lock,
  LockOpen,
  Print,
  History,
  Description,
  Tune,
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
  CollectFamilyPaymentResult,
  FeeReceipt,
  FamilyFeeSummary,
} from '../../../types/feeLedger';
import {
  getActiveShift,
  openShift,
  closeShift,
  fetchDemands,
  fetchAccountBalance,
  collectPayment,
  newIdempotencyKey,
  fetchReceipts,
  searchPosFamilies,
  fetchSingleFamilyFeeSummary,
  fetchFamilyForStudent,
  computeFamilyPaymentWaterfall,
  collectFamilyPayment,
  buildFamilyReceiptFromReceipts,
  extractFamilyBatchRef,
  cleanReferenceDisplay,
} from '../../../services/feeLedgerService';
import {
  HubCard,
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
import PrintFamilyReceiptModal from '../components/PrintFamilyReceiptModal';
import PrintFamilyChallanModal from '../components/PrintFamilyChallanModal';

const ViewToggleGroup = styled.div`
  display: inline-flex;
  background: ${({ theme }) => (isDark(theme) ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9')};
  padding: 3px;
  border-radius: 6px;
  gap: 3px;
  flex-wrap: wrap;
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

const FamilyLinkBanner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.55rem 0.8rem;
  margin-bottom: 0.85rem;
  border-radius: 6px;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(37, 99, 235, 0.16)' : 'rgba(37, 99, 235, 0.08)'};
  border: 1px solid rgba(37, 99, 235, 0.3);
  font-size: 0.78rem;
`;

interface CounterTabProps {
  onPaymentCollected?: () => void;
}

export const CounterTab: React.FC<CounterTabProps> = ({ onPaymentCollected }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  // POS Mode: Individual Student vs Family / Sibling
  const [posMode, setPosMode] = useState<'student' | 'family'>('student');

  // Active cashier shift
  const [shift, setShift] = useState<CashierShift | null>(null);

  // Shift Modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(0);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  // Individual Student POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentLinkedFamily, setStudentLinkedFamily] = useState<FamilyFeeSummary | null>(null);
  const [studentDemands, setStudentDemands] = useState<FeeDemand[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [studentReceipts, setStudentReceipts] = useState<FeeReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [activeStudentView, setActiveStudentView] = useState<'demands' | 'history'>('demands');

  // Family POS State
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [familySuggestions, setFamilySuggestions] = useState<FamilyFeeSummary[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyFeeSummary | null>(null);
  const [activeFamilyView, setActiveFamilyView] = useState<'siblings' | 'demands' | 'history'>('siblings');
  const [familyAllocMode, setFamilyAllocMode] = useState<'auto' | 'custom'>('auto');
  const [selectedSiblingIds, setSelectedSiblingIds] = useState<number[]>([]);
  const [customSiblingAmounts, setCustomSiblingAmounts] = useState<Record<number, number>>({});

  // Payment Form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [refNo, setRefNo] = useState('');
  const [payerName, setPayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Print Modals
  const [receiptResult, setReceiptResult] = useState<CollectPaymentResult | null>(null);
  const [familyReceiptResult, setFamilyReceiptResult] = useState<CollectFamilyPaymentResult | null>(null);
  const [printFamilyChallan, setPrintFamilyChallan] = useState<FamilyFeeSummary | null>(null);

  const idempotencyKey = useRef<string>(newIdempotencyKey());

  useEffect(() => {
    loadActiveShift();
  }, [schoolId, userId]);

  const loadActiveShift = async () => {
    try {
      const s = await getActiveShift(schoolId, userId);
      setShift(s);
    } catch (err: any) {
      console.error('Error loading shift:', err);
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

  // Search Individual Students
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
    setStudentLinkedFamily(null);
    idempotencyKey.current = newIdempotencyKey();

    try {
      setLoadingReceipts(true);
      const [demands, acctBal, receipts, linkedFam] = await Promise.all([
        fetchDemands(schoolId, { studentId: student.id, limit: 25 }),
        fetchAccountBalance(schoolId, student.id),
        fetchReceipts(schoolId, { studentId: student.id, limit: 50 }),
        fetchFamilyForStudent(schoolId, student.id),
      ]);

      const pending = demands.filter((d) => d.pay_status !== 'paid' && d.doc_status !== 'cancelled');
      setStudentDemands(pending);

      const totalDue = pending.reduce((s, d) => s + (d.balance_amount || 0), 0);
      setPayAmount(totalDue);
      setPayerName(student.father_name || student.name);
      setWalletBalance(acctBal.wallet);
      setStudentReceipts(receipts);
      setStudentLinkedFamily(linkedFam);
    } catch (err: any) {
      showToast(err.message || 'Failed to load student fee data.', 'error');
    } finally {
      setLoadingReceipts(false);
    }
  };

  // Search Families
  const handleSearchFamilies = async (q: string) => {
    setFamilySearchQuery(q);
    if (!q || q.trim().length < 1) {
      setFamilySuggestions([]);
      return;
    }
    try {
      const fams = await searchPosFamilies(schoolId, q);
      setFamilySuggestions(fams);
    } catch (err: any) {
      console.error('Error searching families:', err);
    }
  };

  const handleSelectFamily = async (fam: FamilyFeeSummary) => {
    setPosMode('family');
    setFamilySearchQuery('');
    setFamilySuggestions([]);
    idempotencyKey.current = newIdempotencyKey();

    try {
      const detailed = (await fetchSingleFamilyFeeSummary(schoolId, fam.family_id)) || fam;
      setSelectedFamily(detailed);
      const allIds = detailed.members.map((m) => m.student_id);
      setSelectedSiblingIds(allIds);
      setFamilyAllocMode('auto');
      setPayAmount(detailed.total_due);
      setPayerName(detailed.family_name);
      const wf = computeFamilyPaymentWaterfall(detailed, detailed.total_due, allIds);
      setCustomSiblingAmounts(wf);
    } catch (err: any) {
      showToast(err.message || 'Failed to load family fee details.', 'error');
    }
  };

  // Live Family Allocations
  const liveFamilyAllocations = useMemo(() => {
    if (!selectedFamily) return {};
    if (familyAllocMode === 'custom') {
      const out: Record<number, number> = {};
      selectedFamily.members.forEach((m) => {
        out[m.student_id] = selectedSiblingIds.includes(m.student_id)
          ? Number(customSiblingAmounts[m.student_id] || 0)
          : 0;
      });
      return out;
    }
    return computeFamilyPaymentWaterfall(selectedFamily, payAmount, selectedSiblingIds);
  }, [selectedFamily, familyAllocMode, payAmount, selectedSiblingIds, customSiblingAmounts]);

  const effectiveFamilyPayAmount = useMemo(() => {
    if (familyAllocMode === 'custom') {
      return Object.values(liveFamilyAllocations).reduce((s, v) => s + Number(v || 0), 0);
    }
    return payAmount;
  }, [familyAllocMode, liveFamilyAllocations, payAmount]);

  const handleToggleSibling = (studentId: number) => {
    if (!selectedFamily) return;
    setSelectedSiblingIds((prev) => {
      const next = prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId];
      if (familyAllocMode === 'auto') {
        const nextDue = selectedFamily.members
          .filter((m) => next.includes(m.student_id))
          .reduce((s, m) => s + m.balance_due, 0);
        setPayAmount(nextDue);
      }
      return next;
    });
  };

  // Group Family Receipts into Batch & Individual entries for Family History sub-view
  const familyPaymentHistoryGroups = useMemo(() => {
    if (!selectedFamily) return [];
    const items: Array<{ receipt: FeeReceipt; member: any }> = [];
    selectedFamily.members.forEach((m) => {
      m.receipts.forEach((r) => {
        if (r.payment_method !== 'wallet') {
          items.push({ receipt: r, member: m });
        }
      });
    });

    const groups = new Map<string, Array<{ receipt: FeeReceipt; member: any }>>();
    items.forEach((it) => {
      const batchRef = extractFamilyBatchRef(it.receipt.reference_no);
      const minuteKey = it.receipt.paid_at ? it.receipt.paid_at.slice(0, 16) : '';
      const key =
        batchRef ||
        `AUTO-${minuteKey}-${it.receipt.payment_method}-${it.receipt.collector_user_id || 0}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    });

    return Array.from(groups.entries())
      .map(([key, grp]) => {
        const recs = grp.map((g) => g.receipt);
        const first = recs[0];
        const explicitBatch = extractFamilyBatchRef(first.reference_no);
        const label =
          explicitBatch ||
          (grp.length > 1 ? `FAM-${selectedFamily.family_id}-${first.receipt_no}` : first.receipt_no);
        return {
          key,
          label,
          isMulti: grp.length > 1 || Boolean(explicitBatch),
          paidAt: first.paid_at,
          method: first.payment_method,
          status: first.status,
          referenceNo: cleanReferenceDisplay(first.reference_no),
          totalAmount: recs.reduce((s, r) => s + Number(r.amount || 0), 0),
          grp,
          recs,
        };
      })
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [selectedFamily]);

  const handlePrintPastReceipt = (r: FeeReceipt, fallbackStudent?: any) => {
    const stu = fallbackStudent || selectedStudent;
    const res: CollectPaymentResult = {
      success: true,
      receipt_id: r.id,
      receipt_no: r.receipt_no,
      amount: Number(r.amount),
      allocated_amount: Number(r.allocated_amount),
      wallet_amount: Number(r.wallet_amount),
      balance_after: r.snapshot?.balance_after ?? 0,
      payment_method: r.payment_method,
      student_name: r.snapshot?.student_name || stu?.name,
      father_name: r.snapshot?.father_name || stu?.father_name,
      roll_number: r.snapshot?.roll_number || stu?.roll_number,
      allocations: r.snapshot?.allocations || [],
      snapshot: {
        ...r.snapshot,
        paid_at: r.paid_at,
      },
    };
    setReceiptResult(res);
  };

  // Submit Payment (Student or Family)
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payMethod === 'cash' && !shift) {
      showToast('You must open a cashier shift before collecting cash fees.', 'error');
      setOpenShiftModal(true);
      return;
    }

    if (posMode === 'family') {
      if (!selectedFamily) {
        showToast('Please select a family first.', 'error');
        return;
      }
      if (effectiveFamilyPayAmount <= 0) {
        showToast('Family payment amount must be greater than zero.', 'error');
        return;
      }

      try {
        setSubmitting(true);
        const allocations = selectedFamily.members
          .filter((m) => Number(liveFamilyAllocations[m.student_id] || 0) > 0)
          .map((m) => ({
            studentId: m.student_id,
            studentName: m.name,
            fatherName: m.father_name,
            rollNumber: m.roll_number,
            className: m.class_name,
            amount: Number(liveFamilyAllocations[m.student_id]),
            balanceBefore: m.balance_due,
          }));

        const famRes = await collectFamilyPayment(
          { schoolId, userId },
          {
            familyId: selectedFamily.family_id,
            familyName: selectedFamily.family_name,
            contactNumber: selectedFamily.contact_number,
            address: selectedFamily.address,
            allocations,
            method: payMethod,
            idempotencyKey: idempotencyKey.current,
            shiftId: shift?.id ?? null,
            referenceNo: refNo.trim() || null,
            payerName: payerName.trim() || selectedFamily.family_name,
          }
        );

        showToast(
          `Family payment received! Batch #${famRes.batch_ref} (${famRes.member_receipts.length} sibling receipts)`,
          'success'
        );
        setFamilyReceiptResult(famRes);
        onPaymentCollected?.();
        await handleSelectFamily(selectedFamily);
      } catch (err: any) {
        showToast(err.message || 'Family payment collection failed.', 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Individual Student Mode
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
          shiftId: shift?.id ?? null,
          referenceNo: refNo.trim() || null,
          payerName: payerName.trim() || null,
        }
      );

      showToast(`Payment received! Receipt #${res.receipt_no}`, 'success');
      setReceiptResult(res);
      onPaymentCollected?.();
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
        {/* Left Column: Mode Switcher, Search & Demands/History */}
        <div>
          {/* POS Mode Toggle + Search Box */}
          <HubCard>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <ViewToggleGroup>
                <ViewToggleBtn
                  type="button"
                  $active={posMode === 'student'}
                  onClick={() => setPosMode('student')}
                >
                  <Person fontSize="small" />
                  <span>Individual Student POS</span>
                </ViewToggleBtn>
                <ViewToggleBtn
                  type="button"
                  $active={posMode === 'family'}
                  onClick={() => setPosMode('family')}
                >
                  <FamilyRestroom fontSize="small" />
                  <span>Family / Sibling POS</span>
                </ViewToggleBtn>
              </ViewToggleGroup>

              <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                {posMode === 'family'
                  ? 'Pay for all siblings in a single consolidated transaction'
                  : 'Single student fee counter'}
              </span>
            </div>

            {posMode === 'student' ? (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    marginBottom: '0.25rem',
                    color: '#64748b',
                  }}
                >
                  LOOKUP STUDENT (BARCODE / NAME / ROLL / FATHER):
                </label>
                <div style={{ position: 'relative' }}>
                  <ModernInput
                    type="text"
                    placeholder="Scan barcode or type student name / roll #..."
                    value={searchQuery}
                    onChange={(e) => handleSearchStudents(e.target.value)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    autoFocus
                  />

                  {studentSuggestions.length > 0 && (
                    <SearchDropdown>
                      {studentSuggestions.map((s) => (
                        <SearchDropdownItem key={s.id} onClick={() => handleSelectStudent(s)}>
                          <div>
                            <div className="primary-text">{s.name}</div>
                            <div className="sub-text">
                              s/o {s.father_name} • Class: {s.classes?.name || '—'} • Roll:{' '}
                              {s.roll_number || 'N/A'} • ID: #{s.id}
                            </div>
                          </div>
                          <ModernBadge $variant="info">Select</ModernBadge>
                        </SearchDropdownItem>
                      ))}
                    </SearchDropdown>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    marginBottom: '0.25rem',
                    color: '#64748b',
                  }}
                >
                  LOOKUP FAMILY (FAMILY NAME / GUARDIAN PHONE / SIBLING NAME OR ROLL #):
                </label>
                <div style={{ position: 'relative' }}>
                  <ModernInput
                    type="text"
                    placeholder="Type family name, phone #, or any sibling student's name / roll..."
                    value={familySearchQuery}
                    onChange={(e) => handleSearchFamilies(e.target.value)}
                    onFocus={() => {
                      if (!familySearchQuery) handleSearchFamilies('');
                    }}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    autoFocus
                  />

                  {familySuggestions.length > 0 && (
                    <SearchDropdown>
                      {familySuggestions.map((fam) => (
                        <SearchDropdownItem
                          key={fam.family_id}
                          onClick={() => handleSelectFamily(fam)}
                        >
                          <div>
                            <div className="primary-text">
                              {fam.family_name} (#FAM-{fam.family_id}) • {fam.members.length} Sibling(s)
                            </div>
                            <div className="sub-text">
                              Phone: {fam.contact_number || '—'} • Children:{' '}
                              {fam.members.map((m) => `${m.name} (${m.class_name || '—'})`).join(', ') || 'None'}
                            </div>
                          </div>
                          <ModernBadge $variant={fam.total_due > 0 ? 'danger' : 'success'}>
                            Due: {formatFeeCurrency(fam.total_due)}
                          </ModernBadge>
                        </SearchDropdownItem>
                      ))}
                    </SearchDropdown>
                  )}
                </div>
              </div>
            )}
          </HubCard>

          {/* ==================== MODE 1: INDIVIDUAL STUDENT PROFILE ==================== */}
          {posMode === 'student' && selectedStudent && (
            <HubCard>
              {/* Linked Family Banner (if student belongs to a family) */}
              {studentLinkedFamily && studentLinkedFamily.members.length > 0 && (
                <FamilyLinkBanner>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FamilyRestroom style={{ color: '#2563eb' }} />
                    <div>
                      <strong>Family Linked: {studentLinkedFamily.family_name}</strong> (#FAM-
                      {studentLinkedFamily.family_id}) •{' '}
                      <span>{studentLinkedFamily.members.length} Sibling(s)</span> • Combined Family Due:{' '}
                      <strong style={{ color: studentLinkedFamily.total_due > 0 ? '#dc2626' : '#059669' }}>
                        {formatFeeCurrency(studentLinkedFamily.total_due)}
                      </strong>
                    </div>
                  </div>
                  <ModernButton
                    type="button"
                    $size="sm"
                    $variant="primary"
                    onClick={() => handleSelectFamily(studentLinkedFamily)}
                  >
                    <FamilyRestroom fontSize="inherit" /> Switch to Family Payment
                  </ModernButton>
                </FamilyLinkBanner>
              )}

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
                    s/o {selectedStudent.father_name} • Class: {selectedStudent.classes?.name || '—'} • Roll:{' '}
                    {selectedStudent.roll_number || 'N/A'}
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

              {/* View 2: Payment History */}
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
                                <td style={{ fontSize: '0.76rem' }}>{formatFeeDate(r.paid_at)}</td>
                                <td>
                                  <ModernBadge $variant="info" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                                    {r.payment_method.replace('_', ' ')}
                                  </ModernBadge>
                                </td>
                                <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{allocSummary}</td>
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

          {/* ==================== MODE 2: FAMILY / SIBLING POS PROFILE ==================== */}
          {posMode === 'family' && selectedFamily && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                      Family: {selectedFamily.family_name}
                    </h3>
                    <ModernBadge $variant="info">#FAM-{selectedFamily.family_id}</ModernBadge>
                    <ModernBadge $variant="purple">{selectedFamily.members.length} Sibling(s)</ModernBadge>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Phone: {selectedFamily.contact_number || '—'} • Address: {selectedFamily.address || '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <ModernButton
                    type="button"
                    $size="sm"
                    $variant="secondary"
                    onClick={() => setPrintFamilyChallan(selectedFamily)}
                  >
                    <Print fontSize="inherit" /> Family Challan
                  </ModernButton>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                      COMBINED FAMILY DUE
                    </div>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 900,
                        color: selectedFamily.total_due > 0 ? '#dc2626' : '#059669',
                        fontFamily: 'monospace',
                      }}
                    >
                      {formatFeeCurrency(selectedFamily.total_due)}
                    </div>
                  </div>
                </div>
              </div>

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
                    $active={activeFamilyView === 'siblings'}
                    onClick={() => setActiveFamilyView('siblings')}
                  >
                    <FamilyRestroom fontSize="inherit" />
                    <span>Sibling Split & Allocation</span>
                    <span className="count-badge">{selectedFamily.members.length}</span>
                  </ViewToggleBtn>

                  <ViewToggleBtn
                    type="button"
                    $active={activeFamilyView === 'demands'}
                    onClick={() => setActiveFamilyView('demands')}
                  >
                    <Description fontSize="inherit" />
                    <span>All Pending Challans</span>
                    <span className="count-badge">{selectedFamily.unpaid_challans_count}</span>
                  </ViewToggleBtn>

                  <ViewToggleBtn
                    type="button"
                    $active={activeFamilyView === 'history'}
                    onClick={() => setActiveFamilyView('history')}
                  >
                    <History fontSize="inherit" />
                    <span>Family Payment History</span>
                    <span className="count-badge">{familyPaymentHistoryGroups.length}</span>
                  </ViewToggleBtn>
                </ViewToggleGroup>

                {activeFamilyView === 'siblings' && (
                  <ViewToggleGroup>
                    <ViewToggleBtn
                      type="button"
                      $active={familyAllocMode === 'auto'}
                      onClick={() => {
                        setFamilyAllocMode('auto');
                        const sumDue = selectedFamily.members
                          .filter((m) => selectedSiblingIds.includes(m.student_id))
                          .reduce((s, m) => s + m.balance_due, 0);
                        setPayAmount(sumDue);
                      }}
                    >
                      Auto Waterfall
                    </ViewToggleBtn>
                    <ViewToggleBtn
                      type="button"
                      $active={familyAllocMode === 'custom'}
                      onClick={() => {
                        setFamilyAllocMode('custom');
                        setCustomSiblingAmounts(liveFamilyAllocations);
                      }}
                    >
                      <Tune fontSize="inherit" /> Custom Per-Sibling
                    </ViewToggleBtn>
                  </ViewToggleGroup>
                )}
              </div>

              {/* Family View 1: Sibling Allocation Table */}
              {activeFamilyView === 'siblings' && (
                <TableWrapper>
                  <ModernTable>
                    <thead>
                      <tr>
                        <th style={{ width: '36px' }}>Pay</th>
                        <th>Sibling Name</th>
                        <th>Class / Roll</th>
                        <th style={{ textAlign: 'right' }}>Challans</th>
                        <th style={{ textAlign: 'right' }}>Balance Due</th>
                        <th style={{ textAlign: 'right' }}>Allocated Payment</th>
                        <th style={{ textAlign: 'right' }}>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFamily.members.map((m) => {
                        const included = selectedSiblingIds.includes(m.student_id);
                        const alloc = Number(liveFamilyAllocations[m.student_id] || 0);
                        const after = Math.max(0, m.balance_due - alloc);
                        const walletAdd = Math.max(0, alloc - m.balance_due);

                        return (
                          <tr key={m.student_id} style={{ opacity: included ? 1 : 0.45 }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={included}
                                onChange={() => handleToggleSibling(m.student_id)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 800 }}>{m.name}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                s/o {m.father_name || '—'}
                              </div>
                            </td>
                            <td>
                              <div>{m.class_name || '—'}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                Roll: {m.roll_number || 'N/A'}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>{m.unpaid_demands.length}</td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: m.balance_due > 0 ? '#dc2626' : '#059669',
                              }}
                            >
                              {formatFeeCurrency(m.balance_due)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {familyAllocMode === 'custom' ? (
                                <ModernInput
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!included}
                                  value={customSiblingAmounts[m.student_id] ?? 0}
                                  onChange={(e) =>
                                    setCustomSiblingAmounts((prev) => ({
                                      ...prev,
                                      [m.student_id]: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  style={{
                                    width: '120px',
                                    textAlign: 'right',
                                    fontFamily: 'monospace',
                                    fontWeight: 800,
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 900,
                                    color: alloc > 0 ? '#059669' : '#64748b',
                                  }}
                                >
                                  {formatFeeCurrency(alloc)}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              <span style={{ fontWeight: 700, color: after > 0 ? '#dc2626' : '#059669' }}>
                                {formatFeeCurrency(after)}
                              </span>
                              {walletAdd > 0 && (
                                <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>
                                  +{formatFeeCurrency(walletAdd)} Wallet
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </ModernTable>
                </TableWrapper>
              )}

              {/* Family View 2: All Pending Challans Across Siblings */}
              {activeFamilyView === 'demands' && (
                <div>
                  {selectedFamily.unpaid_challans_count === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', opacity: 0.65 }}>
                      ✓ All sibling fee demands are settled!
                    </div>
                  ) : (
                    <TableWrapper>
                      <ModernTable>
                        <thead>
                          <tr>
                            <th>Sibling</th>
                            <th>Class</th>
                            <th>Challan #</th>
                            <th>Due Date</th>
                            <th style={{ textAlign: 'right' }}>Net Billed</th>
                            <th style={{ textAlign: 'right' }}>Paid</th>
                            <th style={{ textAlign: 'right' }}>Balance Due</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFamily.members.flatMap((m) =>
                            m.unpaid_demands.map((d) => (
                              <tr key={d.demand_id}>
                                <td style={{ fontWeight: 700 }}>{m.name}</td>
                                <td>{m.class_name || '—'}</td>
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
                                        : 'info'
                                    }
                                  >
                                    {d.pay_status.toUpperCase()}
                                  </ModernBadge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </ModernTable>
                    </TableWrapper>
                  )}
                </div>
              )}

              {/* Family View 3: Family Payment History */}
              {activeFamilyView === 'history' && (
                <div>
                  {familyPaymentHistoryGroups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', opacity: 0.65 }}>
                      No payment receipts recorded yet for this family.
                    </div>
                  ) : (
                    <TableWrapper>
                      <ModernTable>
                        <thead>
                          <tr>
                            <th>Batch / Receipt #</th>
                            <th>Date</th>
                            <th>Siblings & Receipts</th>
                            <th>Method</th>
                            <th style={{ textAlign: 'right' }}>Total Paid</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familyPaymentHistoryGroups.map((g) => (
                            <tr key={g.key}>
                              <td>
                                <ModernBadge
                                  $variant={g.isMulti ? 'purple' : 'success'}
                                  style={{ fontFamily: 'monospace', fontWeight: 800 }}
                                >
                                  {g.label}
                                </ModernBadge>
                              </td>
                              <td style={{ fontSize: '0.76rem' }}>{formatFeeDate(g.paidAt)}</td>
                              <td>
                                {g.grp.map(({ receipt, member }) => (
                                  <div key={receipt.id} style={{ fontSize: '0.74rem' }}>
                                    <strong>{member.name}</strong> ({member.class_name || '—'}) •{' '}
                                    <span style={{ fontFamily: 'monospace' }}>#{receipt.receipt_no}</span>:{' '}
                                    <strong style={{ color: '#059669' }}>
                                      {formatFeeCurrency(receipt.amount)}
                                    </strong>
                                  </div>
                                ))}
                              </td>
                              <td>
                                <ModernBadge $variant="info" style={{ textTransform: 'uppercase' }}>
                                  {g.method.replace('_', ' ')}
                                </ModernBadge>
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 900,
                                  color: '#059669',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {formatFeeCurrency(g.totalAmount)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <ModernButton
                                  type="button"
                                  $size="sm"
                                  $variant="primary"
                                  onClick={() => {
                                    const famRec = buildFamilyReceiptFromReceipts(
                                      selectedFamily,
                                      g.recs,
                                      g.label
                                    );
                                    setFamilyReceiptResult(famRec);
                                  }}
                                >
                                  <Print fontSize="inherit" /> Family Receipt
                                </ModernButton>
                              </td>
                            </tr>
                          ))}
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
            <h3
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1.1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {posMode === 'family' ? (
                <>
                  <FamilyRestroom style={{ color: '#059669' }} /> Collect Family Payment
                </>
              ) : (
                <>
                  <PointOfSale style={{ color: '#2563eb' }} /> Collect Student Payment
                </>
              )}
            </h3>

            {(posMode === 'student' && !selectedStudent) || (posMode === 'family' && !selectedFamily) ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.6, fontSize: '0.85rem' }}>
                {posMode === 'family'
                  ? 'Search and select a family on the left to collect combined sibling fees.'
                  : 'Search and select a student on the left to receive fees.'}
              </div>
            ) : (
              <form onSubmit={handleCollectPayment} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                      color: '#64748b',
                    }}
                  >
                    {posMode === 'family' && familyAllocMode === 'custom'
                      ? 'CUSTOM SIBLING SPLIT TOTAL (RS):'
                      : 'PAYMENT AMOUNT (RS):'}
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    step="0.01"
                    disabled={posMode === 'family' && familyAllocMode === 'custom'}
                    value={posMode === 'family' ? effectiveFamilyPayAmount : payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      fontSize: '1.3rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color: posMode === 'family' ? '#059669' : '#2563eb',
                      padding: '0.6rem 0.75rem',
                    }}
                    required
                  />
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    {posMode === 'student' ? (
                      <ModernButton
                        type="button"
                        $size="sm"
                        $variant="ghost"
                        onClick={() => setPayAmount(totalOutstanding)}
                      >
                        Full Due ({formatFeeCurrency(totalOutstanding)})
                      </ModernButton>
                    ) : (
                      selectedFamily && (
                        <>
                          <ModernButton
                            type="button"
                            $size="sm"
                            $variant="ghost"
                            onClick={() => {
                              setFamilyAllocMode('auto');
                              setSelectedSiblingIds(selectedFamily.members.map((m) => m.student_id));
                              setPayAmount(selectedFamily.total_due);
                            }}
                          >
                            Full Family Due ({formatFeeCurrency(selectedFamily.total_due)})
                          </ModernButton>
                          {selectedFamily.total_overdue > 0 && (
                            <ModernButton
                              type="button"
                              $size="sm"
                              $variant="ghost"
                              onClick={() => {
                                setFamilyAllocMode('auto');
                                setPayAmount(selectedFamily.total_overdue);
                              }}
                            >
                              Overdue ({formatFeeCurrency(selectedFamily.total_overdue)})
                            </ModernButton>
                          )}
                        </>
                      )
                    )}
                  </div>
                </div>

                {/* Live Sibling Distribution Preview in Family Mode */}
                {posMode === 'family' && selectedFamily && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.07)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: '0.3rem', color: '#059669' }}>
                      SIBLING ALLOCATION PREVIEW:
                    </div>
                    {selectedFamily.members.map((m) => {
                      const amt = Number(liveFamilyAllocations[m.student_id] || 0);
                      if (amt <= 0) return null;
                      return (
                        <div
                          key={m.student_id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '2px 0',
                            borderBottom: '1px dashed rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span>
                            {m.name} ({m.class_name || '—'})
                          </span>
                          <strong style={{ fontFamily: 'monospace' }}>{formatFeeCurrency(amt)}</strong>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                      color: '#64748b',
                    }}
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                      color: '#64748b',
                    }}
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                      color: '#64748b',
                    }}
                  >
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
                  disabled={
                    submitting ||
                    (posMode === 'family' ? effectiveFamilyPayAmount <= 0 : payAmount <= 0)
                  }
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  <CheckCircle fontSize="small" />
                  {submitting
                    ? 'Allocating Payment...'
                    : posMode === 'family'
                    ? `Receive Family Payment (${formatFeeCurrency(effectiveFamilyPayAmount)})`
                    : `Receive ${formatFeeCurrency(payAmount)}`}
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

      {/* Printable Individual Receipt Modal */}
      {receiptResult && (
        <PrintReceiptModal receipt={receiptResult} onClose={() => setReceiptResult(null)} />
      )}

      {/* Printable Consolidated Family Receipt Modal */}
      {familyReceiptResult && (
        <PrintFamilyReceiptModal
          familyReceipt={familyReceiptResult}
          onClose={() => setFamilyReceiptResult(null)}
        />
      )}

      {/* Printable 3-Copy Family Challan Modal */}
      {printFamilyChallan && (
        <PrintFamilyChallanModal
          family={printFamilyChallan}
          onClose={() => setPrintFamilyChallan(null)}
        />
      )}
    </div>
  );
};
export default CounterTab;
