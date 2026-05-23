import React, { useState, useEffect, useMemo } from 'react';
import styled, { useTheme, keyframes } from 'styled-components';
import { Search, AccountCircle, MonetizationOn, Payment, PictureAsPdf, Info } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoStudentsFound from '../components/NoStudentsFound';
import { useProgress } from '../components/Layout';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import { fetchAllRows } from '../utils/paginationHelper';
import { useToast } from '../components/useToast';
import { formatAppDate } from '../utils/dateUtils';
import Loader from '../components/Loader';

const Container = styled.div`
  width: 100%;
  max-width: 1450px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 6px 32px #00000029, 0 1.5px 6px #0000001a;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 2rem 2.2rem;
  margin-bottom: 2.5rem;
  width: 100%;
  @media (max-width: 700px) {
    padding: 1.2rem 0.7rem;
  }
`;

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1.5rem;
`;

const HeadingIcon = styled.div`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 2.1rem;
  display: flex;
  align-items: center;
`;

const Heading = styled.h2`
  font-size: 1.45rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
  }
`;

const FilterInput = styled.input`
  padding: 0.5em 1em;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  min-width: 180px;
`;

const FilterSelect = styled.select`
  padding: 0.5em 1em;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  @media (max-width: 700px) {
    border-radius: 12px;
    &::-webkit-scrollbar {
      height: 6px;
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 4px #0001;
`;

const Th = styled.th`
  padding: 0.7rem 0.5rem;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  border-bottom: 1.5px solid ${({ theme }) => theme.BORDER};
  font-size: 1.01rem;
`;

const Td = styled.td`
  padding: 0.6rem 0.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.97rem;
  background: ${({ theme }) => theme.CARD};
`;

const LeftTd = styled(Td)`
  text-align: left;
`;

const CenterTd = styled(Td)`
  text-align: center;
  @media (max-width: 700px) {
    text-align: right;
    padding-right: 1.2em;
  }
`;

const CenterTh = styled(Th)`
  text-align: center;
`;

const TableRow = styled.tr.attrs({ 'data-testid': 'remaining-fine-row' })`
  transition: background 0.13s;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 1.5px solid #353b4a;
  cursor: pointer;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
`;

const SummaryGrid = styled.div`
  display: flex;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
  width: 100%;
  @media (max-width: 700px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
  }
`;

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.7rem 2.2rem 1.5rem 2.2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid ${({ theme }) => theme.BORDER};
  min-width: 180px;
  flex: 1 1 0;
  @media (max-width: 700px) {
    min-width: 0;
    width: 100%;
    padding: 1.2rem 1rem 1rem 1rem;
  }
`;

const CardTitle = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.05rem;
  font-weight: 600;
  text-align: left;
  width: 100%;
`;

const CardValue = styled.div<{ color?: string }>`
  font-size: 2.1rem;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.ACCENT};
  text-align: right;
  width: 100%;
`;

const ModernExportButton = styled.button`
  background: rgba(99, 102, 241, 0.13);
  color: ${({ theme }) => theme.ACCENT};
  border: none;
  border-radius: 8px;
  padding: 0.38em 1.1em;
  font-size: 0.97em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5em;
  box-shadow: 0 2px 8px #0001;
  transition: background 0.18s, box-shadow 0.18s, transform 0.13s, color 0.13s;
  height: 2.2em;
  &:hover, &:focus {
    background: rgba(99, 102, 241, 0.22);
    color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 4px 16px #6366f122;
    transform: scale(1.045);
  }
`;

const BulkRemitButton = styled(ModernExportButton)`
  background: rgba(239, 68, 68, 0.13);
  color: #ef4444;
  &:hover, &:focus {
    background: rgba(239, 68, 68, 0.22);
    color: #dc2626;
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.22);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 34, 50, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 8px 40px #0008;
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-width: 320px;
  @media (max-width: 600px) {
    min-width: 0;
    width: 90vw;
    padding: 1.2rem 0.7rem 1rem 0.7rem;
  }
`;

const ModalTitleSmall = styled.h3`
  margin-top: 0;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
`;

const ModalText = styled.p`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1.8rem;
  line-height: 1.5;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  width: 100%;
`;

const ConfirmButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #dc2626; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const CancelButton = styled.button`
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: ${({ theme }) => theme.HOVER_BG}; }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  padding-bottom: 0.5rem;
`;

const Tab = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  color: ${({ active, theme }) => active ? theme.ACCENT : theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -0.6rem;
    left: 0;
    width: 100%;
    height: 3px;
    background: ${({ theme }) => theme.ACCENT};
    transform: scaleX(${({ active }) => active ? 1 : 0});
    transition: transform 0.2s;
  }
`;

