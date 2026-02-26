import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Add NDEFReader types for TypeScript
declare global {
    interface Window {
        NDEFReader: any;
    }
}
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import { sortClasses } from '../utils/classUtils';
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
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

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

interface PersonRow {
    id: number;
    name: string;
    rfid_uid: string | null;
    roll_number?: string;
    class_id?: number;
    section_id?: number;
    role?: string;
    status?: string;
}

interface ClassRow { id: number; name: string; }
interface SectionRow { id: number; name: string; class_id: number; }

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
    const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
    const [loading, setLoading] = useState(false);
    const [people, setPeople] = useState<PersonRow[]>([]);
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [sections, setSections] = useState<SectionRow[]>([]);
    const [page, setPage] = useState(0);

    // Editing state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isNfcScanning, setIsNfcScanning] = useState(false);
    const nfcAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setIsNfcSupported('NDEFReader' in window);
    }, []);

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
                ? 'id,name,rfid_uid,roll_number,class_id,section_id,status'
                : 'id,name,rfid_uid,role';

            const data = await fetchAllRows(async (from, to) => {
                return await supabase
                    .from(table)
                    .select(selectFields)
                    .eq('school_id', user.school_id)
                    .order('name')
                    .range(from, to);
            });
            setPeople((data as any as PersonRow[]) || []);
        } catch (e: any) {
            toast.showToast('Failed to load data: ' + (e?.message || ''), 'error');
        } finally {
            setLoading(false);
        }
    }, [user?.school_id, mode]);

    useEffect(() => {
        fetchData();
        setPage(0);
        setSearch('');
        setFilterClass('all');
        setFilterStatus('all');
    }, [fetchData]);

    // Filter
    const filtered = useMemo(() => {
        return people.filter(p => {
            // Status filter (only for students)
            if (mode === 'students' && p.status && p.status !== 'active') return false;

            // Search
            if (search.trim()) {
                const q = search.toLowerCase();
                const name = (p.name || '').toLowerCase();
                const roll = String(p.roll_number || '').toLowerCase();
                const uid = (p.rfid_uid || '').toLowerCase();
                const role = (p.role || '').toLowerCase();
                if (!name.includes(q) && !roll.includes(q) && !uid.includes(q) && !role.includes(q)) return false;
            }
            // Class filter
            if (filterClass !== 'all' && String(p.class_id) !== filterClass) return false;
            // Assigned/unassigned filter
            if (filterStatus === 'assigned' && !p.rfid_uid) return false;
            if (filterStatus === 'unassigned' && p.rfid_uid) return false;
            return true;
        });
    }, [people, search, filterClass, filterStatus, mode]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const assignedCount = people.filter(p => p.rfid_uid).length;
    const totalCount = people.length;

    // Handle RFID assignment
    const handleSave = async (personId: number) => {
        if (!user?.school_id) return;
        const table = mode === 'students' ? 'students' : 'staff';
        const cleanUID = editValue.trim().toUpperCase().replace(/[^A-F0-9]/g, '');

        if (cleanUID && cleanUID.length < 4) {
            toast.showToast('RFID UID must be at least 4 characters', 'error');
            return;
        }

        setSaving(true);
        try {
            // Check for duplicates
            if (cleanUID) {
                const { data: existing } = await supabase
                    .from(table)
                    .select('id,name')
                    .eq('school_id', user.school_id)
                    .eq('rfid_uid', cleanUID)
                    .neq('id', personId)
                    .maybeSingle();

                if (existing) {
                    toast.showToast(`This card is already assigned to ${existing.name}`, 'error');
                    setSaving(false);
                    return;
                }
            }

            const { error } = await supabase
                .from(table)
                .update({ rfid_uid: cleanUID || null })
                .eq('id', personId)
                .eq('school_id', user.school_id);

            if (error) throw error;

            // Update local state
            setPeople(prev => prev.map(p => p.id === personId ? { ...p, rfid_uid: cleanUID || null } : p));
            setEditingId(null);
            setEditValue('');
            toast.showToast(cleanUID ? 'RFID card assigned successfully' : 'RFID card removed', 'success');
        } catch (e: any) {
            toast.showToast('Failed to save: ' + (e?.message || ''), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (personId: number) => {
        if (!window.confirm('Remove RFID card assignment?')) return;
        if (!user?.school_id) return;
        const table = mode === 'students' ? 'students' : 'staff';
        try {
            const { error } = await supabase
                .from(table)
                .update({ rfid_uid: null })
                .eq('id', personId)
                .eq('school_id', user.school_id);

            if (error) throw error;
            setPeople(prev => prev.map(p => p.id === personId ? { ...p, rfid_uid: null } : p));
            toast.showToast('RFID card removed', 'success');
        } catch (e: any) {
            toast.showToast('Failed to remove: ' + (e?.message || ''), 'error');
        }
    };

    const startEdit = (person: PersonRow) => {
        setEditingId(person.id);
        setEditValue(person.rfid_uid || '');
    };

    const cancelEdit = () => {
        if (isNfcScanning && nfcAbortControllerRef.current) {
            nfcAbortControllerRef.current.abort();
            nfcAbortControllerRef.current = null;
            setIsNfcScanning(false);
        }
        setEditingId(null);
        setEditValue('');
    };

    const handleStartNfc = async () => {
        if (!editingId) return;

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
                toast.showToast("NFC Read Error: Hold card steady against the back of your phone", "error");
            };

            ndef.onreading = ({ serialNumber }: any) => {
                console.log("NFC Card detected:", serialNumber);
                if (serialNumber) {
                    const cleanUID = serialNumber.replace(/:/g, '').toUpperCase();
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
            handleSave(personId);
        }
        if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    const sortedClasses = useMemo(() => sortClasses(classes as any[]), [classes]);

    return (
        <Page theme={themeObj}>
            <TopBar>
                <Title theme={themeObj}>
                    <CreditCard style={{ fontSize: 22 }} />
                    RFID Card Assignment
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
                        placeholder={mode === 'students' ? 'Search by name, roll number, or RFID...' : 'Search by name, role, or RFID...'}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                    />
                </SearchWrap>

                {mode === 'students' && (
                    <Select theme={themeObj} value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(0); }}>
                        <option value="all">All Classes</option>
                        {sortedClasses.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </Select>
                )}

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
                                        {mode === 'students' && <TH theme={themeObj}>Class</TH>}
                                        {mode === 'employees' && <TH theme={themeObj}>Role</TH>}
                                        <TH theme={themeObj}>RFID Card</TH>
                                        <TH theme={themeObj} style={{ width: 180 }}>
                                            {editingId ? 'Scan Card / Type UID' : 'Actions'}
                                        </TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageData.map((person, idx) => {
                                        const isEditing = editingId === person.id;
                                        const className = person.class_id ? classesMap.get(person.class_id) || '' : '';
                                        const sectionName = person.section_id ? sectionsMap.get(person.section_id) || '' : '';
                                        const classLabel = [className, sectionName].filter(Boolean).join(' - ');

                                        return (
                                            <Row key={person.id} theme={themeObj}>
                                                <TD theme={themeObj}>{page * PAGE_SIZE + idx + 1}</TD>
                                                <TD theme={themeObj} style={{ fontWeight: 600 }}>{person.name}</TD>
                                                {mode === 'students' && <TD theme={themeObj}>{person.roll_number || person.id}</TD>}
                                                {mode === 'students' && <TD theme={themeObj}>{classLabel}</TD>}
                                                {mode === 'employees' && <TD theme={themeObj}>{person.role || '—'}</TD>}
                                                <TD theme={themeObj}>
                                                    {isEditing ? (
                                                        <>
                                                            <ScanInput
                                                                theme={themeObj}
                                                                autoFocus
                                                                placeholder="Tap card or type UID..."
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onKeyDown={e => handleEditKeyDown(e, person.id)}
                                                            />
                                                            {isNfcSupported && (
                                                                <div style={{ marginTop: '0.4rem' }}>
                                                                    <MobileNfcBtn $active={isNfcScanning} onClick={handleStartNfc}>
                                                                        <NfcIcon style={{ fontSize: 16 }} />
                                                                        {isNfcScanning ? 'Listening...' : 'Scan with Phone NFC'}
                                                                    </MobileNfcBtn>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
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
                                                    )}
                                                </TD>
                                                <TD theme={themeObj}>
                                                    {isEditing ? (
                                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                            <ActionBtn
                                                                $color="#22c55e"
                                                                onClick={() => handleSave(person.id)}
                                                                disabled={saving}
                                                            >
                                                                {saving ? <CircularProgress size={12} /> : <CheckCircle style={{ fontSize: 14 }} />}
                                                                Save
                                                            </ActionBtn>
                                                            <ActionBtn $color="#94a3b8" onClick={cancelEdit}>
                                                                <Cancel style={{ fontSize: 14 }} />
                                                                Cancel
                                                            </ActionBtn>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                            <ActionBtn $color="#a855f7" onClick={() => startEdit(person)}>
                                                                <CreditCard style={{ fontSize: 14 }} />
                                                                {person.rfid_uid ? 'Change' : 'Assign'}
                                                            </ActionBtn>
                                                            {person.rfid_uid && (
                                                                <ActionBtn $color="#ef4444" onClick={() => handleRemove(person.id)}>
                                                                    <Delete style={{ fontSize: 14 }} />
                                                                    Remove
                                                                </ActionBtn>
                                                            )}
                                                        </div>
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
        </Page>
    );
};

export default RFIDCardAssignmentPage;
