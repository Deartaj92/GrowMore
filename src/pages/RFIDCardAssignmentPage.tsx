import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Add NDEFReader types for TypeScript
declare global {
    interface Window {
        NDEFReader: any;
        nfc?: any;
    }
}
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { rfidOfflineService } from '../services/rfidOfflineService';
import { fetchAllRows } from '../utils/paginationHelper';
import { sortClasses } from '../utils/classUtils';
import { mergeStudentsWithSessionClassHistory } from '../utils/studentSessionMerge';
import {
    buildRfidUidCandidates,
    normalizeDesktopScannerUid,
    resolveAssignmentUidFromInput,
    resolveQrAssignmentFromInput,
    sanitizeRfidUid,
} from '../utils/rfidUtils';
import {
    CreditCard,
    Search,
    CheckCircle,
    Cancel,
    Nfc,
    PersonSearch,
    Refresh,
    School,
    Work,
    Delete,
    Sensors as NfcIcon,
    QrCodeScanner as QrCodeScannerIcon,
    Face as FaceIcon,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import FaceRecordModal from '../components/FaceRecordModal';

// ─── Animations ────────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.4); }
  50%       { box-shadow: 0 0 0 12px rgba(168,85,247,0); }
`;

// ─── Styled Components ─────────────────────────────────────────────────────────

const Page = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.BG};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  box-sizing: border-box;
  overflow-y: auto;

  @media (max-width: 768px) { padding: 0.5rem; gap: 0.5rem; }
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg { color: #a855f7; }
`;

const ModeToggle = styled.div`
  display: flex;
  background: ${({ theme }) => theme.CARD};
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  overflow: hidden;
`;

const ModeBtn = styled.button<{ $active?: boolean }>`
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: ${({ $active, theme }) => $active ? '#a855f7' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.TEXT_SECONDARY};

  &:hover { opacity: 0.85; }
`;

const FiltersBar = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.75rem 1rem;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  svg { font-size: 18px; }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.2rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: #a855f7; }
  &::placeholder { color: ${({ theme }) => theme.TEXT_SECONDARY}; }
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.88rem;
  outline: none;
  cursor: pointer;
  min-width: 140px;

  &:focus { border-color: #a855f7; }
  option { background: ${({ theme }) => theme.CARD}; }
`;

const FilterBadge = styled.span`
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(168,85,247,0.15);
  color: #a855f7;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  white-space: nowrap;
`;

const TableCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  flex: 1;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TH = styled.th`
  text-align: left;
  padding: 0.7rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: rgba(148, 163, 184, 0.06);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const TD = styled.td`
  padding: 0.65rem 0.8rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  vertical-align: middle;
`;

const Row = styled.tr`
  transition: background 0.15s;
  animation: ${fadeIn} 0.25s ease;
  &:hover { background: ${({ theme }) => theme.HOVER_BG}; }
`;

const RfidBadge = styled.span<{ $assigned: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  background: ${({ $assigned }) => $assigned ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)'};
  color: ${({ $assigned }) => $assigned ? '#22c55e' : '#94a3b8'};
  
  svg { font-size: 14px; }
`;

const ScanInput = styled.input`
  width: 100%;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.84rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #a855f7;
    box-shadow: 0 0 0 2px rgba(168,85,247,0.2);
    animation: ${pulse} 2s ease-in-out infinite;
  }

  &::placeholder { color: ${({ theme }) => theme.TEXT_SECONDARY}; font-family: inherit; letter-spacing: 0; }
`;

const ActionBtn = styled.button<{ $color: string }>`
  background: ${({ $color }) => $color}18;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}33;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover { background: ${({ $color }) => $color}30; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  svg { font-size: 14px; }
`;

const MobileNfcBtn = styled.button<{ $active?: boolean }>`
  background: ${({ $active }) => $active ? '#22c55e' : 'rgba(59, 130, 246, 0.1)'};
  color: ${({ $active }) => $active ? '#fff' : '#3b82f6'};
  border: 1px solid ${({ $active }) => $active ? '#22c55e' : 'rgba(59, 130, 246, 0.2)'};
  padding: 0.45rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover { background: ${({ $active }) => $active ? '#16a34a' : 'rgba(59, 130, 246, 0.15)'}; }

  @media (min-width: 1200px) {
    display: none;
  }
`;

const NfcDiagnosticTxt = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.4rem;
  padding: 0.4rem;
  background: rgba(239, 68, 68, 0.05);
  border: 1px dashed rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  text-align: center;
`;

const QrPasteHint = styled.div`
  font-size: 0.68rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.35rem;
  max-width: 320px;
  line-height: 1.35;
`;

const EmptyState = styled.div`
  padding: 3rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.92rem;
`;

const CenterLoading = styled.div`
  display: flex;
  justify-content: center;
  padding: 3rem;
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const PageBtn = styled.button`
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) { border-color: #a855f7; color: #a855f7; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'students' | 'employees';

type PersonStatusFilter =
    | 'all'
    | 'active'
    | 'inactive'
    | 'suspended'
    | 'withdrawn'
    | 'terminated'
    | 'left'
    | 'contract_ended';

const PERSON_STATUS_FILTER_OPTIONS: { value: PersonStatusFilter; label: string }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'withdrawn', label: 'Withdrawn' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'left', label: 'Left / Absent' },
    { value: 'contract_ended', label: 'Contract ended' },
];

