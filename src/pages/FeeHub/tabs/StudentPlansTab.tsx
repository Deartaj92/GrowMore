import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Search,
  Add,
  Edit,
  CheckCircle,
  AccountCircle,
  Group,
  Tune,
  FilterList,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import {
  FeeHead,
  StudentFeePlanRow,
  StudentPlanHeadDetail,
} from '../../../types/feeLedger';
import {
  fetchFeeHeads,
  fetchStudentsFeePlans,
  setStudentFeePlan,
  bulkSetClassFeePlan,
} from '../../../services/feeLedgerService';
import { isDark } from '../../../styles/DesignSystem';
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

const HeadChip = styled.span<{ $hasOverride: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 9999px;
  background: ${({ $hasOverride, theme }) =>
    $hasOverride
      ? 'rgba(16, 185, 129, 0.15)'
      : isDark(theme)
      ? 'rgba(148, 163, 184, 0.12)'
      : 'rgba(100, 116, 139, 0.1)'};
  color: ${({ $hasOverride, theme }) =>
    $hasOverride
      ? '#10b981'
      : isDark(theme)
      ? '#cbd5e1'
      : '#475569'};
  border: 1px solid
    ${({ $hasOverride, theme }) =>
      $hasOverride
        ? 'rgba(16, 185, 129, 0.35)'
        : isDark(theme)
        ? 'rgba(148, 163, 184, 0.25)'
        : 'rgba(100, 116, 139, 0.2)'};
`;

export const StudentPlansTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolId = user?.school_id || 2;
  const userId = user?.id || 1;

  // Filters state
  const [sessions, setSessions] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(0);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [sections, setSections] = useState<Array<{ id: number; name: string; class_id: number }>>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentFeePlanRow[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);

  // Single Student Configure Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFeePlanRow | null>(null);
  const [studentHeadInputs, setStudentHeadInputs] = useState<
    Record<number, { amount: number; reason: string; included: boolean }>
  >({});
  const [savingPlan, setSavingPlan] = useState(false);

  // Bulk Class Setup Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkClassId, setBulkClassId] = useState<number | ''>('');
  const [bulkHeadInputs, setBulkHeadInputs] = useState<Record<number, number>>({});
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);

  useEffect(() => {
    loadPrerequisites();
  }, [schoolId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadStudents();
    }
  }, [schoolId, selectedSessionId, selectedClassId, selectedSectionId]);

  const loadPrerequisites = async () => {
    try {
      // Load sessions from 'sessions' table
      const { data: sData } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('id', { ascending: false });

      if (sData && sData.length > 0) {
        setSessions(sData);
        setSelectedSessionId(sData[0].id);
      }

      // Load classes
      const { data: cData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      setClasses(cData || []);

      // Load sections
      const { data: secData } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', schoolId)
        .order('name');
      setSections(secData || []);

      // Load active fee heads
      const heads = await fetchFeeHeads(schoolId);
      setFeeHeads(heads);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load setup filters.', 'error');
    }
  };

  const loadStudents = async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      const rows = await fetchStudentsFeePlans(
        schoolId,
        selectedSessionId,
        selectedClassId || null,
        selectedSectionId || null,
        searchQuery
      );
      setStudents(rows);
    } catch (err: any) {
      showToast(err.message || 'Failed to load students fee plans.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  // Open single student configuration
  const handleOpenEdit = (st: StudentFeePlanRow) => {
    setSelectedStudent(st);
    const inputs: Record<number, { amount: number; reason: string; included: boolean }> = {};

    feeHeads.forEach((h) => {
      const existing = st.heads_detail?.find((d) => d.fee_head_id === h.id);
      const standardAmt = existing ? existing.standard_amount : 0;
      const customAmt = existing && existing.custom_amount !== null ? existing.custom_amount : standardAmt;
      const hasOverride = existing ? existing.has_override : false;

      inputs[h.id] = {
        amount: customAmt,
        reason: hasOverride ? 'Negotiated rate' : '',
        included: customAmt > 0 || hasOverride,
      };
    });

    setStudentHeadInputs(inputs);
    setEditModalOpen(true);
  };

  // Save single student fee plan
  const handleSaveStudentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedSessionId) return;

    try {
      setSavingPlan(true);
      const items = Object.entries(studentHeadInputs)
        .filter(([_, v]) => v.included)
        .map(([headId, v]) => ({
          fee_head_id: Number(headId),
          amount: Number(v.amount),
          reason: v.reason || 'Configured via Student Fee Plan',
        }));

      await setStudentFeePlan(
        { schoolId, userId },
        {
          studentId: selectedStudent.student_id,
          sessionId: selectedSessionId,
          items,
          notes: `Updated student fee package on ${new Date().toLocaleDateString()}`,
        }
      );

      showToast(`Fee plan updated for ${selectedStudent.student_name}!`, 'success');
      setEditModalOpen(false);
      loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to save student fee plan.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  // Open bulk class setup
  const handleOpenBulk = () => {
    setBulkClassId(selectedClassId || (classes[0]?.id ?? ''));
    const initialInputs: Record<number, number> = {};
    feeHeads.forEach((h) => {
      initialInputs[h.id] = h.code === 'TUI' ? 3000 : 0;
    });
    setBulkHeadInputs(initialInputs);
    setBulkModalOpen(true);
  };

  // Save bulk class setup
  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkClassId || !selectedSessionId) {
      showToast('Select a class to configure.', 'error');
      return;
    }

    try {
      setSavingBulk(true);
      const items = Object.entries(bulkHeadInputs)
        .filter(([_, amt]) => Number(amt) > 0)
        .map(([headId, amt]) => ({
          fee_head_id: Number(headId),
          amount: Number(amt),
          reason: 'Class Bulk Package Setup',
        }));

      if (items.length === 0) {
        showToast('Set at least one fee head amount.', 'warning');
        setSavingBulk(false);
        return;
      }

      const res = await bulkSetClassFeePlan(
        { schoolId, userId },
        {
          classId: Number(bulkClassId),
          sessionId: selectedSessionId,
          items,
          overwriteCustom: bulkOverwrite,
        }
      );

      showToast(
        `Successfully applied fee plan to ${res.updated_students} student(s) in selected class!`,
        'success'
      );
      setBulkModalOpen(false);
      loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to bulk-assign class fee plan.', 'error');
    } finally {
      setSavingBulk(false);
    }
  };

  // Filter sections by selected class
  const filteredSections = selectedClassId
    ? sections.filter((s) => s.class_id === Number(selectedClassId))
    : sections;

  // Calculate modal preview net total
  const calculatedModalTotal = Object.values(studentHeadInputs).reduce(
    (sum, cur) => (cur.included ? sum + (Number(cur.amount) || 0) : sum),
    0
  );

  return (
    <div>
      {/* Filter Bar */}
      <HubFilterRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Session */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Academic Session:
            </label>
            <ModernSelect
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </ModernSelect>
          </div>

          {/* Class Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Class:
            </label>
            <ModernSelect
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value ? Number(e.target.value) : '');
                setSelectedSectionId('');
              }}
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </ModernSelect>
          </div>

          {/* Section Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Section:
            </label>
            <ModernSelect
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value ? Number(e.target.value) : '')}
              disabled={!selectedClassId}
            >
              <option value="">All Sections</option>
              {filteredSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </ModernSelect>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                Search Student:
              </label>
              <ModernInput
                type="text"
                placeholder="Name or Roll #"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '180px' }}
              />
            </div>
            <ModernButton type="submit" $variant="ghost">
              <Search fontSize="small" />
            </ModernButton>
          </form>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <ModernButton $variant="ghost" onClick={loadStudents}>
            <Refresh fontSize="small" /> Refresh
          </ModernButton>
          <ModernButton $variant="primary" onClick={handleOpenBulk}>
            <Group fontSize="small" /> Bulk Setup Class Fee Plan
          </ModernButton>
        </div>
      </HubFilterRow>

      {/* Main Student Plans Table */}
      <HubCard style={{ padding: '0.5rem' }}>
        <TableWrapper>
          <ModernTable>
          <thead>
            <tr>
              <th>Roll #</th>
              <th>Student Name & Father</th>
              <th>Class & Section</th>
              <th>Plan Status</th>
              <th style={{ textAlign: 'right' }}>Standard Class Fee</th>
              <th style={{ textAlign: 'right' }}>Custom Rate</th>
              <th style={{ textAlign: 'right' }}>Concessions</th>
              <th style={{ textAlign: 'right' }}>Net Monthly Payable</th>
              <th>Head Breakdown</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  Loading student fee plans...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.7 }}>
                  No students found matching current filters.
                </td>
              </tr>
            ) : (
              students.map((st) => (
                <tr key={st.student_id}>
                  <td style={{ fontWeight: 700 }}>{st.roll_number || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{st.student_name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>S/D/O {st.father_name || '—'}</div>
                  </td>
                  <td>
                    <strong>{st.class_name || 'Unassigned'}</strong>
                    {st.section_name && <span style={{ opacity: 0.7 }}> ({st.section_name})</span>}
                  </td>
                  <td>
                    <ModernBadge
                      $variant={
                        st.plan_status === 'Custom Plan'
                          ? 'success'
                          : st.plan_status === 'Concession / Discount'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {st.plan_status}
                    </ModernBadge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatFeeCurrency(st.standard_monthly)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: st.custom_monthly !== st.standard_monthly ? '#2563eb' : 'inherit' }}>
                    {formatFeeCurrency(st.custom_monthly)}
                  </td>
                  <td style={{ textAlign: 'right', color: st.concession_monthly > 0 ? '#059669' : 'inherit' }}>
                    {st.concession_monthly > 0 ? `-${formatFeeCurrency(st.concession_monthly)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem' }}>
                    {formatFeeCurrency(st.net_monthly)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                      {(st.heads_detail || []).map((h) => {
                        const amt = h.custom_amount !== null ? h.custom_amount : h.standard_amount;
                        if (amt <= 0 && !h.has_override) return null;
                        return (
                          <HeadChip key={h.fee_head_id} $hasOverride={h.has_override} title={`${h.head_title}: Rs ${amt}`}>
                            {h.head_code}: {amt}
                          </HeadChip>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ModernButton $variant="primary" $size="sm" onClick={() => handleOpenEdit(st)}>
                      <Tune fontSize="small" /> Configure Plan
                    </ModernButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </ModernTable>
      </TableWrapper>
    </HubCard>

      {/* Modal: Single Student Configure Fee Plan */}
      {editModalOpen && selectedStudent && (
        <ModalBackdrop onClick={() => setEditModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="640px">
            <h3 className="modal-title">Configure Student Fee Plan</h3>
            <p className="modal-subtitle">
              Set customized monthly fee package for <strong>{selectedStudent.student_name}</strong> (Class {selectedStudent.class_name}).
            </p>

            <form onSubmit={handleSaveStudentPlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {feeHeads.map((h) => {
                  const state = studentHeadInputs[h.id] || { amount: 0, reason: '', included: false };
                  const stdDetail = selectedStudent.heads_detail?.find((d) => d.fee_head_id === h.id);
                  const standardAmount = stdDetail ? stdDetail.standard_amount : 0;

                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: state.included ? 'rgba(37, 99, 235, 0.12)' : 'rgba(148, 163, 184, 0.08)',
                        border: state.included ? '1px solid rgba(37, 99, 235, 0.35)' : '1px solid rgba(148, 163, 184, 0.15)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={state.included}
                            onChange={(e) =>
                              setStudentHeadInputs((prev) => ({
                                ...prev,
                                [h.id]: { ...state, included: e.target.checked },
                              }))
                            }
                          />
                          {h.title} ({h.code})
                        </label>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          Class Standard: <strong>{formatFeeCurrency(standardAmount)}</strong>
                        </span>
                      </div>

                      {state.included && (
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.75 }}>
                              Custom Monthly Fee:
                            </label>
                            <ModernInput
                              type="number"
                              value={state.amount}
                              onChange={(e) =>
                                setStudentHeadInputs((prev) => ({
                                  ...prev,
                                  [h.id]: { ...state, amount: Number(e.target.value) },
                                }))
                              }
                              style={{ width: '100%' }}
                              required
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.75 }}>
                              Reason / Note:
                            </label>
                            <ModernInput
                              type="text"
                              placeholder="e.g. Special negotiated rate"
                              value={state.reason}
                              onChange={(e) =>
                                setStudentHeadInputs((prev) => ({
                                  ...prev,
                                  [h.id]: { ...state, reason: e.target.value },
                                }))
                              }
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(148, 163, 184, 0.12)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Net Monthly Fee for Student:</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#059669' }}>
                  {formatFeeCurrency(calculatedModalTotal)}
                </span>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary" disabled={savingPlan}>
                  {savingPlan ? 'Saving Fee Plan...' : 'Save Student Fee Plan'}
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* Modal: Bulk Setup Class Fee Plan */}
      {bulkModalOpen && (
        <ModalBackdrop onClick={() => setBulkModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="560px">
            <h3 className="modal-title">Bulk Setup Class Fee Plan</h3>
            <p className="modal-subtitle">
              Quickly apply standard or promotional monthly fee packages to all students in a class.
            </p>

            <form onSubmit={handleSaveBulk} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem' }}>
                  Target Class:
                </label>
                <ModernSelect
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(Number(e.target.value))}
                  style={{ width: '100%' }}
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </ModernSelect>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                  Package Monthly Rates per Head:
                </label>
                {feeHeads.map((h) => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{h.title} ({h.code})</span>
                    <ModernInput
                      type="number"
                      value={bulkHeadInputs[h.id] ?? 0}
                      onChange={(e) =>
                        setBulkHeadInputs((prev) => ({
                          ...prev,
                          [h.id]: Number(e.target.value),
                        }))
                      }
                      style={{ width: '140px', textAlign: 'right' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="bulk_ow"
                  checked={bulkOverwrite}
                  onChange={(e) => setBulkOverwrite(e.target.checked)}
                />
                <label htmlFor="bulk_ow" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                  Overwrite students who already have custom plans
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <ModernButton type="button" $variant="ghost" onClick={() => setBulkModalOpen(false)}>
                  Cancel
                </ModernButton>
                <ModernButton type="submit" $variant="primary" disabled={savingBulk}>
                  {savingBulk ? 'Applying to Class...' : 'Apply Plan to All Students in Class'}
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}
    </div>
  );
};

export default StudentPlansTab;
