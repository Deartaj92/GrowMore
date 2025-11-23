import React, { useState, useEffect, useMemo, useContext } from 'react';
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
const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.18);
  color: ${({ theme }) => theme.ACCENT};
  border: 1.2px solid rgba(180, 180, 255, 0.22);
  border-radius: 8px;
  padding: 0.18em 0.7em;
  font-size: 0.89em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3em;
  box-shadow: 0 2px 12px #0001, 0 1.5px 6px #0000000a;
  backdrop-filter: blur(7px);
  transition: background 0.15s, box-shadow 0.15s, transform 0.13s, color 0.13s;
  opacity: 0.93;
  &:hover, &:focus {
    background: rgba(255,255,255,0.28);
    color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 4px 18px #0002;
    transform: scale(1.04);
    opacity: 1;
  }
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
const ExportButton = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.32em 1.2em;
  font-size: 0.97em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4em;
  transition: background 0.15s, box-shadow 0.15s, transform 0.13s;
  box-shadow: 0 2px 8px #0002;
  margin-bottom: 1.2rem;
  &:hover, &:focus {
    background: ${({ theme }) => theme.ACCENT + 'cc'};
    box-shadow: 0 4px 16px #0003;
    transform: scale(1.045);
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
const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid #e0e7ef;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Sidebar menu entry animation from Layout.tsx
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

// Add a subtle animated dots loader for summary cards
const DotsLoader = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 0.2em;
  width: 26px;
  height: 1em;
  vertical-align: middle;
  & span {
    display: inline-block;
    width: 8px;
    height: 8px;
    aspect-ratio: 1/1;
    margin: 0 2px;
    background: ${({ theme }) => theme.ACCENT};
    border-radius: 50%;
    animation: dots-bounce 1.2s infinite both;
    opacity: 0.7;
    vertical-align: middle;
    box-sizing: border-box;
  }
  & span:nth-child(2) {
    animation-delay: 0.2s;
  }
  & span:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes dots-bounce {
    0%, 80%, 100% { transform: scale(1); opacity: 0.7; }
    40% { transform: scale(1.3); opacity: 1; }
  }
`;

// Modal for avatar preview
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
const ModalAvatar = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5.5rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 2.5px solid #6366f1;
  margin-bottom: 1.2rem;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
`;
const ModalClose = styled.button`
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  background: none;
  border: none;
  color: #6366f1;
  font-size: 2rem;
  cursor: pointer;
  z-index: 2;
`;

const AvatarPopover = styled.div`
  position: fixed;
  z-index: 9999;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 4px 24px #0005;
  padding: 1.1rem 1.3rem 1rem 1.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 160px;
  min-height: 120px;
  border: 1.5px solid ${({ theme }) => theme.BORDER};
`;
const PopoverAvatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.7rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 2px solid #6366f1;
  margin-bottom: 0.7rem;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
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
  border-radius: 0;
  box-shadow: none;
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

// --- Dashboard-style Skeleton Loader for RemainingFine ---
const RemainingFineSkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: clamp(8px, 2vw, 24px);
  box-sizing: border-box;
  @media (max-width: 900px) {
    padding: 1rem 0.5rem;
  }
  @media (max-width: 700px) {
    padding: 0.7rem 0.5rem;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
  }
`;
const SkeletonCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 6px 32px #00000029, 0 1.5px 6px #0000001a;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1.8rem 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 120px;
  margin-bottom: 1.2rem;
  overflow: hidden;
  width: 100%;
  @media (max-width: 700px) {
    padding: 1.1rem 0.6rem;
    border-radius: 12px;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0 0 1rem 0;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 18px;
  }
`;
const SkeletonFilterBar = styled.div`
  width: 100%;
  height: 48px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 10px;
  margin-bottom: 1.2rem;
  position: relative;
  overflow: hidden;
  @media (max-width: 700px) {
    border-radius: 10px;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 10px;
  }
`;
const SkeletonSummaryGrid = styled.div`
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
const SkeletonSummaryCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.7rem 2.2rem 1.5rem 2.2rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  min-width: 180px;
  flex: 1 1 0;
  min-height: 80px;
  position: relative;
  overflow: hidden;
  @media (max-width: 700px) {
    min-width: 0;
    width: 100%;
    padding: 1.2rem 1rem 1rem 1rem;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 14px;
  }
`;
const SkeletonTable = styled.div`
  width: 100%;
  height: 220px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  margin-top: 1.2rem;
  position: relative;
  overflow: hidden;
  @media (max-width: 700px) {
    border-radius: 10px;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }
`;
const RemainingFineSkeleton: React.FC = () => (
  <RemainingFineSkeletonContainer>
    <SkeletonCard style={{ marginBottom: 24 }}>
      <SkeletonFilterBar />
      <SkeletonSummaryGrid>
        {[1,2,3,4].map(i => <SkeletonSummaryCard key={i} />)}
      </SkeletonSummaryGrid>
      <SkeletonTable />
    </SkeletonCard>
  </RemainingFineSkeletonContainer>
);

const RemainingFine: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  
  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <Container>
        <Card>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '2rem', 
            gap: 16,
            color: '#888',
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            <Info style={{ fontSize: '1.5rem' }} />
            No school context found. Please contact your administrator.
          </div>
        </Card>
      </Container>
    );
  }

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
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

  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.school_id) return;
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      startProgress(false);
      setProgress(10);
      const [
        { data: studentsData },
        { data: classesData },
        { data: sectionsData },
        { data: finesData },
        { data: paymentsData },
        { data: attendanceData },
      ] = await Promise.all([
        supabase.from('students').select('id, name, father_name, class_id, section_id, picture_url, roll_number').eq('status', 'active').eq('school_id', user.school_id),
        supabase.from('classes').select('id, name, has_sections').eq('school_id', user.school_id),
        supabase.from('sections').select('id, name, class_id').eq('school_id', user.school_id),
        supabase.from('fines').select('class_id, absent_fine, late_fine, effective_from').eq('school_id', user.school_id),
        supabase.from('fine_payments').select('*').eq('school_id', user.school_id),
        supabase.from('attendance_records').select('student_id, class_id, date, status')
          .eq('school_id', user.school_id)
          .in('status', ['absent', 'late']),
      ]);
      setProgress(70);
      setStudents(studentsData || []);
      const sortedClasses = sortClasses(classesData || []);
      setClasses(sortedClasses);
      setSections(sectionsData || []);
      setFines(finesData || []);
      setPayments(paymentsData || []);
      setAttendanceRecords(attendanceData || []);
      setProgress(100);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
      }
    };
    fetchAll();
  }, [user?.school_id]);

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSection('');
    } else {
      // Check if the selected class has sections
      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;
      if (!hasSections) {
        setSelectedSection('');
      }
    }
  }, [selectedClass, classes]);

  // Helper: get class/section name
  const getClassName = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  const getSectionName = (sectionId: any) => sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';
  const getClassHasSections = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.has_sections ?? true;


  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(stu => {
      const nameMatch = stu.name.toLowerCase().includes(search.toLowerCase());
      const idMatch = matchesStudentSearch(stu, search);
      const matchesSearch = nameMatch || idMatch.matches;
      const matchesClass = !selectedClass || String(stu.class_id) === selectedClass;
      const matchesSection = !selectedSection || String(stu.section_id) === selectedSection;
      // Calculate remaining fine
      const totalFine = calculateFine(stu);
      const { paid, remission } = calculatePayments(stu);
      const remaining = totalFine - paid - remission;
      return matchesSearch && matchesClass && matchesSection && remaining !== 0;
    });
  }, [students, search, selectedClass, selectedSection, payments, fines, attendanceRecords, sections]);

  // Filtered students for summary (class/section only)
  const summaryStudents = useMemo(() => {
    return students.filter(stu => {
      const matchesClass = !selectedClass || String(stu.class_id) === selectedClass;
      const matchesSection = !selectedSection || String(stu.section_id) === selectedSection;
      return matchesClass && matchesSection;
    });
  }, [students, selectedClass, selectedSection]);

  // Fine calculation logic - uses class_id from attendance records for accurate fine calculation
  function calculateFine(student: any) {
    const studentAtt = attendanceRecords.filter(
      (rec: any) => rec.student_id === student.id && (rec.status === 'absent' || rec.status === 'late')
    );
    let total = 0;
    
    for (const rec of studentAtt) {
      // Use the class_id directly from the attendance record (this is the class the student was in when attendance was marked)
      const classIdFromRecord = rec.class_id;
      
      // Find fines for that specific class
      const classFines = fines.filter((f: any) => String(f.class_id) === String(classIdFromRecord));
      
      // Always pick the latest fine setting with effective_from <= rec.date
      let fine = classFines && classFines.length > 0 ? classFines[0] : null;
      for (const f of classFines) {
        if (f.effective_from <= rec.date) fine = f;
      }
      
      if (fine) {
        if (rec.status === 'absent') total += Number(fine.absent_fine);
        else if (rec.status === 'late') total += Number(fine.late_fine);
      }
    }
    return total;
  }

  // Payment calculation
  function calculatePayments(student: any) {
    const studentPayments = payments.filter((p: any) => p.student_id === student.id);
    const paid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const remission = studentPayments.reduce((sum: number, p: any) => sum + Number(p.remission || 0), 0);
    return { paid, remission };
  }

  const handleExportPDF = async () => {
    setExportLoading(true);
    
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        // You can add a toast notification here if you have access to it
      }
      
    // Group students by class-section
    const studentsByClassSection: { [key: string]: any[] } = {};
    filteredStudents.forEach(stu => {
      const classId = stu.class_id;
      const sectionId = stu.section_id;
      const key = `${classId}_${sectionId}`;
      if (!studentsByClassSection[key]) studentsByClassSection[key] = [];
      studentsByClassSection[key].push(stu);
    });

    // Sort classes using the universal class sorting function
    const classObjects = Object.keys(studentsByClassSection).map(key => {
      const [classIdA] = key.split('_');
      return {
        name: getClassName(classIdA),
        key: key
      };
    });
    const sortedClassObjects = sortClasses(classObjects);
    const sortedClassKeys = sortedClassObjects.map(obj => obj.key);

    // Sort students within each class by ID
    Object.keys(studentsByClassSection).forEach(key => {
      studentsByClassSection[key].sort((a, b) => a.id - b.id);
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let firstPage = true;
    sortedClassKeys.forEach(key => {
      if (!firstPage) doc.addPage();
      firstPage = false;
      const [classId, sectionId] = key.split('_');
      const className = getClassName(classId);
      const sectionName = getSectionName(sectionId);
      const hasSections = getClassHasSections(classId);
      const students = studentsByClassSection[key];
      // Table headers
      const headers = [
        ['#', 'ID', 'Student Name', 'Father Name', 'Total', 'Paid', 'Remission', 'Remaining', 'Received']
      ];
      // Table body
      let totalTotal = 0, totalPaid = 0, totalRemission = 0, totalRemaining = 0;
      const body = students.map((stu, idx) => {
        const totalFine = calculateFine(stu);
        const { paid, remission } = calculatePayments(stu);
        const remaining = totalFine - paid - remission;
        totalTotal += totalFine;
        totalPaid += paid;
        totalRemission += remission;
        totalRemaining += remaining;
        return [
          idx + 1,
          getStudentDisplayId(stu),
          stu.name,
          stu.father_name,
          totalFine,
          paid,
          remission,
          remaining,
          '' // Received
        ];
      });
      // Add total row
      body.push([
        { content: 'Total', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
        { content: totalTotal, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
        { content: totalPaid, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
        { content: totalRemission, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
        { content: totalRemaining, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
        { content: '', styles: { fillColor: [240,240,240] } }
      ]);
      // Header
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(`Fine Defaulters - ${className}${hasSections && sectionName ? ' (' + sectionName + ')' : ''}`, 105, 22, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const today = new Date();
      const printDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getFullYear()}`;
      doc.text(`Print Date: ${printDate}`, 200, 22, { align: 'right' });
      autoTable(doc, {
        head: headers,
        body,
        startY: 28,
        margin: { left: 6, right: 6 },
        tableWidth: 'auto',
        styles: { fontSize: 9, cellPadding: 1.5, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240,240,240], textColor: 60, fontStyle: 'bold', halign: 'center', fontSize: 8 },
        bodyStyles: { textColor: 60 },
        columnStyles: {
          0: { cellWidth: 8 }, // #
          1: { cellWidth: 14 }, // ID
          2: { halign: 'left', cellWidth: 42 }, // Student Name
          3: { halign: 'left', cellWidth: 42 }, // Father Name
          4: { cellWidth: 16 }, // Total
          5: { cellWidth: 16 }, // Paid
          6: { cellWidth: 18 }, // Remission
          7: { cellWidth: 18 }, // Remaining
          8: { cellWidth: 22 }  // Received
        },
        theme: 'grid',
        didDrawPage: (data) => {
          // Optionally add more header/footer
        }
      });
    });
    
    // Format date as dd-mmm-yyyy for filename
    const formatDateForFileName = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const fileName = `Remaining Fine (${formatDateForFileName(new Date())}).pdf`;
    
    if (isMobileDevice) {
      // For mobile devices, use Capacitor Filesystem API approach
      try {
        // Generate PDF as base64 string
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        // Create unique filename with timestamp to prevent overwriting
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const mobileFileName = `remaining-fine-${timestamp}.pdf`;

        // Check if Capacitor is available (for mobile apps)
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
          try {
            // Write PDF to documents directory
            await window.Capacitor.Plugins.Filesystem.writeFile({
              path: mobileFileName,
              data: pdfBase64,
              directory: 'DOCUMENTS'
            });

            // Get the file URI
            const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
              path: mobileFileName,
              directory: 'DOCUMENTS'
            });

            // Show success message and trigger native Android "Open with" dialog
            
            // Trigger native Android "Open with" dialog by opening the file URI
            // This will show the native Android app chooser dialog
            window.open(uriResult.uri, '_blank');
            
          } catch (fsError) {
            // If filesystem fails, fallback to regular download
            doc.save(mobileFileName);
          }
        } else {
          // Fallback for web browsers - use the blob approach
          try {
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            
            // Create a visible download button for mobile
            const downloadContainer = document.createElement('div');
            downloadContainer.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: white;
              border: 2px solid #4a6cf7;
              border-radius: 12px;
              padding: 20px;
              z-index: 10000;
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 90vw;
            `;
            
            downloadContainer.innerHTML = `
              <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
              <p style="margin: 0 0 15px 0; color: #666;">Remaining Fine Report</p>
              <a href="${url}" download="${fileName}" 
                 style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                📄 Download PDF
              </a>
              <br>
              <button onclick="this.parentElement.remove()" 
                      style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                             border-radius: 6px; margin-top: 10px; cursor: pointer;">
                Close
              </button>
            `;
            
            document.body.appendChild(downloadContainer);
            
            // Auto-remove after 30 seconds
            setTimeout(() => {
              if (downloadContainer.parentElement) {
                downloadContainer.remove();
              }
              URL.revokeObjectURL(url);
            }, 30000);
            
            
          } catch (webError) {
            
            // Final fallback: Open PDF in new tab with data URI
            const pdfDataUri = doc.output('datauristring');
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Remaining Fine PDF</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                      .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                      .header { text-align: center; margin-bottom: 20px; }
                      .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                      .download-btn:hover { background: #3a5ce5; }
                      iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h2>📄 Remaining Fine PDF Generated</h2>
                        <p>If the PDF doesn't open automatically, use the download button below:</p>
                      </div>
                      <div style="text-align: center;">
                        <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                          📥 Download PDF File
                        </a>
                      </div>
                      <iframe src="${pdfDataUri}"></iframe>
                    </div>
                  </body>
                </html>
              `);
              newWindow.document.close();
            }
          }
        }
      } catch (error) {
        // Error handling for mobile PDF export
      }
    } else {
      // For desktop, use the standard approach
      doc.save(fileName);
    }
    } catch (error) {
      // Error handling for PDF generation
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate summary values (use summaryStudents, not filteredStudents)
  const summary = useMemo(() => {
    let totalFine = 0, totalPaid = 0, totalRemission = 0, totalRemaining = 0;
    summaryStudents.forEach(stu => {
      const fine = calculateFine(stu);
      const { paid, remission } = calculatePayments(stu);
      const remaining = fine - paid - remission;
      totalFine += fine;
      totalPaid += paid;
      totalRemission += remission;
      totalRemaining += remaining;
    });
    return { totalFine, totalPaid, totalRemission, totalRemaining };
  }, [summaryStudents, payments, fines, attendanceRecords]);

  // Adjust popover position to stay in viewport
  const getPopoverStyle = () => {
    if (!avatarPopover) return {};
    const padding = 12;
    const width = 200, height = 140;
    let x = avatarPopover.x, y = avatarPopover.y;
    if (x + width > window.innerWidth - padding) x = window.innerWidth - width - padding;
    if (y + height > window.innerHeight - padding) y = window.innerHeight - height - padding;
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    return { left: x, top: y, width, position: 'fixed' as const };
  };

  if (!loading && students.length === 0) {
    return <NoStudentsFound />;
  }

  if (loading) return <Loader />;

  return (
    <Container>
      {/* Avatar Image Preview */}
      {avatarPopover && (
        <AvatarImagePreview style={getPopoverStyle()}>
          {avatarPopover.url ? (
            <PreviewImg src={avatarPopover.url} alt="avatar" />
          ) : (
            <PreviewIcon />
          )}
        </AvatarImagePreview>
      )}
      <Card>
        <HeadingRow>
          <HeadingIcon><MonetizationOn style={{ fontSize: '2.1rem' }} /></HeadingIcon>
          <Heading>Remaining Fine</Heading>
        </HeadingRow>
        <FilterBar>
          <FilterInput
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <FilterSelect value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass || !getClassHasSections(selectedClass)}>
            <option value="">All Sections</option>
            {sections.filter((s: any) => !selectedClass || String(s.class_id) === selectedClass).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </FilterSelect>
          <div style={{ flex: 1 }} />
          <ModernExportButton onClick={handleExportPDF} disabled={exportLoading}>
            {exportLoading ? (
              <div style={{ 
                width: 16, 
                height: 16, 
                border: '2px solid #e0e7ff', 
                borderTop: '2px solid #4a6cf7', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }} />
            ) : (
              <PictureAsPdf style={{ fontSize: '1.2em' }} />
            )}
            {exportLoading ? 'Exporting...' : 'Export PDF'}
          </ModernExportButton>
        </FilterBar>
        {/* Summary Cards below filter bar */}
        <SummaryGrid>
          <SummaryCard>
            <CardTitle>Total Fine</CardTitle>
            <CardValue color="#6366f1">Rs {summary.totalFine.toLocaleString()}</CardValue>
          </SummaryCard>
          <SummaryCard>
            <CardTitle>Total Paid</CardTitle>
            <CardValue color="#22c55e">Rs {summary.totalPaid.toLocaleString()}</CardValue>
          </SummaryCard>
          <SummaryCard>
            <CardTitle>Total Remission</CardTitle>
            <CardValue color="#a78bfa">Rs {summary.totalRemission.toLocaleString()}</CardValue>
          </SummaryCard>
          <SummaryCard>
            <CardTitle>Total Remaining</CardTitle>
            <CardValue color="#f43f5e">Rs {summary.totalRemaining.toLocaleString()}</CardValue>
          </SummaryCard>
        </SummaryGrid>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <CenterTh>S.No</CenterTh>
                <CenterTh>ID</CenterTh>
                <Th style={{ textAlign: 'left' }}>Name</Th>
                <CenterTh>Class</CenterTh>
                <CenterTh>Total</CenterTh>
                <CenterTh>Paid</CenterTh>
                <CenterTh>Remission</CenterTh>
                <CenterTh>Remaining</CenterTh>
                <CenterTh>Action</CenterTh>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <TableRow><CenterTd colSpan={9}>No students found.</CenterTd></TableRow>
              ) : (
                filteredStudents.map((stu, idx) => {
                  const totalFine = calculateFine(stu);
                  const { paid, remission } = calculatePayments(stu);
                  const remaining = totalFine - paid - remission;
                  const classLabel = `${getClassName(stu.class_id)}${getClassHasSections(stu.class_id) && getSectionName(stu.section_id) ? ' (' + getSectionName(stu.section_id) + ')' : ''}`;
                  return (
                    <AnimatedTableRow key={stu.id} $index={idx}>
                      <CenterTd>{idx + 1}</CenterTd>
                      <CenterTd>{getStudentDisplayId(stu)}</CenterTd>
                      <LeftTd
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 120,
                          width: '100%',
                          maxWidth: 340,
                          ...(window.innerWidth <= 700 ? { minWidth: 240, maxWidth: 600 } : {})
                        }}
                      >
                        <Avatar
                          onMouseEnter={e => {
                            setAvatarPopover({
                              url: stu.picture_url,
                              name: stu.name,
                              x: (e as React.MouseEvent).clientX + 12,
                              y: (e as React.MouseEvent).clientY + 12
                            });
                          }}
                          onMouseMove={e => {
                            setAvatarPopover(prev => prev ? {
                              ...prev,
                              x: (e as React.MouseEvent).clientX + 12,
                              y: (e as React.MouseEvent).clientY + 12
                            } : null);
                          }}
                          onMouseLeave={() => setAvatarPopover(null)}
                          title="Preview"
                        >
                          {stu.picture_url ? (
                            <img src={stu.picture_url} alt="" />
                          ) : (
                            <AccountCircle style={{ fontSize: '1.3rem' }} />
                          )}
                        </Avatar>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                          <span style={{ fontWeight: 600 }}>{stu.name}</span>
                          <span style={{ fontSize: '0.92em', color: '#7c8597' }}>{stu.father_name}</span>
                        </div>
                      </LeftTd>
                      <CenterTd>{classLabel}</CenterTd>
                      <CenterTd>Rs. {totalFine}</CenterTd>
                      <CenterTd>Rs. {paid}</CenterTd>
                      <CenterTd>Rs. {remission}</CenterTd>
                      <CenterTd style={{ color: remaining < 0 ? '#dc2626' : (theme as any).ACCENT, fontWeight: 700 }}>Rs. {remaining}</CenterTd>
                      <CenterTd>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <ModernActionButton onClick={() => navigate('/fines/collect', { state: { studentId: stu.id } })}>
                            <Payment style={{ fontSize: '1.1em' }} /> Collect
                          </ModernActionButton>
                        </div>
                      </CenterTd>
                    </AnimatedTableRow>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrapper>
      </Card>
      <style>{`
        @media (max-width: 700px) {
          .collect-btn-text::after { content: 'Collect'; }
          .collect-btn-text { font-size: 1em; }
          .collect-btn-text { display: inline; }
          .collect-btn-text { visibility: hidden; }
          .collect-btn-text::after { visibility: visible; display: inline; }
        }
        @media (min-width: 701px) {
          .collect-btn-text::after { content: ''; }
          .collect-btn-text { visibility: visible; }
        }
      `}</style>
    </Container>
  );
};

export default RemainingFine; 