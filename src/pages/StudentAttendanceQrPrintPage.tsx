import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { CircularProgress } from '@mui/material';
import { Archive, PictureAsPdf, QrCode2, Refresh } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { sortClasses } from '../utils/classUtils';
import { mergeStudentsWithSessionClassHistory } from '../utils/studentSessionMerge';
import { formatAppDate } from '../utils/dateUtils';
import { canonicalQrTokenForMatch, resolveQrAssignmentFromInput } from '../utils/rfidUtils';
import { rfidOfflineService } from '../services/rfidOfflineService';
import StudentAttendanceQrPdfDocument, { StudentQrPdfItem } from '../components/StudentAttendanceQrPdfDocument';
import { buildStudentQrJpegZip, QrZipStudentInput } from '../utils/studentQrJpegZipExport';
import {
    clayButtonStyle,
    clayCardStyle,
    getLayoutPalette,
    CARD_RADIUS_LG,
} from '../styles/DesignSystem';

interface ClassRow { id: number; name: string; }
interface SectionRow { id: number; name: string; class_id: number; }
interface SessionRow { id: number; name: string; is_active?: boolean | null; }

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

interface StudentRow {
    id: number;
    name: string;
    roll_number?: string | null;
    class_id?: number | null;
    section_id?: number | null;
    session_id?: number | null;
    qr_uid?: string | null;
    rfid_uid?: string | null;
    attendance_mode?: string | null;
    status?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
    phone?: string | null;
    gender?: string | null;
    dob?: string | null;
    admission_date?: string | null;
    form_b?: string | null;
    classes?: { name: string } | null;
    sections?: { name: string } | null;
}

const Page = styled.div`
    width: 100%;
    min-height: 100%;
    padding: 0.75rem;
    box-sizing: border-box;
    background: ${({ theme }) => {
        const layout = getLayoutPalette(theme);
        return layout.shellBg;
    }};
`;

