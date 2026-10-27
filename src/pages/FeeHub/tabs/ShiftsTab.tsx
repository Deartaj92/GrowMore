import React, { useState, useEffect } from 'react';
import {
  PointOfSale,
  CheckCircle,
  AccountBalanceWallet,
  Lock,
  LockOpen,
  FilterList,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { CashierShift, ShiftSummary } from '../../../types/feeLedger';
import {
  fetchShifts,
  reconcileShift,
  getShiftSummary,
} from '../../../services/feeLedgerService';
import {
  HubCard,
  HubFilterRow,
  StatsGrid,
  StatBox,
  ModernButton,
  ModernTable,
  TableWrapper,
  ModernBadge,
  ModernInput,
  ModernSelect,
  ModalBackdrop,
  ModalDialog,
  formatFeeCurrency,
  formatFeeDate,
} from '../FeeHubStyles';

export const ShiftsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Reconcile Modal
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [targetShift, setTargetShift] = useState<CashierShift | null>(null);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [auditNotes, setAuditNotes] = useState('');

  useEffect(() => {
    loadShifts();
  }, [schoolId, statusFilter]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await fetchShifts(schoolId, statusFilter === 'ALL' ? undefined : statusFilter);
      setShifts(data);
    } catch (err: any) {
      showToast('Failed to load shifts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openReconcileModal = async (shift: CashierShift) => {
    try {
      setTargetShift(shift);
      setAuditNotes('');
      const sum = await getShiftSummary(schoolId, shift.id);
      setShiftSummary(sum);
      setReconcileModalOpen(true);
    } catch (err: any) {
      showToast('Failed to load shift summary.', 'error');
    }
  };

  const handleConfirmReconcile = async () => {
    if (!targetShift) return;
    try {
      await reconcileShift({ schoolId, userId }, targetShift.id, auditNotes);
      showToast(`Shift #${targetShift.id} successfully reconciled and audited!`, 'success');
      setReconcileModalOpen(false);
      setTargetShift(null);
      loadShifts();
    } catch (err: any) {
      showToast(err.message || 'Failed to reconcile shift.', 'error');
    }
  };

  const openCount = shifts.filter((s) => s.status === 'open').length;
  const closedCount = shifts.filter((s) => s.status === 'closed').length;
  const reconciledCount = shifts.filter((s) => s.status === 'reconciled').length;
  const totalVariance = shifts.reduce((s, r) => s + (r.variance || 0), 0);

  return (
    <div>
      {/* Top Action Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Cashier Shift Drawers & Reconciliation</h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Cash custody audit log tracking opening floats, counted cash, cashier variances, and supervisor sign-offs.
          </span>
        </div>

        <ModernButton onClick={loadShifts}>
          <Refresh fontSize="small" /> Refresh
        </ModernButton>
      </div>

      {/* KPI Stats */}
      <StatsGrid>
        <StatBox $accent="#2563eb">
          <div className="title">Active Open Drawers</div>
          <div className="value">{openCount}</div>
          <div className="sub">In Progress</div>
        </StatBox>

        <StatBox $accent="#d97706">
          <div className="title">Awaiting Reconciliation</div>
          <div className="value">{closedCount}</div>
          <div className="sub">Cash Counted by Cashiers</div>
        </StatBox>

        <StatBox $accent="#059669">
          <div className="title">Audited & Reconciled</div>
          <div className="value">{reconciledCount}</div>
          <div className="sub">Supervisor Verified</div>
        </StatBox>

        <StatBox $accent={totalVariance !== 0 ? '#dc2626' : '#059669'}>
          <div className="title">Net Cash Variance</div>
          <div className="value">{formatFeeCurrency(totalVariance)}</div>
          <div className="sub">
            {totalVariance === 0 ? 'Balanced' : totalVariance > 0 ? 'Cash Over' : 'Cash Short'}
          </div>
        </StatBox>
      </StatsGrid>

      {/* Filter Row */}
      <HubFilterRow>
        <div className="filter-item">
          <label>Status:</label>
          <ModernSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Shifts</option>
            <option value="open">Open Drawers</option>
            <option value="closed">Closed (Pending Reconciliation)</option>
            <option value="reconciled">Reconciled & Locked</option>
          </ModernSelect>
        </div>
      </HubFilterRow>

      {/* Shifts Table */}
      <HubCard style={{ padding: '0.5rem' }}>
        <TableWrapper>
          <ModernTable>
            <thead>
              <tr>
                <th>Shift #</th>
                <th>Cashier</th>
                <th>Opened At</th>
                <th>Closed At</th>
                <th style={{ textAlign: 'right' }}>Opening Float</th>
                <th style={{ textAlign: 'right' }}>Expected Cash</th>
                <th style={{ textAlign: 'right' }}>Counted Cash</th>
                <th style={{ textAlign: 'right' }}>Drawer Variance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Supervisor Action</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                    No shifts found matching filter.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const statusVariant =
                    s.status === 'reconciled'
                      ? 'success'
                      : s.status === 'closed'
                      ? 'warning'
                      : 'info';

                  return (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{s.id}</td>
                      <td style={{ fontWeight: 700 }}>{s.cashier_name || `User #${s.cashier_user_id}`}</td>
                      <td>{formatFeeDate(s.opened_at)}</td>
                      <td>{s.closed_at ? formatFeeDate(s.closed_at) : <span style={{ color: '#2563eb' }}>Active</span>}</td>
                      <td style={{ textAlign: 'right' }}>{formatFeeCurrency(s.opening_float)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {s.expected_cash !== null ? formatFeeCurrency(s.expected_cash) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {s.counted_cash !== null ? formatFeeCurrency(s.counted_cash) : '—'}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 900,
                          color:
                            s.variance === null
                              ? undefined
                              : s.variance < 0
                              ? '#dc2626'
                              : s.variance > 0
                              ? '#2563eb'
                              : '#059669',
                        }}
                      >
                        {s.variance !== null ? (
                          <>
                            {s.variance > 0 ? `+${s.variance}` : s.variance} Rs
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <ModernBadge $variant={statusVariant}>{s.status.toUpperCase()}</ModernBadge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {s.status === 'closed' ? (
                          <ModernButton
                            $size="sm"
                            $variant="success"
                            onClick={() => openReconcileModal(s)}
                          >
                            <CheckCircle fontSize="inherit" /> Reconcile
                          </ModernButton>
                        ) : s.status === 'reconciled' ? (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                            ✓ Audited #{s.reconciled_by || ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#2563eb' }}>In Progress</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ModernTable>
        </TableWrapper>
      </HubCard>

      {/* Modal: Reconcile Shift */}
      {reconcileModalOpen && targetShift && (
        <ModalBackdrop onClick={() => setReconcileModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="520px">
            <h3 className="modal-title">Supervisor Drawer Reconciliation</h3>
            <p className="modal-subtitle">
              Shift #{targetShift.id} operated by {targetShift.cashier_name || `User #${targetShift.cashier_user_id}`}. Verify physical drawer breakdown before locking.
            </p>

            <div style={{ background: 'rgba(148, 163, 184, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.2)', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>OPENING FLOAT:</span>
                  <div style={{ fontWeight: 800 }}>{formatFeeCurrency(targetShift.opening_float)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>COUNTED CASH:</span>
                  <div style={{ fontWeight: 800 }}>{formatFeeCurrency(targetShift.counted_cash || 0)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>EXPECTED DRAWER CASH:</span>
                  <div style={{ fontWeight: 800 }}>{formatFeeCurrency(targetShift.expected_cash || 0)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>DRAWER VARIANCE:</span>
                  <div
                    style={{
                      fontWeight: 900,
                      color: (targetShift.variance || 0) < 0 ? '#dc2626' : (targetShift.variance || 0) > 0 ? '#2563eb' : '#059669',
                    }}
                  >
                    {formatFeeCurrency(targetShift.variance || 0)} (
                    {(targetShift.variance || 0) === 0 ? 'Balanced' : (targetShift.variance || 0) > 0 ? 'Over' : 'Short'})
                  </div>
                </div>
              </div>

              {shiftSummary && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(148, 163, 184, 0.2)', display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                  <span>Receipts: <strong>{shiftSummary.receipt_count}</strong></span>
                  <span>Bank: <strong>{formatFeeCurrency(shiftSummary.bank)}</strong></span>
                  <span>Online: <strong>{formatFeeCurrency(shiftSummary.online)}</strong></span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  SUPERVISOR AUDIT NOTES:
                </label>
                <ModernInput
                  type="text"
                  placeholder="e.g. Cash verified in safe, envelope signed."
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton $variant="ghost" onClick={() => setReconcileModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton $variant="success" onClick={handleConfirmReconcile}>
                  <CheckCircle fontSize="small" /> Confirm Reconciliation
                </ModernButton>
              </div>
            </div>
          </ModalDialog>
        </ModalBackdrop>
      )}
    </div>
  );
};
export default ShiftsTab;
