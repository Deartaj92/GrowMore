import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import {
  Search,
  Group,
  Tune,
  Refresh,
  TrendingUp,
  CardGiftcard,
  History,
  Lock,
  Undo,
  CheckCircle,
  Block,
  VerifiedUser,
  Add,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import {
  FeeHead,
  StudentFeePlanRow,
  ConcessionKind,
  FeeDemand,
} from '../../../types/feeLedger';
import {
  fetchFeeHeads,
  fetchStudentsFeePlans,
  setStudentFeePlan,
  bulkSetClassFeePlan,
  computeIncrementedAmount,
  applyFeeIncrement,
  revertLastFeeIncrement,
  grantStudentConcession,
  revokeStudentConcession,
  decideConcession,
  parseConcessionValidDates,
  fetchDemands,
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
  ModalBackdrop,
  ModalDialog,
  formatFeeCurrency,
  formatFeeDate,
} from '../FeeHubStyles';

const HeadChip = styled.span<{ $hasOverride: boolean; $hasIncrement?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.67rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 9999px;
  background: ${({ $hasOverride, $hasIncrement, theme }) =>
    $hasIncrement
      ? 'rgba(139, 92, 246, 0.16)'
      : $hasOverride
        ? 'rgba(16, 185, 129, 0.15)'
        : isDark(theme)
          ? 'rgba(148, 163, 184, 0.12)'
          : 'rgba(100, 116, 139, 0.1)'};
  color: ${({ $hasOverride, $hasIncrement, theme }) =>
    $hasIncrement
      ? '#8b5cf6'
      : $hasOverride
        ? '#10b981'
        : isDark(theme)
          ? '#cbd5e1'
          : '#475569'};
  border: 1px solid
    ${({ $hasOverride, $hasIncrement, theme }) =>
    $hasIncrement
      ? 'rgba(139, 92, 246, 0.35)'
      : $hasOverride
        ? 'rgba(16, 185, 129, 0.35)'
        : isDark(theme)
          ? 'rgba(148, 163, 184, 0.25)'
          : 'rgba(100, 116, 139, 0.2)'};
`;

const ProtectionBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.65rem 1rem;
  margin-bottom: 0.85rem;
  border-radius: 10px;
  background: ${({ theme }) =>
    isDark(theme)
      ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(37, 99, 235, 0.1) 100%)'
      : 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(37, 99, 235, 0.06) 100%)'};
  border: 1px solid rgba(16, 185, 129, 0.3);
  font-size: 0.78rem;
`;

const ActionPillGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
`;

const firstDayOfCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

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
  const [policyFilter, setPolicyFilter] = useState<
    'ALL' | 'CUSTOM' | 'INCREMENTED' | 'CONCESSION' | 'STANDARD'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentFeePlanRow[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // 1. Single Student Configure Plan Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFeePlanRow | null>(null);
  const [planEffectiveFrom, setPlanEffectiveFrom] = useState<string>(firstDayOfCurrentMonth());
  const [studentHeadInputs, setStudentHeadInputs] = useState<
    Record<number, { amount: number; reason: string; included: boolean }>
  >({});
  const [savingPlan, setSavingPlan] = useState(false);

  // 2. Bulk Class Setup Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkClassId, setBulkClassId] = useState<number | ''>('');
  const [bulkHeadInputs, setBulkHeadInputs] = useState<Record<number, number>>({});
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState<string>(firstDayOfCurrentMonth());
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);

  // 3. Concessions Manager Modal (Single Student or Selected Students)
  const [concModalOpen, setConcModalOpen] = useState(false);
  const [concTargetStudents, setConcTargetStudents] = useState<StudentFeePlanRow[]>([]);
  const [concKind, setConcKind] = useState<ConcessionKind>('sibling');
  const [concFeeHeadId, setConcFeeHeadId] = useState<number | ''>('');
  const [concValueType, setConcValueType] = useState<'percent' | 'fixed'>('percent');
  const [concValue, setConcValue] = useState<number>(20);
  const [concEffectiveFrom, setConcEffectiveFrom] = useState<string>(firstDayOfCurrentMonth());
  const [concEffectiveTo, setConcEffectiveTo] = useState<string>('');
  const [concReason, setConcReason] = useState<string>('');
  const [concAutoApprove, setConcAutoApprove] = useState<boolean>(true);
  const [savingConcession, setSavingConcession] = useState(false);

  // 4. Fee Increment System Modal
  const [incModalOpen, setIncModalOpen] = useState(false);
  const [incScope, setIncScope] = useState<'selected' | 'class' | 'all'>('selected');
  const [incClassId, setIncClassId] = useState<number | ''>('');
  const [incSectionId, setIncSectionId] = useState<number | ''>('');
  const [incTargetHeadIds, setIncTargetHeadIds] = useState<number[]>([]);
  const [incType, setIncType] = useState<'percent' | 'fixed'>('percent');
  const [incValue, setIncValue] = useState<number>(10);
  const [incRounding, setIncRounding] = useState<'exact' | 'nearest_10' | 'nearest_50' | 'nearest_100'>('nearest_10');
  const [incEffectiveFrom, setIncEffectiveFrom] = useState<string>(firstDayOfCurrentMonth());
  const [incSkipAlreadyIncremented, setIncSkipAlreadyIncremented] = useState<boolean>(true);
  const [incReason, setIncReason] = useState<string>('Annual Tuition Fee Revision');
  const [savingIncrement, setSavingIncrement] = useState(false);

  // 5. History & Locked Past Challans Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<StudentFeePlanRow | null>(null);
  const [studentPastDemands, setStudentPastDemands] = useState<FeeDemand[]>([]);
  const [loadingHistoryDemands, setLoadingHistoryDemands] = useState(false);
  const [revertingIncrement, setRevertingIncrement] = useState(false);

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
      const { data: sData } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('id', { ascending: false });

      if (sData && sData.length > 0) {
        setSessions(sData);
        setSelectedSessionId(sData[0].id);
      }

      const { data: cData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      setClasses(cData || []);

      const { data: secData } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', schoolId)
        .order('name');
      setSections(secData || []);

      const heads = await fetchFeeHeads(schoolId);
      setFeeHeads(heads);
      const tuiHead = heads.find((h) => h.code === 'TUI');
      if (tuiHead) {
        setIncTargetHeadIds([tuiHead.id]);
      } else if (heads.length > 0) {
        setIncTargetHeadIds([heads[0].id]);
      }
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
      setSelectedStudentIds((prev) => prev.filter((id) => rows.some((r) => r.student_id === id)));
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

  // Filtered students according to policy filter
  const displayedStudents = useMemo(() => {
    return students.filter((st) => {
      if (policyFilter === 'CUSTOM') {
        return st.heads_detail.some((h) => h.has_override);
      }
      if (policyFilter === 'INCREMENTED') {
        return (st.increment_monthly || 0) > 0;
      }
      if (policyFilter === 'CONCESSION') {
        return st.concession_monthly > 0 || (st.concessions_list || []).length > 0;
      }
      if (policyFilter === 'STANDARD') {
        return !st.heads_detail.some((h) => h.has_override) && st.concession_monthly === 0;
      }
      return true;
    });
  }, [students, policyFilter]);

  // KPI metrics for displayed students
  const kpiStats = useMemo(() => {
    let baseSum = 0;
    let grossSum = 0;
    let incSum = 0;
    let concSum = 0;
    let netSum = 0;
    let incCount = 0;
    let concCount = 0;
    let customCount = 0;
    let lockedChallansCount = 0;

    for (const st of displayedStudents) {
      baseSum += st.base_monthly || 0;
      grossSum += st.custom_monthly || 0;
      incSum += st.increment_monthly || 0;
      concSum += st.concession_monthly || 0;
      netSum += st.net_monthly || 0;
      if ((st.increment_monthly || 0) > 0) incCount++;
      if (st.concession_monthly > 0) concCount++;
      if (st.heads_detail.some((h) => h.has_override)) customCount++;
      lockedChallansCount += st.past_demands_count || 0;
    }

    return {
      totalStudents: displayedStudents.length,
      customCount,
      baseSum,
      grossSum,
      incSum,
      incCount,
      concSum,
      concCount,
      netSum,
      lockedChallansCount,
    };
  }, [displayedStudents]);

  // Checkbox selection helpers
  const allDisplayedSelected =
    displayedStudents.length > 0 &&
    displayedStudents.every((s) => selectedStudentIds.includes(s.student_id));

  const toggleSelectAll = () => {
    if (allDisplayedSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(displayedStudents.map((s) => s.student_id));
    }
  };

  const toggleSelectStudent = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // =========================================================================
  // 1. CONFIGURE STUDENT FEE PLAN MODAL
  // =========================================================================
  const handleOpenEdit = (st: StudentFeePlanRow) => {
    setSelectedStudent(st);
    setPlanEffectiveFrom(firstDayOfCurrentMonth());
    const inputs: Record<number, { amount: number; reason: string; included: boolean }> = {};

    feeHeads.forEach((h) => {
      const existing = st.heads_detail?.find((d) => d.fee_head_id === h.id);
      const standardAmt = existing ? existing.standard_amount : 0;
      const customAmt =
        existing && existing.custom_amount !== null ? existing.custom_amount : standardAmt;
      const hasOverride = existing ? existing.has_override : false;

      inputs[h.id] = {
        amount: customAmt,
        reason: existing?.clean_reason || (hasOverride ? 'Negotiated rate' : ''),
        included: customAmt > 0 || hasOverride,
      };
    });

    setStudentHeadInputs(inputs);
    setEditModalOpen(true);
  };

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
          effectiveFrom: planEffectiveFrom,
          notes: `Updated student fee package effective ${planEffectiveFrom}`,
        }
      );

      showToast(
        `Fee plan updated for ${selectedStudent.student_name} (effective ${planEffectiveFrom}). Past challans remain untouched.`,
        'success'
      );
      setEditModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to save student fee plan.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  // =========================================================================
  // 2. BULK CLASS FEE PLAN MODAL
  // =========================================================================
  const handleOpenBulk = () => {
    setBulkClassId(selectedClassId || (classes[0]?.id ?? ''));
    setBulkEffectiveFrom(firstDayOfCurrentMonth());
    const initialInputs: Record<number, number> = {};
    feeHeads.forEach((h) => {
      initialInputs[h.id] = h.code === 'TUI' ? 3000 : 0;
    });
    setBulkHeadInputs(initialInputs);
    setBulkModalOpen(true);
  };

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
          effectiveFrom: bulkEffectiveFrom,
        }
      );

      showToast(
        `Applied fee plan to ${res.updated_students} student(s) effective ${bulkEffectiveFrom}. Past amounts unaffected!`,
        'success'
      );
      setBulkModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to bulk-assign class fee plan.', 'error');
    } finally {
      setSavingBulk(false);
    }
  };

  // =========================================================================
  // 3. CONCESSIONS MANAGER MODAL
  // =========================================================================
  const handleOpenConcessionModal = (singleStudent?: StudentFeePlanRow) => {
    if (singleStudent) {
      setConcTargetStudents([singleStudent]);
    } else if (selectedStudentIds.length > 0) {
      const targets = students.filter((s) => selectedStudentIds.includes(s.student_id));
      setConcTargetStudents(targets);
    } else if (displayedStudents.length > 0) {
      setConcTargetStudents([displayedStudents[0]]);
    } else {
      showToast('No students available to grant a concession.', 'warning');
      return;
    }

    setConcKind('sibling');
    setConcFeeHeadId('');
    setConcValueType('percent');
    setConcValue(20);
    setConcEffectiveFrom(firstDayOfCurrentMonth());
    setConcEffectiveTo('');
    setConcReason('');
    setConcAutoApprove(true);
    setConcModalOpen(true);
  };

  const handleGrantConcessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (concTargetStudents.length === 0) {
      showToast('Select at least one student.', 'error');
      return;
    }
    if (concValue <= 0) {
      showToast('Concession value must be greater than zero.', 'error');
      return;
    }
    if (concValueType === 'percent' && concValue > 100) {
      showToast('Percentage concession cannot exceed 100%.', 'error');
      return;
    }
    if (!concEffectiveFrom) {
      showToast('Please select an Effective From date.', 'error');
      return;
    }
    if (!concReason.trim()) {
      showToast('Please enter a reason or authority reference for this concession.', 'error');
      return;
    }

    try {
      setSavingConcession(true);
      const res = await grantStudentConcession(
        { schoolId, userId },
        {
          studentIds: concTargetStudents.map((st) => st.student_id),
          feeHeadId: concFeeHeadId ? Number(concFeeHeadId) : null,
          kind: concKind,
          valueType: concValueType,
          value: Number(concValue),
          effectiveFrom: concEffectiveFrom,
          effectiveTo: concEffectiveTo || null,
          reason: concReason.trim(),
          autoApprove: concAutoApprove,
        }
      );
      const grantedCount = res.granted_count;

      showToast(
        `Concession ${concAutoApprove ? 'granted & approved' : 'requested'} for ${grantedCount} student(s) effective from ${concEffectiveFrom}. Past amounts remain untouched.`,
        'success'
      );

      setConcReason('');
      await loadStudents();

      // Refresh concTargetStudents if single student is open
      if (concTargetStudents.length === 1) {
        const updatedRows = await fetchStudentsFeePlans(
          schoolId,
          selectedSessionId,
          selectedClassId || null,
          selectedSectionId || null,
          searchQuery
        );
        const refreshed = updatedRows.find(
          (r) => r.student_id === concTargetStudents[0].student_id
        );
        if (refreshed) {
          setConcTargetStudents([refreshed]);
        }
      } else {
        setConcModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to grant concession.', 'error');
    } finally {
      setSavingConcession(false);
    }
  };

  const handleRevokeStudentConcession = async (concessionId: number) => {
    try {
      await revokeStudentConcession({ schoolId, userId }, concessionId);
      showToast('Concession policy revoked for future billing. Past challans remain intact.', 'success');
      await loadStudents();
      if (concTargetStudents.length === 1) {
        const updatedRows = await fetchStudentsFeePlans(
          schoolId,
          selectedSessionId,
          selectedClassId || null,
          selectedSectionId || null,
          searchQuery
        );
        const refreshed = updatedRows.find(
          (r) => r.student_id === concTargetStudents[0].student_id
        );
        if (refreshed) setConcTargetStudents([refreshed]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke concession.', 'error');
    }
  };

  const handleApprovePendingConcession = async (concessionId: number) => {
    try {
      await decideConcession({ schoolId, userId }, concessionId, 'approve');
      showToast('Pending concession approved.', 'success');
      await loadStudents();
      if (concTargetStudents.length === 1) {
        const updatedRows = await fetchStudentsFeePlans(
          schoolId,
          selectedSessionId,
          selectedClassId || null,
          selectedSectionId || null,
          searchQuery
        );
        const refreshed = updatedRows.find(
          (r) => r.student_id === concTargetStudents[0].student_id
        );
        if (refreshed) setConcTargetStudents([refreshed]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to approve concession.', 'error');
    }
  };

  // =========================================================================
  // 4. FEE INCREMENT SYSTEM MODAL
  // =========================================================================
  const handleOpenIncrementModal = (singleStudent?: StudentFeePlanRow) => {
    if (singleStudent) {
      setSelectedStudentIds([singleStudent.student_id]);
      setIncScope('selected');
    } else if (selectedStudentIds.length > 0) {
      setIncScope('selected');
    } else if (selectedClassId) {
      setIncScope('class');
      setIncClassId(selectedClassId);
      setIncSectionId(selectedSectionId);
    } else {
      setIncScope('all');
    }

    setIncEffectiveFrom(firstDayOfCurrentMonth());
    setIncType('percent');
    setIncValue(10);
    setIncRounding('nearest_10');
    setIncReason('Annual Tuition Fee Revision');
    setIncSkipAlreadyIncremented(true);
    setIncModalOpen(true);
  };

  // Compute live preview of students affected by increment
  const incrementPreviewRows = useMemo(() => {
    let pool: StudentFeePlanRow[] = [];
    if (incScope === 'selected') {
      pool = students.filter((s) => selectedStudentIds.includes(s.student_id));
    } else if (incScope === 'class') {
      pool = students.filter(
        (s) =>
          (!incClassId || s.class_id === Number(incClassId)) &&
          (!incSectionId || s.section_id === Number(incSectionId))
      );
    } else {
      pool = students;
    }

    return pool
      .map((st) => {
        let prevGross = 0;
        let newGross = 0;
        let deltaSum = 0;
        let skippedReason = '';

        for (const h of st.heads_detail) {
          const currentAmt = h.custom_amount !== null ? h.custom_amount : h.standard_amount;
          prevGross += currentAmt;

          const isTargetHead =
            incTargetHeadIds.length === 0 || incTargetHeadIds.includes(h.fee_head_id);

          if (isTargetHead && currentAmt > 0) {
            const alreadyInc =
              incSkipAlreadyIncremented &&
              (h.revisions || []).some(
                (r) =>
                  (r.change_mode === 'increment_percent' || r.change_mode === 'increment_fixed') &&
                  r.effective_from >= incEffectiveFrom
              );

            if (alreadyInc) {
              skippedReason = `Already incremented on/after ${incEffectiveFrom}`;
              newGross += currentAmt;
            } else {
              const nextAmt = computeIncrementedAmount(
                currentAmt,
                incType,
                incValue,
                incRounding
              );
              newGross += nextAmt;
              deltaSum += nextAmt - currentAmt;
            }
          } else {
            newGross += currentAmt;
          }
        }

        // Recalculate concession on new gross if percent concession exists
        let newConc = 0;
        for (const c of st.concessions_list || []) {
          if (c.status !== 'approved') continue;
          const val = Number(c.value) || 0;
          if (!c.fee_head_id) {
            if (c.value_type === 'percent') {
              newConc += Math.round((newGross * val) / 100);
            } else {
              newConc += val;
            }
          } else {
            const h = st.heads_detail.find((hd) => hd.fee_head_id === c.fee_head_id);
            if (h) {
              const curAmt = h.custom_amount !== null ? h.custom_amount : h.standard_amount;
              const isTarget =
                incTargetHeadIds.length === 0 || incTargetHeadIds.includes(h.fee_head_id);
              const nextHeadAmt =
                isTarget && curAmt > 0 && !skippedReason
                  ? computeIncrementedAmount(curAmt, incType, incValue, incRounding)
                  : curAmt;
              if (c.value_type === 'percent') {
                newConc += Math.round((nextHeadAmt * val) / 100);
              } else {
                newConc += Math.min(nextHeadAmt, val);
              }
            }
          }
        }
        newConc = Math.min(newGross, newConc);
        const newNet = Math.max(0, newGross - newConc);

        return {
          student: st,
          prevGross,
          deltaSum,
          newGross,
          newConc,
          newNet,
          skippedReason,
          willUpdate: deltaSum > 0,
        };
      })
      .filter((r) => r.prevGross > 0 || r.skippedReason);
  }, [
    students,
    incScope,
    selectedStudentIds,
    incClassId,
    incSectionId,
    incTargetHeadIds,
    incType,
    incValue,
    incRounding,
    incEffectiveFrom,
    incSkipAlreadyIncremented,
  ]);

  const handleApplyIncrementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    if (incValue <= 0) {
      showToast('Increment value must be greater than zero.', 'error');
      return;
    }
    if (!incEffectiveFrom) {
      showToast('Effective From date is required.', 'error');
      return;
    }
    if (!incReason.trim()) {
      showToast('Please provide a reason or circular reference for this increment.', 'error');
      return;
    }

    const eligibleIds = incrementPreviewRows
      .filter((r) => r.willUpdate)
      .map((r) => r.student.student_id);

    if (eligibleIds.length === 0) {
      showToast('No eligible student fee plans to increment in the selected scope.', 'warning');
      return;
    }

    try {
      setSavingIncrement(true);
      const res = await applyFeeIncrement(
        { schoolId, userId },
        {
          sessionId: selectedSessionId,
          studentIds: eligibleIds,
          targetHeadIds: incTargetHeadIds,
          incrementType: incType,
          incrementValue: Number(incValue),
          roundingMode: incRounding,
          effectiveFrom: incEffectiveFrom,
          reason: incReason.trim(),
        }
      );

      showToast(
        `Applied fee increment to ${res.updated_students} student(s) (+${formatFeeCurrency(
          res.total_monthly_added
        )}/mo) effective ${incEffectiveFrom}. Past amounts are locked & unaffected!`,
        'success'
      );
      setIncModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to apply fee increment.', 'error');
    } finally {
      setSavingIncrement(false);
    }
  };

  // =========================================================================
  // 5. REVISION HISTORY & LOCKED PAST CHALLANS MODAL
  // =========================================================================
  const handleOpenHistoryModal = async (st: StudentFeePlanRow) => {
    setHistoryStudent(st);
    setHistoryModalOpen(true);
    try {
      setLoadingHistoryDemands(true);
      const demands = await fetchDemands(schoolId, { studentId: st.student_id });
      setStudentPastDemands(demands);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistoryDemands(false);
    }
  };

  const handleRevertIncrement = async (st: StudentFeePlanRow) => {
    if (!selectedSessionId) return;
    try {
      setRevertingIncrement(true);
      const res = await revertLastFeeIncrement(
        { schoolId, userId },
        st.student_id,
        selectedSessionId
      );
      if (res.reverted_heads > 0) {
        showToast(
          `Reverted last increment across ${res.reverted_heads} fee head(s) for ${st.student_name}.`,
          'success'
        );
        await loadStudents();
        const updatedRows = await fetchStudentsFeePlans(
          schoolId,
          selectedSessionId,
          selectedClassId || null,
          selectedSectionId || null,
          searchQuery
        );
        const refreshed = updatedRows.find((r) => r.student_id === st.student_id);
        if (refreshed) setHistoryStudent(refreshed);
      } else {
        showToast('No increment found to revert for this student.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to revert increment.', 'error');
    } finally {
      setRevertingIncrement(false);
    }
  };

  // Filter sections by selected class
  const filteredSections = selectedClassId
    ? sections.filter((s) => s.class_id === Number(selectedClassId))
    : sections;

  // Calculate modal preview net total for single student plan edit
  const calculatedModalTotal = Object.values(studentHeadInputs).reduce(
    (sum, cur) => (cur.included ? sum + (Number(cur.amount) || 0) : sum),
    0
  );

  // Live preview for concession modal when 1 student is targeted
  const singleConcPreview = useMemo(() => {
    if (concTargetStudents.length !== 1) return null;
    const st = concTargetStudents[0];
    const gross = st.custom_monthly || 0;
    let newDiscount = 0;

    if (!concFeeHeadId) {
      newDiscount =
        concValueType === 'percent'
          ? Math.round((gross * (Number(concValue) || 0)) / 100)
          : Math.min(gross, Number(concValue) || 0);
    } else {
      const head = st.heads_detail.find((h) => h.fee_head_id === Number(concFeeHeadId));
      const headAmt = head
        ? head.custom_amount !== null
          ? head.custom_amount
          : head.standard_amount
        : 0;
      newDiscount =
        concValueType === 'percent'
          ? Math.round((headAmt * (Number(concValue) || 0)) / 100)
          : Math.min(headAmt, Number(concValue) || 0);
    }

    const totalDiscount = Math.min(gross, (st.concession_monthly || 0) + newDiscount);
    const netAfter = Math.max(0, gross - totalDiscount);

    return {
      gross,
      existingDiscount: st.concession_monthly || 0,
      newDiscount,
      totalDiscount,
      netAfter,
    };
  }, [concTargetStudents, concFeeHeadId, concValueType, concValue]);

  return (
    <div>
      {/* KPI Strip */}
      <StatsGrid style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))' }}>
        <StatBox $accent="#2563eb">
          <div className="title">Students in View</div>
          <div className="value">{kpiStats.totalStudents}</div>
          <div className="sub">
            {kpiStats.customCount} Custom Plan{kpiStats.customCount === 1 ? '' : 's'} Configured
          </div>
        </StatBox>

        <StatBox $accent="#64748b">
          <div className="title">Base Monthly Plans</div>
          <div className="value">{formatFeeCurrency(kpiStats.baseSum)}</div>
          <div className="sub">Pre-increment baseline package sum</div>
        </StatBox>

        <StatBox $accent="#8b5cf6">
          <div className="title">Active Fee Increments</div>
          <div className="value" style={{ color: '#8b5cf6' }}>
            +{formatFeeCurrency(kpiStats.incSum)}
          </div>
          <div className="sub">
            Across {kpiStats.incCount} incremented student{kpiStats.incCount === 1 ? '' : 's'}
          </div>
        </StatBox>

        <StatBox $accent="#ec4899">
          <div className="title">Active Concessions</div>
          <div className="value" style={{ color: '#ec4899' }}>
            -{formatFeeCurrency(kpiStats.concSum)}
          </div>
          <div className="sub">
            Across {kpiStats.concCount} scholarship / discount student{kpiStats.concCount === 1 ? '' : 's'}
          </div>
        </StatBox>

        <StatBox $accent="#10b981">
          <div className="title">Net Monthly Payable</div>
          <div className="value" style={{ color: '#10b981' }}>
            {formatFeeCurrency(kpiStats.netSum)}
          </div>
          <div className="sub">
            {kpiStats.lockedChallansCount} Past Challan{kpiStats.lockedChallansCount === 1 ? '' : 's'} Locked & Protected
          </div>
        </StatBox>
      </StatsGrid>

      {/* Non-Retroactive Past-Amounts Protection Guarantee Banner */}
      <ProtectionBanner>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <VerifiedUser style={{ color: '#10b981', fontSize: '1.2rem' }} />
          <div>
            <strong style={{ color: '#10b981' }}>Non-Retroactive Past-Amounts Protection Active:</strong>{' '}
            <span>
              Concessions and Fee Increments apply strictly from their <strong>Effective From Date</strong> forward.
              Already-issued challans and unbilled past months prior to the effective date are locked and never altered.
            </span>
          </div>
        </div>
        {selectedStudentIds.length > 0 && (
          <ModernBadge $variant="info">
            {selectedStudentIds.length} Student{selectedStudentIds.length === 1 ? '' : 's'} Selected
          </ModernBadge>
        )}
      </ProtectionBanner>

      {/* Filter & Bulk Action Bar */}
      <HubFilterRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Session */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
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
            <label
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
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
            <label
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
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

          {/* Policy Filter */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
              Plan / Policy Filter:
            </label>
            <ModernSelect
              value={policyFilter}
              onChange={(e) => setPolicyFilter(e.target.value as any)}
            >
              <option value="ALL">All Students ({students.length})</option>
              <option value="CUSTOM">Custom Fee Plans</option>
              <option value="INCREMENTED">Incremented Plans (+Rs)</option>
              <option value="CONCESSION">Active Concessions (-Rs)</option>
              <option value="STANDARD">Unconfigured / Standard</option>
            </ModernSelect>
          </div>

          {/* Search */}
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#64748b',
                }}
              >
                Search Student:
              </label>
              <ModernInput
                type="text"
                placeholder="Name or Roll #"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '165px' }}
              />
            </div>
            <ModernButton type="submit" $variant="ghost">
              <Search fontSize="small" />
            </ModernButton>
          </form>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <ModernButton $variant="ghost" onClick={loadStudents}>
            <Refresh fontSize="small" /> Refresh
          </ModernButton>
          <ModernButton
            $variant="success"
            onClick={() => handleOpenConcessionModal()}
            title="Grant Scholarship, Sibling or Custom Discount without affecting past amounts"
          >
            <CardGiftcard fontSize="small" />{' '}
            {selectedStudentIds.length > 0
              ? `Grant Concession (${selectedStudentIds.length})`
              : 'Grant Concession'}
          </ModernButton>
          <ModernButton
            $variant="primary"
            onClick={() => handleOpenIncrementModal()}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            title="Apply % or Fixed Fee Increment from an Effective Date without affecting past amounts"
          >
            <TrendingUp fontSize="small" />{' '}
            {selectedStudentIds.length > 0
              ? `Apply Increment (${selectedStudentIds.length})`
              : 'Fee Increment System'}
          </ModernButton>
          <ModernButton $variant="primary" onClick={handleOpenBulk}>
            <Group fontSize="small" /> Bulk Class Plan
          </ModernButton>
        </div>
      </HubFilterRow>

      {/* Main Student Plans Table */}
      <HubCard style={{ padding: '0.5rem' }}>
        <TableWrapper>
          <ModernTable>
            <thead>
              <tr>
                <th style={{ width: '34px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allDisplayedSelected}
                    onChange={toggleSelectAll}
                    title="Select all students in view"
                  />
                </th>
                <th>Roll #</th>
                <th>Student & Father</th>
                <th>Class</th>
                <th>Plan & Policy Status</th>
                <th style={{ textAlign: 'right' }}>Base Fee</th>
                <th style={{ textAlign: 'right' }}>Increment (+)</th>
                <th style={{ textAlign: 'right' }}>Gross Rate</th>
                <th style={{ textAlign: 'right' }}>Concession (-)</th>
                <th style={{ textAlign: 'right' }}>Net Monthly</th>
                <th>Past Challans</th>
                <th>Head Breakdown</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    Loading student fee plans, increments & concessions...
                  </td>
                </tr>
              ) : displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.7 }}>
                    No students found matching current filters.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((st) => {
                  const isChecked = selectedStudentIds.includes(st.student_id);
                  const activeConcs = (st.concessions_list || []).filter(
                    (c) => c.status === 'approved'
                  );
                  const pendingConcs = (st.concessions_list || []).filter(
                    (c) => c.status === 'pending'
                  );

                  return (
                    <tr
                      key={st.student_id}
                      style={{
                        background: isChecked ? 'rgba(37, 99, 235, 0.06)' : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectStudent(st.student_id)}
                        />
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {st.roll_number || '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{st.student_name}</div>
                        <div style={{ fontSize: '0.73rem', opacity: 0.7 }}>
                          S/D/O {st.father_name || '—'}
                        </div>
                      </td>
                      <td>
                        <strong>{st.class_name || 'Unassigned'}</strong>
                        {st.section_name && (
                          <span style={{ opacity: 0.7 }}> ({st.section_name})</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                          <ModernBadge
                            $variant={
                              st.plan_status === 'Custom + Increment + Concession' ||
                                st.plan_status === 'Incremented Plan'
                                ? 'info'
                                : st.plan_status === 'Custom Plan' ||
                                  st.plan_status === 'Custom + Concession'
                                  ? 'success'
                                  : st.plan_status === 'Concession / Discount'
                                    ? 'warning'
                                    : 'neutral'
                            }
                          >
                            {st.plan_status}
                          </ModernBadge>
                          {st.last_increment_effective_from && (
                            <span style={{ fontSize: '0.67rem', color: '#8b5cf6', fontWeight: 700 }}>
                              Inc Eff: {formatFeeDate(st.last_increment_effective_from)}
                            </span>
                          )}
                          {pendingConcs.length > 0 && (
                            <ModernBadge $variant="warning">
                              {pendingConcs.length} Pending Conc
                            </ModernBadge>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', opacity: 0.85 }}>
                        {formatFeeCurrency(st.base_monthly)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: (st.increment_monthly || 0) > 0 ? '#8b5cf6' : 'inherit',
                        }}
                      >
                        {(st.increment_monthly || 0) > 0 ? (
                          <div>
                            +{formatFeeCurrency(st.increment_monthly || 0)}
                            {st.last_increment_label && (
                              <div style={{ fontSize: '0.66rem', opacity: 0.85 }}>
                                ({st.last_increment_label})
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color:
                            st.custom_monthly !== st.standard_monthly ? '#2563eb' : 'inherit',
                        }}
                      >
                        {formatFeeCurrency(st.custom_monthly)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: st.concession_monthly > 0 ? '#ec4899' : 'inherit',
                        }}
                      >
                        {st.concession_monthly > 0 ? (
                          <div>
                            -{formatFeeCurrency(st.concession_monthly)}
                            {activeConcs.length > 0 && (
                              <div style={{ fontSize: '0.66rem', opacity: 0.85 }}>
                                {activeConcs
                                  .map((c) =>
                                    c.value_type === 'percent'
                                      ? `${c.kind.replace('_', ' ')} (${c.value}%)`
                                      : `${c.kind.replace('_', ' ')}`
                                  )
                                  .join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '0.94rem',
                          color: '#10b981',
                        }}
                      >
                        {formatFeeCurrency(st.net_monthly)}
                      </td>
                      <td>
                        {(st.past_demands_count || 0) > 0 ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              fontSize: '0.7rem',
                            }}
                            title="Already issued challans are frozen snapshots and never altered by plan changes, increments, or concessions."
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontWeight: 800,
                                color: '#059669',
                              }}
                            >
                              <Lock style={{ fontSize: '0.78rem' }} /> {st.past_demands_count || 0} Locked
                            </span>
                            <span style={{ opacity: 0.75 }}>
                              {formatFeeCurrency(st.past_demands_total || 0)} billed
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', opacity: 0.55 }}>No challans yet</span>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            flexWrap: 'wrap',
                            maxWidth: '220px',
                          }}
                        >
                          {(st.heads_detail || []).map((h) => {
                            const amt =
                              h.custom_amount !== null ? h.custom_amount : h.standard_amount;
                            if (amt <= 0 && !h.has_override) return null;
                            const incAmt = h.increment_amount || 0;
                            return (
                              <HeadChip
                                key={h.fee_head_id}
                                $hasOverride={h.has_override}
                                $hasIncrement={incAmt > 0}
                                title={`${h.head_title}: Base Rs ${h.base_amount ?? amt}${incAmt > 0 ? ` + Inc Rs ${incAmt}` : ''
                                  } = Gross Rs ${amt}`}
                              >
                                {h.head_code}: {amt}
                                {incAmt > 0 && ` (+${incAmt})`}
                              </HeadChip>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <ActionPillGroup>
                          <ModernButton
                            $variant="primary"
                            $size="sm"
                            onClick={() => handleOpenEdit(st)}
                            title="Configure Base / Custom Plan"
                          >
                            <Tune fontSize="inherit" /> Plan
                          </ModernButton>
                          <ModernButton
                            $variant="success"
                            $size="sm"
                            onClick={() => handleOpenConcessionModal(st)}
                            title="Manage or Grant Concessions"
                          >
                            <CardGiftcard fontSize="inherit" /> Conc
                          </ModernButton>
                          <ModernButton
                            $variant="ghost"
                            $size="sm"
                            onClick={() => handleOpenIncrementModal(st)}
                            style={{ color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.35)' }}
                            title="Apply Fee Increment to Student"
                          >
                            <TrendingUp fontSize="inherit" /> +Inc
                          </ModernButton>
                          <ModernButton
                            $variant="ghost"
                            $size="sm"
                            onClick={() => handleOpenHistoryModal(st)}
                            title="View Revision History & Locked Past Challans"
                          >
                            <History fontSize="inherit" />
                          </ModernButton>
                        </ActionPillGroup>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ModernTable>
        </TableWrapper>
      </HubCard>

      {/* =================================================================== */}
      {/* MODAL 1: SINGLE STUDENT CONFIGURE FEE PLAN                          */}
      {/* =================================================================== */}
      {editModalOpen && selectedStudent && (
        <ModalBackdrop onClick={() => setEditModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="660px">
            <h3 className="modal-title">Configure Student Fee Plan</h3>
            <p className="modal-subtitle">
              Set customized monthly fee package for <strong>{selectedStudent.student_name}</strong>{' '}
              (Class {selectedStudent.class_name}).
            </p>

            {/* Past Challans Protection Notice */}
            <div
              style={{
                padding: '0.6rem 0.85rem',
                marginBottom: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Lock fontSize="small" style={{ color: '#10b981' }} />
              <div>
                <strong>{selectedStudent.past_demands_count} Past Challan(s) Protected:</strong>{' '}
                Changes made here take effect from the <strong>Effective From Date</strong> below
                and will never alter existing challans ({formatFeeCurrency(selectedStudent.past_demands_total)} already billed).
              </div>
            </div>

            <form
              onSubmit={handleSaveStudentPlan}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    marginBottom: '0.25rem',
                  }}
                >
                  Effective From Date (Applies to Billing Periods On/After):
                </label>
                <ModernInput
                  type="date"
                  value={planEffectiveFrom}
                  onChange={(e) => setPlanEffectiveFrom(e.target.value)}
                  style={{ width: '220px' }}
                  required
                />
              </div>

              <div
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                {feeHeads.map((h) => {
                  const state = studentHeadInputs[h.id] || {
                    amount: 0,
                    reason: '',
                    included: false,
                  };
                  const stdDetail = selectedStudent.heads_detail?.find(
                    (d) => d.fee_head_id === h.id
                  );
                  const standardAmount = stdDetail ? stdDetail.standard_amount : 0;

                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: state.included
                          ? 'rgba(37, 99, 235, 0.1)'
                          : 'rgba(148, 163, 184, 0.08)',
                        border: state.included
                          ? '1px solid rgba(37, 99, 235, 0.35)'
                          : '1px solid rgba(148, 163, 184, 0.15)',
                        borderRadius: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.4rem',
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
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
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '140px 1fr',
                            gap: '0.5rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                opacity: 0.75,
                              }}
                            >
                              Monthly Fee (Rs):
                            </label>
                            <ModernInput
                              type="number"
                              min="0"
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
                            <label
                              style={{
                                display: 'block',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                opacity: 0.75,
                              }}
                            >
                              Reason / Note:
                            </label>
                            <ModernInput
                              type="text"
                              placeholder="e.g. Agreed admission package"
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
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    Configured Gross Monthly Package:
                  </div>
                  {selectedStudent.concession_monthly > 0 && (
                    <div style={{ fontSize: '0.74rem', color: '#ec4899' }}>
                      Active Concession: -{formatFeeCurrency(selectedStudent.concession_monthly)} → Net:{' '}
                      {formatFeeCurrency(
                        Math.max(0, calculatedModalTotal - selectedStudent.concession_monthly)
                      )}
                    </div>
                  )}
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#059669' }}>
                  {formatFeeCurrency(calculatedModalTotal)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <ModernButton
                  type="button"
                  $variant="ghost"
                  onClick={() => setEditModalOpen(false)}
                >
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

      {/* =================================================================== */}
      {/* MODAL 2: CONCESSIONS MANAGER (SINGLE OR BULK SELECTED STUDENTS)     */}
      {/* =================================================================== */}
      {concModalOpen && (
        <ModalBackdrop onClick={() => setConcModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="680px">
            <h3 className="modal-title">
              <CardGiftcard fontSize="small" style={{ color: '#ec4899', marginRight: '6px' }} />
              {concTargetStudents.length === 1
                ? `Concessions & Scholarships — ${concTargetStudents[0].student_name}`
                : `Bulk Grant Concession (${concTargetStudents.length} Students Selected)`}
            </h3>
            <p className="modal-subtitle">
              Concessions are bounded by their <strong>Effective From Date</strong> (`valid_during` daterange) and never alter past issued challans or prior months.
            </p>

            {/* Existing Concessions List when viewing a single student */}
            {concTargetStudents.length === 1 && (
              <div style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    marginBottom: '0.4rem',
                  }}
                >
                  Active & Pending Concessions for {concTargetStudents[0].student_name}:
                </div>
                {(concTargetStudents[0].concessions_list || []).length === 0 ? (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(148, 163, 184, 0.08)',
                      fontSize: '0.78rem',
                      opacity: 0.75,
                    }}
                  >
                    No active concessions on file for this student. Use the form below to grant one.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {(concTargetStudents[0].concessions_list || []).map((c) => {
                      const dates = parseConcessionValidDates(c.valid_during);
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.55rem 0.85rem',
                            borderRadius: '8px',
                            background: 'rgba(236, 72, 153, 0.08)',
                            border: '1px solid rgba(236, 72, 153, 0.28)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              <span style={{ textTransform: 'capitalize' }}>
                                {c.kind.replace('_', ' ')}
                              </span>{' '}
                              —{' '}
                              <span style={{ color: '#ec4899', fontWeight: 800 }}>
                                {c.value_type === 'percent'
                                  ? `${c.value}% Off`
                                  : `${formatFeeCurrency(c.value)} Off`}
                              </span>{' '}
                              ({c.head_title || 'All Eligible Heads'})
                            </div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                              Effective: <strong>{dates.validFrom || 'Immediate'}</strong>
                              {dates.validTo ? ` → ${dates.validTo}` : ' (Ongoing)'} • Reason:{' '}
                              {c.reason}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <ModernBadge
                              $variant={c.status === 'approved' ? 'success' : 'warning'}
                            >
                              {c.status.toUpperCase()}
                            </ModernBadge>
                            {c.status === 'pending' && (
                              <ModernButton
                                type="button"
                                $size="sm"
                                $variant="success"
                                onClick={() => handleApprovePendingConcession(c.id)}
                              >
                                <CheckCircle fontSize="inherit" /> Approve
                              </ModernButton>
                            )}
                            {c.status === 'approved' && (
                              <ModernButton
                                type="button"
                                $size="sm"
                                $variant="danger"
                                onClick={() => handleRevokeStudentConcession(c.id)}
                              >
                                <Block fontSize="inherit" /> Revoke
                              </ModernButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Grant New Concession Form */}
            <form
              onSubmit={handleGrantConcessionSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
                borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                paddingTop: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>
                <Add fontSize="inherit" /> Grant New Concession Policy
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Concession Policy Kind:
                  </label>
                  <ModernSelect
                    value={concKind}
                    onChange={(e) => setConcKind(e.target.value as ConcessionKind)}
                    style={{ width: '100%' }}
                  >
                    <option value="sibling">Sibling Discount</option>
                    <option value="staff_child">Staff Child Concession</option>
                    <option value="scholarship">Academic Scholarship</option>
                    <option value="need_based">Need-Based Financial Aid</option>
                    <option value="merit">Merit Award</option>
                    <option value="other">Special Management Waiver</option>
                  </ModernSelect>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Applicable Fee Head:
                  </label>
                  <ModernSelect
                    value={concFeeHeadId}
                    onChange={(e) =>
                      setConcFeeHeadId(e.target.value ? Number(e.target.value) : '')
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="">All Eligible Monthly Heads</option>
                    {feeHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title} ({h.code})
                      </option>
                    ))}
                  </ModernSelect>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Discount Calculation Type:
                  </label>
                  <ModernSelect
                    value={concValueType}
                    onChange={(e) => setConcValueType(e.target.value as 'percent' | 'fixed')}
                    style={{ width: '100%' }}
                  >
                    <option value="percent">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Monthly Discount (Rs)</option>
                  </ModernSelect>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {concValueType === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount (Rs)'}:
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    max={concValueType === 'percent' ? 100 : 500000}
                    value={concValue}
                    onChange={(e) => setConcValue(Number(e.target.value))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Effective From Date (Non-Retroactive):
                  </label>
                  <ModernInput
                    type="date"
                    value={concEffectiveFrom}
                    onChange={(e) => setConcEffectiveFrom(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Effective To Date (Optional Expiry):
                  </label>
                  <ModernInput
                    type="date"
                    value={concEffectiveTo}
                    onChange={(e) => setConcEffectiveTo(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    marginBottom: '0.25rem',
                  }}
                >
                  Authority / Justification Reason (Mandatory):
                </label>
                <ModernInput
                  type="text"
                  placeholder="e.g. Approved 20% sibling concession from current month forward"
                  value={concReason}
                  onChange={(e) => setConcReason(e.target.value)}
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
                  checked={concAutoApprove}
                  onChange={(e) => setConcAutoApprove(e.target.checked)}
                />
                Approve & activate immediately for billing on/after {concEffectiveFrom}
              </label>

              {/* Live Preview Box */}
              {singleConcPreview && (
                <div
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.09)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    Gross Monthly: <strong>{formatFeeCurrency(singleConcPreview.gross)}</strong> • New
                    Concession:{' '}
                    <strong style={{ color: '#ec4899' }}>
                      -{formatFeeCurrency(singleConcPreview.newDiscount)}
                    </strong>
                  </div>
                  <div>
                    New Net Monthly Payable:{' '}
                    <strong style={{ color: '#059669', fontSize: '1rem' }}>
                      {formatFeeCurrency(singleConcPreview.netAfter)}
                    </strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <ModernButton
                  type="button"
                  $variant="ghost"
                  onClick={() => setConcModalOpen(false)}
                >
                  Close
                </ModernButton>
                <ModernButton type="submit" $variant="success" disabled={savingConcession}>
                  {savingConcession
                    ? 'Applying Concession...'
                    : `Grant Concession (${concTargetStudents.length} Student${concTargetStudents.length === 1 ? '' : 's'
                    })`}
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: FEE INCREMENT SYSTEM MODAL (NON-RETROACTIVE)               */}
      {/* =================================================================== */}
      {incModalOpen && (
        <ModalBackdrop onClick={() => setIncModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="780px">
            <h3 className="modal-title">
              <TrendingUp fontSize="small" style={{ color: '#8b5cf6', marginRight: '6px' }} />
              Fee Increment & Revision System (Past-Amounts Protected)
            </h3>
            <p className="modal-subtitle">
              Apply percentage or fixed fee increments with an <strong>Effective From Date</strong>.
              Historical pre-increment rates are preserved so past challans and unbilled months prior to the effective date are never affected.
            </p>

            <form
              onSubmit={handleApplyIncrementSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              {/* Scope & Effective Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Increment Target Scope:
                  </label>
                  <ModernSelect
                    value={incScope}
                    onChange={(e) => setIncScope(e.target.value as any)}
                    style={{ width: '100%' }}
                  >
                    <option value="selected">
                      Selected Students ({selectedStudentIds.length})
                    </option>
                    <option value="class">By Class / Section</option>
                    <option value="all">All Students in Current View ({students.length})</option>
                  </ModernSelect>
                </div>

                {incScope === 'class' ? (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Select Class:
                    </label>
                    <ModernSelect
                      value={incClassId}
                      onChange={(e) =>
                        setIncClassId(e.target.value ? Number(e.target.value) : '')
                      }
                      style={{ width: '100%' }}
                    >
                      <option value="">All Loaded Classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </ModernSelect>
                  </div>
                ) : (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Effective From Date:
                    </label>
                    <ModernInput
                      type="date"
                      value={incEffectiveFrom}
                      onChange={(e) => setIncEffectiveFrom(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {incScope === 'class' ? 'Effective From Date:' : 'Increment Method:'}
                  </label>
                  {incScope === 'class' ? (
                    <ModernInput
                      type="date"
                      value={incEffectiveFrom}
                      onChange={(e) => setIncEffectiveFrom(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  ) : (
                    <ModernSelect
                      value={incType}
                      onChange={(e) => setIncType(e.target.value as 'percent' | 'fixed')}
                      style={{ width: '100%' }}
                    >
                      <option value="percent">Percentage Increase (+%)</option>
                      <option value="fixed">Fixed Amount Increase (+Rs)</option>
                    </ModernSelect>
                  )}
                </div>
              </div>

              {/* Increment Value & Rounding */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                {incScope === 'class' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Increment Method:
                    </label>
                    <ModernSelect
                      value={incType}
                      onChange={(e) => setIncType(e.target.value as 'percent' | 'fixed')}
                      style={{ width: '100%' }}
                    >
                      <option value="percent">Percentage Increase (+%)</option>
                      <option value="fixed">Fixed Amount Increase (+Rs)</option>
                    </ModernSelect>
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {incType === 'percent' ? 'Increment Percentage (+%):' : 'Increment Amount (+Rs):'}
                  </label>
                  <ModernInput
                    type="number"
                    min="1"
                    max={incType === 'percent' ? 200 : 100000}
                    value={incValue}
                    onChange={(e) => setIncValue(Number(e.target.value))}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Rounding Rule:
                  </label>
                  <ModernSelect
                    value={incRounding}
                    onChange={(e) => setIncRounding(e.target.value as any)}
                    style={{ width: '100%' }}
                    disabled={incType === 'fixed'}
                  >
                    <option value="exact">Exact Rupee (Rs 1)</option>
                    <option value="nearest_10">Round to Nearest Rs 10</option>
                    <option value="nearest_50">Round to Nearest Rs 50</option>
                    <option value="nearest_100">Round to Nearest Rs 100</option>
                  </ModernSelect>
                </div>

                {incScope !== 'class' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Circular / Reason:
                    </label>
                    <ModernInput
                      type="text"
                      value={incReason}
                      onChange={(e) => setIncReason(e.target.value)}
                      placeholder="e.g. Annual 10% Revision"
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                )}
              </div>

              {incScope === 'class' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Circular / Increment Reason:
                  </label>
                  <ModernInput
                    type="text"
                    value={incReason}
                    onChange={(e) => setIncReason(e.target.value)}
                    placeholder="e.g. Annual 10% Revision"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              )}

              {/* Target Fee Heads Selection */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    marginBottom: '0.35rem',
                  }}
                >
                  Applicable Fee Heads to Increment:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {feeHeads.map((h) => {
                    const checked = incTargetHeadIds.includes(h.id);
                    return (
                      <label
                        key={h.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: checked
                            ? 'rgba(139, 92, 246, 0.16)'
                            : 'rgba(148, 163, 184, 0.1)',
                          border: checked
                            ? '1px solid rgba(139, 92, 246, 0.45)'
                            : '1px solid rgba(148, 163, 184, 0.25)',
                          color: checked ? '#8b5cf6' : 'inherit',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setIncTargetHeadIds((p) => [...p, h.id]);
                            } else {
                              setIncTargetHeadIds((p) => p.filter((id) => id !== h.id));
                            }
                          }}
                        />
                        {h.title} ({h.code})
                      </label>
                    );
                  })}
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={incSkipAlreadyIncremented}
                  onChange={(e) => setIncSkipAlreadyIncremented(e.target.checked)}
                />
                Prevent duplicate increments: Skip students already incremented on or after{' '}
                {incEffectiveFrom}
              </label>

              {/* Live Before-vs-After Preview Table */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    Before vs After Increment Preview (
                    {incrementPreviewRows.filter((r) => r.willUpdate).length} Eligible):
                  </span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#8b5cf6' }}>
                    Total Monthly Impact: +
                    {formatFeeCurrency(
                      incrementPreviewRows.reduce((s, r) => s + r.deltaSum, 0)
                    )}
                    /mo
                  </span>
                </div>
                <div
                  style={{
                    maxHeight: '210px',
                    overflowY: 'auto',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '8px',
                  }}
                >
                  <ModernTable>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Class</th>
                        <th style={{ textAlign: 'right' }}>Previous Gross</th>
                        <th style={{ textAlign: 'right' }}>Increment (+)</th>
                        <th style={{ textAlign: 'right' }}>New Gross</th>
                        <th style={{ textAlign: 'right' }}>Concession (-)</th>
                        <th style={{ textAlign: 'right' }}>New Net</th>
                        <th>Past Challans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incrementPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '1rem', opacity: 0.6 }}>
                            No students with active fee plans in selected scope.
                          </td>
                        </tr>
                      ) : (
                        incrementPreviewRows.map((row) => (
                          <tr key={row.student.student_id}>
                            <td style={{ fontWeight: 700 }}>{row.student.student_name}</td>
                            <td>{row.student.class_name}</td>
                            <td style={{ textAlign: 'right' }}>
                              {formatFeeCurrency(row.prevGross)}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
                                color: row.willUpdate ? '#8b5cf6' : '#94a3b8',
                              }}
                            >
                              {row.skippedReason ? (
                                <span style={{ fontSize: '0.68rem' }}>Skipped (Already Inc)</span>
                              ) : (
                                `+${formatFeeCurrency(row.deltaSum)}`
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {formatFeeCurrency(row.newGross)}
                            </td>
                            <td style={{ textAlign: 'right', color: '#ec4899' }}>
                              {row.newConc > 0 ? `-${formatFeeCurrency(row.newConc)}` : '—'}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 800,
                                color: '#10b981',
                              }}
                            >
                              {formatFeeCurrency(row.newNet)}
                            </td>
                            <td style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
                              {row.student.past_demands_count} Locked (Unchanged)
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </ModernTable>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <ModernButton
                  type="button"
                  $variant="ghost"
                  onClick={() => setIncModalOpen(false)}
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  type="submit"
                  $variant="primary"
                  disabled={savingIncrement}
                  style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  {savingIncrement
                    ? 'Applying Increment...'
                    : `Apply Increment Effective ${incEffectiveFrom}`}
                </ModernButton>
              </div>
            </form>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: REVISION HISTORY & LOCKED PAST CHALLANS                    */}
      {/* =================================================================== */}
      {historyModalOpen && historyStudent && (
        <ModalBackdrop onClick={() => setHistoryModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="720px">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <div>
                <h3 className="modal-title">
                  Plan Revisions, Increments & Protected Past Challans
                </h3>
                <p className="modal-subtitle">
                  Audit log for <strong>{historyStudent.student_name}</strong> (Class{' '}
                  {historyStudent.class_name})
                </p>
              </div>
              {(historyStudent.increment_monthly || 0) > 0 && (
                <ModernButton
                  type="button"
                  $variant="danger"
                  $size="sm"
                  disabled={revertingIncrement}
                  onClick={() => handleRevertIncrement(historyStudent)}
                >
                  <Undo fontSize="small" />{' '}
                  {revertingIncrement ? 'Reverting...' : 'Revert Last Increment'}
                </ModernButton>
              )}
            </div>

            {/* Section 1: Plan & Increment Revisions */}
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  marginBottom: '0.4rem',
                }}
              >
                1. Effective-Dated Fee Plan & Increment History:
              </div>
              {(historyStudent.revisions_history || []).length === 0 ? (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(148, 163, 184, 0.08)',
                    fontSize: '0.8rem',
                    opacity: 0.75,
                  }}
                >
                  No custom revisions or increments recorded yet. Student is on baseline package.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '8px',
                  }}
                >
                  <ModernTable>
                    <thead>
                      <tr>
                        <th>Effective From</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Previous Rate</th>
                        <th style={{ textAlign: 'right' }}>Delta</th>
                        <th style={{ textAlign: 'right' }}>New Rate</th>
                        <th>Reason / Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyStudent.revisions_history || []).map((rev, idx) => {
                        const isInc =
                          rev.change_mode === 'increment_percent' ||
                          rev.change_mode === 'increment_fixed';
                        const isInit = rev.change_mode === 'initial_plan';
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                              {formatFeeDate(rev.effective_from)}
                            </td>
                            <td>
                              <ModernBadge
                                $variant={isInc ? 'info' : isInit ? 'success' : 'neutral'}
                              >
                                {isInc ? 'INCREMENT' : isInit ? 'INITIAL' : 'REVISION'}
                              </ModernBadge>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {formatFeeCurrency(rev.previous_amount)}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
                                color: rev.delta_amount >= 0 ? '#8b5cf6' : '#ef4444',
                              }}
                            >
                              {rev.delta_amount >= 0
                                ? `+${formatFeeCurrency(rev.delta_amount)}`
                                : formatFeeCurrency(rev.delta_amount)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800 }}>
                              {formatFeeCurrency(rev.new_amount)}
                            </td>
                            <td style={{ fontSize: '0.76rem' }}>{rev.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </ModernTable>
                </div>
              )}
            </div>

            {/* Section 2: Locked Past Challans */}
            <div>
              <div
                style={{
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  marginBottom: '0.4rem',
                }}
              >
                2. Already-Issued Challans (Frozen Snapshots — Unaffected by Future Changes):
              </div>
              {loadingHistoryDemands ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>
                  Loading student challans...
                </div>
              ) : studentPastDemands.length === 0 ? (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(148, 163, 184, 0.08)',
                    fontSize: '0.8rem',
                    opacity: 0.75,
                  }}
                >
                  No challans issued yet for this student.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '8px',
                  }}
                >
                  <ModernTable>
                    <thead>
                      <tr>
                        <th>Challan #</th>
                        <th>Period</th>
                        <th>Due Date</th>
                        <th style={{ textAlign: 'right' }}>Frozen Net</th>
                        <th style={{ textAlign: 'right' }}>Paid</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                        <th>Protection Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPastDemands.map((d) => (
                        <tr key={d.demand_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {d.challan_no}
                          </td>
                          <td>
                            {d.period_month
                              ? `${String(d.period_month).padStart(2, '0')}/${d.period_year}`
                              : d.period_year}
                          </td>
                          <td>{formatFeeDate(d.due_date)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800 }}>
                            {formatFeeCurrency(d.net_amount)}
                          </td>
                          <td style={{ textAlign: 'right', color: '#10b981' }}>
                            {formatFeeCurrency(d.paid_amount)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {formatFeeCurrency(d.balance_amount)}
                          </td>
                          <td>
                            <ModernBadge $variant="success">
                              <Lock style={{ fontSize: '0.7rem', marginRight: '3px' }} /> LOCKED
                              SNAPSHOT
                            </ModernBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </ModernTable>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <ModernButton
                type="button"
                $variant="primary"
                onClick={() => setHistoryModalOpen(false)}
              >
                Close
              </ModernButton>
            </div>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: BULK SETUP CLASS FEE PLAN                                  */}
      {/* =================================================================== */}
      {bulkModalOpen && (
        <ModalBackdrop onClick={() => setBulkModalOpen(false)}>
          <ModalDialog onClick={(e) => e.stopPropagation()} $width="560px">
            <h3 className="modal-title">Bulk Setup Class Fee Plan</h3>
            <p className="modal-subtitle">
              Quickly apply standard or promotional monthly fee packages to all students in a class
              from an effective date forward.
            </p>

            <form
              onSubmit={handleSaveBulk}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '0.25rem',
                    }}
                  >
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

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Effective From Date:
                  </label>
                  <ModernInput
                    type="date"
                    value={bulkEffectiveFrom}
                    onChange={(e) => setBulkEffectiveFrom(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#64748b',
                  }}
                >
                  Package Monthly Rates per Head:
                </label>
                {feeHeads.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {h.title} ({h.code})
                    </span>
                    <ModernInput
                      type="number"
                      min="0"
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

              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}
              >
                <input
                  type="checkbox"
                  id="bulk_ow"
                  checked={bulkOverwrite}
                  onChange={(e) => setBulkOverwrite(e.target.checked)}
                />
                <label htmlFor="bulk_ow" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                  Overwrite students who already have custom plans (past challans still remain locked)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <ModernButton
                  type="button"
                  $variant="ghost"
                  onClick={() => setBulkModalOpen(false)}
                >
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
