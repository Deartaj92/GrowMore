import React, { useState, useEffect } from 'react';
import {
  PointOfSale,
  Search,
  Payment,
  Receipt,
  CheckCircle,
  Print,
  Close,
  Lock,
  LockOpen,
  Bolt,
  AccountBalance,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/useToast';
import {
  FeeDemand,
  PaymentMethod,
  CashierShift,
  CollectPaymentResult,
} from '../../types/feeLedger';
import {
  fetchDemandByChallanNo,
  searchPosDemands,
  collectFeePayment,
  collectStudentMultiPayment,
  fetchStudentUnpaidDemands,
  getActiveShift,
  openCashierShift,
  closeCashierShift,
} from '../../services/feeLedgerService';
import {
  DenseContainer,
  DenseHeader,
  StatsStrip,
  StatCard,
  DenseCard,
  CompactTable,
  DenseBadge,
  CompactButton,
  DenseSelect,
  DenseInput,
  SuggestionsDropdown,
  SuggestionItem,
  formatFeeDate,
} from './FeeSharedComponents';

export const FeeCounterPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const cashierId = user?.id || 1;

  const [activeShift, setActiveShiftState] = useState<CashierShift | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState(0);

  // Challan Search & Payment Form
  const [challanQuery, setChallanQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FeeDemand[]>([]);
  const [suggestions, setSuggestions] = useState<FeeDemand[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [searching, setSearching] = useState(false);
  const [activeDemand, setActiveDemand] = useState<FeeDemand | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [refNo, setRefNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [payerName, setPayerName] = useState('');
  const [processing, setProcessing] = useState(false);

  // Receipt Modal
  const [receiptResult, setReceiptResult] = useState<CollectPaymentResult | null>(null);

  useEffect(() => {
    loadShift();
  }, [schoolId, cashierId]);

  // Live Auto-Suggestions Effect
  useEffect(() => {
    const q = challanQuery.trim();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchPosDemands(schoolId, q);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Error fetching search suggestions', err);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [challanQuery, schoolId]);

  const loadShift = async () => {
    try {
      const shift = await getActiveShift(schoolId, cashierId);
      setActiveShiftState(shift);
    } catch (err: any) {
      console.error('Failed to load active shift', err);
    }
  };

  const handleOpenShift = async () => {
    try {
      const shift = await openCashierShift(schoolId, cashierId, openingFloat);
      setActiveShiftState(shift);
      setShiftModalOpen(false);
      showToast('Cashier shift opened successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to open shift.', 'error');
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    const expected = Number(activeShift.opening_cash_float || 0) + Number(activeShift.total_cash_collected || 0);
    const actual = prompt(`Enter physical cash counted (Expected: Rs. ${expected.toLocaleString()}):`);
    if (actual === null) return;

    try {
      await closeCashierShift(activeShift.id, Number(actual), 'Reconciled at counter close');
      showToast('Shift drawer reconciled and closed!', 'success');
      loadShift();
    } catch (err: any) {
      showToast(err.message || 'Failed to close shift.', 'error');
    }
  };

  // Multi-Challan Student Payment State
  const [studentDemands, setStudentDemands] = useState<FeeDemand[]>([]);
  const [selectedDemandIds, setSelectedDemandIds] = useState<number[]>([]);

  const selectDemand = async (demand: FeeDemand) => {
    setActiveDemand(demand);
    setPayerName(demand.snapshot_data?.student_name || '');
    try {
      const allUnpaid = await fetchStudentUnpaidDemands(schoolId, demand.student_id);
      if (allUnpaid && allUnpaid.length > 0) {
        setStudentDemands(allUnpaid);
        const ids = allUnpaid.map((d) => d.id);
        setSelectedDemandIds(ids);
        const totalDue = allUnpaid.reduce((acc, d) => acc + Number(d.total_balance_amount || 0), 0);
        setPayAmount(totalDue);
      } else {
        setStudentDemands([demand]);
        setSelectedDemandIds([demand.id]);
        setPayAmount(Number(demand.total_balance_amount));
      }
    } catch (err) {
      setStudentDemands([demand]);
      setSelectedDemandIds([demand.id]);
      setPayAmount(Number(demand.total_balance_amount));
    }
  };

  const toggleDemandSelection = (id: number) => {
    setSelectedDemandIds((prev) => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter((dId) => dId !== id) : [...prev, id];
      const selectedDemands = studentDemands.filter((d) => next.includes(d.id));
      const newTotal = selectedDemands.reduce((acc, d) => acc + Number(d.total_balance_amount || 0), 0);
      setPayAmount(newTotal);
      return next;
    });
  };

  const handleSelectSuggestion = (demand: FeeDemand) => {
    selectDemand(demand);
    setChallanQuery(demand.snapshot_data?.student_name || demand.challan_no);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearchChallan();
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      handleSearchChallan();
    }
  };

  const handleSearchChallan = async () => {
    const q = challanQuery.trim();
    if (!q) return;
    try {
      setSearching(true);
      setShowSuggestions(false);
      const results = await searchPosDemands(schoolId, q);
      setSearchResults(results);
      if (results.length === 0) {
        showToast(`No demands found matching "${q}".`, 'error');
        setActiveDemand(null);
        setStudentDemands([]);
      } else if (results.length === 1) {
        selectDemand(results[0]);
        showToast(`Loaded unpaid demands for ${results[0].snapshot_data?.student_name || 'student'}.`, 'success');
      } else {
        showToast(`Found ${results.length} matching demands. Select a student below.`, 'info');
        selectDemand(results[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'Error looking up challan or student.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!activeDemand) return;
    if (!activeShift) {
      showToast('Open cashier drawer before collecting payments.', 'error');
      return;
    }
    if (payAmount <= 0) {
      showToast('Payment amount must be greater than zero.', 'error');
      return;
    }

    const selectedDemandsList = studentDemands.filter((d) => selectedDemandIds.includes(d.id));
    const totalSelectedDue = selectedDemandsList.reduce((acc, d) => acc + Number(d.total_balance_amount || 0), 0);

    if (payAmount > totalSelectedDue && totalSelectedDue > 0) {
      showToast(`Payment amount exceeds total selected balance (Rs. ${totalSelectedDue.toLocaleString()}).`, 'error');
      return;
    }

    try {
      setProcessing(true);
      const idempotencyKey = `MULTI-PAY-${activeDemand.student_id}-${Date.now()}`;

      const res = await collectStudentMultiPayment({
        p_school_id: schoolId,
        p_student_id: activeDemand.student_id,
        p_received_amount: payAmount,
        p_payment_method: payMethod,
        p_collector_user_id: cashierId,
        p_idempotency_key: idempotencyKey,
        p_reference_no: refNo || null,
        p_bank_name: bankName || null,
        p_payer_name: payerName || null,
        p_shift_id: activeShift.id,
        p_selected_demand_ids: selectedDemandIds.length > 0 ? selectedDemandIds : null,
      });

      showToast(`Collected Rs. ${res.received_amount.toLocaleString()} across ${res.demands_count} challan(s)! Receipt #${res.receipt_no}`, 'success');
      setReceiptResult(res as any);

      await selectDemand(activeDemand);
      loadShift();
    } catch (err: any) {
      showToast(err.message || 'Payment collection failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const totalStudentDue = studentDemands.reduce((acc, d) => acc + Number(d.total_balance_amount || 0), 0);
  const selectedDemandsList = studentDemands.filter((d) => selectedDemandIds.includes(d.id));
  const totalSelectedDue = selectedDemandsList.reduce((acc, d) => acc + Number(d.total_balance_amount || 0), 0);

  // Compute live waterfall allocation preview across student demands
  let tempPay = payAmount;
  const waterfallPreview = studentDemands.map((d) => {
    const isChecked = selectedDemandIds.includes(d.id);
    const balance = Number(d.total_balance_amount || 0);
    let allocated = 0;
    if (isChecked && tempPay > 0) {
      allocated = Math.min(tempPay, balance);
      tempPay -= allocated;
    }
    return {
      ...d,
      isChecked,
      allocated,
      remainingBalanceAfter: balance - allocated,
    };
  });

  return (
    <DenseContainer>
      {/* Header */}
      <DenseHeader>
        <div className="title-group">
          <h1>
            <PointOfSale style={{ color: '#2563eb', fontSize: '1.4rem' }} /> Fee Counter (POS)
          </h1>
          <span className="subtitle">Advanced Multi-Challan Transactional Desk</span>
        </div>

        <div className="actions-group">
          {activeShift ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <DenseBadge $variant="success">Shift #{activeShift.id} Active</DenseBadge>
              <CompactButton $variant="danger" onClick={handleCloseShift}>
                <Lock fontSize="inherit" /> Close Drawer
              </CompactButton>
            </div>
          ) : (
            <CompactButton $variant="primary" onClick={() => setShiftModalOpen(true)}>
              <LockOpen fontSize="inherit" /> Open Cashier Shift
            </CompactButton>
          )}
        </div>
      </DenseHeader>

      {/* Cashier Live Drawer Stats */}
      {activeShift && (
        <StatsStrip>
          <StatCard $accentColor="#3b82f6">
            <span className="stat-label">Opening Float</span>
            <div className="stat-val-row">
              <span className="stat-val">Rs. {Number(activeShift.opening_cash_float).toLocaleString()}</span>
              <span className="stat-sub">Drawer Base</span>
            </div>
          </StatCard>

          <StatCard $accentColor="#10b981">
            <span className="stat-label">Cash Collected</span>
            <div className="stat-val-row">
              <span className="stat-val">Rs. {Number(activeShift.total_cash_collected).toLocaleString()}</span>
              <span className="stat-sub">Live Total</span>
            </div>
          </StatCard>

          <StatCard $accentColor="#6366f1">
            <span className="stat-label">Bank / Online</span>
            <div className="stat-val-row">
              <span className="stat-val">
                Rs. {(Number(activeShift.total_bank_collected) + Number(activeShift.total_online_collected)).toLocaleString()}
              </span>
              <span className="stat-sub">Direct Deposit</span>
            </div>
          </StatCard>

          <StatCard $accentColor="#059669">
            <span className="stat-label">Expected Drawer Cash</span>
            <div className="stat-val-row">
              <span className="stat-val">
                Rs. {(Number(activeShift.opening_cash_float) + Number(activeShift.total_cash_collected)).toLocaleString()}
              </span>
              <span className="stat-sub">Float + Cash</span>
            </div>
          </StatCard>
        </StatsStrip>
      )}

      {/* Two Column POS Workstation */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '0.75rem', alignItems: 'start' }}>
        {/* Left Column: Quick Lookup & Entry */}
        <div>
          <DenseCard style={{ marginBottom: '0.75rem', position: 'relative' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', opacity: 0.7 }}>
              Search Student / Scan Challan
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', position: 'relative' }}>
              <DenseInput
                type="text"
                placeholder="Search by Name, Father, Roll #, Student ID, Challan..."
                value={challanQuery}
                onChange={(e) => setChallanQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKeyDown}
              />
              <CompactButton $variant="primary" onClick={handleSearchChallan} disabled={searching}>
                <Search fontSize="inherit" /> {searching ? '...' : 'Search'}
              </CompactButton>

              {showSuggestions && suggestions.length > 0 && (
                <SuggestionsDropdown>
                  {suggestions.map((d, index) => (
                    <SuggestionItem
                      key={d.id}
                      $selected={index === selectedIndex}
                      onMouseDown={() => handleSelectSuggestion(d)}
                    >
                      <div>
                        <div className="name">
                          {d.snapshot_data?.student_name || `Student #${d.student_id}`}
                        </div>
                        <div className="meta">
                          Father: {d.snapshot_data?.father_name || '—'} | Roll: {d.snapshot_data?.roll_number || '—'}
                        </div>
                        <div className="challan">{d.challan_no}</div>
                      </div>
                      <div className="amount">
                        <div style={{ color: Number(d.total_balance_amount) > 0 ? '#ef4444' : '#10b981' }}>
                          Rs. {Number(d.total_balance_amount).toLocaleString()}
                        </div>
                        <DenseBadge $variant={d.status === 'issued' ? 'warning' : d.status === 'paid' ? 'success' : 'neutral'}>
                          {d.status}
                        </DenseBadge>
                      </div>
                    </SuggestionItem>
                  ))}
                </SuggestionsDropdown>
              )}
            </div>
          </DenseCard>

          {searchResults.length > 1 && (
            <DenseCard style={{ marginBottom: '0.75rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: '0.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Matching Results ({searchResults.length})</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.7 }}>Click student to select</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '240px', overflowY: 'auto' }}>
                {searchResults.map((d) => {
                  const isSelected = activeDemand?.id === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => selectDemand(d)}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: '5px',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(148, 163, 184, 0.2)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {d.snapshot_data?.student_name || `Student #${d.student_id}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                          Father: {d.snapshot_data?.father_name || 'N/A'} | Roll #: {d.snapshot_data?.roll_number || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>
                          Challan: {d.challan_no}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: Number(d.total_balance_amount) > 0 ? '#ef4444' : '#10b981' }}>
                          Rs. {Number(d.total_balance_amount).toLocaleString()}
                        </div>
                        <DenseBadge $variant={d.status === 'issued' ? 'warning' : d.status === 'paid' ? 'success' : 'neutral'}>
                          {d.status}
                        </DenseBadge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DenseCard>
          )}

          {activeDemand && (
            <DenseCard>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem', opacity: 0.7 }}>
                Collection Parameters
              </div>

              {/* Total & Balance Summary */}
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span>Unpaid Challans:</span>
                  <span className="num">{studentDemands.length} Challan(s)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span>Total Student Due:</span>
                  <span className="num" style={{ color: '#ef4444', fontWeight: 700 }}>
                    Rs. {totalStudentDue.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    paddingTop: '0.3rem',
                    borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                    fontSize: '0.95rem',
                  }}
                >
                  <span>Selected Balance:</span>
                  <span className="num" style={{ color: '#ef4444' }}>
                    Rs. {totalSelectedDue.toLocaleString()}
                  </span>
                </div>
              </div>

              {totalSelectedDue <= 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                  }}
                >
                  <CheckCircle fontSize="small" style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  Selected demands are fully paid
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                      Collecting Amount (Rs.)
                    </label>
                    <DenseInput
                      type="number"
                      min="1"
                      max={totalSelectedDue}
                      value={payAmount || ''}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>

                  {/* Fast Amount Shortcuts */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <CompactButton
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem' }}
                      onClick={() => setPayAmount(totalSelectedDue)}
                    >
                      Full Selected (Rs. {totalSelectedDue.toLocaleString()})
                    </CompactButton>
                    <CompactButton
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem' }}
                      onClick={() => setPayAmount(Math.round(totalSelectedDue / 2))}
                    >
                      50% Split
                    </CompactButton>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                        Method
                      </label>
                      <DenseSelect
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                      >
                        <option value="cash">Cash Desk</option>
                        <option value="bank_transfer">Bank Wire</option>
                        <option value="cheque">Cheque</option>
                        <option value="easypaisa">EasyPaisa</option>
                        <option value="jazzcash">JazzCash</option>
                        <option value="pos_card">Card</option>
                      </DenseSelect>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                        Payer Name
                      </label>
                      <DenseInput
                        type="text"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                      />
                    </div>
                  </div>

                  <CompactButton
                    $variant="success"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', marginTop: '0.3rem', fontSize: '0.9rem' }}
                    disabled={processing || payAmount <= 0}
                    onClick={handleProcessPayment}
                  >
                    <Payment fontSize="inherit" />
                    {processing ? 'Processing...' : `Receive Rs. ${payAmount.toLocaleString()}`}
                  </CompactButton>
                </div>
              )}
            </DenseCard>
          )}
        </div>

        {/* Right Column: High-Density Demand Inspection & Waterfall Preview */}
        <DenseCard style={{ padding: '0.8rem' }}>
          {activeDemand ? (
            <div>
              {/* Student Header Snapshot */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.6rem',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  marginBottom: '0.6rem',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                    {activeDemand.snapshot_data?.student_name}
                  </h3>
                  <div style={{ fontSize: '0.74rem', opacity: 0.7, marginTop: '0.1rem' }}>
                    Student ID: #{activeDemand.student_id} | Father: {activeDemand.snapshot_data?.father_name} | Class: {activeDemand.snapshot_data?.class_name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Total Student Balance</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: totalStudentDue > 0 ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>
                    Rs. {totalStudentDue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Multi-Challan Waterfall Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 0.35rem 0' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7 }}>
                  Multi-Challan Outstanding Breakdown ({studentDemands.length})
                </div>
                <div style={{ fontSize: '0.7rem' }}>
                  <button
                    onClick={() => setSelectedDemandIds(studentDemands.map((d) => d.id))}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, padding: '0 4px' }}
                  >
                    Select All
                  </button> | 
                  <button
                    onClick={() => setSelectedDemandIds([])}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600, padding: '0 4px' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <CompactTable>
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>Pay</th>
                    <th>Challan #</th>
                    <th>Month / Year</th>
                    <th>Due Date</th>
                    <th>Net Billed</th>
                    <th>Balance Due</th>
                    <th>Waterfall Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {waterfallPreview.map((d) => (
                    <tr key={d.id} style={{ opacity: d.isChecked ? 1 : 0.5 }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={d.isChecked}
                          onChange={() => toggleDemandSelection(d.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <strong>{d.challan_no}</strong>
                      </td>
                      <td>
                        <DenseBadge $variant="neutral">
                          {d.billing_month
                            ? `${new Date(2000, d.billing_month - 1, 1).toLocaleString('en-US', { month: 'short' })} ${d.billing_year}`
                            : `Year ${d.billing_year}`}
                        </DenseBadge>
                      </td>
                      <td>{formatFeeDate(d.due_date)}</td>
                      <td className="num">Rs. {Number(d.total_net_amount).toLocaleString()}</td>
                      <td className="num" style={{ color: '#ef4444', fontWeight: 700 }}>
                        Rs. {Number(d.total_balance_amount).toLocaleString()}
                      </td>
                      <td>
                        {d.allocated >= Number(d.total_balance_amount) ? (
                          <DenseBadge $variant="success">
                            Rs. {d.allocated.toLocaleString()} (FULL)
                          </DenseBadge>
                        ) : d.allocated > 0 ? (
                          <DenseBadge $variant="warning">
                            Rs. {d.allocated.toLocaleString()} (PARTIAL)
                          </DenseBadge>
                        ) : (
                          <DenseBadge $variant="neutral">
                            UNPAID
                          </DenseBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </CompactTable>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.4 }}>
              <Receipt style={{ fontSize: '3rem', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No Active Student Selected</div>
              <div style={{ fontSize: '0.78rem' }}>Scan or search for a Student Name, Father, Roll # or Challan # on the left panel.</div>
            </div>
          )}
        </DenseCard>
      </div>

      {/* MODAL: OPEN SHIFT */}
      {shiftModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <DenseCard style={{ maxWidth: '350px', width: '100%', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Open Cashier Shift Drawer</h3>
              <Close style={{ cursor: 'pointer' }} onClick={() => setShiftModalOpen(false)} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                Opening Cash Float (Rs.)
              </label>
              <input
                type="number"
                min="0"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <CompactButton onClick={() => setShiftModalOpen(false)}>Cancel</CompactButton>
              <CompactButton $variant="primary" onClick={handleOpenShift}>
                <LockOpen fontSize="inherit" /> Confirm Open
              </CompactButton>
            </div>
          </DenseCard>
        </div>
      )}

      {/* MODAL: PRINTABLE IMMUTABLE RECEIPT */}
      {receiptResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <DenseCard
            style={{
              maxWidth: '400px',
              width: '100%',
              padding: '1.25rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>FEE PAYMENT RECEIPT</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>GrowMore School System</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{new Date().toLocaleString()}</div>
            </div>

            <div style={{ fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>
              <div>Receipt No: <strong>{receiptResult.receipt_no}</strong></div>
              <div>Challan No: <strong>{receiptResult.snapshot?.challan_no}</strong></div>
              <div>Student: {receiptResult.snapshot?.student_info?.student_name}</div>
              <div>Class: {receiptResult.snapshot?.student_info?.class_name}</div>
              <div>Method: {receiptResult.snapshot?.payment_method?.toUpperCase()}</div>
            </div>

            <div style={{ borderTop: '1px dashed #94a3b8', borderBottom: '1px dashed #94a3b8', padding: '0.4rem 0', margin: '0.4rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                <span>PAID AMOUNT:</span>
                <span>Rs. {Number(receiptResult.received_amount).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                <span>Remaining Due:</span>
                <span>Rs. {Number(receiptResult.remaining_balance).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.68rem', textAlign: 'center', margin: '0.6rem 0', opacity: 0.6 }}>
              * Immutable Financial Receipt *
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <CompactButton $variant="primary" onClick={() => window.print()}>
                <Print fontSize="inherit" /> Print Slip
              </CompactButton>
              <CompactButton onClick={() => setReceiptResult(null)}>Close</CompactButton>
            </div>
          </DenseCard>
        </div>
      )}
    </DenseContainer>
  );
};

export default FeeCounterPage;
