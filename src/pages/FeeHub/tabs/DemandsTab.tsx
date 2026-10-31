import React, { useState, useEffect, useMemo } from 'react';
import {
  Description,
  Add,
  Print,
  Block,
  FilterList,
  Visibility,
  Refresh,
  CheckCircle,
  FamilyRestroom,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import {
  FeeDemand,
  FeeDemandLine,
  FamilyFeeSummary,
} from '../../../types/feeLedger';
import {
  fetchDemands,
  fetchDemandLines,
  generateDemands,
  generateFamilyDemands,
  cancelDemand,
  fetchFamiliesWithFeeSummary,
  fetchSingleFamilyFeeSummary,
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
  formatFeeDate,
} from '../FeeHubStyles';
import PrintChallanModal from '../components/PrintChallanModal';
import PrintFamilyChallanModal from '../components/PrintFamilyChallanModal';

export const DemandsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | ''>('');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [families, setFamilies] = useState<FamilyFeeSummary[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Generation Modal
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState<{
    sessionId: number;
    month: number;
    year: number;
    issueDate: string;
    dueDate: string;
    targetMode: 'school_or_class' | 'family';
    classId: number | '';
    familyId: number | '';
  }>({
    sessionId: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    targetMode: 'school_or_class',
    classId: '',
    familyId: '',
  });

  // Print & Details Modal
  const [activeChallan, setActiveChallan] = useState<{ demand: FeeDemand; lines: FeeDemandLine[] } | null>(null);
  const [activeFamilyChallan, setActiveFamilyChallan] = useState<FamilyFeeSummary | null>(null);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<FeeDemand | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadFilters();
    loadDemands();
  }, [schoolId]);

  const loadFilters = async () => {
    try {
      const { data: sData } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('id', { ascending: false });
      if (sData && sData.length > 0) {
        setSessions(sData);
        setSelectedSessionId(sData[0].id);
        setGenForm((prev) => ({ ...prev, sessionId: sData[0].id }));
      }

      const { data: cData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      setClasses(cData || []);

      const famList = await fetchFamiliesWithFeeSummary(schoolId);
      setFamilies(famList);
    } catch (err: any) {
      console.error('Error loading filters:', err);
    }
  };

  const studentToFamilyMap = useMemo(() => {
    const map: Record<number, FamilyFeeSummary> = {};
    families.forEach((f) => {
      f.members.forEach((s) => {
        map[s.student_id] = f;
      });
    });
    return map;
  }, [families]);

  const loadDemands = async () => {
    try {
      setLoading(true);
      const [data, famList] = await Promise.all([
        fetchDemands(schoolId, { limit: 250 }),
        fetchFamiliesWithFeeSummary(schoolId),
      ]);
      setDemands(data);
      setFamilies(famList);
    } catch (err: any) {
      showToast(err.message || 'Failed to load demands.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run Batch Demands Generation
  const handleGenerateDemands = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genForm.sessionId) {
      showToast('Select an academic session.', 'error');
      return;
    }

    try {
      setGenerating(true);
      if (genForm.targetMode === 'family') {
        if (!genForm.familyId) {
          showToast('Please select a target family.', 'error');
          setGenerating(false);
          return;
        }
        const res = await generateFamilyDemands(
          { schoolId, userId },
          {
            familyId: Number(genForm.familyId),
            sessionId: genForm.sessionId,
            month: Number(genForm.month),
            year: Number(genForm.year),
            issueDate: genForm.issueDate,
            dueDate: genForm.dueDate,
          }
        );
        showToast(
          `Family Billing Complete: Generated ${res.generated_count} sibling demands (${res.already_exists_count} already existed).`,
          'success'
        );
      } else {
        const res = await generateDemands(
          { schoolId, userId },
          {
            sessionId: genForm.sessionId,
            month: Number(genForm.month),
            year: Number(genForm.year),
            issueDate: genForm.issueDate,
            dueDate: genForm.dueDate,
            classId: genForm.classId ? Number(genForm.classId) : null,
          }
        );

        showToast(
          `Generated ${res.generated_count} demands (${res.already_exists_count} already existed).`,
          'success'
        );
      }
      setGenModalOpen(false);
      loadDemands();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate demands.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Inspect / Print Challan
  const handleOpenChallan = async (demand: FeeDemand) => {
    try {
      const lineMap = await fetchDemandLines([demand.demand_id]);
      const lines = lineMap[demand.demand_id] || [];
      setActiveChallan({ demand, lines });
    } catch (err: any) {
      showToast('Failed to load challan lines.', 'error');
    }
  };

  const handleOpenFamilyChallan = async (familyId: number) => {
    try {
      const fam = await fetchSingleFamilyFeeSummary(schoolId, familyId);
      if (!fam) {
        showToast('Family not found.', 'error');
        return;
      }
      setActiveFamilyChallan(fam);
    } catch (err: any) {
      showToast('Failed to load consolidated family challan.', 'error');
    }
  };

  // Cancel Unpaid Challan
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      showToast('A mandatory reason is required to cancel a challan.', 'error');
      return;
    }

    try {
      await cancelDemand({ schoolId, userId }, cancelTarget.demand_id, cancelReason);
      showToast(`Challan #${cancelTarget.challan_no} successfully cancelled.`, 'success');
      setCancelModalOpen(false);
      setCancelTarget(null);
      setCancelReason('');
      loadDemands();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel challan.', 'error');
    }
  };

  // Filtered rows
  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (selectedSessionId && d.session_id !== Number(selectedSessionId)) return false;
      if (selectedClassId && d.snapshot?.class_id !== Number(selectedClassId)) return false;
      if (selectedFamilyId) {
        const fam = studentToFamilyMap[d.student_id];
        if (!fam || fam.family_id !== Number(selectedFamilyId)) return false;
      }
      if (statusFilter !== 'ALL' && d.pay_status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesChallan = d.challan_no.toLowerCase().includes(q);
        const matchesStudent = d.snapshot?.student_name?.toLowerCase().includes(q);
        const matchesRoll = d.snapshot?.roll_number?.toLowerCase().includes(q);
        const fam = studentToFamilyMap[d.student_id];
        const matchesFamily = fam?.family_name?.toLowerCase().includes(q);
        if (!matchesChallan && !matchesStudent && !matchesRoll && !matchesFamily) return false;
      }
      return true;
    });
  }, [demands, selectedSessionId, selectedClassId, selectedFamilyId, statusFilter, searchQuery, studentToFamilyMap]);

  return (
    <div>
      {/* Top Action Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Fee Demands & Challans Registry</h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Batch monthly billing generation, family-wise billing, line item breakdowns, and 3-copy standard bank challans.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {selectedFamilyId && (
            <ModernButton
              $variant="secondary"
              onClick={() => handleOpenFamilyChallan(Number(selectedFamilyId))}
            >
              <Print fontSize="small" /> Print Consolidated Family Challan
            </ModernButton>
          )}
          <ModernButton $variant="primary" onClick={() => setGenModalOpen(true)}>
            <Add fontSize="small" /> Generate Monthly Demands
          </ModernButton>
          <ModernButton onClick={loadDemands}>
            <Refresh fontSize="small" /> Refresh
          </ModernButton>
        </div>
      </div>

      {/* Filter Row */}
      <HubFilterRow>
        <div className="filter-item">
          <label>Session:</label>
          <ModernSelect
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </ModernSelect>
        </div>

        <div className="filter-item">
          <label>Class:</label>
          <ModernSelect
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </ModernSelect>
        </div>

        <div className="filter-item">
          <label>Family:</label>
          <ModernSelect
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Families</option>
            {families.map((f) => (
              <option key={f.family_id} value={f.family_id}>
                {f.family_name} ({f.members.length} Siblings)
              </option>
            ))}
          </ModernSelect>
        </div>

        <div className="filter-item">
          <label>Status:</label>
          <ModernSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Fully Paid</option>
            <option value="overdue">Overdue</option>
          </ModernSelect>
        </div>

        <div className="filter-item" style={{ flex: 1, minWidth: '200px' }}>
          <label>Search:</label>
          <ModernInput
            type="text"
            placeholder="Challan #, Student, Family..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </HubFilterRow>

      {/* Table */}
      <HubCard style={{ padding: '0.5rem' }}>
        <TableWrapper>
          <ModernTable>
          <thead>
            <tr>
              <th>Challan #</th>
              <th>Student Details</th>
              <th>Class</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Total (Rs)</th>
              <th style={{ textAlign: 'right' }}>Paid (Rs)</th>
              <th style={{ textAlign: 'right' }}>Balance Due</th>
              <th>Pay Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDemands.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                  No fee demands matching criteria. Click "Generate Monthly Demands" to run billing.
                </td>
              </tr>
            ) : (
              filteredDemands.map((d) => {
                const isPaid = d.pay_status === 'paid';
                const isCancelled = d.doc_status === 'cancelled';
                const canCancel = !isPaid && !isCancelled && d.paid_amount === 0;
                const linkedFamily = studentToFamilyMap[d.student_id];

                return (
                  <tr key={d.demand_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>#{d.challan_no}</td>
                    <td>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {d.snapshot?.student_name || `Student #${d.student_id}`}
                        {linkedFamily && (
                          <span
                            onClick={() => setSelectedFamilyId(linkedFamily.family_id)}
                            title="Filter by this family"
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              background: 'rgba(124, 58, 237, 0.12)',
                              color: '#6d28d9',
                              cursor: 'pointer',
                            }}
                          >
                            {linkedFamily.family_name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        s/o {d.snapshot?.father_name || '—'}
                      </div>
                    </td>
                    <td>{d.snapshot?.class_name || '—'}</td>
                    <td>{formatFeeDate(d.issue_date)}</td>
                    <td>{formatFeeDate(d.due_date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatFeeCurrency(d.net_amount)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                      {formatFeeCurrency(d.paid_amount)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 900,
                        color: d.balance_amount > 0 ? '#dc2626' : '#059669',
                        fontFamily: 'monospace',
                      }}
                    >
                      {formatFeeCurrency(d.balance_amount)}
                    </td>
                    <td>
                      <ModernBadge
                        $variant={
                          isCancelled
                            ? 'neutral'
                            : d.pay_status === 'paid'
                            ? 'success'
                            : d.pay_status === 'overdue'
                            ? 'danger'
                            : d.pay_status === 'partially_paid'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {isCancelled ? 'CANCELLED' : d.pay_status.toUpperCase()}
                      </ModernBadge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <ModernButton
                          $size="sm"
                          $variant="ghost"
                          onClick={() => handleOpenChallan(d)}
                          title="Print 3-Copy Bank Challan"
                        >
                          <Print fontSize="inherit" /> Challan
                        </ModernButton>

                        {linkedFamily && (
                          <ModernButton
                            $size="sm"
                            $variant="ghost"
                            onClick={() => handleOpenFamilyChallan(linkedFamily.family_id)}
                            title="Print Consolidated Family Challan"
                          >
                            <FamilyRestroom fontSize="inherit" /> Family
                          </ModernButton>
                        )}

                        {canCancel && (
                          <ModernButton
                            $size="sm"
                            $variant="danger"
                            onClick={() => {
                              setCancelTarget(d);
                              setCancelReason('');
                              setCancelModalOpen(true);
                            }}
                            title="Cancel Unpaid Challan"
                          >
                            <Block fontSize="inherit" /> Cancel
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

      {/* Modal: Generate Demands */}
      {genModalOpen && (
        <ModalBackdrop onClick={() => setGenModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="540px">
            <h3 className="modal-title">Generate Monthly Fee Demands</h3>
            <p className="modal-subtitle">
              Calculates fee lines based on catalog rate cards, student concessions, and negotiated overrides. Race-free & idempotent.
            </p>

            <form onSubmit={handleGenerateDemands} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Target Scope Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem', color: '#64748b' }}>
                  BILLING TARGET SCOPE:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div
                    onClick={() => setGenForm((prev) => ({ ...prev, targetMode: 'school_or_class' }))}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: `2px solid ${genForm.targetMode === 'school_or_class' ? '#2563eb' : 'rgba(148,163,184,0.25)'}`,
                      background: genForm.targetMode === 'school_or_class' ? 'rgba(37,99,235,0.08)' : 'transparent',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    Whole School / Specific Class
                  </div>
                  <div
                    onClick={() => setGenForm((prev) => ({ ...prev, targetMode: 'family' }))}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: `2px solid ${genForm.targetMode === 'family' ? '#7c3aed' : 'rgba(148,163,184,0.25)'}`,
                      background: genForm.targetMode === 'family' ? 'rgba(124,58,237,0.08)' : 'transparent',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    Specific Family (All Siblings)
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    ACADEMIC SESSION:
                  </label>
                  <ModernSelect
                    value={genForm.sessionId || (sessions[0]?.id ?? '')}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, sessionId: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                    required
                  >
                    {sessions.length === 0 ? (
                      <option value="">No sessions found</option>
                    ) : (
                      sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </ModernSelect>
                </div>

                {genForm.targetMode === 'school_or_class' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                      TARGET CLASS (OPTIONAL):
                    </label>
                    <ModernSelect
                      value={genForm.classId}
                      onChange={(e) =>
                        setGenForm((prev) => ({
                          ...prev,
                          classId: e.target.value ? Number(e.target.value) : '',
                        }))
                      }
                      style={{ width: '100%' }}
                    >
                      <option value="">All Classes (Whole School)</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </ModernSelect>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                      SELECT TARGET FAMILY:
                    </label>
                    <ModernSelect
                      value={genForm.familyId}
                      onChange={(e) =>
                        setGenForm((prev) => ({
                          ...prev,
                          familyId: e.target.value ? Number(e.target.value) : '',
                        }))
                      }
                      style={{ width: '100%' }}
                      required
                    >
                      <option value="">Select Family...</option>
                      {families.map((f) => (
                        <option key={f.family_id} value={f.family_id}>
                          {f.family_name} ({f.members.length} Siblings)
                        </option>
                      ))}
                    </ModernSelect>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    BILLING MONTH (1 – 12):
                  </label>
                  <ModernSelect
                    value={genForm.month}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, month: Number(e.target.value) }))}
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
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    BILLING YEAR:
                  </label>
                  <ModernInput
                    type="number"
                    value={genForm.year}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    ISSUE DATE:
                  </label>
                  <ModernInput
                    type="date"
                    value={genForm.issueDate}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                    DUE DATE:
                  </label>
                  <ModernInput
                    type="date"
                    value={genForm.dueDate}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setGenModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary" disabled={generating}>
                  {generating ? 'Processing Batch...' : 'Run Demand Generator'}
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: Cancel Challan */}
      {cancelModalOpen && cancelTarget && (
        <ModalBackdrop onClick={() => setCancelModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="480px">
            <h3 className="modal-title">Cancel Challan #{cancelTarget.challan_no}</h3>
            <p className="modal-subtitle">
              Cancelling this unpaid fee demand will post a cancellation reversal in the ledger and release any held concessions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: '#64748b' }}>
                  CANCELLATION REASON (MANDATORY):
                </label>
                <ModernInput
                  type="text"
                  placeholder="e.g. Student withdrew prior to start of month"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ModernButton $variant="ghost" onClick={() => setCancelModalOpen(false)}>
                  Back
                </ModernButton>
                <ModernButton $variant="danger" onClick={handleConfirmCancel}>
                  Confirm Cancellation
                </ModernButton>
              </div>
            </div>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Print 3-Copy Challan Modal */}
      {activeChallan && (
        <PrintChallanModal
          demand={activeChallan.demand}
          lines={activeChallan.lines}
          onClose={() => setActiveChallan(null)}
        />
      )}

      {/* Print Consolidated Family Challan Modal */}
      {activeFamilyChallan && (
        <PrintFamilyChallanModal
          family={activeFamilyChallan}
          onClose={() => setActiveFamilyChallan(null)}
        />
      )}
    </div>
  );
};
export default DemandsTab;