const HistoryTable = styled(Table)`
  margin-top: 1rem;
`;

const UndoButton = styled.button`
  background: rgba(244, 63, 94, 0.1);
  color: #f43f5e;
  border: 1px solid rgba(244, 63, 94, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s;
  
  &:hover {
    background: #f43f5e;
    color: white;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModernActionButton = styled.button`
  background: rgba(99, 102, 241, 0.13);
  color: ${({ theme }) => theme.ACCENT};
  border: none;
  border-radius: 8px;
  padding: 0.32em 1.1em;
  font-size: 0.97em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5em;
  box-shadow: 0 2px 8px #0001;
  transition: background 0.18s, box-shadow 0.18s, transform 0.13s, color 0.13s;
  height: 2.2em;
  justify-content: center;
  text-align: center;
  @media (max-width: 700px) {
    width: 100%;
    font-size: 1.05em;
    padding: 0.38em 0.7em;
  }
  &:hover, &:focus {
    background: rgba(99, 102, 241, 0.22);
    color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 4px 16px #6366f122;
    transform: scale(1.045);
  }
`;

const slideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    filter: blur(4px);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.03);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0px);
  }
`;

const AnimatedTableRow = styled.tr<{ $index: number }>`
  opacity: 0;
  animation: ${slideIn} 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: ${props => props.$index * 0.09 + 0.18}s;
`;

const PreviewImg = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 18px #0006;
  background: #232a3b;
`;

const PreviewIcon = styled(AccountCircle)`
  width: 120px !important;
  height: 120px !important;
  border-radius: 50%;
  background: #232a3b;
  color: #b0b8d1;
  box-shadow: 0 4px 18px #0006;
`;

const AvatarImagePreview = styled.div`
  position: fixed;
  z-index: 9999;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
