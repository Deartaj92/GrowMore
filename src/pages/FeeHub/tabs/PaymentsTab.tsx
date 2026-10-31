import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import {
  Receipt,
  Print,
  FileDownload,
  Refresh,
  FamilyRestroom,
  Person,
  Assessment,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import {
  FeeReceipt,
  CollectPaymentResult,
  CollectFamilyPaymentResult,
  FamilyFeeSummary,
} from '../../../types/feeLedger';
import {
  fetchReceipts,
  fetchFamiliesWithFeeSummary,
  buildFamilyReceiptFromReceipts,
  extractFamilyBatchRef,
  cleanReferenceDisplay,
} from '../../../services/feeLedgerService';
import { isDark } from '../../../styles/DesignSystem';
import {
  HubCard,
  HubFilterRow,
  StatsGrid,
  StatBox,
  ModernInput,
  ModernSelect,
  ModernButton,
  ModernTable,
  TableWrapper,
  ModernBadge,
  formatFeeCurrency,
  formatFeeDate,
} from '../FeeHubStyles';
import PrintReceiptModal from '../components/PrintReceiptModal';
import PrintFamilyReceiptModal from '../components/PrintFamilyReceiptModal';

const ModeToggleBar = styled.div`
  display: inline-flex;
  background: ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.06)' : '#f1f5f9')};
  padding: 3px;
  border-radius: 6px;
  gap: 3px;
  flex-wrap: wrap;
`;

const ModeToggleBtn = styled.button<{ $active: boolean }>`
  border: none;
  background: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#334155' : '#ffffff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#f8fafc' : '#0f172a') : isDark(theme) ? '#94a3b8' : '#64748b'};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-size: 0.76rem;
  padding: 0.36rem 0.75rem;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s ease;
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none')};
`;

export const PaymentsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;

  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [families, setFamilies] = useState<FamilyFeeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode
  const [viewMode, setViewMode] = useState<'individual' | 'family_batches' | 'family_summary'>('individual');

  // Filters
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<number | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Print modals
  const [selectedReceipt, setSelectedReceipt] = useState<CollectPaymentResult | null>(null);
  const [selectedFamilyReceipt, setSelectedFamilyReceipt] = useState<CollectFamilyPaymentResult | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recData, famData] = await Promise.all([
        fetchReceipts(schoolId, { limit: 350 }),
        fetchFamiliesWithFeeSummary(schoolId),
      ]);
      setReceipts(recData);
      setFamilies(famData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payment history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  // Lookup maps: studentId -> FamilyFeeSummary, familyId -> FamilyFeeSummary
  const { studentFamilyMap, familyByIdMap } = useMemo(() => {
    const sMap = new Map<number, FamilyFeeSummary>();
    const fMap = new Map<number, FamilyFeeSummary>();
    families.forEach((f) => {
      fMap.set(f.family_id, f);
      f.members.forEach((m) => sMap.set(m.student_id, f));
    });
    return { studentFamilyMap: sMap, familyByIdMap: fMap };
  }, [families]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return receipts.filter((r) => {
      const sid = Number(r.snapshot?.student_id || 0);
      const fam = studentFamilyMap.get(sid);

      if (familyFilter !== 'all' && fam?.family_id !== Number(familyFilter)) {
        return false;
      }
      if (methodFilter !== 'all' && r.payment_method !== methodFilter) {
        return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      if (dateFilter !== 'all') {
        const pDate = new Date(r.paid_at);
        const pDateStr = pDate.toISOString().split('T')[0];
        if (dateFilter === 'today' && pDateStr !== todayStr) return false;
        if (dateFilter === 'week') {
          const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        }
        if (dateFilter === 'month') {
          if (pDate.getMonth() !== now.getMonth() || pDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      if (!q) return true;
      const recNo = (r.receipt_no || '').toLowerCase();
      const payer = (r.payer_name || '').toLowerCase();
      const ref = (r.reference_no || '').toLowerCase();
      const sName = (r.snapshot?.student_name || '').toLowerCase();
      const fName = (r.snapshot?.father_name || '').toLowerCase();
      const roll = (r.snapshot?.roll_number || '').toLowerCase();
      const famName = (fam?.family_name || '').toLowerCase();
      const famPhone = (fam?.contact_number || '').toLowerCase();
      const challans = (r.snapshot?.allocations || [])
        .map((a: any) => (a.challan_no || '').toLowerCase())
        .join(' ');

      return (
        recNo.includes(q) ||
        payer.includes(q) ||
        ref.includes(q) ||
        sName.includes(q) ||
        fName.includes(q) ||
        roll.includes(q) ||
        famName.includes(q) ||
        famPhone.includes(q) ||
        challans.includes(q)
      );
    });
  }, [receipts, search, familyFilter, methodFilter, statusFilter, dateFilter, studentFamilyMap]);

  // Grouped Family Payment Batches
  const familyBatchGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        batchLabel: string;
        family: FamilyFeeSummary;
        receipts: FeeReceipt[];
        paidAt: string;
        method: string;
        status: string;
        referenceNo: string;
        totalAmount: number;
        totalAllocated: number;
        totalWallet: number;
      }
    >();

    filteredReceipts.forEach((r) => {
      const sid = Number(r.snapshot?.student_id || 0);
      const fam = studentFamilyMap.get(sid);
      if (!fam) return;

      const batchRef = extractFamilyBatchRef(r.reference_no);
      const minuteKey = r.paid_at ? r.paid_at.slice(0, 16) : '';
      const groupKey =
        batchRef ||
        `FAMGRP-${fam.family_id}-${minuteKey}-${r.payment_method}-${r.collector_user_id || 0}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          batchLabel: batchRef || `FAM-${fam.family_id}-${r.receipt_no}`,
          family: fam,
          receipts: [],
          paidAt: r.paid_at,
          method: r.payment_method,
          status: r.status,
          referenceNo: cleanReferenceDisplay(r.reference_no),
          totalAmount: 0,
          totalAllocated: 0,
          totalWallet: 0,
        });
      }
      const g = groups.get(groupKey)!;
      g.receipts.push(r);
      g.totalAmount += Number(r.amount || 0);
      g.totalAllocated += Number(r.allocated_amount || 0);
      g.totalWallet += Number(r.wallet_amount || 0);
    });

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );
  }, [filteredReceipts, studentFamilyMap]);

  // Analytics Metrics
  const stats = useMemo(() => {
    const totalAmount = filteredReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayAmount = filteredReceipts
      .filter((r) => r.paid_at && r.paid_at.startsWith(todayStr))
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const familyLinkedAmount = filteredReceipts
      .filter((r) => studentFamilyMap.has(Number(r.snapshot?.student_id || 0)))
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    return {
      totalAmount,
      todayAmount,
      totalCount: filteredReceipts.length,
      familyLinkedAmount,
      familyBatchesCount: familyBatchGroups.length,
    };
  }, [filteredReceipts, studentFamilyMap, familyBatchGroups]);

  // Open Individual Print Modal
  const handleOpenPrint = (r: FeeReceipt) => {
    const res: CollectPaymentResult = {
      success: true,
      receipt_id: r.id,
      receipt_no: r.receipt_no,
      amount: Number(r.amount),
      allocated_amount: Number(r.allocated_amount),
      wallet_amount: Number(r.wallet_amount),
      balance_after: r.snapshot?.balance_after ?? 0,
      payment_method: r.payment_method,
      student_name: r.snapshot?.student_name,
      father_name: r.snapshot?.father_name,
      roll_number: r.snapshot?.roll_number,
      allocations: r.snapshot?.allocations || [],
      snapshot: {
        ...r.snapshot,
        paid_at: r.paid_at,
      },
    };
    setSelectedReceipt(res);
  };

  // Open Consolidated Family Receipt for a single receipt (pulls its batch peers if any)
  const handleOpenFamilyReceiptForSingle = (r: FeeReceipt) => {
    const sid = Number(r.snapshot?.student_id || 0);
    const fam = studentFamilyMap.get(sid);
    if (!fam) return;

    const batchRef = extractFamilyBatchRef(r.reference_no);
    const peerReceipts = batchRef
      ? receipts.filter((x) => extractFamilyBatchRef(x.reference_no) === batchRef)
      : [r];

    const famRec = buildFamilyReceiptFromReceipts(
      fam,
      peerReceipts.length > 0 ? peerReceipts : [r],
      batchRef || undefined
    );
    setSelectedFamilyReceipt(famRec);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) {
      showToast('No receipt data to export.', 'warning');
      return;
    }

    const headers = [
      'Receipt No',
      'FamilyBatchRef',
      'Family Name',
      'Date & Time',
      'Student Name',
      'Roll Number',
      'Father Name',
      'Payment Method',
      'Amount (Rs)',
      'Allocated to Dues (Rs)',
      'Wallet / Advance (Rs)',
      'Reference / Notes',
      'Status',
    ];

    const rows = filteredReceipts.map((r) => {
      const sid = Number(r.snapshot?.student_id || 0);
      const fam = studentFamilyMap.get(sid);
      const batchRef = extractFamilyBatchRef(r.reference_no) || '';
      return [
        r.receipt_no,
        batchRef,
        `"${fam?.family_name || ''}"`,
        new Date(r.paid_at).toLocaleString(),
        `"${r.snapshot?.student_name || r.payer_name || ''}"`,
        `"${r.snapshot?.roll_number || ''}"`,
        `"${r.snapshot?.father_name || ''}"`,
        r.payment_method.toUpperCase(),
        r.amount,
        r.allocated_amount,
        r.wallet_amount,
        `"${cleanReferenceDisplay(r.reference_no)}"`,
        r.status,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fee_Receipts_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Receipts exported to CSV!', 'success');
  };

  return (
    <div>
      {/* Top Level Summary Metrics */}
      <StatsGrid>
        <StatBox $accent="#059669">
          <div className="title">Total Collections</div>
          <div className="value">{formatFeeCurrency(stats.totalAmount)}</div>
          <div className="sub">{stats.totalCount} Receipts</div>
        </StatBox>

        <StatBox $accent="#2563eb">
          <div className="title">Collected Today</div>
          <div className="value">{formatFeeCurrency(stats.todayAmount)}</div>
          <div className="sub">Direct Counter Inflow</div>
        </StatBox>

        <StatBox $accent="#7c3aed">
          <div className="title">Family Collections</div>
          <div className="value">{formatFeeCurrency(stats.familyLinkedAmount)}</div>
          <div className="sub">{stats.familyBatchesCount} Family Payment Batches</div>
        </StatBox>

        <StatBox $accent="#0284c7">
          <div className="title">Active Families</div>
          <div className="value">{families.filter((f) => f.members.length > 0).length}</div>
          <div className="sub">With Linked Sibling Accounts</div>
        </StatBox>
      </StatsGrid>

      {/* Main Filter & Table Card */}
      <HubCard>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
              Fee Payment & Family Receipt History
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', opacity: 0.75 }}>
              Chronological audit trail of individual student receipts, consolidated family payment batches, and family-level summaries.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ModeToggleBar>
              <ModeToggleBtn
                type="button"
                $active={viewMode === 'individual'}
                onClick={() => setViewMode('individual')}
              >
                <Person fontSize="inherit" /> All Receipts ({filteredReceipts.length})
              </ModeToggleBtn>
              <ModeToggleBtn
                type="button"
                $active={viewMode === 'family_batches'}
                onClick={() => setViewMode('family_batches')}
              >
                <FamilyRestroom fontSize="inherit" /> Family-Wise History ({familyBatchGroups.length})
              </ModeToggleBtn>
              <ModeToggleBtn
                type="button"
                $active={viewMode === 'family_summary'}
                onClick={() => setViewMode('family_summary')}
              >
                <Assessment fontSize="inherit" /> Family Collection Summary
              </ModeToggleBtn>
            </ModeToggleBar>

            <ModernButton $variant="ghost" $size="sm" onClick={loadData} disabled={loading}>
              <Refresh fontSize="small" /> Refresh
            </ModernButton>
            <ModernButton $variant="primary" $size="sm" onClick={handleExportCSV}>
              <FileDownload fontSize="small" /> Export CSV
            </ModernButton>
          </div>
        </div>

        {/* Filter Controls */}
        <HubFilterRow style={{ marginBottom: '1rem' }}>
          <div style={{ flex: '2', minWidth: '200px', width: '100%' }}>
            <ModernInput
              placeholder="Search receipt #, family name, student name, roll #, challan #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ flex: '1', minWidth: '150px', width: '100%' }}>
            <ModernSelect
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value="all">All Families & Students</option>
              {families
                .filter((f) => f.members.length > 0)
                .map((f) => (
                  <option key={f.family_id} value={f.family_id}>
                    {f.family_name} ({f.members.length} Siblings)
                  </option>
                ))}
            </ModernSelect>
          </div>

          <div style={{ flex: '1', minWidth: '130px', width: '100%' }}>
            <ModernSelect
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash (Counter)</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="pos_card">POS Card / Debit</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="cheque">Cheque</option>
            </ModernSelect>
          </div>

          <div style={{ flex: '1', minWidth: '120px', width: '100%' }}>
            <ModernSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">All Statuses</option>
              <option value="posted">Posted (Valid)</option>
              <option value="voided">Voided</option>
            </ModernSelect>
          </div>

          <div style={{ flex: '1', minWidth: '120px', width: '100%' }}>
            <ModernSelect
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
            </ModernSelect>
          </div>
        </HubFilterRow>

        {/* ==================== VIEW 1: INDIVIDUAL RECEIPTS ==================== */}
        {viewMode === 'individual' && (
          <TableWrapper>
            <ModernTable>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date & Time</th>
                  <th>Student / Payer</th>
                  <th>Family Account</th>
                  <th>Method</th>
                  <th>Challan(s) Settled</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No payment receipts found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => {
                    const sid = Number(r.snapshot?.student_id || 0);
                    const fam = studentFamilyMap.get(sid);
                    const batchRef = extractFamilyBatchRef(r.reference_no);
                    const sName = r.snapshot?.student_name || r.payer_name || 'N/A';
                    const fName = r.snapshot?.father_name;
                    const roll = r.snapshot?.roll_number;
                    const allocations: any[] = r.snapshot?.allocations || [];

                    return (
                      <tr key={r.id}>
                        <td>
                          <ModernBadge $variant="success" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {r.receipt_no}
                          </ModernBadge>
                          {batchRef && (
                            <div
                              style={{
                                fontSize: '0.65rem',
                                fontFamily: 'monospace',
                                color: '#7c3aed',
                                fontWeight: 700,
                                marginTop: '2px',
                              }}
                            >
                              {batchRef}
                            </div>
                          )}
                        </td>

                        <td style={{ fontSize: '0.78rem' }}>
                          <span>{new Date(r.paid_at).toLocaleDateString()}</span>{' '}
                          <span style={{ opacity: 0.65 }}>
                            {new Date(r.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700 }}>{sName}</div>
                          {(roll || fName) && (
                            <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                              {roll ? `Roll: ${roll}` : ''} {fName ? `• s/o ${fName}` : ''}
                            </div>
                          )}
                        </td>

                        <td>
                          {fam ? (
                            <div>
                              <ModernBadge $variant="info">
                                {fam.family_name} (#{fam.family_id})
                              </ModernBadge>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', opacity: 0.5 }}>Individual</span>
                          )}
                        </td>

                        <td>
                          <ModernBadge
                            $variant={r.payment_method === 'cash' ? 'info' : 'purple'}
                            style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}
                          >
                            {r.payment_method.replace('_', ' ')}
                          </ModernBadge>
                          {cleanReferenceDisplay(r.reference_no) && (
                            <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '2px' }}>
                              Ref: {cleanReferenceDisplay(r.reference_no)}
                            </div>
                          )}
                        </td>

                        <td>
                          {allocations.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                              {allocations.map((a: any, idx: number) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: 'rgba(37, 99, 235, 0.12)',
                                    color: '#3b82f6',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontSize: '0.68rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                  }}
                                >
                                  {a.challan_no || `Challan #${a.demand_id}`}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>Direct / Wallet</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.88rem', color: '#10b981', fontFamily: 'monospace' }}>
                          {formatFeeCurrency(r.amount)}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <ModernBadge $variant={r.status === 'posted' ? 'success' : 'danger'}>
                            {r.status === 'posted' ? 'POSTED' : 'VOIDED'}
                          </ModernBadge>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                            <ModernButton
                              $variant="ghost"
                              $size="sm"
                              onClick={() => handleOpenPrint(r)}
                              title="View & Re-print Student Receipt"
                            >
                              <Print fontSize="small" /> Receipt
                            </ModernButton>
                            {fam && (
                              <ModernButton
                                $variant="secondary"
                                $size="sm"
                                onClick={() => handleOpenFamilyReceiptForSingle(r)}
                                title="Print Consolidated Family Receipt"
                              >
                                <FamilyRestroom fontSize="small" /> Family Slip
                              </ModernButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </ModernTable>
          </TableWrapper>
        )}

        {/* ==================== VIEW 2: FAMILY-WISE PAYMENT BATCHES ==================== */}
        {viewMode === 'family_batches' && (
          <TableWrapper>
            <ModernTable>
              <thead>
                <tr>
                  <th>Batch / Voucher Ref</th>
                  <th>Date & Time</th>
                  <th>Family Account</th>
                  <th>Siblings Covered & Receipt Breakdown</th>
                  <th>Method</th>
                  <th style={{ textAlign: 'right' }}>Dues Settled</th>
                  <th style={{ textAlign: 'right' }}>Total Family Paid</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {familyBatchGroups.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No family-linked payment transactions found.
                    </td>
                  </tr>
                ) : (
                  familyBatchGroups.map((batch) => (
                    <tr key={batch.key}>
                      <td>
                        <ModernBadge
                          $variant={batch.receipts.length > 1 ? 'purple' : 'success'}
                          style={{ fontFamily: 'monospace', fontWeight: 800 }}
                        >
                          {batch.batchLabel}
                        </ModernBadge>
                        {batch.receipts.length > 1 && (
                          <div style={{ fontSize: '0.66rem', color: '#7c3aed', fontWeight: 700, marginTop: '2px' }}>
                            {batch.receipts.length} Sibling Receipts
                          </div>
                        )}
                      </td>

                      <td style={{ fontSize: '0.76rem' }}>
                        <div>{new Date(batch.paidAt).toLocaleDateString()}</div>
                        <div style={{ opacity: 0.65 }}>
                          {new Date(batch.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800 }}>{batch.family.family_name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                          #FAM-{batch.family.family_id} • {batch.family.contact_number || '—'}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {batch.receipts.map((r) => (
                            <div key={r.id} style={{ fontSize: '0.75rem' }}>
                              <strong>{r.snapshot?.student_name || r.payer_name}</strong> •{' '}
                              <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>#{r.receipt_no}</span> •{' '}
                              <strong style={{ color: '#059669', fontFamily: 'monospace' }}>
                                {formatFeeCurrency(r.amount)}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td>
                        <ModernBadge $variant="info" style={{ textTransform: 'uppercase' }}>
                          {batch.method.replace('_', ' ')}
                        </ModernBadge>
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatFeeCurrency(batch.totalAllocated)}
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 900,
                          color: '#059669',
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {formatFeeCurrency(batch.totalAmount)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <ModernButton
                          $size="sm"
                          $variant="primary"
                          onClick={() => {
                            const famRec = buildFamilyReceiptFromReceipts(
                              batch.family,
                              batch.receipts,
                              batch.batchLabel
                            );
                            setSelectedFamilyReceipt(famRec);
                          }}
                        >
                          <Print fontSize="small" /> Print Family Receipt
                        </ModernButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ModernTable>
          </TableWrapper>
        )}

        {/* ==================== VIEW 3: FAMILY COLLECTION SUMMARY ==================== */}
        {viewMode === 'family_summary' && (
          <TableWrapper>
            <ModernTable>
              <thead>
                <tr>
                  <th>Family Account</th>
                  <th>Contact Phone</th>
                  <th>Siblings Count</th>
                  <th style={{ textAlign: 'right' }}>Receipts Count</th>
                  <th>Last Payment Date</th>
                  <th style={{ textAlign: 'right' }}>Total Billed</th>
                  <th style={{ textAlign: 'right' }}>Total Paid</th>
                  <th style={{ textAlign: 'right' }}>Current Balance Due</th>
                  <th style={{ textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {families.filter((f) => f.members.length > 0).length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No active families found.
                    </td>
                  </tr>
                ) : (
                  families
                    .filter((f) => f.members.length > 0)
                    .map((f) => (
                      <tr key={f.family_id}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{f.family_name}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>#FAM-{f.family_id}</div>
                        </td>
                        <td>{f.contact_number || '—'}</td>
                        <td>
                          <ModernBadge $variant="info">{f.members.length} Sibling(s)</ModernBadge>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{f.receipts_count}</td>
                        <td>{f.last_payment_date ? formatFeeDate(f.last_payment_date) : '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {formatFeeCurrency(f.total_billed)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            color: '#059669',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                          }}
                        >
                          {formatFeeCurrency(f.total_paid)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            color: f.total_due > 0 ? '#dc2626' : '#059669',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                          }}
                        >
                          {formatFeeCurrency(f.total_due)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <ModernButton
                            $size="sm"
                            $variant="ghost"
                            onClick={() => {
                              setFamilyFilter(f.family_id);
                              setViewMode('family_batches');
                            }}
                          >
                            Filter Receipts
                          </ModernButton>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </ModernTable>
          </TableWrapper>
        )}
      </HubCard>

      {/* Print Individual Receipt Modal */}
      {selectedReceipt && (
        <PrintReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Print Consolidated Family Receipt Modal */}
      {selectedFamilyReceipt && (
        <PrintFamilyReceiptModal
          familyReceipt={selectedFamilyReceipt}
          onClose={() => setSelectedFamilyReceipt(null)}
        />
      )}
    </div>
  );
};
export default PaymentsTab;
