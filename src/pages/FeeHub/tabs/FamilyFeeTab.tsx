import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import {
  FamilyRestroom,
  PointOfSale,
  Receipt,
  Description,
  MenuBook,
  Print,
  Refresh,
  FileDownload,
  Add,
  CheckCircle,
  Phone,
  AccountBalanceWallet,
  History,
  Visibility,
  LockOpen,
  Lock,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { isDark } from '../../../styles/DesignSystem';
import {
  FamilyFeeSummary,
  PaymentMethod,
  CashierShift,
  CollectFamilyPaymentResult,
  CollectPaymentResult,
  FeeReceipt,
  FamilyStatementEntry,
} from '../../../types/feeLedger';
import {
  fetchFamiliesWithFeeSummary,
  fetchSingleFamilyFeeSummary,
  computeFamilyPaymentWaterfall,
  collectFamilyPayment,
  buildFamilyReceiptFromReceipts,
  extractFamilyBatchRef,
  cleanReferenceDisplay,
  generateFamilyDemands,
  getFamilyStatement,
  getActiveShift,
  openShift,
  newIdempotencyKey,
} from '../../../services/feeLedgerService';
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
  ModalBackdrop,
  ModalDialog,
  formatFeeCurrency,
  formatFeeDate,
} from '../FeeHubStyles';
import PrintFamilyReceiptModal from '../components/PrintFamilyReceiptModal';
import PrintFamilyChallanModal from '../components/PrintFamilyChallanModal';
import PrintFamilyStatementModal from '../components/PrintFamilyStatementModal';
import PrintReceiptModal from '../components/PrintReceiptModal';

const SiblingChip = styled.span<{ $hasDue: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  margin: 2px 3px 2px 0;
  background: ${({ $hasDue, theme }) =>
    $hasDue
      ? 'rgba(239, 68, 68, 0.12)'
      : isDark(theme)
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ $hasDue }) => ($hasDue ? '#ef4444' : '#10b981')};
  border: 1px solid
    ${({ $hasDue }) => ($hasDue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)')};
`;

const SubTabBar = styled.div`
  display: inline-flex;
  background: ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.06)' : '#f1f5f9')};
  padding: 3px;
  border-radius: 6px;
  gap: 3px;
  flex-wrap: wrap;