`;

const RemainingFine: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const { showToast } = useToast();
  
  const [isRemitting, setIsRemitting] = useState(false);
  const [showRemitConfirm, setShowRemitConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'history'>('students');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [undoingBatch, setUndoingBatch] = useState<string | null>(null);
  const [showUndoConfirm, setShowUndoConfirm] = useState<{ batchId: string, count: number, amount: number } | null>(null);
  
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [specialFines, setSpecialFines] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const navigate = useNavigate();
  const [avatarPopover, setAvatarPopover] = useState<{
    url?: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchAll = async () => {
    if (!user?.school_id) return;
    const minDuration = 1000;
    const start = Date.now();
    setLoading(true);
    startProgress(false);
    setProgress(10);
    
    try {
      const [studentsData, classesData, sectionsData, finesData, attendanceData, paymentsData, specialFinesData] = await Promise.all([
        fetchAllRows(async (from, to) => {
          return await supabase.from('students')
            .select('id, name, father_name, class_id, section_id, picture_url, roll_number')
            .eq('status', 'active')
            .eq('school_id', user?.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('classes')
            .select('id, name, has_sections')
            .eq('school_id', user?.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('sections')
            .select('id, name, class_id')
            .eq('school_id', user?.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('fines')
            .select('class_id, absent_fine, late_fine, effective_from')
            .eq('school_id', user?.school_id)
            .order('effective_from', { ascending: true })
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('attendance_records')
            .select('student_id, class_id, date, status')
            .eq('school_id', user?.school_id)
            .in('status', ['absent', 'late'])
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('fine_payments')
            .select('*')
            .eq('school_id', user?.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase
            .from('special_fines')
            .select('id, student_id, amount, paid_amount, status')
            .eq('school_id', user?.school_id)
            .range(from, to);
        }),
      ]);
      
      setStudents(studentsData);
      setClasses(sortClasses(classesData));
      setSections(sectionsData);
      setFines(finesData);
      setPayments(paymentsData);
      setSpecialFines(specialFinesData || []);
      setAttendanceRecords(attendanceData);
      setProgress(100);
    } catch (err) {
      showToast("Failed to fetch data.", "error");
    } finally {
      const elapsed = Date.now() - start;
      setTimeout(() => {
        setLoading(false);
        completeProgress();
      }, Math.max(0, minDuration - elapsed));
    }
  };

  const fetchHistory = async () => {
    if (!user?.school_id) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_bulk_remission_history', { 
        p_school_id: Number(user?.school_id)
      });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      showToast("Failed to fetch history: " + err.message, "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user?.school_id) {
      if (activeTab === 'students') {
        fetchAll();
      } else {
        fetchHistory();
      }
    }
  }, [user?.school_id, activeTab]);

  const handleBulkRemit = async () => {
    if (!user?.school_id) return;
    if (summary.totalRemaining <= 0) {
      showToast("No remaining fines to remit.", "info");
      return;
    }

    setIsRemitting(true);
    startProgress(false);
    setProgress(30);
    
    try {
      const batchId = `BATCH-${new Date().getTime()}`;
      const today = new Date().toISOString().slice(0, 10);
      
      const { data: count, error } = await supabase.rpc('bulk_remit_all_fines', {
        p_school_id: Number(user?.school_id),
        p_batch_id: batchId,
        p_payment_date: today
      });

      if (error) throw error;

      setProgress(100);
      showToast(`Successfully remitted fines for ${count} students.`, "success");
      fetchAll();
      setShowRemitConfirm(false);
    } catch (err: any) {
      showToast("Remission failed: " + err.message, "error");
    } finally {
      setIsRemitting(false);
      completeProgress();
    }
  };

  const handleUndoRemission = async (batchId: string) => {
    if (!user?.school_id) return;
    setUndoingBatch(batchId);
    startProgress(false);
    setProgress(50);
    
    try {
      const { data: count, error } = await supabase.rpc('undo_bulk_remission', {
        p_school_id: Number(user?.school_id),
        p_batch_id: batchId
      });

      if (error) throw error;

      setProgress(100);
      showToast(`Successfully reverted ${count} remission records.`, "success");
      fetchHistory();
    } catch (err: any) {
      showToast("Undo failed: " + err.message, "error");
    } finally {
      setUndoingBatch(null);
      setShowUndoConfirm(null);
      completeProgress();
    }
  };

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSection('');
    } else {
      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;
      if (!hasSections) {
        setSelectedSection('');
      }
    }
  }, [selectedClass, classes]);

  const getClassName = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  const getSectionName = (sectionId: any) => sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';
  const getClassHasSections = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.has_sections ?? true;

  function calculateFine(student: any) {
    if (!fines || fines.length === 0) return 0;
    
    const studentAtt = attendanceRecords.filter(
      (rec: any) => rec.student_id === student.id && (rec.status === 'absent' || rec.status === 'late')
    );
    let total = 0;
    
    for (const rec of studentAtt) {
      const classIdFromRecord = rec.class_id || student.class_id;
      const classFines = fines.filter((f: any) => String(f.class_id) === String(classIdFromRecord)) || [];
      
      let applicableFine = null;
      for (const f of classFines) {
        if (f.effective_from <= rec.date) {
          applicableFine = f;
        }
      }
      
      let fineAmount = 0;
      if (applicableFine) {
        fineAmount = rec.status === 'absent' ? Number(applicableFine.absent_fine || 0) : Number(applicableFine.late_fine || 0);
      }
      total += fineAmount;
    }
    return total;
  }

  function calculatePayments(student: any) {
    const studentPayments = payments.filter((p: any) => p.student_id === student.id);
    const paid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const remission = studentPayments.reduce((sum: number, p: any) => sum + Number(p.remission || 0), 0);
    return { paid, remission };
  }

  function calculateSpecials(student: any) {
    if (!specialFines || specialFines.length === 0) return { total: 0, paid: 0, remaining: 0 };
    const studs = specialFines.filter((s: any) => String(s.student_id) === String(student.id));
    const total = studs.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
    const paid = studs.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
    const remaining = total - paid;
    return { total, paid, remaining };
  }

  const filteredStudents = useMemo(() => {
    return students.filter(stu => {
      const nameMatch = stu.name.toLowerCase().includes(search.toLowerCase());
      const idMatch = matchesStudentSearch(stu, search);
      const matchesSearch = nameMatch || idMatch.matches;
      const matchesClass = !selectedClass || String(stu.class_id) === selectedClass;
      const matchesSection = !selectedSection || String(stu.section_id) === selectedSection;
      
      const totalFine = calculateFine(stu);
      const { paid, remission } = calculatePayments(stu);
      const { total: specialTotal, paid: specialPaid, remaining: specialRemaining } = calculateSpecials(stu);
      const combinedRemaining = (totalFine + specialRemaining) - paid - remission;
      return matchesSearch && matchesClass && matchesSection && combinedRemaining !== 0;
    });
  }, [students, search, selectedClass, selectedSection, payments, fines, attendanceRecords, sections]);

  const summaryStudents = useMemo(() => {
    return students.filter(stu => {
      const matchesClass = !selectedClass || String(stu.class_id) === selectedClass;
      const matchesSection = !selectedSection || String(stu.section_id) === selectedSection;
      return matchesClass && matchesSection;
    });
  }, [students, selectedClass, selectedSection]);

  const summary = useMemo(() => {
    let totalFine = 0, totalPaid = 0, totalRemission = 0, totalRemaining = 0;
    summaryStudents.forEach(stu => {
      const fine = calculateFine(stu);
      const { paid, remission } = calculatePayments(stu);
      const { total: specialTotal, paid: specialPaid, remaining: specialRemaining } = calculateSpecials(stu);
      const combinedTotal = fine + specialTotal;
      const combinedPaid = paid + specialPaid;
      const remaining = combinedTotal - combinedPaid - remission;
      totalFine += combinedTotal;
      totalPaid += combinedPaid;
      totalRemission += remission;
      totalRemaining += remaining;
    });
    return { totalFine, totalPaid, totalRemission, totalRemaining };
  }, [summaryStudents, payments, fines, attendanceRecords]);

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const studentsByClassSection: { [key: string]: any[] } = {};
      filteredStudents.forEach(stu => {
        const key = `${stu.class_id}_${stu.section_id}`;
        if (!studentsByClassSection[key]) studentsByClassSection[key] = [];
        studentsByClassSection[key].push(stu);
      });

      const sortedClassKeys = sortClasses(Object.keys(studentsByClassSection).map(key => ({
        name: getClassName(key.split('_')[0]),
        key
      }))).map(obj => obj.key);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let firstPage = true;
      
      sortedClassKeys.forEach(key => {
        if (!firstPage) doc.addPage();
        firstPage = false;
        const [classId, sectionId] = key.split('_');
        const className = getClassName(classId);
        const sectionName = getSectionName(sectionId);
        const hasSections = getClassHasSections(classId);
        const studentsInList = studentsByClassSection[key].sort((a, b) => a.id - b.id);
        
        const headers = [['#', 'ID', 'Student Name', 'Father Name', 'Special', 'Total', 'Paid', 'Remission', 'Remaining', 'Received']];
        let tTotal = 0, tPaid = 0, tRem = 0, tRemains = 0, tSpecial = 0;
        
        const body = studentsInList.map((stu, idx) => {
          const fine = calculateFine(stu);
          const { paid, remission } = calculatePayments(stu);
          const { total: specialTotal, paid: specialPaid, remaining: specialRemaining } = calculateSpecials(stu);
          const combinedTotal = fine + specialTotal;
          const combinedPaid = paid + specialPaid;
          const remaining = combinedTotal - combinedPaid - remission;
          tTotal += combinedTotal; tPaid += combinedPaid; tRem += remission; tRemains += remaining; tSpecial += specialRemaining;
          return [idx + 1, getStudentDisplayId(stu), stu.name, stu.father_name, specialRemaining, combinedTotal, combinedPaid, remission, remaining, ''];
        });
        
        body.push([
          { content: 'Total', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
          { content: tSpecial, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
          { content: tTotal, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
          { content: tPaid, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
          { content: tRem, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
          { content: tRemains, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
          { content: '', styles: { fillColor: [240,240,240] } }
        ]);

        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(`Fine Defaulters - ${className}${hasSections && sectionName ? ' (' + sectionName + ')' : ''}`, 105, 22, { align: 'center' });
        
        autoTable(doc, {
          head: headers,
          body,
          startY: 28,
          margin: { left: 6, right: 6 },
          styles: { fontSize: 9, cellPadding: 1.5, halign: 'center', valign: 'middle' },
          headStyles: { fillColor: [240,240,240], textColor: 60, fontStyle: 'bold' },
          theme: 'grid'
        });
      });

      const fileName = `Remaining Fine (${new Date().toLocaleDateString()}).pdf`;
      if (isMobileDevice) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        if (window.Capacitor?.Plugins?.Filesystem) {
          await window.Capacitor.Plugins.Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: 'DOCUMENTS'
          });
          const uri = await window.Capacitor.Plugins.Filesystem.getUri({ path: fileName, directory: 'DOCUMENTS' });
          window.open(uri.uri, '_blank');
        } else {
          doc.save(fileName);
        }
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      showToast("PDF Export failed.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const getPopoverStyle = () => {
    if (!avatarPopover) return {};
    const padding = 12;
    const width = 200, height = 140;
    let x = avatarPopover.x, y = avatarPopover.y;
    if (x + width > window.innerWidth - padding) x = window.innerWidth - width - padding;
    if (y + height > window.innerHeight - padding) y = window.innerHeight - height - padding;
    return { left: x, top: y, width: 200, position: 'fixed' as const };
  };

  if (!user?.school_id) return null;
  if (loading) return <Loader />;
  if (!loading && students.length === 0) return <NoStudentsFound />;

  return (
    <Container>
      <AnimatePresence>
        {showRemitConfirm && (
          <ModalOverlay as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalContent as={motion.div} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <ModalTitleSmall>Confirm Bulk Remission</ModalTitleSmall>
              <ModalText>
                Are you sure you want to remit <strong>all</strong> remaining fines? 
                <br /><br />
                Total amount: <strong>Rs. {summary.totalRemaining.toLocaleString()}</strong>
              </ModalText>
              <ModalButtons>
                <CancelButton onClick={() => setShowRemitConfirm(false)} disabled={isRemitting}>Cancel</CancelButton>
                <ConfirmButton onClick={handleBulkRemit} disabled={isRemitting}>{isRemitting ? 'Processing...' : 'Yes, Remit All'}</ConfirmButton>
              </ModalButtons>
            </ModalContent>
          </ModalOverlay>
        )}
        {showUndoConfirm && (
          <ModalOverlay as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalContent as={motion.div} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <ModalTitleSmall>Confirm Undo</ModalTitleSmall>
              <ModalText>
                Revert remission batch <strong>{showUndoConfirm.batchId}</strong> for <strong>{showUndoConfirm.count}</strong> students?
              </ModalText>
              <ModalButtons>
                <CancelButton onClick={() => setShowUndoConfirm(null)} disabled={!!undoingBatch}>Cancel</CancelButton>
                <ConfirmButton onClick={() => handleUndoRemission(showUndoConfirm.batchId)} disabled={!!undoingBatch}>{undoingBatch ? 'Reverting...' : 'Yes, Undo'}</ConfirmButton>
              </ModalButtons>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {avatarPopover && (
        <AvatarImagePreview style={getPopoverStyle()}>
          {avatarPopover.url ? <PreviewImg src={avatarPopover.url} alt="" /> : <PreviewIcon />}
        </AvatarImagePreview>
      )}

      <Card>
        <HeadingRow>
          <HeadingIcon><MonetizationOn style={{ fontSize: '2.1rem' }} /></HeadingIcon>
          <Heading>Remaining Fine Management</Heading>
        </HeadingRow>

        <TabContainer>
          <Tab active={activeTab === 'students'} onClick={() => setActiveTab('students')}>Students List</Tab>
          <Tab active={activeTab === 'history'} onClick={() => setActiveTab('history')}>Remission History</Tab>
        </TabContainer>

        {activeTab === 'students' ? (
          <>
            <FilterBar>
              <FilterInput type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <FilterSelect value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FilterSelect>
              <FilterSelect value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass || !getClassHasSections(selectedClass)}>
                <option value="">All Sections</option>
                {sections.filter((s: any) => !selectedClass || String(s.class_id) === selectedClass).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FilterSelect>
              <div style={{ flex: 1 }} />
              <BulkRemitButton onClick={() => setShowRemitConfirm(true)} disabled={isRemitting || summary.totalRemaining <= 0}>
                {isRemitting ? 'Remitting...' : 'Remit All Fines'}
              </BulkRemitButton>
              <ModernExportButton onClick={handleExportPDF} disabled={exportLoading}>
                {exportLoading ? 'Exporting...' : 'Export PDF'}
              </ModernExportButton>
            </FilterBar>

            <SummaryGrid>
              <SummaryCard><CardTitle>Total Fine</CardTitle><CardValue color="#6366f1">Rs {summary.totalFine.toLocaleString()}</CardValue></SummaryCard>
              <SummaryCard><CardTitle>Total Paid</CardTitle><CardValue color="#22c55e">Rs {summary.totalPaid.toLocaleString()}</CardValue></SummaryCard>
              <SummaryCard><CardTitle>Total Remission</CardTitle><CardValue color="#a78bfa">Rs {summary.totalRemission.toLocaleString()}</CardValue></SummaryCard>
              <SummaryCard><CardTitle>Total Remaining</CardTitle><CardValue color="#f43f5e">Rs {summary.totalRemaining.toLocaleString()}</CardValue></SummaryCard>
            </SummaryGrid>

            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <CenterTh>S.No</CenterTh><CenterTh>ID</CenterTh><Th style={{ textAlign: 'left' }}>Name</Th>
                    <CenterTh>Class</CenterTh><CenterTh>Special</CenterTh><CenterTh>Total</CenterTh><CenterTh>Paid</CenterTh>
                    <CenterTh>Remission</CenterTh><CenterTh>Remaining</CenterTh><CenterTh>Action</CenterTh>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <TableRow><CenterTd colSpan={9}>No students found.</CenterTd></TableRow>
                  ) : (
                    filteredStudents.map((stu, idx) => {
                      const totalFine = calculateFine(stu);
                      const { paid, remission } = calculatePayments(stu);
                      const { total: specialTotal, paid: specialPaid, remaining: specialRemaining } = calculateSpecials(stu);
                      const combinedTotal = totalFine + specialTotal;
                      const combinedPaid = paid + specialPaid;
                      const remaining = combinedTotal - combinedPaid - remission;
                      return (
                        <AnimatedTableRow key={stu.id} $index={idx}>
                          <CenterTd>{idx + 1}</CenterTd>
                          <CenterTd>{getStudentDisplayId(stu)}</CenterTd>
                          <LeftTd style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar onMouseEnter={e => setAvatarPopover({ url: stu.picture_url, name: stu.name, x: e.clientX + 12, y: e.clientY + 12 })} onMouseLeave={() => setAvatarPopover(null)}>
                              {stu.picture_url ? <img src={stu.picture_url} alt="" /> : <AccountCircle />}
                            </Avatar>
                            <div><div>{stu.name}</div><div style={{ fontSize: '0.8em', opacity: 0.7 }}>{stu.father_name}</div></div>
                          </LeftTd>
                          <CenterTd>{getClassName(stu.class_id)}</CenterTd>
                          <CenterTd>Rs. {specialRemaining}</CenterTd>
                          <CenterTd>Rs. {combinedTotal}</CenterTd>
                          <CenterTd>Rs. {combinedPaid}</CenterTd>
                          <CenterTd>Rs. {remission}</CenterTd>
                          <CenterTd style={{ color: remaining < 0 ? '#ef4444' : (theme as any).ACCENT, fontWeight: 700 }}>Rs. {remaining}</CenterTd>
                          <CenterTd>
                            <ModernActionButton onClick={() => navigate('/fines/collect', { state: { studentId: stu.id } })}>Collect</ModernActionButton>
                          </CenterTd>
                        </AnimatedTableRow>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </TableWrapper>
          </>
        ) : (
          <TableWrapper>
            {historyLoading ? <Loader /> : history.length === 0 ? <p>No history found.</p> : (
              <HistoryTable>
                <thead>
                  <tr><CenterTh>Date</CenterTh><Th style={{ textAlign: 'left' }}>Batch ID</Th><CenterTh>Students</CenterTh><CenterTh>Total Remitted</CenterTh><CenterTh>Action</CenterTh></tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <TableRow key={item.batch_id}>
                      <CenterTd>{formatAppDate(item.history_date)}</CenterTd>
                      <LeftTd>{item.batch_id}</LeftTd>
                      <CenterTd>{item.student_count}</CenterTd>
                      <CenterTd>Rs. {item.total_amount.toLocaleString()}</CenterTd>
                      <CenterTd>
                        <UndoButton onClick={() => setShowUndoConfirm({ batchId: item.batch_id, count: item.student_count, amount: item.total_amount })} disabled={undoingBatch === item.batch_id}>
                          {undoingBatch === item.batch_id ? 'Undoing...' : 'Undo'}
                        </UndoButton>
                      </CenterTd>
                    </TableRow>
                  ))}
                </tbody>
              </HistoryTable>
            )}
          </TableWrapper>
        )}
      </Card>
    </Container>
  );
};

export default RemainingFine;