interface PersonRow {
    id: number;
    name: string;
    rfid_uid: string | null;
    qr_uid: string | null;
    attendance_mode?: 'rfid_required' | 'manual_only' | 'hybrid' | null;
    roll_number?: string;
    class_id?: number;
    section_id?: number;
    session_id?: number | null;
    role?: string;
    status?: string;
    /** Present when loaded for students; used only to show face enrollment status (compact template in DB). */
    face_embedding?: string | null;
}

const getEffectiveAttendanceMode = (
    attendanceMode: 'rfid_required' | 'manual_only' | 'hybrid' | null | undefined,
    hasCard: boolean
): 'rfid_required' | 'manual_only' | 'hybrid' => {
    if (hasCard && (!attendanceMode || attendanceMode === 'manual_only')) {
        return 'hybrid';
    }

    return attendanceMode || (hasCard ? 'hybrid' : 'manual_only');
};

interface ClassRow { id: number; name: string; }
interface SectionRow { id: number; name: string; class_id: number; }
interface SessionRow { id: number; name: string; is_active?: boolean | null; }

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const RFIDCardAssignmentPage: React.FC = () => {
    const { theme } = useTheme();
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    const { user } = useAuth();
    const toast = useToast();

    const [mode, setMode] = useState<Mode>('students');
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterSection, setFilterSection] = useState('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
    const [filterPersonStatus, setFilterPersonStatus] = useState<PersonStatusFilter>('active');
    const [loading, setLoading] = useState(false);
    const [people, setPeople] = useState<PersonRow[]>([]);
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [sections, setSections] = useState<SectionRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [filterSession, setFilterSession] = useState('');
    const [page, setPage] = useState(0);
    const [faceRecordTarget, setFaceRecordTarget] = useState<{
        id: number;
        name: string;
        kind: 'student' | 'employee';
    } | null>(null);

    type EditField = 'rfid' | 'qr';
    const [editing, setEditing] = useState<{ personId: number; field: EditField } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editAttendanceMode, setEditAttendanceMode] = useState<'rfid_required' | 'manual_only' | 'hybrid'>('hybrid');
    const [saving, setSaving] = useState(false);

    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isNfcScanning, setIsNfcScanning] = useState(false);
    const nfcAbortControllerRef = useRef<AbortController | null>(null);
    const editNormalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setIsNfcSupported(('NDEFReader' in window) || (!!(window as any).nfc));
    }, []);

    useEffect(() => {
        if (!user?.school_id) return;
        setFilterSession('');
        (async () => {
            const { data } = await supabase
                .from('sessions')
                .select('id,name,is_active')
                .eq('school_id', user.school_id)
                .order('name');
            const list = (data || []) as SessionRow[];
            setSessions(list);
            const active = list.find(s => s.is_active);
            if (active) setFilterSession(String(active.id));
        })();
    }, [user?.school_id]);

    const isSecureContext = window.isSecureContext;

    const classesMap = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);
    const sectionsMap = useMemo(() => new Map(sections.map(s => [s.id, s.name])), [sections]);

    const fetchData = useCallback(async () => {
        if (!user?.school_id) return;
        setLoading(true);
        try {
            // Fetch classes and sections for students mode
            if (mode === 'students') {
                const [classRes, secRes] = await Promise.all([
                    supabase.from('classes').select('id,name').eq('school_id', user.school_id).order('name'),
                    supabase.from('sections').select('id,name,class_id').eq('school_id', user.school_id).order('name'),
                ]);
                setClasses((classRes.data || []) as ClassRow[]);
                setSections((secRes.data || []) as SectionRow[]);
            }

            // Fetch people
            const table = mode === 'students' ? 'students' : 'staff';
            const selectFields = mode === 'students'
                ? 'id,name,rfid_uid,qr_uid,attendance_mode,roll_number,class_id,section_id,status,session_id,face_embedding'
                : 'id,name,rfid_uid,qr_uid,attendance_mode,role,status,face_embedding';

            let data = await fetchAllRows<PersonRow>(async (from, to) => {
                return await supabase
                    .from(table)
                    // session_id may not be present in generated Database types on older schemas
                    .select(selectFields as '*')
                    .eq('school_id', user.school_id)
                    .order('name')
                    .range(from, to);
            });
            if (mode === 'students' && filterSession) {
                data = await mergeStudentsWithSessionClassHistory(
                    supabase,
                    user.school_id,
                    filterSession,
                    data || []
                );
            }
            setPeople(data || []);
            rfidOfflineService.cacheMappings(String(user.school_id)).catch(error => {
                console.warn('Failed to refresh native RFID mapping cache:', error);
            });
        } catch (e: any) {
            toast.showToast('Failed to load data: ' + (e?.message || ''), 'error');
        } finally {
            setLoading(false);
        }
    }, [user?.school_id, mode, filterSession]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setPage(0);
        setSearch('');
        setFilterClass('all');
        setFilterSection('all');
        setFilterStatus('all');
        setFilterPersonStatus('active');
        setFaceRecordTarget(null);
    }, [user?.school_id, mode]);

    const filteredSections = useMemo(() => {
        if (filterClass === 'all') {
            return sections;
        }

        return sections.filter(section => String(section.class_id) === filterClass);
    }, [sections, filterClass]);

    // Filter
    const filtered = useMemo(() => {
        return people.filter(p => {
            if (filterPersonStatus !== 'all' && String(p.status) !== filterPersonStatus) return false;
            if (mode === 'students' && filterSession && String(p.session_id) !== filterSession) return false;

            // Search
            if (search.trim()) {
                const q = search.toLowerCase();
                const name = (p.name || '').toLowerCase();
                const roll = String(p.roll_number || '').toLowerCase();
                const uid = (p.rfid_uid || '').toLowerCase();
                const qr = (p.qr_uid || '').toLowerCase();
                const role = (p.role || '').toLowerCase();
                if (!name.includes(q) && !roll.includes(q) && !uid.includes(q) && !qr.includes(q) && !role.includes(q)) return false;
            }
            // Class filter
            if (filterClass !== 'all' && String(p.class_id) !== filterClass) return false;
            // Section filter
            if (filterSection !== 'all' && String(p.section_id) !== filterSection) return false;
            // Assigned/unassigned filter
            const hasAnyCard = !!(p.rfid_uid || p.qr_uid);
            if (filterStatus === 'assigned' && !hasAnyCard) return false;
            if (filterStatus === 'unassigned' && hasAnyCard) return false;
            return true;
        });
    }, [people, search, filterClass, filterSection, filterStatus, filterPersonStatus, filterSession, mode]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const assignedCount = people.filter(p => p.rfid_uid || p.qr_uid).length;
    const totalCount = people.length;

    const saveAndConfirmPerson = useCallback(async (
        table: 'students' | 'staff',
        personId: number,
        payload: { rfid_uid: string | null; attendance_mode: 'rfid_required' | 'manual_only' | 'hybrid' }
    ) => {
        const runUpdate = async (updatePayload: typeof payload) => {
            const { error } = await supabase
                .from(table)
                .update(updatePayload)
                .eq('id', personId)
                .eq('school_id', user!.school_id);

            if (error) {
                throw error;
            }
        };

        const fetchCurrentRow = async () => {
            const { data, error } = await supabase
                .from(table)
                .select('id, rfid_uid, attendance_mode')
                .eq('id', personId)
                .eq('school_id', user!.school_id)
                .single();

            if (error) {
                throw error;
            }

            return data;
        };

        await runUpdate(payload);
        let currentRow = await fetchCurrentRow();

        const uidMatches = (currentRow.rfid_uid || null) === payload.rfid_uid;
        const modeMatches = (currentRow.attendance_mode || 'manual_only') === payload.attendance_mode;

        if (!uidMatches || !modeMatches) {
            await runUpdate({ attendance_mode: payload.attendance_mode, rfid_uid: payload.rfid_uid });
            currentRow = await fetchCurrentRow();
        }

        const confirmedUid = currentRow.rfid_uid || null;
        const confirmedMode = (currentRow.attendance_mode || 'manual_only') as 'rfid_required' | 'manual_only' | 'hybrid';

        if (confirmedUid !== payload.rfid_uid || confirmedMode !== payload.attendance_mode) {
            throw new Error(`Saved row did not confirm requested attendance mode. Current value is "${confirmedMode}".`);
        }

        return {
            id: currentRow.id,
            rfid_uid: confirmedUid,
            attendance_mode: confirmedMode,
        };
    }, [user?.school_id]);

    // Handle RFID-only assignment (NFC + USB + typed UID). QR is assigned separately per row.
    const handleSaveRfid = async (personId: number, uidOverride?: string) => {
        if (!user?.school_id) return;
        const table = mode === 'students' ? 'students' : 'staff';
        const cleanUID = resolveAssignmentUidFromInput(uidOverride ?? editValue);
        const uidCandidates = buildRfidUidCandidates(cleanUID);

        if (cleanUID && cleanUID.length < 4) {
            toast.showToast('Card UID must be at least 4 hex characters.', 'error');
            return;
        }

        if (!cleanUID && editAttendanceMode !== 'manual_only') {
            toast.showToast('Assign an RFID card before using RFID Required or Hybrid mode', 'error');
            return;
        }

        setSaving(true);
        try {
            // Check for duplicates across BOTH students and staff tables
            if (cleanUID) {
                const otherTable = table === 'students' ? 'staff' : 'students';

                // Check same table
                const sameSelect = table === 'students'
                    ? 'id,name'
                    : 'id,name,role';
                const { data: existingSameData } = await supabase
                    .from(table)
                    .select(sameSelect)
                    .eq('school_id', user.school_id)
                    .in('rfid_uid', uidCandidates)
                    .neq('id', personId)
                    .maybeSingle();

                if (existingSameData) {
                    const existingSame = existingSameData as any;
                    if (table === 'students') {
                        toast.showToast(`Already assigned to student: ${existingSame.name}`, 'error');
                    } else {
                        toast.showToast(`Already assigned to staff: ${existingSame.name}${existingSame.role ? ` (${existingSame.role})` : ''}`, 'error');
                    }
                    setSaving(false);
                    return;
                }

                const { data: dupQrSameTable } = await supabase
                    .from(table)
                    .select(sameSelect)
                    .eq('school_id', user.school_id)
                    .in('qr_uid', uidCandidates)
                    .neq('id', personId)
                    .maybeSingle();

                if (dupQrSameTable) {
                    toast.showToast('This UID is already assigned as a QR token to someone else.', 'error');
                    setSaving(false);
                    return;
                }

                // Check other table
                const otherSelect = otherTable === 'students'
                    ? 'id,name'
                    : 'id,name,role';
                const { data: existingOtherData } = await supabase
                    .from(otherTable)
                    .select(otherSelect)
                    .eq('school_id', user.school_id)
                    .in('rfid_uid', uidCandidates)
                    .maybeSingle();

                if (existingOtherData) {
                    const existingOther = existingOtherData as any;
                    if (otherTable === 'students') {
                        toast.showToast(`Already assigned to student: ${existingOther.name}`, 'error');
                    } else {
                        toast.showToast(`Already assigned to staff: ${existingOther.name}${existingOther.role ? ` (${existingOther.role})` : ''}`, 'error');
                    }
                    setSaving(false);
                    return;
                }

                const { data: dupQrOtherTable } = await supabase
                    .from(otherTable)
                    .select(otherSelect)
                    .eq('school_id', user.school_id)
                    .in('qr_uid', uidCandidates)
                    .maybeSingle();

                if (dupQrOtherTable) {
                    toast.showToast('This UID is already assigned as a QR token to someone else.', 'error');
                    setSaving(false);
                    return;
                }
            }

            const nextAttendanceMode = cleanUID ? editAttendanceMode : 'manual_only';

            const updatedRow = await saveAndConfirmPerson(table, personId, {
                rfid_uid: cleanUID || null,
                attendance_mode: nextAttendanceMode
            });

            setPeople(prev => prev.map(p => p.id === personId ? {
                ...p,
                rfid_uid: updatedRow.rfid_uid || null,
                attendance_mode: updatedRow.attendance_mode as 'rfid_required' | 'manual_only' | 'hybrid' | null
            } : p));
            setEditing(null);
            setEditValue('');
            setEditAttendanceMode('hybrid');
            rfidOfflineService.cacheMappings(String(user.school_id)).catch(error => {
                console.warn('Failed to refresh native RFID mapping cache after save:', error);
            });
            toast.showToast(cleanUID ? 'RFID settings saved successfully' : 'RFID assignment cleared', 'success');
        } catch (e: any) {
            toast.showToast('Failed to save: ' + (e?.message || ''), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveQr = async (personId: number, uidOverride?: string) => {
        if (!user?.school_id) return;
        const table = mode === 'students' ? 'students' : 'staff';
        const cleanUID = resolveQrAssignmentFromInput(uidOverride ?? editValue);
        const rfidDupCandidates = buildRfidUidCandidates(cleanUID);

        if (cleanUID && cleanUID.length < 4) {
            toast.showToast('QR value is too short after normalization (min 4 characters).', 'error');
            return;
        }

        setSaving(true);
        try {
            if (cleanUID) {
                const otherTable = table === 'students' ? 'staff' : 'students';
                const sameSelect = table === 'students' ? 'id,name' : 'id,name,role';
                const { data: existingSameData } = await supabase
                    .from(table)
                    .select(sameSelect)
                    .eq('school_id', user.school_id)
                    .eq('qr_uid', cleanUID)
                    .neq('id', personId)
                    .maybeSingle();

                if (existingSameData) {
                    const existingSame = existingSameData as any;
                    toast.showToast(
                        table === 'students'
                            ? `This QR is already assigned to student: ${existingSame.name}`
                            : `This QR is already assigned to staff: ${existingSame.name}${existingSame.role ? ` (${existingSame.role})` : ''}`,
                        'error'
                    );
                    setSaving(false);
                    return;
                }

                const otherSelect = otherTable === 'students' ? 'id,name' : 'id,name,role';
                const { data: existingOtherData } = await supabase
                    .from(otherTable)
                    .select(otherSelect)
                    .eq('school_id', user.school_id)
                    .eq('qr_uid', cleanUID)
                    .maybeSingle();

                if (existingOtherData) {
                    const existingOther = existingOtherData as any;
                    toast.showToast(
                        otherTable === 'students'
                            ? `This QR is already assigned to student: ${existingOther.name}`
                            : `This QR is already assigned to staff: ${existingOther.name}${existingOther.role ? ` (${existingOther.role})` : ''}`,
                        'error'
                    );
                    setSaving(false);
                    return;
                }

                if (rfidDupCandidates.length > 0) {
                    const { data: dupRfidSame } = await supabase
                        .from(table)
                        .select(sameSelect)
                        .eq('school_id', user.school_id)
                        .in('rfid_uid', rfidDupCandidates)
                        .neq('id', personId)
                        .maybeSingle();

                    if (dupRfidSame) {
                        toast.showToast('This token is already assigned as an RFID card to someone else.', 'error');
                        setSaving(false);
                        return;
                    }

                    const { data: dupRfidOther } = await supabase
                        .from(otherTable)
                        .select(otherSelect)
                        .eq('school_id', user.school_id)
                        .in('rfid_uid', rfidDupCandidates)
                        .maybeSingle();

                    if (dupRfidOther) {
                        toast.showToast('This token is already assigned as an RFID card to someone else.', 'error');
                        setSaving(false);
                        return;
                    }
                }
            }

            const { error } = await supabase
                .from(table)
                .update({ qr_uid: cleanUID || null })
                .eq('id', personId)
                .eq('school_id', user.school_id);

            if (error) throw error;

            setPeople(prev => prev.map(p => (p.id === personId ? { ...p, qr_uid: cleanUID || null } : p)));
            setEditing(null);
            setEditValue('');
            rfidOfflineService.cacheMappings(String(user.school_id)).catch(error => {
                console.warn('Failed to refresh RFID mapping cache after QR save:', error);
            });
            toast.showToast(cleanUID ? 'QR assignment saved' : 'QR assignment cleared', 'success');
        } catch (e: any) {
            toast.showToast('Failed to save QR: ' + (e?.message || ''), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveRfid = async (personId: number) => {
        if (!window.confirm('Remove RFID card assignment?')) return;
        if (!user?.school_id) return;
        const table = mode === 'students' ? 'students' : 'staff';
        const person = people.find(p => p.id === personId);
        try {
            const nextMode = getEffectiveAttendanceMode(person?.attendance_mode, !!person?.qr_uid);
            const updatedRow = await saveAndConfirmPerson(table, personId, {
                rfid_uid: null,
                attendance_mode: nextMode,
            });
            setPeople(prev => prev.map(p => p.id === personId ? {
                ...p,
                rfid_uid: updatedRow.rfid_uid || null,
                attendance_mode: updatedRow.attendance_mode as 'rfid_required' | 'manual_only' | 'hybrid' | null
            } : p));
            rfidOfflineService.cacheMappings(String(user.school_id)).catch(error => {
                console.warn('Failed to refresh native RFID mapping cache after removal:', error);
            });
            toast.showToast('RFID assignment removed', 'success');
        } catch (e: any) {
            toast.showToast('Failed to remove: ' + (e?.message || ''), 'error');
        }
    };

    const handleRemoveQr = async (personId: number) => {
        if (!window.confirm('Remove QR assignment?')) return;
        if (!user?.school_id) return;
        const table = mode === 'students' ? 'students' : 'staff';
        const person = people.find(p => p.id === personId);
        try {
            const nextMode = getEffectiveAttendanceMode(person?.attendance_mode, !!person?.rfid_uid);
            const { error } = await supabase
                .from(table)
                .update({ qr_uid: null, attendance_mode: nextMode })
                .eq('id', personId)
                .eq('school_id', user.school_id);

            if (error) throw error;

            setPeople(prev => prev.map(p => (p.id === personId ? { ...p, qr_uid: null, attendance_mode: nextMode } : p)));
            rfidOfflineService.cacheMappings(String(user.school_id)).catch(error => {
                console.warn('Failed to refresh RFID mapping cache after QR removal:', error);
            });
            toast.showToast('QR assignment removed', 'success');
        } catch (e: any) {
            toast.showToast('Failed to remove QR: ' + (e?.message || ''), 'error');
        }
    };

    const startEditRfid = (person: PersonRow) => {
        setEditing({ personId: person.id, field: 'rfid' });
        setEditValue(person.rfid_uid || '');
        setEditAttendanceMode(getEffectiveAttendanceMode(person.attendance_mode, !!(person.rfid_uid || person.qr_uid)));
    };

    const startEditQr = (person: PersonRow) => {
        setEditing({ personId: person.id, field: 'qr' });
        setEditValue(person.qr_uid || '');
    };

    const cancelEdit = () => {
        if (isNfcScanning && nfcAbortControllerRef.current) {
            nfcAbortControllerRef.current.abort();
            nfcAbortControllerRef.current = null;
            setIsNfcScanning(false);
        }
        if (editNormalizeTimerRef.current) {
            clearTimeout(editNormalizeTimerRef.current);
            editNormalizeTimerRef.current = null;
        }
        setEditing(null);
        setEditValue('');
        setEditAttendanceMode('hybrid');
    };

    const handleEditInputChange = (value: string) => {
        const sanitized = sanitizeRfidUid(value);
        setEditValue(sanitized);

        if (editNormalizeTimerRef.current) {
            clearTimeout(editNormalizeTimerRef.current);
        }

        editNormalizeTimerRef.current = setTimeout(() => {
            setEditValue(current => {
                const normalizedCurrent = sanitizeRfidUid(current);
                if (normalizedCurrent.length < 4) {
                    return normalizedCurrent;
                }

                return normalizeDesktopScannerUid(normalizedCurrent);
            });
            editNormalizeTimerRef.current = null;
        }, 120);
    };

    const handleStartNfc = async () => {
        if (!editing || editing.field !== 'rfid') return;

        // --- 1. Pure Native Android APK (PhoneGap-NFC) ---
        if (window.nfc) {
            if (isNfcScanning) {
                window.nfc.removeTagDiscoveredListener();
                setIsNfcScanning(false);
                return;
            }

            try {
                setIsNfcScanning(true);
                toast.showToast("NFC Scanner Active (Native)...", "success");

                window.nfc.addTagDiscoveredListener(
                    (nfcEvent: any) => {
                        const tagId = nfcEvent.tag.id;
                        if (tagId) {
                            // Convert byte array to HEX UID
                            const cleanUID = tagId.map((b: number) => {
                                let s = (b & 0xFF).toString(16).toUpperCase();
                                return s.length === 1 ? '0' + s : s;
                            }).join('');

                            setEditValue(cleanUID);
                            toast.showToast(`Card read: ${cleanUID}`, "success");
                        }
                    },
                    () => console.log("NFC listener started"),
                    (err: any) => {
                        setIsNfcScanning(false);
                        toast.showToast("Native NFC Error: " + err, "error");
                    }
                );
                return; // Use native and skip web
            } catch (err) {
                console.error("Native NFC catch:", err);
            }
        }

        // --- 2. Standard Web Browser (Web NFC) ---
        if (isNfcScanning) {
            if (nfcAbortControllerRef.current) {
                nfcAbortControllerRef.current.abort();
                nfcAbortControllerRef.current = null;
            }
            setIsNfcScanning(false);
            return;
        }

        try {
            const ndef = new window.NDEFReader();
            nfcAbortControllerRef.current = new AbortController();

            setIsNfcScanning(true);
            await ndef.scan({ signal: nfcAbortControllerRef.current.signal });

            ndef.onreadingerror = (_event: any) => {
                toast.showToast("Bank cards are blocked by browsers. Use a standard NFC/RFID card.", "error");
            };

            ndef.onreading = ({ serialNumber }: any) => {
                console.log("NFC Card detected:", serialNumber);
                if (serialNumber) {
                    const cleanUID = sanitizeRfidUid(serialNumber);
                    setEditValue(cleanUID);
                    if (cleanUID.length >= 4) {
                        toast.showToast(`Card detected: ${cleanUID}`, "success");
                    }
                }
            };
        } catch (error: any) {
            setIsNfcScanning(false);
            if (error.name !== 'AbortError') {
                toast.showToast("NFC Error: " + error.message, "error");
            }
        }
    };

    // Handle keyboard input from USB reader in edit field
    const handleEditKeyDown = (e: React.KeyboardEvent, personId: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (editNormalizeTimerRef.current) {
                clearTimeout(editNormalizeTimerRef.current);
                editNormalizeTimerRef.current = null;
            }

            const normalizedUid = editing?.field === 'qr'
                ? resolveQrAssignmentFromInput(editValue)
                : resolveAssignmentUidFromInput(editValue);
            if (normalizedUid !== editValue) {
                setEditValue(normalizedUid);
            }
            if (editing?.field === 'qr') {
                handleSaveQr(personId, normalizedUid);
            } else {
                handleSaveRfid(personId, normalizedUid);
            }
        }
        if (e.key === 'Escape') {
            if (editNormalizeTimerRef.current) {
                clearTimeout(editNormalizeTimerRef.current);
                editNormalizeTimerRef.current = null;
            }
            cancelEdit();
        }
    };

    const sortedClasses = useMemo(() => sortClasses(classes as any[]), [classes]);

    return (
        <Page theme={themeObj}>
            <TopBar>
                <Title theme={themeObj}>
                    <CreditCard style={{ fontSize: 22 }} />
                    RFID / QR Card Assignment
                </Title>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FilterBadge>{assignedCount}/{totalCount} assigned</FilterBadge>
                    <ModeToggle theme={themeObj}>
                        <ModeBtn $active={mode === 'students'} theme={themeObj} onClick={() => setMode('students')}>
                            <School style={{ fontSize: 16 }} />
                            Students
                        </ModeBtn>
                        <ModeBtn $active={mode === 'employees'} theme={themeObj} onClick={() => setMode('employees')}>
                            <Work style={{ fontSize: 16 }} />
                            Employees
                        </ModeBtn>
                    </ModeToggle>
                </div>
            </TopBar>

            <FiltersBar theme={themeObj}>
                <SearchWrap theme={themeObj}>
                    <SearchIcon theme={themeObj}><Search /></SearchIcon>
                    <SearchInput
                        theme={themeObj}
                        placeholder={mode === 'students' ? 'Search by name, roll number, or card UID...' : 'Search by name, role, or card UID...'}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                    />
                </SearchWrap>

                {mode === 'students' && (
                    <Select theme={themeObj} value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterSection('all'); setPage(0); }}>
                        <option value="all">All Classes</option>
                        {sortedClasses.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </Select>
                )}

                {mode === 'students' && (
                    <Select theme={themeObj} value={filterSection} onChange={e => { setFilterSection(e.target.value); setPage(0); }}>
                        <option value="all">All Sections</option>
                        {filteredSections.map((section) => (
                            <option key={section.id} value={String(section.id)}>
                                {section.name}
                            </option>
                        ))}
                    </Select>
                )}

                {mode === 'students' && (
                    <Select
                        theme={themeObj}
                        value={filterSession}
                        onChange={e => { setFilterSession(e.target.value); setPage(0); }}
                        aria-label="Session"
                    >
                        {sessions.length === 0 ? (
                            <option value="">Loading…</option>
                        ) : (
                            sessions.map(s => (
                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                            ))
                        )}
                    </Select>
                )}

                <Select
                    theme={themeObj}
                    value={filterPersonStatus}
                    onChange={e => {
                        setFilterPersonStatus(e.target.value as PersonStatusFilter);
                        setPage(0);
                    }}
                    aria-label="Enrollment status"
                >
                    {PERSON_STATUS_FILTER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </Select>

                <Select theme={themeObj} value={filterStatus} onChange={e => { setFilterStatus(e.target.value as any); setPage(0); }}>
                    <option value="all">All Cards</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                </Select>

                <ActionBtn $color="#a855f7" onClick={fetchData} disabled={loading}>
                    <Refresh style={{ fontSize: 14 }} />
                    Refresh
                </ActionBtn>
            </FiltersBar>

            <TableCard theme={themeObj}>
                {loading ? (
                    <CenterLoading><CircularProgress size={28} /></CenterLoading>
                ) : filtered.length === 0 ? (
                    <EmptyState theme={themeObj}>
                        <PersonSearch style={{ fontSize: 48, opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
                        No {mode} found matching your filters.
                    </EmptyState>
                ) : (
                    <>
                        <TableWrap>
                            <Table>
                                <thead>
                                    <tr>
                                        <TH theme={themeObj}>#</TH>
                                        <TH theme={themeObj}>Name</TH>
                                        {mode === 'students' && <TH theme={themeObj}>Roll No</TH>}
                                        {mode === 'students' && <TH theme={themeObj}>Class / Section</TH>}
                                        {mode === 'students' && <TH theme={themeObj}>Face</TH>}
                                        {mode === 'employees' && <TH theme={themeObj}>Role</TH>}
                                        {mode === 'employees' && <TH theme={themeObj}>Face</TH>}
                                        <TH theme={themeObj}>Attendance Mode</TH>
                                        <TH theme={themeObj}>RFID card</TH>
                                        <TH theme={themeObj}>QR code</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageData.map((person, idx) => {
                                        const isEditingRfid = editing?.personId === person.id && editing.field === 'rfid';
                                        const isEditingQr = editing?.personId === person.id && editing.field === 'qr';
                                        const hasAnyCard = !!(person.rfid_uid || person.qr_uid);
                                        const className = person.class_id ? classesMap.get(person.class_id) || '' : '';
                                        const sectionName = person.section_id ? sectionsMap.get(person.section_id) || '' : '';
                                        const classLabel = className && sectionName
                                            ? `${className} - ${sectionName}`
                                            : className || sectionName || '—';

                                        return (
                                            <Row key={person.id} theme={themeObj}>
                                                <TD theme={themeObj}>{page * PAGE_SIZE + idx + 1}</TD>
                                                <TD theme={themeObj} style={{ fontWeight: 600 }}>{person.name}</TD>
                                                {mode === 'students' && <TD theme={themeObj}>{person.roll_number || person.id}</TD>}
                                                {mode === 'students' && <TD theme={themeObj}>{classLabel}</TD>}
                                                {mode === 'students' && (
                                                    <TD theme={themeObj}>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setFaceRecordTarget({
                                                                    id: person.id,
                                                                    name: person.name,
                                                                    kind: 'student',
                                                                })
                                                            }
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                padding: '0.35rem 0.65rem',
                                                                borderRadius: 8,
                                                                border: '1px solid rgba(168,85,247,0.45)',
                                                                background: person.face_embedding ? 'rgba(168,85,247,0.12)' : 'transparent',
                                                                color: '#a855f7',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <FaceIcon style={{ fontSize: 16 }} />
                                                            {person.face_embedding ? 'Update' : 'Record'}
                                                        </button>
                                                    </TD>
                                                )}
                                                {mode === 'employees' && <TD theme={themeObj}>{person.role || '—'}</TD>}
                                                {mode === 'employees' && (
                                                    <TD theme={themeObj}>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setFaceRecordTarget({
                                                                    id: person.id,
                                                                    name: person.name,
                                                                    kind: 'employee',
                                                                })
                                                            }
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                padding: '0.35rem 0.65rem',
                                                                borderRadius: 8,
                                                                border: '1px solid rgba(168,85,247,0.45)',
                                                                background: person.face_embedding ? 'rgba(168,85,247,0.12)' : 'transparent',
                                                                color: '#a855f7',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <FaceIcon style={{ fontSize: 16 }} />
                                                            {person.face_embedding ? 'Update' : 'Record'}
                                                        </button>
                                                    </TD>
                                                )}
                                                <TD theme={themeObj}>
                                                    {isEditingRfid ? (
                                                        <Select
                                                            theme={themeObj}
                                                            value={editAttendanceMode}
                                                            onChange={e => setEditAttendanceMode(e.target.value as 'rfid_required' | 'manual_only' | 'hybrid')}
                                                            style={{ minWidth: 150 }}
                                                        >
                                                            <option value="manual_only">Manual Only</option>
                                                            <option value="rfid_required">RFID Required</option>
                                                            <option value="hybrid">Hybrid</option>
                                                        </Select>
                                                    ) : (
                                                        <RfidBadge
                                                            $assigned={getEffectiveAttendanceMode(person.attendance_mode, hasAnyCard) !== 'manual_only'}
                                                            title="Based on RFID/QR assignment"
                                                        >
                                                            {getEffectiveAttendanceMode(person.attendance_mode, hasAnyCard) === 'hybrid'
                                                                ? 'Hybrid'
                                                                : getEffectiveAttendanceMode(person.attendance_mode, hasAnyCard) === 'rfid_required'
                                                                    ? 'RFID Required'
                                                                    : 'Manual Only'}
                                                        </RfidBadge>
                                                    )}
                                                </TD>
                                                <TD theme={themeObj}>
                                                    {isEditingRfid ? (
                                                        <>
                                                            <ScanInput
                                                                theme={themeObj}
                                                                autoFocus
                                                                placeholder="NFC tap, USB RFID reader, or paste UID..."
                                                                value={editValue}
                                                                onChange={e => handleEditInputChange(e.target.value)}
                                                                onKeyDown={e => handleEditKeyDown(e, person.id)}
                                                            />
                                                            {isNfcSupported ? (
                                                                <div style={{ marginTop: '0.4rem' }}>
                                                                    <MobileNfcBtn $active={isNfcScanning} onClick={handleStartNfc}>
                                                                        <NfcIcon style={{ fontSize: 16 }} />
                                                                        {isNfcScanning ? 'Listening...' : 'Scan with Phone NFC'}
                                                                    </MobileNfcBtn>
                                                                </div>
                                                            ) : (
                                                                !isSecureContext && (
                                                                    <NfcDiagnosticTxt theme={themeObj}>
                                                                        HTTPS required for mobile NFC.
                                                                    </NfcDiagnosticTxt>
                                                                )
                                                            )}
                                                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                                                                <ActionBtn
                                                                    $color="#22c55e"
                                                                    onClick={() => handleSaveRfid(person.id)}
                                                                    disabled={saving}
                                                                >
                                                                    {saving ? <CircularProgress size={12} /> : <CheckCircle style={{ fontSize: 14 }} />}
                                                                    Save RFID
                                                                </ActionBtn>
                                                                <ActionBtn $color="#94a3b8" onClick={cancelEdit}>
                                                                    <Cancel style={{ fontSize: 14 }} />
                                                                    Cancel
                                                                </ActionBtn>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RfidBadge $assigned={!!person.rfid_uid}>
                                                                {person.rfid_uid ? (
                                                                    <>
                                                                        <Nfc style={{ fontSize: 14 }} />
                                                                        {person.rfid_uid}
                                                                    </>
                                                                ) : (
                                                                    'Not assigned'
                                                                )}
                                                            </RfidBadge>
                                                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                                                                <ActionBtn $color="#a855f7" onClick={() => startEditRfid(person)}>
                                                                    <CreditCard style={{ fontSize: 14 }} />
                                                                    {person.rfid_uid ? 'Change RFID' : 'Assign RFID'}
                                                                </ActionBtn>
                                                                {person.rfid_uid && (
                                                                    <ActionBtn $color="#ef4444" onClick={() => handleRemoveRfid(person.id)}>
                                                                        <Delete style={{ fontSize: 14 }} />
                                                                        Clear RFID
                                                                    </ActionBtn>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </TD>
                                                <TD theme={themeObj}>
                                                    {isEditingQr ? (
                                                        <>
                                                            <QrPasteHint theme={themeObj}>
                                                                Camera scanning is only on <b>QR Attendance</b>. Paste a value here, use a USB QR keyboard wedge, or use <b>Student QR labels</b> to generate codes.
                                                            </QrPasteHint>
                                                            <ScanInput
                                                                theme={themeObj}
                                                                autoFocus
                                                                placeholder="Camera scan or paste QR text..."
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onKeyDown={e => handleEditKeyDown(e, person.id)}
                                                            />
                                                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                                                                <ActionBtn
                                                                    $color="#22c55e"
                                                                    onClick={() => handleSaveQr(person.id)}
                                                                    disabled={saving}
                                                                >
                                                                    {saving ? <CircularProgress size={12} /> : <CheckCircle style={{ fontSize: 14 }} />}
                                                                    Save QR
                                                                </ActionBtn>
                                                                <ActionBtn $color="#94a3b8" onClick={cancelEdit}>
                                                                    <Cancel style={{ fontSize: 14 }} />
                                                                    Cancel
                                                                </ActionBtn>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RfidBadge $assigned={!!person.qr_uid} style={{ borderColor: 'rgba(14,165,233,0.35)' }}>
                                                                {person.qr_uid ? (
                                                                    <>
                                                                        <QrCodeScannerIcon style={{ fontSize: 14 }} />
                                                                        {person.qr_uid}
                                                                    </>
                                                                ) : (
                                                                    'Not assigned'
                                                                )}
                                                            </RfidBadge>
                                                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                                                                <ActionBtn $color="#0ea5e9" onClick={() => startEditQr(person)}>
                                                                    <QrCodeScannerIcon style={{ fontSize: 14 }} />
                                                                    {person.qr_uid ? 'Change QR' : 'Assign QR'}
                                                                </ActionBtn>
                                                                {person.qr_uid && (
                                                                    <ActionBtn $color="#ef4444" onClick={() => handleRemoveQr(person.id)}>
                                                                        <Delete style={{ fontSize: 14 }} />
                                                                        Clear QR
                                                                    </ActionBtn>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </TD>
                                            </Row>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </TableWrap>

                        {totalPages > 1 && (
                            <PaginationBar theme={themeObj}>
                                <span>
                                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                                </span>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <PageBtn theme={themeObj} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</PageBtn>
                                    <PageBtn theme={themeObj} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</PageBtn>
                                </div>
                            </PaginationBar>
                        )}
                    </>
                )}
            </TableCard>

            {faceRecordTarget && user?.school_id != null && (
                <FaceRecordModal
                    open
                    personKind={faceRecordTarget.kind === 'employee' ? 'employee' : 'student'}
                    personId={faceRecordTarget.id}
                    schoolId={user.school_id}
                    personName={faceRecordTarget.name}
                    onClose={() => setFaceRecordTarget(null)}
                    onSaved={() => {
                        void fetchData();
                    }}
                />
            )}
        </Page>
    );
};

export default RFIDCardAssignmentPage;