`;

const SubTabBtn = styled.button<{ $active: boolean }>`
  border: none;
  background: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#334155' : '#ffffff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#f8fafc' : '#0f172a') : isDark(theme) ? '#94a3b8' : '#64748b'};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-size: 0.76rem;
  padding: 0.38rem 0.75rem;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s ease;
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none')};
`;

interface FamilyFeeTabProps {
  onPaymentCollected?: () => void;
}

export const FamilyFeeTab: React.FC<FamilyFeeTabProps> = ({ onPaymentCollected }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  const [families, setFamilies] = useState<FamilyFeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<CashierShift | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'overdue' | 'settled' | 'wallet'>('all');

  // Selected family for Inspector Drawer / Detail Panel
  const [selectedFamily, setSelectedFamily] = useState<FamilyFeeSummary | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'siblings' | 'history' | 'ledger'>('siblings');
  const [familyStatement, setFamilyStatement] = useState<FamilyStatementEntry[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Family Payment Collection Modal
  const [payModalFamily, setPayModalFamily] = useState<FamilyFeeSummary | null>(null);
  const [allocationMode, setAllocationMode] = useState<'auto' | 'custom'>('auto');
  const [selectedSiblingIds, setSelectedSiblingIds] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<number, number>>({});
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [refNo, setRefNo] = useState('');
  const [payerName, setPayerName] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);
  const idempotencyKey = useRef<string>(newIdempotencyKey());

  // Open Shift Modal (if cashier needs to open drawer before cash payment)
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(0);

  // Generate Family Demands Modal
  const [genFamilyTarget, setGenFamilyTarget] = useState<FamilyFeeSummary | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: number; name: string }>>([]);
  const [genForm, setGenForm] = useState({
    sessionId: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
  });
  const [generatingDemands, setGeneratingDemands] = useState(false);

  // Print Modals
  const [printFamilyReceipt, setPrintFamilyReceipt] = useState<CollectFamilyPaymentResult | null>(null);
  const [printSingleReceipt, setPrintSingleReceipt] = useState<CollectPaymentResult | null>(null);
  const [printFamilyChallan, setPrintFamilyChallan] = useState<FamilyFeeSummary | null>(null);
  const [printFamilyStatementOpen, setPrintFamilyStatementOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, [schoolId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [famData, activeShift, sessResp] = await Promise.all([
        fetchFamiliesWithFeeSummary(schoolId),
        getActiveShift(schoolId, userId),
        supabase
          .from('sessions')
          .select('id, name')
          .eq('school_id', schoolId)
          .order('id', { ascending: false }),
      ]);
      setFamilies(famData);
      setShift(activeShift);
      if (sessResp.data && sessResp.data.length > 0) {
        setSessions(sessResp.data);
        setGenForm((prev) => ({ ...prev, sessionId: prev.sessionId || sessResp.data![0].id }));
      }
      if (selectedFamily) {
        const updated = famData.find((f) => f.family_id === selectedFamily.family_id);
        if (updated) setSelectedFamily(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load family fee summary.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered families
  const filteredFamilies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return families.filter((f) => {
      if (statusFilter === 'due' && f.total_due <= 0) return false;
      if (statusFilter === 'overdue' && f.total_overdue <= 0) return false;
      if (statusFilter === 'settled' && (f.total_due > 0 || f.members.length === 0)) return false;
      if (statusFilter === 'wallet' && f.total_wallet <= 0) return false;

      if (!q) return true;
      if (String(f.family_id) === q || `fam-${f.family_id}` === q) return true;
      if (f.family_name.toLowerCase().includes(q)) return true;
      if (f.contact_number?.toLowerCase().includes(q)) return true;
      if (f.address?.toLowerCase().includes(q)) return true;
      return f.members.some(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.roll_number?.toLowerCase().includes(q) ||
          m.father_name?.toLowerCase().includes(q) ||
          m.class_name?.toLowerCase().includes(q)
      );
    });
  }, [families, search, statusFilter]);

  // Aggregate KPI stats
  const kpis = useMemo(() => {
    const activeFamilies = families.filter((f) => f.members.length > 0);
    const totalSiblings = activeFamilies.reduce((s, f) => s + f.members.length, 0);
    const totalBilled = activeFamilies.reduce((s, f) => s + f.total_billed, 0);
    const totalPaid = activeFamilies.reduce((s, f) => s + f.total_paid, 0);
    const totalDue = activeFamilies.reduce((s, f) => s + f.total_due, 0);
    const familiesWithDue = activeFamilies.filter((f) => f.total_due > 0).length;
    return {
      familiesCount: activeFamilies.length,
      totalSiblings,
      totalBilled,
      totalPaid,
      totalDue,
      familiesWithDue,
    };
  }, [families]);

  // Open Family Payment Modal
  const handleOpenPayModal = (fam: FamilyFeeSummary) => {
    if (fam.members.length === 0) {
      showToast('This family has no linked students yet.', 'warning');
      return;
    }
    idempotencyKey.current = newIdempotencyKey();
    setPayModalFamily(fam);
    setAllocationMode('auto');
    const defaultIds = fam.members.map((m) => m.student_id);
    setSelectedSiblingIds(defaultIds);
    setLumpSumAmount(fam.total_due);
    setPayerName(fam.family_name);
    setRefNo('');
    const waterfall = computeFamilyPaymentWaterfall(fam, fam.total_due, defaultIds);
    setCustomAmounts(waterfall);
  };

  // Compute live allocation per sibling in the payment modal
  const liveAllocations = useMemo(() => {
    if (!payModalFamily) return {};
    if (allocationMode === 'custom') {
      const out: Record<number, number> = {};
      payModalFamily.members.forEach((m) => {
        out[m.student_id] = selectedSiblingIds.includes(m.student_id)
          ? Number(customAmounts[m.student_id] || 0)
          : 0;
      });
      return out;
    }
    return computeFamilyPaymentWaterfall(payModalFamily, lumpSumAmount, selectedSiblingIds);
  }, [payModalFamily, allocationMode, lumpSumAmount, selectedSiblingIds, customAmounts]);

  const effectivePayTotal = useMemo(() => {
    return Object.values(liveAllocations).reduce((s, v) => s + Number(v || 0), 0);
  }, [liveAllocations]);

  const handleToggleSiblingSelection = (studentId: number) => {
    if (!payModalFamily) return;
    setSelectedSiblingIds((prev) => {
      const next = prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId];
      const nextDue = payModalFamily.members
        .filter((m) => next.includes(m.student_id))
        .reduce((s, m) => s + m.balance_due, 0);
      if (allocationMode === 'auto') {
        setLumpSumAmount(nextDue);
      }
      return next;
    });
  };

  // Submit Family Payment
  const handleCollectFamilyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalFamily) return;
    if (payMethod === 'cash' && !shift) {
      showToast('Please open a cashier drawer shift before accepting cash payments.', 'error');
      setOpenShiftModal(true);
      return;
    }
    if (effectivePayTotal <= 0) {
      showToast('Total payment amount must be greater than zero.', 'error');
      return;
    }

    try {
      setSubmittingPay(true);
      const allocationsPayload = payModalFamily.members
        .filter((m) => Number(liveAllocations[m.student_id] || 0) > 0)
        .map((m) => ({
          studentId: m.student_id,
          studentName: m.name,
          fatherName: m.father_name,
          rollNumber: m.roll_number,
          className: m.class_name,
          amount: Number(liveAllocations[m.student_id]),
          balanceBefore: m.balance_due,
        }));

      const res = await collectFamilyPayment(
        { schoolId, userId },
        {
          familyId: payModalFamily.family_id,
          familyName: payModalFamily.family_name,
          contactNumber: payModalFamily.contact_number,
          address: payModalFamily.address,
          allocations: allocationsPayload,
          method: payMethod,
          idempotencyKey: idempotencyKey.current,
          shiftId: shift?.id ?? null,
          referenceNo: refNo.trim() || null,
          payerName: payerName.trim() || payModalFamily.family_name,
        }
      );

      showToast(
        `Family payment of ${formatFeeCurrency(res.total_amount)} collected across ${res.member_receipts.length} sibling(s)!`,
        'success'
      );
      setPayModalFamily(null);
      setPrintFamilyReceipt(res);
      onPaymentCollected?.();
      await loadAll();
    } catch (err: any) {
      showToast(err.message || 'Family payment collection failed.', 'error');
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openShift({ schoolId, userId }, openingFloat);
      showToast('Cashier shift opened!', 'success');
      setOpenShiftModal(false);
      const s = await getActiveShift(schoolId, userId);
      setShift(s);
    } catch (err: any) {
      showToast(err.message || 'Failed to open shift.', 'error');
    }
  };

  // Open Inspector Panel for a Family
  const handleInspectFamily = async (
    fam: FamilyFeeSummary,
    tab: 'siblings' | 'history' | 'ledger' = 'siblings'
  ) => {
    setSelectedFamily(fam);
    setInspectorTab(tab);
    if (tab === 'ledger') {
      await loadFamilyStatementData(fam.family_id);
    }
  };

  const loadFamilyStatementData = async (familyId: number) => {
    try {
      setLoadingStatement(true);
      const { family, entries } = await getFamilyStatement(schoolId, familyId);
      setSelectedFamily(family);
      setFamilyStatement(entries);
    } catch (err: any) {
      showToast(err.message || 'Failed to load family statement.', 'error');
    } finally {
      setLoadingStatement(false);
    }
  };

  // Open Consolidated Family Challan
  const handleOpenFamilyChallan = async (fam: FamilyFeeSummary) => {
    try {
      const detailed = await fetchSingleFamilyFeeSummary(schoolId, fam.family_id);
      setPrintFamilyChallan(detailed || fam);
    } catch {
      setPrintFamilyChallan(fam);
    }
  };

  // Generate Monthly Demands for a Family
  const handleGenerateFamilyDemands = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genFamilyTarget || !genForm.sessionId) return;
    try {
      setGeneratingDemands(true);
      const res = await generateFamilyDemands(
        { schoolId, userId },
        {
          familyId: genFamilyTarget.family_id,
          sessionId: Number(genForm.sessionId),
          month: Number(genForm.month),
          year: Number(genForm.year),
          issueDate: genForm.issueDate,
          dueDate: genForm.dueDate,
        }
      );
      showToast(res.message, 'success');
      setGenFamilyTarget(null);
      await loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate family demands.', 'error');
    } finally {
      setGeneratingDemands(false);
    }
  };

  // Group a family's receipts into Family Payment Batches + Individual Receipts
  const selectedFamilyPaymentBatches = useMemo(() => {
    if (!selectedFamily) return [];
    const allReceipts: Array<{ receipt: FeeReceipt; member: any }> = [];
    selectedFamily.members.forEach((m) => {
      m.receipts.forEach((r) => {
        if (r.payment_method !== 'wallet') {
          allReceipts.push({ receipt: r, member: m });
        }
      });
    });

    // Group by batchRef if present, otherwise by same minute + payer_name + payment_method, or single receipt
    const groups = new Map<string, Array<{ receipt: FeeReceipt; member: any }>>();
    allReceipts.forEach((item) => {
      const batchRef = extractFamilyBatchRef(item.receipt.reference_no);
      const minuteKey = item.receipt.paid_at ? item.receipt.paid_at.slice(0, 16) : '';
      const groupKey =
        batchRef ||
        `AUTO-${minuteKey}-${item.receipt.payment_method}-${item.receipt.collector_user_id || 0}`;
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(item);
    });

    return Array.from(groups.entries())
      .map(([key, items]) => {
        const receipts = items.map((i) => i.receipt);
        const first = receipts[0];
        const explicitBatch = extractFamilyBatchRef(first.reference_no);
        const batchLabel =
          explicitBatch ||
          (items.length > 1
            ? `FAM-${selectedFamily.family_id}-${first.receipt_no}`
            : first.receipt_no);

        return {
          key,
          batchLabel,
          isMultiSibling: items.length > 1 || Boolean(explicitBatch),
          paidAt: first.paid_at,
          method: first.payment_method,
          status: first.status,
          referenceNo: cleanReferenceDisplay(first.reference_no),
          totalAmount: receipts.reduce((s, r) => s + Number(r.amount || 0), 0),
          totalAllocated: receipts.reduce((s, r) => s + Number(r.allocated_amount || 0), 0),
          totalWallet: receipts.reduce((s, r) => s + Number(r.wallet_amount || 0), 0),
          items,
          receipts,
        };
      })
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [selectedFamily]);

  // Export CSV of Families Fee Summary
  const handleExportCSV = () => {
    if (filteredFamilies.length === 0) {
      showToast('No family records to export.', 'warning');
      return;
    }
    const headers = [
      'Family ID',
      'Family Name',
      'Contact Phone',
      'Address',
      'Active Siblings Count',
      'Siblings Names & Classes',
      'Total Billed (Rs)',
      'Total Paid (Rs)',
      'Advance Wallet (Rs)',
      'Net Balance Due (Rs)',
      'Overdue Amount (Rs)',
    ];
    const rows = filteredFamilies.map((f) => [
      f.family_id,
      `"${(f.family_name || '').replace(/"/g, '""')}"`,
      `"${f.contact_number || ''}"`,
      `"${(f.address || '').replace(/"/g, '""')}"`,
      f.members.length,
      `"${f.members.map((m) => `${m.name} (${m.class_name || '—'}: Rs ${m.balance_due})`).join('; ')}"`,
      f.total_billed,
      f.total_paid,
      f.total_wallet,
      f.total_due,
      f.total_overdue,
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Family_Fee_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* KPI Summary Strip */}
      <StatsGrid>
        <StatBox $accent="#2563eb">
          <div className="title">Registered Families</div>
          <div className="value">{kpis.familiesCount}</div>
          <div className="sub">{kpis.totalSiblings} Linked Sibling Students</div>
        </StatBox>

        <StatBox $accent="#7c3aed">
          <div className="title">Family Total Invoiced</div>
          <div className="value">{formatFeeCurrency(kpis.totalBilled)}</div>
          <div className="sub">Combined Sibling Challans</div>
        </StatBox>

        <StatBox $accent="#059669">
          <div className="title">Family Total Collected</div>
          <div className="value">{formatFeeCurrency(kpis.totalPaid)}</div>
          <div className="sub">
            {kpis.totalBilled > 0
              ? `${Math.round((kpis.totalPaid / kpis.totalBilled) * 100)}% Family Recovery`
              : 'Settled Receipts'}
          </div>
        </StatBox>

        <StatBox $accent="#dc2626">
          <div className="title">Family Outstanding Dues</div>
          <div className="value" style={{ color: '#dc2626' }}>
            {formatFeeCurrency(kpis.totalDue)}
          </div>
          <div className="sub">{kpis.familiesWithDue} Families with Pending Balances</div>
        </StatBox>
      </StatsGrid>

      {/* Main Family Fee Directory Card */}
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
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FamilyRestroom style={{ color: '#2563eb' }} />
              Family-Wise Fee Billing, Collection & History
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', opacity: 0.75 }}>
              Collect combined sibling fees in a single transaction, print consolidated 3-copy family challans, and audit family-wide payment history.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <ModernButton $variant="ghost" $size="sm" onClick={loadAll} disabled={loading}>
              <Refresh fontSize="small" /> Refresh
            </ModernButton>
            <ModernButton $variant="secondary" $size="sm" onClick={handleExportCSV}>
              <FileDownload fontSize="small" /> Export Family CSV
            </ModernButton>
          </div>
        </div>

        {/* Search & Filter Row */}
        <HubFilterRow style={{ marginBottom: '1rem' }}>
          <div style={{ flex: 2, minWidth: '240px', width: '100%' }}>
            <ModernInput
              type="text"
              placeholder="Search by family name, phone, family ID, or any sibling student name / roll #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '180px', width: '100%' }}>
            <ModernSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="all">All Families ({families.length})</option>
              <option value="due">Families with Pending Dues</option>
              <option value="overdue">Overdue Families Only</option>
              <option value="settled">Fully Settled Families (Rs 0 Due)</option>
              <option value="wallet">Families with Advance Wallet Credit</option>
            </ModernSelect>
          </div>
        </HubFilterRow>

        {/* Families Table */}
        <TableWrapper>
          <ModernTable>
            <thead>
              <tr>
                <th>Family / Guardian</th>
                <th>Contact</th>
                <th>Linked Siblings & Individual Dues</th>
                <th style={{ textAlign: 'right' }}>Billed</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Wallet</th>
                <th style={{ textAlign: 'right' }}>Net Family Due</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Family Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.65 }}>
                    Loading family fee accounts & sibling balances...
                  </td>
                </tr>
              ) : filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.65 }}>
                    No families found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((fam) => {
                  const isSelected = selectedFamily?.family_id === fam.family_id;
                  const hasOverdue = fam.total_overdue > 0;
                  const hasDue = fam.total_due > 0;

                  return (
                    <tr
                      key={fam.family_id}
                      style={{
                        background: isSelected ? 'rgba(37, 99, 235, 0.06)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{fam.family_name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, fontFamily: 'monospace' }}>
                          #FAM-{fam.family_id} {fam.address ? `• ${fam.address}` : ''}
                        </div>
                      </td>

                      <td style={{ fontSize: '0.76rem' }}>
                        {fam.contact_number ? (
                          <a
                            href={`tel:${fam.contact_number}`}
                            style={{
                              color: '#2563eb',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: 600,
                            }}
                          >
                            <Phone style={{ fontSize: '0.82rem' }} /> {fam.contact_number}
                          </a>
                        ) : (
                          <span style={{ opacity: 0.45 }}>—</span>
                        )}
                      </td>

                      <td style={{ maxWidth: '360px' }}>
                        {fam.members.length === 0 ? (
                          <span style={{ fontSize: '0.72rem', opacity: 0.55 }}>No students linked</span>
                        ) : (
                          <div>
                            {fam.members.map((m) => (
                              <SiblingChip key={m.student_id} $hasDue={m.balance_due > 0}>
                                <span>{m.name}</span>
                                <span style={{ opacity: 0.75 }}>({m.class_name || '—'})</span>
                                <span style={{ fontFamily: 'monospace' }}>
                                  {m.balance_due > 0 ? formatFeeCurrency(m.balance_due) : '✓ Paid'}
                                </span>
                              </SiblingChip>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatFeeCurrency(fam.total_billed)}
                      </td>

                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700, fontFamily: 'monospace' }}>
                        {formatFeeCurrency(fam.total_paid)}
                      </td>

                      <td style={{ textAlign: 'right', color: fam.total_wallet > 0 ? '#10b981' : undefined, fontFamily: 'monospace' }}>
                        {fam.total_wallet > 0 ? formatFeeCurrency(fam.total_wallet) : '—'}
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 900,
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                          color: hasDue ? '#dc2626' : '#059669',
                        }}
                      >
                        {formatFeeCurrency(fam.total_due)}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {fam.members.length === 0 ? (
                          <ModernBadge $variant="neutral">EMPTY</ModernBadge>
                        ) : hasOverdue ? (
                          <ModernBadge $variant="danger">OVERDUE</ModernBadge>
                        ) : hasDue ? (
                          <ModernBadge $variant="warning">DUE ({fam.unpaid_challans_count})</ModernBadge>
                        ) : (
                          <ModernBadge $variant="success">SETTLED</ModernBadge>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <ModernButton
                            $size="sm"
                            $variant="success"
                            onClick={() => handleOpenPayModal(fam)}
                            disabled={fam.members.length === 0}
                            title="Collect Consolidated Family Payment"
                          >
                            <PointOfSale fontSize="inherit" /> Pay Family
                          </ModernButton>

                          <ModernButton
                            $size="sm"
                            $variant="ghost"
                            onClick={() => handleOpenFamilyChallan(fam)}
                            disabled={fam.members.length === 0}
                            title="Print Consolidated 3-Copy Family Challan"
                          >
                            <Print fontSize="inherit" /> Challan
                          </ModernButton>

                          <ModernButton
                            $size="sm"
                            $variant="secondary"
                            onClick={() => handleInspectFamily(fam, 'history')}
                            disabled={fam.members.length === 0}
                            title="View Family Payment History, Siblings & Consolidated Ledger"
                          >
                            <History fontSize="inherit" /> History ({fam.receipts_count})
                          </ModernButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ModernTable>
        </TableWrapper>
      </HubCard>

      {/* Detailed Family Inspector Panel (Siblings, Payment History, Consolidated Ledger) */}
      {selectedFamily && (
        <HubCard style={{ marginTop: '1rem', borderTop: '3px solid #2563eb' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                  Family Account: {selectedFamily.family_name} (#FAM-{selectedFamily.family_id})
                </h3>
                <ModernBadge $variant="info">{selectedFamily.members.length} Sibling(s)</ModernBadge>
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: '2px' }}>
                Contact: {selectedFamily.contact_number || 'N/A'} • Address: {selectedFamily.address || 'N/A'} • Total Family Due:{' '}
                <strong style={{ color: selectedFamily.total_due > 0 ? '#dc2626' : '#059669' }}>
                  {formatFeeCurrency(selectedFamily.total_due)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <ModernButton
                $size="sm"
                $variant="success"
                onClick={() => handleOpenPayModal(selectedFamily)}
              >
                <PointOfSale fontSize="small" /> Collect Family Payment
              </ModernButton>

              <ModernButton
                $size="sm"
                $variant="primary"
                onClick={() => setGenFamilyTarget(selectedFamily)}
              >
                <Add fontSize="small" /> Generate Family Demands
              </ModernButton>

              <ModernButton
                $size="sm"
                $variant="secondary"
                onClick={() => handleOpenFamilyChallan(selectedFamily)}
              >
                <Print fontSize="small" /> Family Challan
              </ModernButton>

              <ModernButton
                $size="sm"
                $variant="ghost"
                onClick={() => setSelectedFamily(null)}
              >
                Close Panel
              </ModernButton>
            </div>
          </div>

          {/* Inspector Sub-Tabs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <SubTabBar>
              <SubTabBtn
                type="button"
                $active={inspectorTab === 'siblings'}
                onClick={() => setInspectorTab('siblings')}
              >
                <Description fontSize="inherit" />
                Siblings & Pending Challans ({selectedFamily.unpaid_challans_count})
              </SubTabBtn>

              <SubTabBtn
                type="button"
                $active={inspectorTab === 'history'}
                onClick={() => setInspectorTab('history')}
              >
                <Receipt fontSize="inherit" />
                Family Payment & Receipt History ({selectedFamilyPaymentBatches.length})
              </SubTabBtn>

              <SubTabBtn
                type="button"
                $active={inspectorTab === 'ledger'}
                onClick={() => {
                  setInspectorTab('ledger');
                  loadFamilyStatementData(selectedFamily.family_id);
                }}
              >
                <MenuBook fontSize="inherit" />
                Consolidated Family Statement
              </SubTabBtn>
            </SubTabBar>

            {inspectorTab === 'ledger' && (
              <ModernButton
                $size="sm"
                $variant="primary"
                onClick={() => setPrintFamilyStatementOpen(true)}
              >
                <Print fontSize="small" /> Print Official Family Statement
              </ModernButton>
            )}
          </div>

          {/* Sub-Tab 1: Siblings & Pending Challans */}
          {inspectorTab === 'siblings' && (
            <div>
              <TableWrapper>
                <ModernTable>
                  <thead>
                    <tr>
                      <th>Sibling Name</th>
                      <th>Father Name</th>
                      <th>Class & Section</th>
                      <th>Roll #</th>
                      <th>Pending Challans</th>
                      <th style={{ textAlign: 'right' }}>Total Billed</th>
                      <th style={{ textAlign: 'right' }}>Total Paid</th>
                      <th style={{ textAlign: 'right' }}>Wallet Credit</th>
                      <th style={{ textAlign: 'right' }}>Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFamily.members.map((m) => (
                      <tr key={m.student_id}>
                        <td style={{ fontWeight: 800 }}>{m.name}</td>
                        <td>{m.father_name || '—'}</td>
                        <td>
                          {m.class_name || '—'} {m.section_name ? `(${m.section_name})` : ''}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{m.roll_number || 'N/A'}</td>
                        <td>
                          {m.unpaid_demands.length === 0 ? (
                            <ModernBadge $variant="success">All Settled</ModernBadge>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                              {m.unpaid_demands.map((d) => (
                                <ModernBadge
                                  key={d.demand_id}
                                  $variant={d.pay_status === 'overdue' ? 'danger' : 'warning'}
                                  style={{ fontFamily: 'monospace' }}
                                >
                                  #{d.challan_no} ({formatFeeCurrency(d.balance_amount)})
                                </ModernBadge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {formatFeeCurrency(m.total_billed)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#059669', fontFamily: 'monospace' }}>
                          {formatFeeCurrency(m.total_paid)}
                        </td>
                        <td style={{ textAlign: 'right', color: m.wallet_balance > 0 ? '#10b981' : undefined, fontFamily: 'monospace' }}>
                          {m.wallet_balance > 0 ? formatFeeCurrency(m.wallet_balance) : '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            color: m.balance_due > 0 ? '#dc2626' : '#059669',
                          }}
                        >
                          {formatFeeCurrency(m.balance_due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ModernTable>
              </TableWrapper>
            </div>
          )}

          {/* Sub-Tab 2: Family Payment & Receipt History */}
          {inspectorTab === 'history' && (
            <div>
              {selectedFamilyPaymentBatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.65 }}>
                  No payment receipts recorded yet for any sibling in this family.
                </div>
              ) : (
                <TableWrapper>
                  <ModernTable>
                    <thead>
                      <tr>
                        <th>Batch / Receipt Ref</th>
                        <th>Date & Time</th>
                        <th>Siblings Covered & Receipt #s</th>
                        <th>Method</th>
                        <th style={{ textAlign: 'right' }}>Allocated to Dues</th>
                        <th style={{ textAlign: 'right' }}>Wallet Credit</th>
                        <th style={{ textAlign: 'right' }}>Total Paid</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Print Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFamilyPaymentBatches.map((batch) => (
                        <tr key={batch.key}>
                          <td>
                            <ModernBadge
                              $variant={batch.isMultiSibling ? 'purple' : 'success'}
                              style={{ fontFamily: 'monospace', fontWeight: 800 }}
                            >
                              {batch.batchLabel}
                            </ModernBadge>
                            {batch.isMultiSibling && (
                              <div style={{ fontSize: '0.66rem', color: '#7c3aed', fontWeight: 700, marginTop: '2px' }}>
                                Family Batch ({batch.items.length} Siblings)
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {batch.items.map(({ receipt, member }) => (
                                <div
                                  key={receipt.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  <span style={{ fontWeight: 700 }}>{member.name}</span>
                                  <span style={{ opacity: 0.65 }}>({member.class_name || '—'})</span>
                                  <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                                    #{receipt.receipt_no}
                                  </span>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                                    {formatFeeCurrency(receipt.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td>
                            <ModernBadge $variant="info" style={{ textTransform: 'uppercase' }}>
                              {batch.method.replace('_', ' ')}
                            </ModernBadge>
                            {batch.referenceNo && (
                              <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '2px' }}>
                                Ref: {batch.referenceNo}
                              </div>
                            )}
                          </td>

                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                            {formatFeeCurrency(batch.totalAllocated)}
                          </td>

                          <td style={{ textAlign: 'right', color: batch.totalWallet > 0 ? '#059669' : undefined, fontFamily: 'monospace' }}>
                            {batch.totalWallet > 0 ? `+${formatFeeCurrency(batch.totalWallet)}` : '—'}
                          </td>

                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 900,
                              color: '#059669',
                              fontFamily: 'monospace',
                              fontSize: '0.88rem',
                            }}
                          >
                            {formatFeeCurrency(batch.totalAmount)}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <ModernBadge $variant={batch.status === 'posted' ? 'success' : 'danger'}>
                              {batch.status.toUpperCase()}
                            </ModernBadge>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <ModernButton
                                $size="sm"
                                $variant="primary"
                                onClick={() => {
                                  const famRec = buildFamilyReceiptFromReceipts(
                                    selectedFamily,
                                    batch.receipts,
                                    batch.batchLabel
                                  );
                                  setPrintFamilyReceipt(famRec);
                                }}
                                title="Print Consolidated Family Receipt"
                              >
                                <Print fontSize="inherit" /> Family Receipt
                              </ModernButton>

                              {batch.items.length === 1 && (
                                <ModernButton
                                  $size="sm"
                                  $variant="ghost"
                                  onClick={() => {
                                    const r = batch.items[0].receipt;
                                    const m = batch.items[0].member;
                                    setPrintSingleReceipt({
                                      success: true,
                                      receipt_id: r.id,
                                      receipt_no: r.receipt_no,
                                      amount: Number(r.amount),
                                      allocated_amount: Number(r.allocated_amount),
                                      wallet_amount: Number(r.wallet_amount),
                                      balance_after: r.snapshot?.balance_after ?? 0,
                                      payment_method: r.payment_method,
                                      student_name: r.snapshot?.student_name || m.name,
                                      father_name: r.snapshot?.father_name || m.father_name,
                                      roll_number: r.snapshot?.roll_number || m.roll_number,
                                      allocations: r.snapshot?.allocations || [],
                                      snapshot: { ...r.snapshot, paid_at: r.paid_at },
                                    });
                                  }}
                                >
                                  Thermal Slip
                                </ModernButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </ModernTable>
                </TableWrapper>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Consolidated Family Statement / Ledger */}
          {inspectorTab === 'ledger' && (
            <div>
              {loadingStatement ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.65 }}>
                  Loading consolidated family ledger statement...
                </div>
              ) : familyStatement.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.65 }}>
                  No ledger entries found for this family.
                </div>
              ) : (
                <TableWrapper>
                  <ModernTable>
                    <thead>
                      <tr>
                        <th>Entry #</th>
                        <th>Date</th>
                        <th>Sibling Student</th>
                        <th>Type</th>
                        <th>Ref</th>
                        <th>Particulars</th>
                        <th style={{ textAlign: 'right' }}>Debit (Rs)</th>
                        <th style={{ textAlign: 'right' }}>Credit (Rs)</th>
                        <th style={{ textAlign: 'right' }}>Family Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyStatement.map((entry) => (
                        <tr key={entry.entry_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{entry.entry_id}</td>
                          <td>{formatFeeDate(entry.entry_date)}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{entry.student_name}</div>
                            <div style={{ fontSize: '0.68rem', opacity: 0.65 }}>
                              {entry.class_name || '—'} • Roll: {entry.roll_number || 'N/A'}
                            </div>
                          </td>
                          <td>
                            <ModernBadge
                              $variant={
                                entry.entry_type === 'PAYMENT' || entry.entry_type === 'WALLET_CREDIT'
                                  ? 'success'
                                  : entry.entry_type === 'CHARGE' || entry.entry_type === 'LATE_FINE'
                                  ? 'danger'
                                  : 'info'
                              }
                            >
                              {entry.entry_type.replace('_', ' ')}
                            </ModernBadge>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {entry.challan_no
                              ? `#${entry.challan_no}`
                              : entry.receipt_no
                              ? `#${entry.receipt_no}`
                              : '—'}
                          </td>
                          <td>{entry.description}</td>
                          <td style={{ textAlign: 'right', color: entry.debit ? '#dc2626' : undefined, fontWeight: entry.debit ? 700 : 400 }}>
                            {entry.debit ? formatFeeCurrency(entry.debit) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: entry.credit ? '#059669' : undefined, fontWeight: entry.credit ? 700 : 400 }}>
                            {entry.credit ? formatFeeCurrency(entry.credit) : '—'}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              color: entry.family_running_balance > 0 ? '#dc2626' : '#059669',
                            }}
                          >
                            {formatFeeCurrency(entry.family_running_balance)}
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

      {/* Modal: Collect Consolidated Family Payment */}
      {payModalFamily && (
        <ModalBackdrop onClick={() => setPayModalFamily(null)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="740px">
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FamilyRestroom style={{ color: '#059669' }} />
              Collect Consolidated Family Payment • {payModalFamily.family_name}
            </h3>
            <p className="modal-subtitle">
              Receive a single payment from the parent/guardian and automatically or manually allocate across all siblings. Issues an official Consolidated Family Receipt.
            </p>

            <form onSubmit={handleCollectFamilyPayment} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Mode Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <SubTabBar>
                  <SubTabBtn
                    type="button"
                    $active={allocationMode === 'auto'}
                    onClick={() => {
                      setAllocationMode('auto');
                      const selectedDue = payModalFamily.members
                        .filter((m) => selectedSiblingIds.includes(m.student_id))
                        .reduce((s, m) => s + m.balance_due, 0);
                      setLumpSumAmount(selectedDue);
                    }}
                  >
                    Auto Waterfall (Oldest Due First)
                  </SubTabBtn>
                  <SubTabBtn
                    type="button"
                    $active={allocationMode === 'custom'}
                    onClick={() => {
                      setAllocationMode('custom');
                      setCustomAmounts(liveAllocations);
                    }}
                  >
                    Custom Per-Sibling Split
                  </SubTabBtn>
                </SubTabBar>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <ModernButton
                    type="button"
                    $size="sm"
                    $variant="ghost"
                    onClick={() => {
                      const allIds = payModalFamily.members.map((m) => m.student_id);
                      setSelectedSiblingIds(allIds);
                      setLumpSumAmount(payModalFamily.total_due);
                      const wf = computeFamilyPaymentWaterfall(payModalFamily, payModalFamily.total_due, allIds);
                      setCustomAmounts(wf);
                    }}
                  >
                    Full Family Due ({formatFeeCurrency(payModalFamily.total_due)})
                  </ModernButton>

                  {payModalFamily.total_overdue > 0 && (
                    <ModernButton
                      type="button"
                      $size="sm"
                      $variant="ghost"
                      onClick={() => {
                        setLumpSumAmount(payModalFamily.total_overdue);
                        const wf = computeFamilyPaymentWaterfall(
                          payModalFamily,
                          payModalFamily.total_overdue,
                          selectedSiblingIds
                        );
                        setCustomAmounts(wf);
                      }}
                    >
                      Overdue Only ({formatFeeCurrency(payModalFamily.total_overdue)})
                    </ModernButton>
                  )}
                </div>
              </div>

              {/* Lump sum input when in Auto mode */}
              {allocationMode === 'auto' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    TOTAL FAMILY LUMP-SUM AMOUNT RECEIVED (RS):
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    step="0.01"
                    value={lumpSumAmount}
                    onChange={(e) => setLumpSumAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color: '#059669',
                      padding: '0.55rem 0.75rem',
                    }}
                    required
                  />
                </div>
              )}

              {/* Sibling Allocation Breakdown Table */}
              <TableWrapper>
                <ModernTable>
                  <thead>
                    <tr>
                      <th style={{ width: '36px' }}>Include</th>
                      <th>Sibling Student</th>
                      <th>Class / Roll</th>
                      <th style={{ textAlign: 'right' }}>Pending Challans</th>
                      <th style={{ textAlign: 'right' }}>Current Due</th>
                      <th style={{ textAlign: 'right', width: '160px' }}>Payment Allocation (Rs)</th>
                      <th style={{ textAlign: 'right' }}>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payModalFamily.members.map((m) => {
                      const included = selectedSiblingIds.includes(m.student_id);
                      const allocAmt = Number(liveAllocations[m.student_id] || 0);
                      const balAfter = Math.max(0, m.balance_due - allocAmt);
                      const advanceAdded = Math.max(0, allocAmt - m.balance_due);

                      return (
                        <tr key={m.student_id} style={{ opacity: included ? 1 : 0.45 }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={included}
                              onChange={() => handleToggleSiblingSelection(m.student_id)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 800 }}>{m.name}</div>
                            {m.father_name && (
                              <div style={{ fontSize: '0.68rem', opacity: 0.65 }}>s/o {m.father_name}</div>
                            )}
                          </td>
                          <td>
                            <div>{m.class_name || '—'}</div>
                            <div style={{ fontSize: '0.68rem', opacity: 0.65 }}>Roll: {m.roll_number || 'N/A'}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                            {m.unpaid_demands.length} challan(s)
                          </td>
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
                            {allocationMode === 'custom' ? (
                              <ModernInput
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!included}
                                value={customAmounts[m.student_id] ?? 0}
                                onChange={(e) =>
                                  setCustomAmounts((prev) => ({
                                    ...prev,
                                    [m.student_id]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                style={{
                                  width: '130px',
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
                                  color: allocAmt > 0 ? '#059669' : '#64748b',
                                  fontSize: '0.9rem',
                                }}
                              >
                                {formatFeeCurrency(allocAmt)}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                            <span style={{ color: balAfter > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                              {formatFeeCurrency(balAfter)}
                            </span>
                            {advanceAdded > 0 && (
                              <div style={{ color: '#10b981', fontSize: '0.66rem', fontWeight: 700 }}>
                                +{formatFeeCurrency(advanceAdded)} Wallet
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ModernTable>
              </TableWrapper>

              {/* Payment Method, Payer & Reference */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    PAYMENT METHOD:
                  </label>
                  <ModernSelect
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    style={{ width: '100%' }}
                  >
                    <option value="cash">Cash (Counter Drawer)</option>
                    <option value="bank_transfer">Bank Transfer / Slip</option>
                    <option value="pos_card">Credit / Debit POS Card</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="cheque">Bank Cheque</option>
                  </ModernSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    DEPOSITOR / GUARDIAN NAME:
                  </label>
                  <ModernInput
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    REFERENCE / SLIP # (OPTIONAL):
                  </label>
                  <ModernInput
                    type="text"
                    placeholder="Bank ref / Cheque #"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.6rem',
                  borderTop: '1px solid rgba(148, 163, 184, 0.25)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.82rem' }}>
                  Total Family Payment to Post:{' '}
                  <strong style={{ fontSize: '1.1rem', color: '#059669', fontFamily: 'monospace' }}>
                    {formatFeeCurrency(effectivePayTotal)}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <ModernButton type="button" $variant="ghost" onClick={() => setPayModalFamily(null)}>
                    Cancel
                  </ModernButton>
                  <ModernButton
                    type="submit"
                    $variant="success"
                    disabled={submittingPay || effectivePayTotal <= 0}
                  >
                    <CheckCircle fontSize="small" />
                    {submittingPay
                      ? 'Posting Family Receipts...'
                      : `Confirm & Receive ${formatFeeCurrency(effectivePayTotal)}`}
                  </ModernButton>
                </div>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: Generate Monthly Demands for Family */}
      {genFamilyTarget && (
        <ModalBackdrop onClick={() => setGenFamilyTarget(null)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="480px">
            <h3 className="modal-title">
              Generate Family Demands • {genFamilyTarget.family_name}
            </h3>
            <p className="modal-subtitle">
              Generates monthly fee challans for all {genFamilyTarget.members.length} linked sibling(s) in this family using their applicable class rates, overrides, and concessions.
            </p>

            <form onSubmit={handleGenerateFamilyDemands} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  ACADEMIC SESSION:
                </label>
                <ModernSelect
                  value={genForm.sessionId}
                  onChange={(e) => setGenForm((p) => ({ ...p, sessionId: Number(e.target.value) }))}
                  style={{ width: '100%' }}
                  required
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </ModernSelect>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    BILLING MONTH:
                  </label>
                  <ModernSelect
                    value={genForm.month}
                    onChange={(e) => setGenForm((p) => ({ ...p, month: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Month {m} ({new Date(2026, m - 1).toLocaleString('default', { month: 'long' })})
                      </option>
                    ))}
                  </ModernSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    BILLING YEAR:
                  </label>
                  <ModernInput
                    type="number"
                    value={genForm.year}
                    onChange={(e) => setGenForm((p) => ({ ...p, year: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    ISSUE DATE:
                  </label>
                  <ModernInput
                    type="date"
                    value={genForm.issueDate}
                    onChange={(e) => setGenForm((p) => ({ ...p, issueDate: e.target.value }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    DUE DATE:
                  </label>
                  <ModernInput
                    type="date"
                    value={genForm.dueDate}
                    onChange={(e) => setGenForm((p) => ({ ...p, dueDate: e.target.value }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setGenFamilyTarget(null)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary" disabled={generatingDemands}>
                  {generatingDemands ? 'Generating...' : 'Generate Sibling Challans'}
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: Open Cashier Shift */}
      {openShiftModal && (
        <ModalBackdrop onClick={() => setOpenShiftModal(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="420px">
            <h3 className="modal-title">Open Cashier Drawer Shift</h3>
            <p className="modal-subtitle">
              An open cashier shift is required to accept physical cash payments at the counter.
            </p>
            <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  OPENING CASH FLOAT (RS):
                </label>
                <ModernInput
                  type="number"
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 800 }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setOpenShiftModal(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="success">
                  Open Shift
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Print Modals */}
      {printFamilyReceipt && (
        <PrintFamilyReceiptModal
          familyReceipt={printFamilyReceipt}
          onClose={() => setPrintFamilyReceipt(null)}
        />
      )}

      {printSingleReceipt && (
        <PrintReceiptModal
          receipt={printSingleReceipt}
          onClose={() => setPrintSingleReceipt(null)}
        />
      )}

      {printFamilyChallan && (
        <PrintFamilyChallanModal
          family={printFamilyChallan}
          onClose={() => setPrintFamilyChallan(null)}
        />
      )}

      {printFamilyStatementOpen && selectedFamily && (
        <PrintFamilyStatementModal
          family={selectedFamily}
          entries={familyStatement}
          onClose={() => setPrintFamilyStatementOpen(false)}
        />
      )}
    </div>
  );
};

export default FamilyFeeTab;

