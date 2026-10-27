import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import {
  Receipt,
  Search,
  FilterList,
  Print,
  FileDownload,
  Refresh,
  AttachMoney,
  Today,
  AccountBalance,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { FeeReceipt, CollectPaymentResult } from '../../../types/feeLedger';
import { fetchReceipts } from '../../../services/feeLedgerService';
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
} from '../FeeHubStyles';
import PrintReceiptModal from '../components/PrintReceiptModal';

export const PaymentsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;

  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Print modal
  const [selectedReceipt, setSelectedReceipt] = useState<CollectPaymentResult | null>(null);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const data = await fetchReceipts(schoolId, { limit: 200 });
      setReceipts(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load receipts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [schoolId]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return receipts.filter((r) => {
      // Method filter
      if (methodFilter !== 'all' && r.payment_method !== methodFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      // Date filter
      if (dateFilter !== 'all') {
        const pDate = new Date(r.paid_at);
        const pDateStr = pDate.toISOString().split('T')[0];
        if (dateFilter === 'today' && pDateStr !== todayStr) {
          return false;
        }
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

      // Search match
      if (!q) return true;
      const recNo = (r.receipt_no || '').toLowerCase();
      const payer = (r.payer_name || '').toLowerCase();
      const ref = (r.reference_no || '').toLowerCase();
      const sName = (r.snapshot?.student_name || '').toLowerCase();
      const fName = (r.snapshot?.father_name || '').toLowerCase();
      const roll = (r.snapshot?.roll_number || '').toLowerCase();
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
        challans.includes(q)
      );
    });
  }, [receipts, search, methodFilter, statusFilter, dateFilter]);

  // Analytics Metrics
  const stats = useMemo(() => {
    const totalAmount = filteredReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayAmount = filteredReceipts
      .filter((r) => r.paid_at && r.paid_at.startsWith(todayStr))
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const cashAmount = filteredReceipts
      .filter((r) => r.payment_method === 'cash')
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const digitalAmount = totalAmount - cashAmount;

    return {
      totalAmount,
      todayAmount,
      totalCount: filteredReceipts.length,
      cashAmount,
      digitalAmount,
    };
  }, [filteredReceipts]);

  // Open Print Modal with standardized CollectPaymentResult format
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

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) {
      showToast('No receipt data to export.', 'warning');
      return;
    }

    const headers = [
      'Receipt No',
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

    const rows = filteredReceipts.map((r) => [
      r.receipt_no,
      new Date(r.paid_at).toLocaleString(),
      `"${r.snapshot?.student_name || r.payer_name || ''}"`,
      `"${r.snapshot?.roll_number || ''}"`,
      `"${r.snapshot?.father_name || ''}"`,
      r.payment_method.toUpperCase(),
      r.amount,
      r.allocated_amount,
      r.wallet_amount,
      `"${r.reference_no || ''}"`,
      r.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
          <div className="title">Cash Collections</div>
          <div className="value">{formatFeeCurrency(stats.cashAmount)}</div>
          <div className="sub">Physical Drawer Settlements</div>
        </StatBox>

        <StatBox $accent="#0284c7">
          <div className="title">Digital / Bank</div>
          <div className="value">{formatFeeCurrency(stats.digitalAmount)}</div>
          <div className="sub">Online, Raast, POS Card & Bank</div>
        </StatBox>
      </StatsGrid>

      {/* Main Filter & Table Card */}
      <HubCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
              Fee Payment & Receipt History
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', opacity: 0.75 }}>
              Complete chronological audit trail of all student collections, transaction modes, and allocations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <ModernButton $variant="ghost" $size="sm" onClick={loadReceipts} disabled={loading}>
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
              placeholder="Search by receipt #, student name, roll #, challan #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ flex: '1', minWidth: '130px', width: '100%' }}>
            <ModernSelect
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">All Payment Methods</option>
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
              <option value="voided">Voided / Cancelled</option>
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

        {/* Receipts Table */}
        <TableWrapper>
          <ModernTable>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date & Time</th>
                <th>Student / Payer</th>
                <th>Method</th>
                <th>Challan(s) Settled</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
                <th style={{ textAlign: 'right' }}>Allocation</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
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
                        <ModernBadge
                          $variant={r.payment_method === 'cash' ? 'info' : 'purple'}
                          style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}
                        >
                          {r.payment_method.replace('_', ' ')}
                        </ModernBadge>
                        {r.reference_no && (
                          <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '2px' }}>
                            Ref: {r.reference_no}
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
                          <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>Direct Settlement</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.88rem', color: '#10b981' }}>
                        {formatFeeCurrency(r.amount)}
                      </td>

                      <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                        <div>
                          Dues: {formatFeeCurrency(r.allocated_amount)}
                        </div>
                        {Number(r.wallet_amount) > 0 && (
                          <div style={{ color: '#10b981', fontWeight: 700 }}>
                            +{formatFeeCurrency(r.wallet_amount)} Wallet
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <ModernBadge $variant={r.status === 'posted' ? 'success' : 'danger'}>
                          {r.status === 'posted' ? 'POSTED' : 'VOIDED'}
                        </ModernBadge>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <ModernButton
                          $variant="ghost"
                          $size="sm"
                          onClick={() => handleOpenPrint(r)}
                          title="View & Re-print Receipt"
                        >
                          <Print fontSize="small" /> Receipt
                        </ModernButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ModernTable>
        </TableWrapper>
      </HubCard>

      {/* Print Receipt Modal */}
      {selectedReceipt && (
        <PrintReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
export default PaymentsTab;
