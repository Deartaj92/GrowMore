import React, { useState, useEffect } from 'react';
import {
  AssignmentTurnedIn,
  CheckCircle,
  Cancel,
  History,
  Tune,
  CardGiftcard,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import {
  FeeAdjustment,
  FeeConcession,
  StudentFeeOverride,
} from '../../../types/feeLedger';
import {
  fetchAdjustments,
  decideAdjustment,
  fetchConcessions,
  decideConcession,
  fetchOverrides,
  decideOverride,
} from '../../../services/feeLedgerService';
import {
  HubCard,
  StatsGrid,
  StatBox,
  ModernButton,
  ModernTable,
  TableWrapper,
  ModernBadge,
  ModernInput,
  ModalBackdrop,
  ModalDialog,
  formatFeeCurrency,
  formatFeeDate,
} from '../FeeHubStyles';

export const ApprovalsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  const [activeQueue, setActiveQueue] = useState<'adjustments' | 'concessions' | 'overrides'>('adjustments');
  const [viewHistory, setViewHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  // Queues
  const [adjustments, setAdjustments] = useState<FeeAdjustment[]>([]);
  const [concessions, setConcessions] = useState<FeeConcession[]>([]);
  const [overrides, setOverrides] = useState<StudentFeeOverride[]>([]);

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'adjustment' | 'concession' | 'override';
    id: number;
    approve: boolean;
  } | null>(null);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    loadQueues();
  }, [schoolId, viewHistory]);

  const loadQueues = async () => {
    try {
      setLoading(true);
      const statusParam = viewHistory ? undefined : 'pending';

      const [adj, conc, over] = await Promise.all([
        fetchAdjustments(schoolId, statusParam),
        fetchConcessions(schoolId, { status: statusParam }),
        fetchOverrides(schoolId, statusParam),
      ]);

      setAdjustments(adj);
      setConcessions(conc);
      setOverrides(over);
    } catch (err: any) {
      showToast('Failed to load approval queues.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openDecisionDialog = (type: 'adjustment' | 'concession' | 'override', id: number, approve: boolean) => {
    setPendingAction({ type, id, approve });
    setRemarks('');
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!pendingAction) return;
    const { type, id, approve } = pendingAction;

    try {
      if (type === 'adjustment') {
        await decideAdjustment({ schoolId, userId }, id, approve, remarks);
        showToast(`Adjustment ${approve ? 'approved' : 'rejected'}.`, 'success');
      } else if (type === 'concession') {
        await decideConcession({ schoolId, userId }, id, approve ? 'approve' : 'reject');
        showToast(`Concession ${approve ? 'approved' : 'rejected'}.`, 'success');
      } else if (type === 'override') {
        await decideOverride({ schoolId, userId }, id, approve);
        showToast(`Override ${approve ? 'approved' : 'rejected'}.`, 'success');
      }

      setDecisionModalOpen(false);
      setPendingAction(null);
      loadQueues();
    } catch (err: any) {
      showToast(err.message || 'Failed to process decision.', 'error');
    }
  };

  const pendingAdjCount = adjustments.filter((a) => a.status === 'pending').length;
  const pendingConcCount = concessions.filter((c) => c.status === 'pending').length;
  const pendingOverCount = overrides.filter((o) => o.status === 'pending').length;
  const totalPending = pendingAdjCount + pendingConcCount + pendingOverCount;

  return (
    <div>
      {/* Top Action Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Maker-Checker Approvals Queue</h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Administrative authorization queue for fee waivers, payment receipt voids, and scholarships.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ModernButton
            $variant={viewHistory ? 'primary' : 'secondary'}
            onClick={() => setViewHistory(!viewHistory)}
          >
            <History fontSize="small" /> {viewHistory ? 'Show Pending Only' : 'Show History Log'}
          </ModernButton>
          <ModernButton onClick={loadQueues}>Refresh</ModernButton>
        </div>
      </div>

      {/* KPI Stats */}
      <StatsGrid>
        <StatBox $accent={totalPending > 0 ? '#d97706' : '#059669'}>
          <div className="title">Items Awaiting Decision</div>
          <div className="value">{totalPending}</div>
          <div className="sub">Across All 3 Queues</div>
        </StatBox>

        <StatBox $accent="#dc2626">
          <div className="title">Financial Adjustments</div>
          <div className="value">{pendingAdjCount}</div>
          <div className="sub">Waivers / Voids / Refunds</div>
        </StatBox>

        <StatBox $accent="#ec4899">
          <div className="title">Scholarship Concessions</div>
          <div className="value">{pendingConcCount}</div>
          <div className="sub">Discount Policies</div>
        </StatBox>

        <StatBox $accent="#2563eb">
          <div className="title">Rate Overrides</div>
          <div className="value">{pendingOverCount}</div>
          <div className="sub">Custom Student Rates</div>
        </StatBox>
      </StatsGrid>

      {/* Queue Switcher */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <ModernButton
          $variant={activeQueue === 'adjustments' ? 'primary' : 'ghost'}
          onClick={() => setActiveQueue('adjustments')}
        >
          <Tune fontSize="small" /> Financial Adjustments ({pendingAdjCount})
        </ModernButton>
        <ModernButton
          $variant={activeQueue === 'concessions' ? 'primary' : 'ghost'}
          onClick={() => setActiveQueue('concessions')}
        >
          <CardGiftcard fontSize="small" /> Concession Policies ({pendingConcCount})
        </ModernButton>
        <ModernButton
          $variant={activeQueue === 'overrides' ? 'primary' : 'ghost'}
          onClick={() => setActiveQueue('overrides')}
        >
          <AssignmentTurnedIn fontSize="small" /> Rate Overrides ({pendingOverCount})
        </ModernButton>
      </div>

      {/* ================================================================= */}
      {/* QUEUE 1: ADJUSTMENTS */}
      {/* ================================================================= */}
      {activeQueue === 'adjustments' && (
        <HubCard style={{ padding: '0.5rem' }}>
          <TableWrapper>
            <ModernTable>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Target Reference</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Requested By</th>
                <th>Justification</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                    No financial adjustments {viewHistory ? 'found in history' : 'pending decision'}.
                  </td>
                </tr>
              ) : (
                adjustments.map((a) => {
                  const isPending = a.status === 'pending';
                  const isRequester = a.requested_by === userId;
                  const canDecide = isPending && !isRequester;

                  return (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{a.id}</td>
                      <td>
                        <ModernBadge
                          $variant={
                            a.kind === 'void' ? 'danger' : a.kind === 'waiver' ? 'warning' : 'info'
                          }
                        >
                          {a.kind.toUpperCase()}
                        </ModernBadge>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {a.receipt_no ? `REC #${a.receipt_no}` : a.demand_line_id ? `Line #${a.demand_line_id}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                        {a.amount ? formatFeeCurrency(a.amount) : 'Full Receipt'}
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>
                        <div>{a.requester_name || `User #${a.requested_by}`}</div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {formatFeeDate(a.created_at)}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '0.78rem' }}>{a.reason}</td>
                      <td>
                        <ModernBadge
                          $variant={
                            a.status === 'approved' ? 'success' : a.status === 'pending' ? 'warning' : 'danger'
                          }
                        >
                          {a.status.toUpperCase()}
                        </ModernBadge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {canDecide ? (
                          <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                            <ModernButton
                              $size="sm"
                              $variant="success"
                              onClick={() => openDecisionDialog('adjustment', a.id, true)}
                            >
                              <CheckCircle fontSize="inherit" /> Approve
                            </ModernButton>
                            <ModernButton
                              $size="sm"
                              $variant="danger"
                              onClick={() => openDecisionDialog('adjustment', a.id, false)}
                            >
                              <Cancel fontSize="inherit" /> Reject
                            </ModernButton>
                          </div>
                        ) : isPending && isRequester ? (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                            Self-approval blocked
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>Decided</span>
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
      )}

      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* QUEUE 2: CONCESSIONS */}
      {/* ================================================================= */}
      {activeQueue === 'concessions' && (
        <HubCard style={{ padding: '0.5rem' }}>
          <TableWrapper>
            <ModernTable>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Policy Kind</th>
                  <th>Head</th>
                  <th style={{ textAlign: 'right' }}>Discount Value</th>
                  <th>Validity</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {concessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                      No concessions {viewHistory ? 'found in history' : 'pending decision'}.
                    </td>
                  </tr>
                ) : (
                  concessions.map((c) => {
                    const isPending = c.status === 'pending';
                    const isRequester = c.requested_by === userId;
                    const canDecide = isPending && !isRequester;

                    return (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{c.id}</td>
                        <td style={{ fontWeight: 700 }}>{c.student_name || `ID #${c.student_id}`}</td>
                        <td style={{ textTransform: 'capitalize' }}>
                          <ModernBadge $variant="info">{c.kind.replace('_', ' ')}</ModernBadge>
                        </td>
                        <td>{c.head_title || 'All eligible heads'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#ec4899' }}>
                          {c.value_type === 'percent' ? `${c.value}% Off` : formatFeeCurrency(c.value)}
                        </td>
                        <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {c.valid_during.replace(/[\[\(\)\]]/g, '').replace(',', ' → ') || 'Open-ended'}
                        </td>
                        <td style={{ maxWidth: '220px', fontSize: '0.78rem' }}>{c.reason}</td>
                        <td>
                          <ModernBadge
                            $variant={
                              c.status === 'approved' ? 'success' : c.status === 'pending' ? 'warning' : 'danger'
                            }
                          >
                            {c.status.toUpperCase()}
                          </ModernBadge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {canDecide ? (
                            <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                              <ModernButton
                                $size="sm"
                                $variant="success"
                                onClick={() => openDecisionDialog('concession', c.id, true)}
                              >
                                <CheckCircle fontSize="inherit" /> Approve
                              </ModernButton>
                              <ModernButton
                                $size="sm"
                                $variant="danger"
                                onClick={() => openDecisionDialog('concession', c.id, false)}
                              >
                                <Cancel fontSize="inherit" /> Reject
                              </ModernButton>
                            </div>
                          ) : isPending && isRequester ? (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                              Self-approval blocked
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>Decided</span>
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
      )}

      {/* ================================================================= */}
      {/* QUEUE 3: OVERRIDES */}
      {/* ================================================================= */}
      {activeQueue === 'overrides' && (
        <HubCard style={{ padding: '0.5rem' }}>
          <TableWrapper>
            <ModernTable>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Fee Head</th>
                  <th>Session</th>
                  <th style={{ textAlign: 'right' }}>Custom Rate</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overrides.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                      No rate overrides {viewHistory ? 'found in history' : 'pending decision'}.
                    </td>
                  </tr>
                ) : (
                  overrides.map((o) => {
                    const isPending = o.status === 'pending';
                    const isRequester = o.requested_by === userId;
                    const canDecide = isPending && !isRequester;

                    return (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{o.id}</td>
                        <td style={{ fontWeight: 700 }}>{o.student_name || `ID #${o.student_id}`}</td>
                        <td>{o.head_title}</td>
                        <td>Session #{o.session_id}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                          {formatFeeCurrency(o.amount)}
                        </td>
                        <td style={{ maxWidth: '240px', fontSize: '0.78rem' }}>{o.reason}</td>
                        <td>
                          <ModernBadge
                            $variant={
                              o.status === 'approved' ? 'success' : o.status === 'pending' ? 'warning' : 'danger'
                            }
                          >
                            {o.status.toUpperCase()}
                          </ModernBadge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {canDecide && (
                            <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                              <ModernButton
                                $size="sm"
                                $variant="success"
                                onClick={() => openDecisionDialog('override', o.id, true)}
                              >
                                <CheckCircle fontSize="inherit" /> Approve
                              </ModernButton>
                              <ModernButton
                                $size="sm"
                                $variant="danger"
                                onClick={() => openDecisionDialog('override', o.id, false)}
                              >
                                <Cancel fontSize="inherit" /> Reject
                              </ModernButton>
                            </div>
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
      )}

      {/* Decision Remarks Modal */}
      {decisionModalOpen && pendingAction && (
        <ModalBackdrop onClick={() => setDecisionModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="480px">
            <h3 className="modal-title">
              {pendingAction.approve ? 'Authorize & Approve Request' : 'Reject Request'}
            </h3>
            <p className="modal-subtitle">
              {pendingAction.approve
                ? 'Approval immediately executes the financial transaction into the immutable double-entry ledger.'
                : 'Please state the audit rationale for rejecting this request.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  SUPERVISOR REMARKS (OPTIONAL):
                </label>
                <ModernInput
                  type="text"
                  placeholder="Enter remarks or approval terms..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton $variant="ghost" onClick={() => setDecisionModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton
                  $variant={pendingAction.approve ? 'success' : 'danger'}
                  onClick={handleConfirmDecision}
                >
                  {pendingAction.approve ? 'Confirm Approval' : 'Confirm Rejection'}
                </ModernButton>
              </div>
            </div>
          </ModalDialog>
        </ModalBackdrop>
      )}
    </div>
  );
};
export default ApprovalsTab;