const TopBar = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    display: flex;
    align-items: center;
    gap: 0.45rem;
    svg { color: #0ea5e9; }
`;

const Sub = styled.p`
    margin: 0.35rem 0 0;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    max-width: 640px;
    line-height: 1.45;
`;

const Card = styled.div`
    ${clayCardStyle}
    border-radius: ${CARD_RADIUS_LG};
    padding: 1rem;
    margin-bottom: 0.75rem;
`;

const Row = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.65rem;
`;

const Input = styled.input`
    flex: 1;
    min-width: 180px;
    padding: 0.45rem 0.65rem;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.BORDER};
    background: ${({ theme }) => theme.BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    font-size: 0.88rem;
`;

const Select = styled.select`
    padding: 0.45rem 0.65rem;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.BORDER};
    background: ${({ theme }) => theme.BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    font-size: 0.88rem;
    min-width: 140px;
`;

const Btn = styled.button<{ $active?: boolean; $variant?: 'primary' | 'secondary' | 'danger' }>`
    ${clayButtonStyle}
`;

const TableWrap = styled.div`
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.BORDER};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
`;

const Th = styled.th`
    text-align: left;
    padding: 0.55rem 0.65rem;
    background: ${({ theme }) => theme.CARD};
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const Td = styled.td`
    padding: 0.5rem 0.65rem;
    border-top: 1px solid ${({ theme }) => theme.BORDER};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const getEffectiveAttendanceMode = (
    attendanceMode: string | null | undefined,
    hasCard: boolean
): 'rfid_required' | 'manual_only' | 'hybrid' => {
    if (hasCard && (!attendanceMode || attendanceMode === 'manual_only')) {
        return 'hybrid';
    }
    if (attendanceMode === 'rfid_required' || attendanceMode === 'hybrid' || attendanceMode === 'manual_only') {
        return attendanceMode;
    }
    return hasCard ? 'hybrid' : 'manual_only';
};

const StudentAttendanceQrPrintPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [schoolName, setSchoolName] = useState('School');
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [sections, setSections] = useState<SectionRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [filterSession, setFilterSession] = useState('');

    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterSection, setFilterSection] = useState('all');
    const [filterPersonStatus, setFilterPersonStatus] = useState<PersonStatusFilter>('active');
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const [pdfBusy, setPdfBusy] = useState(false);
    const [zipBusy, setZipBusy] = useState(false);
    const [assignBusy, setAssignBusy] = useState(false);

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

    const load = useCallback(async () => {
        if (!user?.school_id) return;
        setLoading(true);
        try {
            const [instRes, schoolRes, classRes, secRes, studRes] = await Promise.all([
                supabase.from('institute_profile').select('name').eq('school_id', user.school_id).maybeSingle(),
                supabase.from('schools').select('name').eq('id', user.school_id).maybeSingle(),
                supabase.from('classes').select('id,name').eq('school_id', user.school_id).order('name'),
                supabase.from('sections').select('id,name,class_id').eq('school_id', user.school_id).order('name'),
                supabase
                    .from('students')
                    .select(
                        'id,name,roll_number,class_id,section_id,session_id,qr_uid,rfid_uid,attendance_mode,status,father_name,mother_name,phone,gender,dob,admission_date,form_b,classes:class_id(name),sections:section_id(name)'
                    )
                    .eq('school_id', user.school_id)
                    .order('name'),
            ]);

            setSchoolName(instRes.data?.name || schoolRes.data?.name || 'School');
            setClasses((classRes.data || []) as ClassRow[]);
            setSections((secRes.data || []) as SectionRow[]);
            let rows = (studRes.data || []) as unknown as StudentRow[];
            if (filterSession) {
                rows = await mergeStudentsWithSessionClassHistory(supabase, user.school_id, filterSession, rows);
            }
            setStudents(rows);
        } catch (e: any) {
            toast.showToast('Failed to load: ' + (e?.message || ''), 'error');
        } finally {
            setLoading(false);
        }
    }, [user?.school_id, toast, filterSession]);

    useEffect(() => {
        load();
    }, [load]);

    const filteredSections = useMemo(() => {
        if (filterClass === 'all') return sections;
        return sections.filter(s => String(s.class_id) === filterClass);
    }, [sections, filterClass]);

    const filtered = useMemo(() => {
        return students.filter(s => {
            if (filterPersonStatus !== 'all' && String(s.status) !== filterPersonStatus) return false;
            if (filterSession && String(s.session_id) !== filterSession) return false;
            if (filterClass !== 'all' && String(s.class_id) !== filterClass) return false;
            if (filterSection !== 'all' && String(s.section_id) !== filterSection) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                const nm = (s.name || '').toLowerCase();
                const roll = String(s.roll_number || '').toLowerCase();
                const qu = (s.qr_uid || '').toLowerCase();
                const father = (s.father_name || '').toLowerCase();
                const mother = (s.mother_name || '').toLowerCase();
                const ph = (s.phone || '').toLowerCase();
                const reg = String(s.form_b || '').toLowerCase();
                if (
                    !nm.includes(q) &&
                    !roll.includes(q) &&
                    !qu.includes(q) &&
                    !father.includes(q) &&
                    !mother.includes(q) &&
                    !ph.includes(q) &&
                    !reg.includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [students, filterClass, filterSection, filterPersonStatus, filterSession, search]);

    const sortedClasses = useMemo(() => sortClasses(classes as any[]), [classes]);

    const toggle = (id: number) => {
        setSelected(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const selectAllFiltered = () => {
        setSelected(new Set(filtered.map(s => s.id)));
    };

    const clearSelection = () => setSelected(new Set());

    const classLabel = (s: StudentRow) => {
        const cn = s.classes?.name || '';
        const sn = s.sections?.name || '';
        if (cn && sn) return `${cn} — ${sn}`;
        return cn || sn || '—';
    };

    const formatOptionalDate = (v: string | null | undefined) => {
        if (v == null || String(v).trim() === '') return '—';
        return formatAppDate(v, '—');
    };

    const statusDisplay = (s: string | null | undefined) => {
        if (s == null || String(s).trim() === '') return '—';
        const t = String(s).trim();
        return t.charAt(0).toUpperCase() + t.slice(1);
    };

    const generateToken = () => canonicalQrTokenForMatch(crypto.randomUUID());

    const handleAssign = async (regenerate: boolean) => {
        if (!user?.school_id || selected.size === 0) {
            toast.showToast('Select at least one student.', 'error');
            return;
        }
        setAssignBusy(true);
        try {
            const targets = students.filter(s => selected.has(s.id));
            for (const s of targets) {
                if (!regenerate && s.qr_uid) continue;

                const token = generateToken();
                const hasCard = !!(s.rfid_uid || token);
                const attendance_mode = getEffectiveAttendanceMode(s.attendance_mode, hasCard);

                const { error } = await supabase
                    .from('students')
                    .update({ qr_uid: token, attendance_mode })
                    .eq('id', s.id)
                    .eq('school_id', user.school_id);

                if (error) throw error;
            }

            rfidOfflineService.cacheMappings(String(user.school_id)).catch(() => {});
            toast.showToast(
                regenerate ? 'QR codes regenerated and saved' : 'QR codes assigned (skipped rows that already had a code)',
                'success'
            );
            await load();
            clearSelection();
        } catch (e: any) {
            toast.showToast('Assign failed: ' + (e?.message || ''), 'error');
        } finally {
            setAssignBusy(false);
        }
    };

    const handlePdf = async () => {
        if (!user?.school_id || selected.size === 0) {
            toast.showToast('Select students with QR codes to print.', 'error');
            return;
        }
        const rows = students.filter(s => selected.has(s.id) && s.qr_uid);
        if (rows.length === 0) {
            toast.showToast('Selected students have no QR assigned yet. Generate first.', 'error');
            return;
        }

        const sorted = [...rows].sort((a, b) => {
            const ca = classLabel(a);
            const cb = classLabel(b);
            if (ca !== cb) return ca.localeCompare(cb, undefined, { sensitivity: 'base' });
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });

        setPdfBusy(true);
        try {
            const items: StudentQrPdfItem[] = await Promise.all(
                sorted.map(async s => {
                    const raw = resolveQrAssignmentFromInput(s.qr_uid || '') || (s.qr_uid as string);
                    const qrDataUrl = await QRCode.toDataURL(raw, {
                        width: 240,
                        margin: 1,
                        errorCorrectionLevel: 'M',
                    });
                    const father = (s.father_name || '').trim() || '—';
                    const cls = classLabel(s);
                    const captionLine = `${s.name} / ${father} (${cls})`;
                    return {
                        id: s.id,
                        captionLine,
                        qrDataUrl,
                    };
                })
            );

            const blob = await pdf(
                <StudentAttendanceQrPdfDocument schoolName={schoolName} items={items} />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `student-attendance-qr-${user.school_id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.showToast('PDF downloaded', 'success');
        } catch (e: any) {
            toast.showToast('PDF failed: ' + (e?.message || ''), 'error');
        } finally {
            setPdfBusy(false);
        }
    };

    const handleJpegZip = async () => {
        if (!user?.school_id || selected.size === 0) {
            toast.showToast('Select at least one student.', 'error');
            return;
        }
        const rows = students.filter(s => selected.has(s.id) && s.qr_uid);
        if (rows.length === 0) {
            toast.showToast('Selected students have no QR assigned yet. Generate first.', 'error');
            return;
        }

        const sorted = [...rows].sort((a, b) => {
            const ca = classLabel(a);
            const cb = classLabel(b);
            if (ca !== cb) return ca.localeCompare(cb, undefined, { sensitivity: 'base' });
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });

        setZipBusy(true);
        try {
            const inputs: QrZipStudentInput[] = sorted.map(s => ({
                id: s.id,
                name: s.name,
                father_name: s.father_name ?? null,
                qr_uid: s.qr_uid ?? null,
                classFolderLabel: classLabel(s),
            }));
            const blob = await buildStudentQrJpegZip(inputs);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `student-qr-jpegs-school-${user.school_id}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.showToast(`ZIP with ${sorted.length} JPEG(s) downloaded (folders by class).`, 'success');
        } catch (e: any) {
            toast.showToast('ZIP export failed: ' + (e?.message || ''), 'error');
        } finally {
            setZipBusy(false);
        }
    };

    if (!user?.school_id) {
        return <Page><Sub>Sign in to use this page.</Sub></Page>;
    }

    return (
        <Page>
            <TopBar>
                <div>
                    <Title>
                        <QrCode2 style={{ fontSize: 26 }} />
                        Student attendance QR labels
                    </Title>
                    <Sub>
                        Generate secure QR tokens, save them to each student&apos;s <code>qr_uid</code>, print a PDF sheet, or download a ZIP of JPEGs (one folder per class).
                        Use the <b>QR Attendance</b> page to scan with the device camera — the camera is not used here or on card assignment.
                    </Sub>
                </div>
            </TopBar>

            <Card>
                <Row>
                    <Input
                        placeholder="Search name, roll, reg. ID, parent, phone, or QR…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterSection('all'); }}>
                        <option value="all">All classes</option>
                        {sortedClasses.map((c: any) => (
                            <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))}
                    </Select>
                    <Select value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                        <option value="all">All sections</option>
                        {filteredSections.map(sec => (
                            <option key={sec.id} value={String(sec.id)}>{sec.name}</option>
                        ))}
                    </Select>
                    <Select value={filterSession} onChange={e => setFilterSession(e.target.value)} aria-label="Session">
                        {sessions.length === 0 ? (
                            <option value="">Loading…</option>
                        ) : (
                            sessions.map(s => (
                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                            ))
                        )}
                    </Select>
                    <Select
                        value={filterPersonStatus}
                        onChange={e => setFilterPersonStatus(e.target.value as PersonStatusFilter)}
                        aria-label="Enrollment status"
                    >
                        {PERSON_STATUS_FILTER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
                    <Btn type="button" onClick={() => load()} disabled={loading}>
                        <Refresh style={{ fontSize: 16 }} /> Refresh
                    </Btn>
                </Row>
                <Row>
                    <Btn type="button" onClick={selectAllFiltered} disabled={loading || filtered.length === 0}>
                        Select filtered ({filtered.length})
                    </Btn>
                    <Btn type="button" onClick={clearSelection} disabled={selected.size === 0}>
                        Clear selection
                    </Btn>
                    <Btn
                        type="button"
                        $variant="primary"
                        onClick={() => handleAssign(false)}
                        disabled={assignBusy || pdfBusy || zipBusy || selected.size === 0}
                    >
                        {assignBusy ? <CircularProgress size={14} color="inherit" /> : <QrCode2 style={{ fontSize: 16 }} />}
                        Assign QR (empty only)
                    </Btn>
                    <Btn
                        type="button"
                        $variant="danger"
                        onClick={() => {
                            if (window.confirm('Regenerate QR for all selected students? Old codes will stop working.')) {
                                handleAssign(true);
                            }
                        }}
                        disabled={assignBusy || pdfBusy || zipBusy || selected.size === 0}
                    >
                        Regenerate selected
                    </Btn>
                    <Btn
                        type="button"
                        $variant="primary"
                        onClick={handlePdf}
                        disabled={pdfBusy || zipBusy || selected.size === 0}
                    >
                        {pdfBusy ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdf style={{ fontSize: 16 }} />}
                        Download PDF
                    </Btn>
                    <Btn
                        type="button"
                        $variant="secondary"
                        onClick={handleJpegZip}
                        disabled={zipBusy || pdfBusy || selected.size === 0}
                        title="One JPEG per student; folders by class; filenames Student_Father_Class.jpg"
                    >
                        {zipBusy ? <CircularProgress size={14} color="inherit" /> : <Archive style={{ fontSize: 16 }} />}
                        Download JPEGs (ZIP)
                    </Btn>
                </Row>
            </Card>

            {loading ? (
                <Card style={{ textAlign: 'center', padding: '2rem' }}>
                    <CircularProgress />
                </Card>
            ) : (
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th style={{ width: 40 }} />
                                <Th>Student</Th>
                                <Th>Parents</Th>
                                <Th>Phone</Th>
                                <Th>Gender / DOB</Th>
                                <Th>Class</Th>
                                <Th>Admitted</Th>
                                <Th>Status</Th>
                                <Th>QR token</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => (
                                <tr key={s.id}>
                                    <Td>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(s.id)}
                                            onChange={() => toggle(s.id)}
                                        />
                                    </Td>
                                    <Td>
                                        <strong>{s.name}</strong>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                                            Roll {s.roll_number || '—'}
                                            {s.form_b?.trim() ? (
                                                <span> · Reg. {s.form_b}</span>
                                            ) : null}
                                        </div>
                                    </Td>
                                    <Td style={{ fontSize: '0.78rem', lineHeight: 1.35 }}>
                                        <div>{s.father_name?.trim() || '—'}</div>
                                        {s.mother_name?.trim() ? (
                                            <div style={{ opacity: 0.85 }}>{s.mother_name}</div>
                                        ) : null}
                                    </Td>
                                    <Td style={{ fontSize: '0.78rem' }}>{s.phone?.trim() || '—'}</Td>
                                    <Td style={{ fontSize: '0.78rem', lineHeight: 1.35 }}>
                                        <div>{s.gender?.trim() || '—'}</div>
                                        <div style={{ opacity: 0.85 }}>{formatOptionalDate(s.dob)}</div>
                                    </Td>
                                    <Td style={{ fontSize: '0.78rem' }}>{classLabel(s)}</Td>
                                    <Td style={{ fontSize: '0.78rem' }}>{formatOptionalDate(s.admission_date)}</Td>
                                    <Td style={{ fontSize: '0.78rem' }}>{statusDisplay(s.status)}</Td>
                                    <Td style={{ fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all' }}>
                                        {s.qr_uid || '—'}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableWrap>
            )}
        </Page>
    );
};

export default StudentAttendanceQrPrintPage;
