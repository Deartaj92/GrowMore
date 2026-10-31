import React, { useState, useEffect, useMemo } from 'react';
import {
  Add,
  CheckCircle,
  Cancel,
  Block,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import {
  FeeConcession,
  StudentFeeOverride,
  FeeHead,
  ConcessionKind,
} from '../../../types/feeLedger';
import {
  fetchConcessions,
  grantStudentConcession,
  decideConcession,
  fetchOverrides,
  requestOverride,
  decideOverride,
  fetchFeeHeads,
  parseOverrideReasonAndRevisions,
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
  formatFeeCurrency,
} from '../FeeHubStyles';

const firstDayOfCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

export const ConcessionsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  const [subTab, setSubTab] = useState<'concessions' | 'overrides'>('concessions');

  // Concessions
  const [concessions, setConcessions] = useState<FeeConcession[]>([]);
  const [concFilter, setConcFilter] = useState('ALL');
  const [concSearch, setConcSearch] = useState('');

  // Overrides
  const [overrides, setOverrides] = useState<StudentFeeOverride[]>([]);
  const [overFilter, setOverFilter] = useState('ALL');
  const [overSearch, setOverSearch] = useState('');

  // References
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearchInput, setStudentSearchInput] = useState('');

  // Modals
  const [isConcModalOpen, setIsConcModalOpen] = useState(false);
  const [isOverModalOpen, setIsOverModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Forms
  const [concForm, setConcForm] = useState<{
    kind: ConcessionKind;
    fee_head_id: number | null;
    value_type: 'percent' | 'fixed';
    value: number;
    valid_from: string;
    valid_to: string;
    reason: string;
    auto_approve: boolean;
  }>({
    kind: 'sibling',
    fee_head_id: null,
    value_type: 'percent',
    value: 20,
    valid_from: firstDayOfCurrentMonth(),
    valid_to: '',
    reason: '',
    auto_approve: true,
  });

  const [overForm, setOverForm] = useState<{
    session_id: number;
    fee_head_id: number;
    amount: number;
    reason: string;
  }>({
    session_id: 0,
    fee_head_id: 0,
    amount: 0,
    reason: '',
  });

  useEffect(() => {
    loadReferences();
    loadConcessionsData();
    loadOverridesData();
  }, [schoolId]);

  const loadReferences = async () => {
    try {
      const heads = await fetchFeeHeads(schoolId);
      setFeeHeads(heads);

      const { data: sData } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('id', { ascending: false });
      if (sData && sData.length > 0) {
        setSessions(sData);
        setOverForm((p) => ({ ...p, session_id: sData[0].id }));
      }
      if (heads.length > 0) {
        setOverForm((p) => ({ ...p, fee_head_id: heads[0].id }));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadConcessionsData = async () => {
    try {
      const data = await fetchConcessions(schoolId);
      setConcessions(data);
    } catch (err: any) {
      showToast('Failed to load concessions.', 'error');
    }
  };

  const loadOverridesData = async () => {
    try {
      const data = await fetchOverrides(schoolId);
      setOverrides(data);
    } catch (err: any) {
      showToast('Failed to load fee overrides.', 'error');
    }
  };

  const searchStudents = async (query: string) => {
    setStudentSearchInput(query);
    if (!query || query.trim().length < 2) {
      setStudents([]);
      return;
    }
    const { data } = await supabase
      .from('students')
      .select('id, name, father_name, roll_number, class_id, classes:class_id(name)')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .or(`name.ilike.%${query}%,father_name.ilike.%${query}%,roll_number.ilike.%${query}%`)
      .limit(10);
    setStudents(data || []);
  };

  // Submit Concession Request
  const handleCreateConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please select a student.', 'error');
      return;
    }
    if (concForm.value <= 0) {
      showToast('Benefit value must be greater than zero.', 'error');
      return;
    }
    if (!concForm.reason.trim()) {
      showToast('A clear reason is required.', 'error');
      return;
    }

    try {
      await grantStudentConcession(
        { schoolId, userId },
        {
          studentIds: [selectedStudent.id],
          feeHeadId: concForm.fee_head_id ? Number(concForm.fee_head_id) : null,
          kind: concForm.kind,
          valueType: concForm.value_type,
          value: Number(concForm.value),
          effectiveFrom: concForm.valid_from,
          effectiveTo: concForm.valid_to || null,
          reason: concForm.reason.trim(),
          autoApprove: concForm.auto_approve,
        }
      );
      showToast(
        `Concession policy ${concForm.auto_approve ? 'granted & approved' : 'requested'} effective from ${concForm.valid_from}. Past amounts are unaffected.`,
        'success'
      );
      setIsConcModalOpen(false);
      setSelectedStudent(null);
      loadConcessionsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to grant concession.', 'error');
    }
  };

  // Submit Override Request
  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please select a student.', 'error');
      return;
    }
    if (overForm.amount < 0) {
      showToast('Override amount cannot be negative.', 'error');
      return;
    }
    if (!overForm.reason.trim()) {
      showToast('A clear justification is required.', 'error');
      return;
    }

    try {
      await requestOverride(schoolId, userId, {
        student_id: selectedStudent.id,
        session_id: Number(overForm.session_id),
        fee_head_id: Number(overForm.fee_head_id),
        amount: Number(overForm.amount),
        reason: overForm.reason.trim(),
      });
      showToast('Rate override requested successfully.', 'success');
      setIsOverModalOpen(false);
      setSelectedStudent(null);
      loadOverridesData();
    } catch (err: any) {
      showToast(err.message || 'Failed to request override.', 'error');
    }
  };

  // Maker-checker Decisions
  const handleDecideConcession = async (id: number, action: 'approve' | 'reject' | 'revoke') => {
    try {
      await decideConcession({ schoolId, userId }, id, action);
      showToast(`Concession ${action}d.`, 'success');
      loadConcessionsData();
    } catch (err: any) {
      showToast(err.message || `Failed to ${action} concession.`, 'error');
    }
  };

  const handleDecideOverride = async (id: number, approve: boolean) => {
    try {
      await decideOverride({ schoolId, userId }, id, approve);
      showToast(`Override ${approve ? 'approved' : 'rejected'}.`, 'success');
      loadOverridesData();
    } catch (err: any) {
      showToast(err.message || 'Failed to decide override.', 'error');
    }
  };

  const filteredConcessions = useMemo(() => {
    return concessions.filter((c) => {
      if (concFilter !== 'ALL' && c.status !== concFilter) return false;
      if (concSearch.trim()) {
        const q = concSearch.toLowerCase();
        const m1 = c.student_name?.toLowerCase().includes(q);
        const m2 = c.head_title?.toLowerCase().includes(q);
        const m3 = c.kind.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [concessions, concFilter, concSearch]);

  const filteredOverrides = useMemo(() => {
    return overrides.filter((o) => {
      if (overFilter !== 'ALL' && o.status !== overFilter) return false;
      if (overSearch.trim()) {
        const q = overSearch.toLowerCase();
        const m1 = o.student_name?.toLowerCase().includes(q);
        const m2 = o.head_title?.toLowerCase().includes(q);
        if (!m1 && !m2) return false;
      }
      return true;
    });
  }, [overrides, overFilter, overSearch]);

  return (
    <div>
      {/* Sub-nav row */}
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
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <ModernButton
            $variant={subTab === 'concessions' ? 'primary' : 'ghost'}
            onClick={() => setSubTab('concessions')}
          >
            Concession Policies ({concessions.length})
          </ModernButton>
          <ModernButton
            $variant={subTab === 'overrides' ? 'primary' : 'ghost'}
            onClick={() => setSubTab('overrides')}
          >
            Custom Student Overrides ({overrides.length})
          </ModernButton>
        </div>

        <div>
          {subTab === 'concessions' ? (
            <ModernButton $variant="primary" onClick={() => setIsConcModalOpen(true)}>
              <Add fontSize="small" /> Grant / Request Concession
            </ModernButton>
          ) : (
            <ModernButton $variant="primary" onClick={() => setIsOverModalOpen(true)}>
              <Add fontSize="small" /> Request Rate Override
            </ModernButton>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SUB-TAB 1: CONCESSIONS */}
      {/* ================================================================= */}
      {subTab === 'concessions' && (
        <>
          <HubFilterRow>
            <div className="filter-item">
              <label>Status:</label>
              <ModernSelect value={concFilter} onChange={(e) => setConcFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved / Active</option>
                <option value="rejected">Rejected</option>
                <option value="revoked">Revoked</option>
              </ModernSelect>
            </div>

            <div className="filter-item" style={{ flex: 1, minWidth: '220px' }}>
              <label>Search:</label>
              <ModernInput
                type="text"
                placeholder="Student, head or kind..."
                value={concSearch}
                onChange={(e) => setConcSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </HubFilterRow>

          <HubCard style={{ padding: '0.5rem' }}>
            <TableWrapper>
              <ModernTable>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student</th>
                    <th>Policy Kind</th>
                    <th>Applicable Head</th>
                    <th style={{ textAlign: 'right' }}>Discount Value</th>
                    <th>Effective Window (Non-Retroactive)</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConcessions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}
                      >
                        No concessions found. Click "Grant / Request Concession" to grant a scholarship or discount.
                      </td>
                    </tr>
                  ) : (
                    filteredConcessions.map((c) => {
                      const isPending = c.status === 'pending';
                      const canRevoke = c.status === 'approved';

                      return (
                        <tr key={c.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{c.id}</td>
                          <td style={{ fontWeight: 700 }}>
                            {c.student_name || `ID #${c.student_id}`}
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>
                            <ModernBadge $variant="info">{c.kind.replace('_', ' ')}</ModernBadge>
                          </td>
                          <td>{c.head_title || 'All eligible heads'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#ec4899' }}>
                            {c.value_type === 'percent'
                              ? `${c.value}% Off`
                              : formatFeeCurrency(c.value)}
                          </td>
                          <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {c.valid_during.replace(/[\[\(\)\]]/g, '').replace(',', ' → ') ||
                              'Open-ended'}
                          </td>
                          <td style={{ fontSize: '0.78rem', maxWidth: '200px' }}>{c.reason}</td>
                          <td>
                            <ModernBadge
                              $variant={
                                c.status === 'approved'
                                  ? 'success'
                                  : c.status === 'pending'
                                  ? 'warning'
                                  : c.status === 'rejected'
                                  ? 'danger'
                                  : 'neutral'
                              }
                            >
                              {c.status.toUpperCase()}
                            </ModernBadge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                              {isPending && (
                                <>
                                  <ModernButton
                                    $size="sm"
                                    $variant="success"
                                    onClick={() => handleDecideConcession(c.id, 'approve')}
                                  >
                                    <CheckCircle fontSize="inherit" /> Approve
                                  </ModernButton>
                                  <ModernButton
                                    $size="sm"
                                    $variant="danger"
                                    onClick={() => handleDecideConcession(c.id, 'reject')}
                                  >
                                    <Cancel fontSize="inherit" /> Reject
                                  </ModernButton>
                                </>
                              )}
                              {canRevoke && (
                                <ModernButton
                                  $size="sm"
                                  $variant="ghost"
                                  onClick={() => handleDecideConcession(c.id, 'revoke')}
                                >
                                  <Block fontSize="inherit" /> Revoke
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
          </HubCard>
        </>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: OVERRIDES */}
      {/* ================================================================= */}
      {subTab === 'overrides' && (
        <>
          <HubFilterRow>
            <div className="filter-item">
              <label>Status:</label>
              <ModernSelect value={overFilter} onChange={(e) => setOverFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </ModernSelect>
            </div>

            <div className="filter-item" style={{ flex: 1, minWidth: '220px' }}>
              <label>Search:</label>
              <ModernInput
                type="text"
                placeholder="Student or fee head..."
                value={overSearch}
                onChange={(e) => setOverSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </HubFilterRow>

          <HubCard style={{ padding: '0.5rem' }}>
            <TableWrapper>
              <ModernTable>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student</th>
                    <th>Fee Head</th>
                    <th>Session</th>
                    <th style={{ textAlign: 'right' }}>Fixed Monthly Rate</th>
                    <th>Reason / Justification</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOverrides.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}
                      >
                        No custom rate overrides found.
                      </td>
                    </tr>
                  ) : (
                    filteredOverrides.map((o) => {
                      const isPending = o.status === 'pending';
                      const { cleanReason } = parseOverrideReasonAndRevisions(o.reason);

                      return (
                        <tr key={o.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{o.id}</td>
                          <td style={{ fontWeight: 700 }}>
                            {o.student_name || `ID #${o.student_id}`}
                          </td>
                          <td>{o.head_title}</td>
                          <td>Session #{o.session_id}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                            {formatFeeCurrency(o.amount)}
                          </td>
                          <td style={{ fontSize: '0.78rem', maxWidth: '260px' }}>{cleanReason}</td>
                          <td>
                            <ModernBadge
                              $variant={
                                o.status === 'approved'
                                  ? 'success'
                                  : o.status === 'pending'
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {o.status.toUpperCase()}
                            </ModernBadge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isPending && (
                              <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                                <ModernButton
                                  $size="sm"
                                  $variant="success"
                                  onClick={() => handleDecideOverride(o.id, true)}
                                >
                                  <CheckCircle fontSize="inherit" /> Approve
                                </ModernButton>
                                <ModernButton
                                  $size="sm"
                                  $variant="danger"
                                  onClick={() => handleDecideOverride(o.id, false)}
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
        </>
      )}

      {/* Modal: Grant / Request Concession */}
      {isConcModalOpen && (
        <ModalBackdrop onClick={() => setIsConcModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="580px">
            <h3 className="modal-title">Grant / Request Concession Policy</h3>
            <p className="modal-subtitle">
              Configure scholarships, sibling discounts, or special fee waivers effective from a chosen date without affecting past challans.
            </p>

            <form
              onSubmit={handleCreateConcession}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginBottom: '0.25rem',
                  }}
                >
                  STUDENT:
                </label>
                {selectedStudent ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <div>
                      <strong>{selectedStudent.name}</strong> (Roll:{' '}
                      {selectedStudent.roll_number || 'N/A'}, Class:{' '}
                      {selectedStudent.classes?.name || '—'})
                    </div>
                    <ModernButton
                      $size="sm"
                      $variant="ghost"
                      onClick={() => setSelectedStudent(null)}
                    >
                      Change
                    </ModernButton>
                  </div>
                ) : (
                  <div>
                    <ModernInput
                      type="text"
                      placeholder="Type student name or roll #..."
                      value={studentSearchInput}
                      onChange={(e) => searchStudents(e.target.value)}
                      style={{ width: '100%' }}
                    />
                    {students.length > 0 && (
                      <div
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          marginTop: '4px',
                          maxHeight: '140px',
                          overflowY: 'auto',
                          background: '#fff',
                          color: '#0f172a',
                        }}
                      >
                        {students.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStudent(s);
                              setStudents([]);
                              setStudentSearchInput('');
                            }}
                            style={{
                              padding: '0.45rem 0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '0.8rem',
                            }}
                          >
                            <strong>{s.name}</strong> s/o {s.father_name} (Class:{' '}
                            {s.classes?.name || '—'})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    POLICY KIND:
                  </label>
                  <ModernSelect
                    value={concForm.kind}
                    onChange={(e) =>
                      setConcForm((p) => ({ ...p, kind: e.target.value as ConcessionKind }))
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="sibling">Sibling Discount</option>
                    <option value="staff_child">Staff Child Concession</option>
                    <option value="scholarship">Academic Scholarship</option>
                    <option value="need_based">Need-Based Assistance</option>
                    <option value="merit">Merit Award</option>
                    <option value="other">Other Special Policy</option>
                  </ModernSelect>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    APPLICABLE HEAD:
                  </label>
                  <ModernSelect
                    value={concForm.fee_head_id || ''}
                    onChange={(e) =>
                      setConcForm((p) => ({
                        ...p,
                        fee_head_id: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="">All Eligible Heads</option>
                    {feeHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title}
                      </option>
                    ))}
                  </ModernSelect>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    DISCOUNT TYPE:
                  </label>
                  <ModernSelect
                    value={concForm.value_type}
                    onChange={(e) =>
                      setConcForm((p) => ({
                        ...p,
                        value_type: e.target.value as 'percent' | 'fixed',
                      }))
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="percent">Percentage Off (%)</option>
                    <option value="fixed">Fixed Amount Off (Rs)</option>
                  </ModernSelect>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    {concForm.value_type === 'percent' ? 'PERCENT (%)' : 'AMOUNT (RS)'}:
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    max={concForm.value_type === 'percent' ? 100 : 1000000}
                    value={concForm.value}
                    onChange={(e) =>
                      setConcForm((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))
                    }
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    EFFECTIVE FROM DATE (NON-RETROACTIVE):
                  </label>
                  <ModernInput
                    type="date"
                    value={concForm.valid_from}
                    onChange={(e) => setConcForm((p) => ({ ...p, valid_from: e.target.value }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    EFFECTIVE TO DATE (OPTIONAL):
                  </label>
                  <ModernInput
                    type="date"
                    value={concForm.valid_to}
                    onChange={(e) => setConcForm((p) => ({ ...p, valid_to: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginBottom: '0.25rem',
                  }}
                >
                  REASON / BOARD RESOLUTION (MANDATORY):
                </label>
                <ModernInput
                  type="text"
                  placeholder="e.g. Sibling discount verified for 2nd child in school"
                  value={concForm.reason}
                  onChange={(e) => setConcForm((p) => ({ ...p, reason: e.target.value }))}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={concForm.auto_approve}
                  onChange={(e) =>
                    setConcForm((p) => ({ ...p, auto_approve: e.target.checked }))
                  }
                />
                Approve & activate immediately for billing on/after {concForm.valid_from}
              </label>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <ModernButton
                  type="button"
                  $variant="ghost"
                  onClick={() => setIsConcModalOpen(false)}
                >
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary">
                  {concForm.auto_approve ? 'Grant & Approve Concession' : 'Submit Request'}
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: Request Override */}
      {isOverModalOpen && (
        <ModalBackdrop onClick={() => setIsOverModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="540px">
            <h3 className="modal-title">Request Custom Rate Override</h3>
            <p className="modal-subtitle">
              Sets an exact flat monthly rate for an individual student.
            </p>

            <form
              onSubmit={handleCreateOverride}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginBottom: '0.25rem',
                  }}
                >
                  STUDENT:
                </label>
                {selectedStudent ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <div>
                      <strong>{selectedStudent.name}</strong> (Roll:{' '}
                      {selectedStudent.roll_number || 'N/A'}, Class:{' '}
                      {selectedStudent.classes?.name || '—'})
                    </div>
                    <ModernButton
                      $size="sm"
                      $variant="ghost"
                      onClick={() => setSelectedStudent(null)}
                    >
                      Change
                    </ModernButton>
                  </div>
                ) : (
                  <div>
                    <ModernInput
                      type="text"
                      placeholder="Type student name or roll #..."
                      value={studentSearchInput}
                      onChange={(e) => searchStudents(e.target.value)}
                      style={{ width: '100%' }}
                    />
                    {students.length > 0 && (
                      <div
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          marginTop: '4px',
                          maxHeight: '140px',
                          overflowY: 'auto',
                          background: '#fff',
                          color: '#0f172a',
                        }}
                      >
                        {students.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStudent(s);
                              setStudents([]);
                              setStudentSearchInput('');
                            }}
                            style={{
                              padding: '0.45rem 0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '0.8rem',
                            }}
                          >
                            <strong>{s.name}</strong> s/o {s.father_name} (Class:{' '}
                            {s.classes?.name || '—'})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    ACADEMIC SESSION:
                  </label>
                  <ModernSelect
                    value={overForm.session_id}
                    onChange={(e) =>
                      setOverForm((p) => ({ ...p, session_id: Number(e.target.value) }))
                    }
                    style={{ width: '100%' }}
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </ModernSelect>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: '0.25rem',
                    }}
                  >
                    FEE HEAD:
                  </label>
                  <ModernSelect
                    value={overForm.fee_head_id}
                    onChange={(e) =>
                      setOverForm((p) => ({ ...p, fee_head_id: Number(e.target.value) }))
                    }
                    style={{ width: '100%' }}
                  >
                    {feeHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title}
                      </option>
                    ))}
                  </ModernSelect>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginBottom: '0.25rem',
                  }}
                >
                  OVERRIDE MONTHLY AMOUNT (RS):
                </label>
                <ModernInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={overForm.amount}
                  onChange={(e) =>
                    setOverForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))
                  }
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginBottom: '0.25rem',
                  }}
                >
                  JUSTIFICATION / SPECIAL BOARD APPROVAL:
                </label>
                <ModernInput
                  type="text"
                  placeholder="e.g. Special fee package agreed at admission"
                  value={overForm.reason}
                  onChange={(e) => setOverForm((p) => ({ ...p, reason: e.target.value }))}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <ModernButton
                  type="button"
                  $variant="ghost"
                  onClick={() => setIsOverModalOpen(false)}
                >
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary">
                  Submit Override
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}
    </div>
  );
};
export default ConcessionsTab;
