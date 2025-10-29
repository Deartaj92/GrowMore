import React, { useState, useEffect, useContext, useMemo, useCallback, memo, useRef } from 'react';
import styled, { keyframes, DefaultTheme, css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sortClasses } from '../utils/classUtils';
import { ThemeContext } from '../contexts/ThemeContext';
import { examinationService } from '../services/examinationService';
import { Examination, PerformanceAnalytics, ExamStatistics } from '../types/examinations';
import {
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  EmojiEvents as TrophyIcon,
  Grade as GradeIcon,
  Subject as SubjectIcon,
  Class as ClassIcon,
  PictureAsPdf,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Subject ordering configuration - handles variations in naming (from DetailedMarksCertificate.tsx)
const getSubjectOrder = (subjectName: string): number => {
  const name = subjectName.toLowerCase().trim();
  
  // English subjects
  if (name.includes('english') && !name.includes('b')) return 1;
  if (name.includes('english') && name.includes('b')) return 2;
  
  // Urdu subjects
  if (name.includes('urdu') && !name.includes('b')) return 3;
  if (name.includes('urdu') && name.includes('b')) return 4;
  
  // Mathematics
  if (name.includes('math') || name.includes('mathematics')) return 5;
  
  // Islamic subjects
  if (name.includes('islam') || name.includes('islamiyat') || name.includes('islamiat')) return 6;
  if (name.includes('pak study') || name.includes('pakistan')) return 7;
  if (name.includes('mutala') || name.includes('quran')) return 8;
  
  // Science subjects
  if (name.includes('biology')) return 9;
  if (name.includes('chemistry')) return 10;
  if (name.includes('physics')) return 11;
  
  // Social subjects
  if (name.includes('social') || name.includes('study')) return 12;
  if (name.includes('general science')) return 13;
  if (name.includes('general knowledge') || name.includes('gk')) return 14;
  
  // Islamic studies
  if (name.includes('nazra') || name.includes('nazira')) return 15;
  if (name.includes('hifz') || name.includes('hifazat')) return 16;
  
  // Default order for other subjects
  return 999;
};

// Professional Analytics Layout
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 8px 0 8px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 92vh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
  will-change: transform;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin: 4px 0 2px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 4px #0001;
  border-radius: 8px;
  padding: 3px 6px 1px 6px;
  min-height: 32px;
`;

const Title = styled.h1`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  white-space: nowrap;
  
  @media (max-width: 700px) {
    padding-right: 50px; /* Space for PDF button */
  }
`;

// Enhanced Header Components (matching other components)
const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  flex-wrap: nowrap;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const HeaderBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;

  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  @media (min-width: 701px) {
    display: none;
  }
`;

const DesktopSegmentedGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 0;

  @media (max-width: 700px) {
    display: none;
  }
`;

const MobileHeaderLayout = styled.div`
  display: none;

  @media (max-width: 700px) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
`;

const MobileRow = styled.div`
  display: flex;
  width: 100%;
  gap: 8px;
  margin-top: 8px; /* Lower the segmented group */
  
  @media (max-width: 700px) {
    gap: 0;
    margin-top: 12px; /* More space on mobile */
  }
`;

const MobilePdfButton = styled.button`
  display: none;
  
  @media (max-width: 700px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
    color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#374151'};
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 1.4px 1.4px 4px #2222;
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 10;
    
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
      transform: translateY(-1px);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.FIELD_BORDER};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

// Enhanced Header Components
const SEGMENTED_HEIGHT = '28px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f8f9fa'};
  border-radius: 11px;
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1.4px 1.4px 4px rgba(0,0,0,0.3)' : '1.4px 1.4px 4px rgba(0,0,0,0.1)'};
  border: ${({ theme }) => theme.BG === '#252525' ? '1px solid #333' : '1px solid #e5e7eb'};
  overflow: hidden;
  
  /* Mobile enhancements - maintain segmented group appearance */
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
    gap: 0;
    padding: 0;
  }
  
  @media (max-width: 480px) {
    flex-direction: row;
    gap: 0;
    padding: 0;
    border-radius: 8px;
    overflow-x: visible;
    overflow-y: visible;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; $last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1.4px 1.4px 4px rgba(0,0,0,0.3)' : '1.4px 1.4px 4px rgba(0,0,0,0.1)'};
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#ffffff'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#374151'};
  padding: 0 2.2em 0 0.84em;
  border-right: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
  &:last-child { border-right: none; }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ $last }) => $last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:not(:first-child) {
    border-left: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => theme.BG === '#252525' 
    ? `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23374151' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  
  /* Mobile enhancements - maintain segmented group appearance */
  @media (max-width: 768px) {
    width: 100%;
    border-radius: 0;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
    margin: 0;
    box-shadow: none;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    border-radius: 0;
    margin: 0;
    border: none;
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#ffffff'};
    box-shadow: none;
  }
`;

// Professional Analytics Cards
const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  padding: 8px 0 10px 0;
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.2rem;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const AnalyticsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 2.5px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    padding: 1.2rem 1.2rem 1rem 1.2rem;
    border-radius: 12px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardValue = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  line-height: 1;
`;

const CardSubtitle = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0.5rem 0 0 0;
`;

const MetricCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 2px solid ${({ $color, theme }) => $color || theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const MetricValue = styled.div<{ $color?: string }>`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ $color, theme }) => $color || theme.ACCENT};
  margin: 0.5rem 0;
  line-height: 1;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
`;

const ProgressFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 2px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.SHADOW};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.FIELD_BG};
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:hover {
    background: ${({ theme }) => theme.FIELD_BG};
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const NoResults = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  background: ${({ theme }) => theme.CARD};
  border: 2px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.SHADOW};
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  
  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid ${({ theme }) => theme.FIELD_BG};
    border-top: 3px solid ${({ theme }) => theme.ACCENT};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ToTopButton = styled.button`
  position: fixed;
  right: 18px;
  bottom: 24px;
  z-index: 3000;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px #0005;
  font-size: 2rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.13s;
  opacity: 0.92;
  &:hover {
    background: #4f46e5;
    box-shadow: 0 8px 32px #6366f155;
    transform: scale(1.08);
  }
  @media (min-width: 701px) {
    display: none;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: ${({ variant, theme }) => {
    if (variant === 'primary') {
      return '#4a6cf7';
    } else {
      return theme.BG === '#252525' ? '#333' : '#f3f4f6';
    }
  }};
  color: ${({ variant, theme }) => {
    if (variant === 'primary') {
      return 'white';
    } else {
      return theme.TEXT_PRIMARY;
    }
  }};
  border: 1px solid ${({ variant, theme }) => {
    if (variant === 'primary') {
      return '#4a6cf7';
    } else {
      return theme.BORDER;
    }
  }};

  &:hover {
    background: ${({ variant, theme }) => {
      if (variant === 'primary') {
        return '#3a5ce5';
      } else {
        return theme.BG === '#252525' ? '#444' : '#e5e7eb';
      }
    }};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// Analytics Data Types
interface AnalyticsData {
  totalStudents: number;
  appearedStudents: number;
  passedStudents: number;
  failedStudents: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  passPercentage: number;
  topPerformers: Array<{
    student_id: number;
    student_name: string;
    father_name?: string;
    class_name: string;
    section_name?: string;
    percentage: number;
    obtained_marks: number;
    total_marks: number;
    grade: string;
    position: number;
    rank_in_class: number;
    status: string;
  }>;
  lowestScorer?: {
    student_id: number;
    student_name: string;
    father_name?: string;
    class_name: string;
    section_name?: string;
    percentage: number;
    obtained_marks: number;
    total_marks: number;
    grade: string;
    status: string;
  };
  failedStudentsList: Array<{
    student_id: number;
    student_name: string;
    father_name?: string;
    class_name: string;
    section_name?: string;
    percentage: number;
    obtained_marks: number;
    total_marks: number;
    grade: string;
    position: number;
    rank_in_class: number;
    status: string;
  }>;
  subjectPerformance: Array<{
    subject_name: string;
    average_percentage: number;
    pass_percentage: number;
    total_students: number;
  }>;
  classPerformance: Array<{
    class_name: string;
    average_percentage: number;
    pass_percentage: number;
    total_students: number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
}

const ExaminationAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme } = useContext(ThemeContext);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showToTop, setShowToTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadExaminations();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (selectedExam) {
      loadAnalytics();
    }
  }, [selectedExam]);

  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        setShowToTop(mainContentRef.current.scrollTop > 300);
      }
    };

    const contentElement = mainContentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const loadExaminations = async () => {
    try {
      setLoading(true);
      const data = await examinationService.getExaminations({}, user?.school_id);
      setExaminations(data);
    } catch (error) {
      console.error('Error loading examinations:', error);
      showToast('Failed to load examinations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedExam || !user?.school_id) return;

    try {
      setAnalyticsLoading(true);
      const analyticsData = await getAnalyticsData(selectedExam.id, user.school_id);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Failed to load analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

        const getAnalyticsData = async (examId: number, schoolId: number): Promise<AnalyticsData> => {
          // First, get the examination details to get the passing percentage
          const { data: examDetails, error: examDetailsError } = await supabase
            .from('examinations')
            .select('passing_marks')
            .eq('id', examId)
            .eq('school_id', schoolId)
            .single();

          if (examDetailsError) throw examDetailsError;
          
          const passingPercentage = examDetails?.passing_marks || 33; // Default to 33% if not set

          // Get all exam results for this exam (similar to MasterSheetManager)
          const { data: examResults, error: examError } = await supabase
            .from('exam_results')
            .select(`
              student_id,
              obtained_marks,
              max_marks,
              percentage,
              grade,
              remarks,
              subject_id,
              subjects!inner(name, short_name)
            `)
            .eq('exam_id', examId)
            .eq('school_id', schoolId);

          if (examError) throw examError;
          

    // Get total active students in school (not just enrolled, but active during exam period)
    const { data: totalStudents, error: totalError } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    if (totalError) throw totalError;

    // Group results by student to calculate overall performance
    const studentResults: { [studentId: number]: any[] } = {};
    examResults?.forEach(result => {
      if (!studentResults[result.student_id]) {
        studentResults[result.student_id] = [];
      }
      studentResults[result.student_id].push(result);
    });

    // Get student details for those who appeared
    const studentIds = Object.keys(studentResults).map(id => parseInt(id));
    let studentDetails: any[] = [];
    
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          class_id,
          section_id,
          school_id
        `)
        .in('id', studentIds)
        .eq('school_id', schoolId);

      if (studentsError) throw studentsError;
      studentDetails = students || [];
    }

    // Get class details with has_sections
    const classIds = Array.from(new Set(studentDetails.map(s => s.class_id)));
    let classDetails: any[] = [];
    
    if (classIds.length > 0) {
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .in('id', classIds);

      if (classesError) throw classesError;
      
      // Sort classes: numbered classes first, then special classes (Play Group, Nursery, K.G)
      const sortedClasses = sortClasses(classes || []);
      
      classDetails = sortedClasses;
    }

    // Get section details for classes that have sections
    const sectionIds = Array.from(new Set(studentDetails.map(s => s.section_id).filter(Boolean)));
    let sectionDetails: any[] = [];
    
    if (sectionIds.length > 0) {
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .in('class_id', classIds);

      if (sectionsError) throw sectionsError;
      sectionDetails = sections || [];
    }

    // Create lookup maps for efficient access
    const classMap = new Map(classDetails.map(c => [c.id, c]));
    const sectionMap = new Map(sectionDetails.map(s => [s.id, s]));
    
    // Helper function to get section name based on has_sections
    const getSectionName = (classId: number, sectionId: number | null): string => {
      if (!sectionId) return '';
      const classInfo = classMap.get(classId);
      const hasSections = classInfo?.has_sections ?? true;
      if (!hasSections) return '';
      return sectionMap.get(sectionId)?.name || '';
    };

    // Calculate overall performance for each student
    const combinedData: any[] = studentDetails.map(student => {
      const results = studentResults[student.id] || [];
      const totalMarks = results.reduce((sum, r) => sum + (r.max_marks || 0), 0);
      const obtainedMarks = results.reduce((sum, r) => sum + (r.obtained_marks || 0), 0);
      const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      
      
      // Calculate grade based on overall percentage (same logic as DetailedMarksCertificate)
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      
            // Determine status using the actual passing percentage from examination
            let status = 'pass';
            if (results.some(r => r.remarks === 'Absent')) {
              status = 'absent';
            } else if (percentage < passingPercentage) {
              status = 'fail';
            }
      
      const classInfo = classMap.get(student.class_id);
      
      return {
        student_id: student.id,
        student_name: student.name,
        father_name: student.father_name,
        class_name: classInfo?.name || 'Unknown',
        section_name: getSectionName(student.class_id, student.section_id),
        class_id: student.class_id,
        total_marks: totalMarks,
        obtained_marks: obtainedMarks,
        percentage: percentage,
        grade: grade,
        status: status,
        position: 0, // Will be calculated later
        rank_in_class: 0 // Will be calculated later
      };
    });

          // Calculate analytics using the actual passing percentage
          const appearedStudents = combinedData.length;
          const totalStudentsCount = totalStudents?.length || 0;
          const passedStudents = combinedData.filter(s => s.percentage >= passingPercentage).length;
          const failedStudents = appearedStudents - passedStudents;
    const averagePercentage = combinedData.reduce((sum, s) => sum + s.percentage, 0) / appearedStudents || 0;
    const highestPercentage = Math.max(...(combinedData.map(s => s.percentage) || [0]));
    const lowestPercentage = Math.min(...(combinedData.map(s => s.percentage) || [0]));
    const passPercentage = appearedStudents > 0 ? (passedStudents / appearedStudents) * 100 : 0;
    

    // Calculate positions and ranks
    const sortedByPercentage = [...combinedData].sort((a, b) => b.percentage - a.percentage);
    
    // Assign positions with proper handling of ties
    let currentPosition = 1;
    for (let i = 0; i < sortedByPercentage.length; i++) {
      const student = sortedByPercentage[i];
      const currentPercentage = student.percentage;
      
      // Count how many students have the same percentage as current student
      let samePercentageCount = 1;
      for (let j = i + 1; j < sortedByPercentage.length; j++) {
        if (sortedByPercentage[j].percentage === currentPercentage) {
          samePercentageCount++;
        } else {
          break;
        }
      }
      
      // Assign the same position to all students with same percentage
      for (let k = 0; k < samePercentageCount; k++) {
        sortedByPercentage[i + k].position = currentPosition;
        sortedByPercentage[i + k].rank_in_class = currentPosition;
      }
      
      // Move to next position (skip the tied students and increment by 1)
      i += samePercentageCount - 1;
      currentPosition = currentPosition + 1;
    }

    // Top performers with detailed information
    const topPerformers = sortedByPercentage
      .slice(0, 15) // Show top 15 performers
      .map((student, index) => ({
        student_id: student.student_id,
        student_name: student.student_name,
        father_name: student.father_name,
        class_name: student.class_name,
        section_name: student.section_name,
        percentage: student.percentage,
        obtained_marks: student.obtained_marks,
        total_marks: student.total_marks,
        grade: student.grade,
        position: student.position,
        rank_in_class: student.rank_in_class,
        status: student.status
      }));

    // Find the actual lowest scorer from all students
    const lowestScorer = sortedByPercentage.length > 0 
      ? sortedByPercentage[sortedByPercentage.length - 1] 
      : null;

    // Get all failed students (below passing percentage)
    const failedStudentsList = sortedByPercentage
      .filter(student => student.status === 'fail')
      .map(student => ({
        student_id: student.student_id,
        student_name: student.student_name,
        father_name: student.father_name,
        class_name: student.class_name,
        section_name: student.section_name,
        percentage: student.percentage,
        obtained_marks: student.obtained_marks,
        total_marks: student.total_marks,
        grade: student.grade,
        position: student.position,
        rank_in_class: student.rank_in_class,
        status: student.status
      }));

    // Subject-wise performance
    const subjectPerformance = await getSubjectPerformance(examId, schoolId);

    // Class-wise performance
    const classPerformance = getClassPerformanceFromData(combinedData);

    // Grade distribution
    const gradeDistribution = getGradeDistribution(combinedData);

    return {
      totalStudents: totalStudentsCount,
      appearedStudents,
      passedStudents,
      failedStudents,
      averagePercentage,
      highestPercentage,
      lowestPercentage,
      passPercentage,
      topPerformers,
      lowestScorer: lowestScorer ? {
        student_id: lowestScorer.student_id,
        student_name: lowestScorer.student_name,
        father_name: lowestScorer.father_name,
        class_name: lowestScorer.class_name,
        section_name: lowestScorer.section_name,
        percentage: lowestScorer.percentage,
        obtained_marks: lowestScorer.obtained_marks,
        total_marks: lowestScorer.total_marks,
        grade: lowestScorer.grade,
        status: lowestScorer.status
      } : undefined,
      failedStudentsList,
      subjectPerformance,
      classPerformance,
      gradeDistribution
    };
  };

  const getSubjectPerformance = async (examId: number, schoolId: number) => {
    // Get exam results with subject information (similar to MasterSheetManager)
    const { data: examResults, error: resultsError } = await supabase
      .from('exam_results')
      .select(`
        student_id,
        obtained_marks,
        max_marks,
        percentage,
        grade,
        subject_id,
        subjects!inner(name, short_name)
      `)
      .eq('exam_id', examId)
      .eq('school_id', schoolId);

    if (resultsError) throw resultsError;

    // Get student details to filter by school
    const studentIds = examResults?.map(s => s.student_id) || [];
    let studentDetails: any[] = [];
    
    if (studentIds.length > 0) {
      const { data: students, error: studentDetailsError } = await supabase
        .from('students')
        .select('id, school_id')
        .in('id', studentIds)
        .eq('school_id', schoolId);

      if (studentDetailsError) throw studentDetailsError;
      studentDetails = students || [];
    }

    // Filter exam results by school
    const schoolStudentIds = studentDetails.map(s => s.id);
    const filteredExamResults = examResults?.filter(s => schoolStudentIds.includes(s.student_id)) || [];

    // Group results by subject
    const subjectMap = new Map();
    filteredExamResults.forEach(result => {
      const subjectName = (result.subjects as any)?.name || 'Unknown';
      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, []);
      }
      subjectMap.get(subjectName).push(result);
    });

    // Calculate performance for each subject and sort them
    const subjectPerformance = Array.from(subjectMap.entries()).map(([subjectName, results]: [string, any[]]) => {
      const averagePercentage = results.reduce((sum, r) => sum + r.percentage, 0) / results.length || 0;
      const passPercentage = (results.filter(r => r.percentage >= 33).length / results.length) * 100 || 0;
      
      return {
        subject_name: subjectName,
        average_percentage: averagePercentage,
        pass_percentage: passPercentage,
        total_students: results.length
      };
    });

    // Sort subjects using the same logic as DetailedMarksCertificate
    return subjectPerformance.sort((a, b) => {
      const orderA = getSubjectOrder(a.subject_name);
      const orderB = getSubjectOrder(b.subject_name);
      return orderA - orderB;
    });
  };

  const getClassPerformanceFromData = (combinedData: any[]) => {
    const classMap = new Map();
    
    combinedData.forEach(student => {
      const className = student.class_name;
      if (!classMap.has(className)) {
        classMap.set(className, []);
      }
      classMap.get(className).push(student.percentage);
    });

    const classPerformance = Array.from(classMap.entries()).map(([className, percentages]: [string, number[]]) => {
      const averagePercentage = percentages.reduce((sum: number, p: number) => sum + p, 0) / percentages.length;
      const passPercentage = (percentages.filter((p: number) => p >= 33).length / percentages.length) * 100;
      
      return {
        class_name: className,
        average_percentage: averagePercentage,
        pass_percentage: passPercentage,
        total_students: percentages.length
      };
    });

    // Sort classes numerically (1st, 2nd, 3rd, etc.)
    return classPerformance.sort((a, b) => {
      const numA = parseInt(a.class_name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.class_name.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  };

  const getGradeDistribution = (students: any[]) => {
    const gradeMap = new Map();
    students.forEach((student: any) => {
      // Calculate grade based on percentage (same logic as DetailedMarksCertificate)
      const percentage = student.percentage;
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
    });

    const total = students.length;
    const gradeData = Array.from(gradeMap.entries()).map(([grade, count]: [string, number]) => ({
      grade,
      count,
      percentage: (count / total) * 100
    }));

    // Define the exact order we want
    const gradeOrder = ['A+', 'A', 'B', 'C', 'D', 'F'];
    
    // Sort by the predefined order
    return gradeData.sort((a, b) => {
      const indexA = gradeOrder.indexOf(a.grade);
      const indexB = gradeOrder.indexOf(b.grade);
      return indexA - indexB;
    });
  };

  const scrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generateAnalyticsPDF = async () => {
    if (!analytics || !selectedExam) return;

    setExportLoading(true);
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        showToast('Generating PDF for mobile... Please wait.', 'success');
      }
      // Fetch institute name from database
      let instituteName = 'School Analytics';
      if (user?.school_id) {
        const { data: instituteProfile } = await supabase
          .from('institute_profile')
          .select('name')
          .eq('school_id', user.school_id)
          .single();
        
        if (instituteProfile?.name) {
          instituteName = instituteProfile.name;
        }
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Helper function to format date
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      // Header
      doc.setFillColor(74, 108, 247);
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('EXAMINATION ANALYTICS REPORT', pageWidth / 2, 10, { align: 'center' });
      
      // Add institute name from database
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(instituteName, pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${formatDate(new Date())}`, pageWidth / 2, 22, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      let yPosition = 35;

      // Examination Details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EXAMINATION DETAILS', 15, yPosition);
      
      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Examination: ${selectedExam.name}`, 15, yPosition);
      doc.text(`Type: ${selectedExam.exam_type}`, 15, yPosition + 5);
      doc.text(`Start Date: ${formatDate(new Date(selectedExam.start_date))}`, 15, yPosition + 10);
      if (selectedExam.end_date) {
        doc.text(`End Date: ${formatDate(new Date(selectedExam.end_date))}`, 15, yPosition + 15);
        yPosition += 20;
      } else {
        yPosition += 15;
      }

      // Key Metrics Table
      yPosition += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('KEY METRICS', 15, yPosition);
      
      yPosition += 8;
      const metricsData = [
        ['Metric', 'Count', 'Percentage'],
        ['Total Students', analytics.totalStudents.toString(), '100%'],
        ['Appeared Students', analytics.appearedStudents.toString(), `${((analytics.appearedStudents / analytics.totalStudents) * 100).toFixed(1)}%`],
        ['Passed Students', analytics.passedStudents.toString(), `${analytics.passPercentage.toFixed(1)}%`],
        ['Failed Students', analytics.failedStudents.toString(), `${((analytics.failedStudents / analytics.appearedStudents) * 100).toFixed(1)}%`],
        ['Average Percentage', `${analytics.averagePercentage.toFixed(1)}%`, 'Overall Performance'],
        ['Highest Score', `${analytics.highestPercentage.toFixed(1)}%`, 'Best Performer'],
        ['Lowest Score', `${analytics.lowestPercentage.toFixed(1)}%`, 'Needs Improvement']
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [metricsData[0]],
        body: metricsData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [74, 108, 247], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'center' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Grade Distribution
      if (analytics.gradeDistribution.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('GRADE DISTRIBUTION', 15, yPosition);
        
        yPosition += 8;
        const gradeData = analytics.gradeDistribution.map(grade => [
          `Grade ${grade.grade}`,
          grade.count.toString(),
          `${grade.percentage.toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Grade', 'Count', 'Percentage']],
          body: gradeData,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center' },
            2: { halign: 'center' }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Top Performers
      if (analytics.topPerformers.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP PERFORMERS', 15, yPosition);
        
        yPosition += 8;
        const topPerformersData = analytics.topPerformers.slice(0, 10).map(performer => [
          performer.position.toString(),
          performer.student_name,
          performer.father_name || 'N/A',
          performer.section_name ? `${performer.class_name} (${performer.section_name})` : performer.class_name,
          `${performer.obtained_marks.toFixed(0)}/${performer.total_marks.toFixed(0)}`,
          `${performer.percentage.toFixed(1)}%`,
          performer.grade
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Rank', 'Student Name', 'Father Name', 'Class (Section)', 'Marks', 'Percentage', 'Grade']],
          body: topPerformersData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 7, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 40, halign: 'left' },
            2: { cellWidth: 35, halign: 'left' },
            3: { cellWidth: 30, halign: 'left' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 15, halign: 'center' }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Failed Students
      if (analytics.failedStudentsList.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('FAILED STUDENTS', 15, yPosition);
        
        yPosition += 8;
        // Sort failed students by class name numerically
        const sortedFailedStudents = [...analytics.failedStudentsList].sort((a, b) => {
          const numA = parseInt(a.class_name.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.class_name.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

        const failedStudentsData = sortedFailedStudents.map((student, index) => [
          (index + 1).toString(),
          student.student_name,
          student.father_name || 'N/A',
          student.section_name ? `${student.class_name} (${student.section_name})` : student.class_name,
          `${student.obtained_marks.toFixed(0)}/${student.total_marks.toFixed(0)}`,
          `${student.percentage.toFixed(1)}%`,
          student.grade
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['S.No', 'Student Name', 'Father Name', 'Class (Section)', 'Marks', 'Percentage', 'Grade']],
          body: failedStudentsData,
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 7, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 40, halign: 'left' },
            2: { cellWidth: 35, halign: 'left' },
            3: { cellWidth: 30, halign: 'left' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 15, halign: 'center' }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Subject Performance
      if (analytics.subjectPerformance.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('SUBJECT-WISE PERFORMANCE', 15, yPosition);
        
        yPosition += 8;
        const subjectData = analytics.subjectPerformance.map(subject => [
          subject.subject_name,
          `${subject.average_percentage.toFixed(1)}%`,
          `${subject.pass_percentage.toFixed(1)}%`,
          subject.total_students.toString()
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Subject', 'Average %', 'Pass Rate', 'Students']],
          body: subjectData,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Class Performance
      if (analytics.classPerformance.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('CLASS-WISE PERFORMANCE', 15, yPosition);
        
        yPosition += 8;
        const classData = analytics.classPerformance.map(classPerf => [
          classPerf.class_name,
          `${classPerf.average_percentage.toFixed(1)}%`,
          `${classPerf.pass_percentage.toFixed(1)}%`,
          classPerf.total_students.toString()
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Class', 'Average %', 'Pass Rate', 'Students']],
          body: classData,
          theme: 'grid',
          headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' }
          }
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
      }

      // Save the PDF with mobile-friendly approach
      const fileName = `ExaminationAnalytics_${selectedExam?.name}_${new Date().toLocaleDateString('en-GB')}.pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `examination-analytics-${timestamp}.pdf`;

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
              showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
              
              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              console.error('Filesystem error:', fsError);
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
              showToast('PDF downloaded successfully!', 'success');
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
                <p style="margin: 0 0 15px 0; color: #666;">Examination Analytics Report</p>
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
              
              showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');
              
            } catch (webError) {
              console.error('Web download failed, trying data URI method:', webError);
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Examination Analytics PDF</title>
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
                          <h2>📄 Examination Analytics PDF Generated</h2>
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
                showToast(`PDF opened in new tab. Use the download button in the new tab.`, 'success');
              } else {
                showToast('Please allow popups for this site to download the PDF', 'error');
              }
            }
          }
        } catch (error) {
          console.error('Mobile PDF export error:', error);
          showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        showToast('Analytics PDF generated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>
          <AnalyticsIcon style={{ fontSize: 20 }} />
          Examination Analytics
        </Title>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={loadAnalytics}
            disabled={!selectedExam || analyticsLoading}
            style={{
              background: 'none',
              border: 'none',
              color: theme === 'dark' ? '#e2e8f0' : '#374151',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              opacity: (!selectedExam || analyticsLoading) ? 0.5 : 1,
              pointerEvents: (!selectedExam || analyticsLoading) ? 'none' : 'auto'
            }}
            onMouseEnter={(e) => {
              if (selectedExam && !analyticsLoading) {
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
            title={analyticsLoading ? 'Loading...' : 'Refresh Analytics'}
          >
            <RefreshIcon 
              style={{ 
                fontSize: 20,
                animation: analyticsLoading ? 'spin 1s linear infinite' : 'none'
              }} 
            />
          </button>
          <button
            onClick={generateAnalyticsPDF}
            disabled={!selectedExam || !analytics || analyticsLoading || exportLoading}
            style={{
              background: 'none',
              border: 'none',
              color: theme === 'dark' ? '#e2e8f0' : '#374151',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              opacity: (!selectedExam || !analytics || analyticsLoading || exportLoading) ? 0.5 : 1,
              pointerEvents: (!selectedExam || !analytics || analyticsLoading || exportLoading) ? 'none' : 'auto'
            }}
            onMouseEnter={(e) => {
              if (selectedExam && analytics && !analyticsLoading && !exportLoading) {
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
            title={!analytics ? 'Generate Analytics PDF' : 'Export Analytics PDF'}
          >
            {exportLoading ? (
              <div style={{ 
                width: 20, 
                height: 20, 
                border: '2px solid #e0e7ff', 
                borderTop: '2px solid #4a6cf7', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }} />
            ) : (
              <PictureAsPdf style={{ fontSize: 20 }} />
            )}
          </button>
        </div>
        <DesktopSegmentedGroup>
          <SegmentedGroup>
            <SegmentedSelect
              value={selectedExam?.id || ''}
              onChange={(e) => {
                const exam = examinations.find(ex => ex.id === Number(e.target.value));
                setSelectedExam(exam || null);
              }}
              first
              $last={true}
            >
              <option value="">Select Examination</option>
              {examinations.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.exam_type.replace('_', ' ').toUpperCase()})
                </option>
              ))}
            </SegmentedSelect>
          </SegmentedGroup>
        </DesktopSegmentedGroup>
        
        <HeaderBottomRow>
          <MobileHeaderLayout>
            <MobileRow>
              <SegmentedGroup>
                <SegmentedSelect
                  value={selectedExam?.id || ''}
                  onChange={(e) => {
                    const exam = examinations.find(ex => ex.id === Number(e.target.value));
                    setSelectedExam(exam || null);
                  }}
                  style={{ flex: '1', minWidth: 0 }}
                  first
                  $last
                >
                  <option value="">Select Examination</option>
                  {examinations.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.exam_type.replace('_', ' ').toUpperCase()})
                    </option>
                  ))}
                </SegmentedSelect>
              </SegmentedGroup>
            </MobileRow>
          </MobileHeaderLayout>
        </HeaderBottomRow>
      </Header>

      <MainContent ref={mainContentRef}>
        {/* Analytics Loading */}
        {analyticsLoading && (
          <LoadingSpinner />
        )}

        {/* Analytics Content */}
        {selectedExam && analytics && !analyticsLoading && (
          <>
            {/* Key Metrics */}
            <AnalyticsGrid>
              <AnalyticsCard>
                <CardHeader>
                  <CardTitle>
                    <SchoolIcon style={{ fontSize: 20, color: '#10b981' }} />
                    Appeared
                  </CardTitle>
                </CardHeader>
                <CardValue>{analytics.appearedStudents}</CardValue>
                <CardSubtitle>
                  {analytics.totalStudents > 0 
                    ? `${((analytics.appearedStudents / analytics.totalStudents) * 100).toFixed(1)}% of total students`
                    : 'No students enrolled'
                  }
                </CardSubtitle>
              </AnalyticsCard>

              <AnalyticsCard>
                <CardHeader>
                  <CardTitle>
                    <TrendingUpIcon style={{ fontSize: 20, color: '#10b981' }} />
                    Passed
                  </CardTitle>
                </CardHeader>
                <CardValue>{analytics.passedStudents}</CardValue>
                <CardSubtitle>
                  {analytics.appearedStudents > 0 
                    ? `${analytics.passPercentage.toFixed(1)}% pass rate`
                    : 'No students appeared'
                  }
                </CardSubtitle>
              </AnalyticsCard>

              <AnalyticsCard>
                <CardHeader>
                  <CardTitle>
                    <TrendingDownIcon style={{ fontSize: 20, color: '#ef4444' }} />
                    Failed
                  </CardTitle>
                </CardHeader>
                <CardValue>{analytics.failedStudents}</CardValue>
                <CardSubtitle>
                  {analytics.appearedStudents > 0 
                    ? `${((analytics.failedStudents / analytics.appearedStudents) * 100).toFixed(1)}% fail rate`
                    : 'No students appeared'
                  }
                </CardSubtitle>
              </AnalyticsCard>
            </AnalyticsGrid>

            {/* Performance Metrics */}
            <AnalyticsGrid>
              <AnalyticsCard>
                <CardHeader>
                  <CardTitle>
                    <BarChartIcon style={{ fontSize: 20, color: '#3b82f6' }} />
                    Average Percentage
                  </CardTitle>
                </CardHeader>
                <CardValue>{analytics.averagePercentage.toFixed(1)}%</CardValue>
                <CardSubtitle>Overall performance</CardSubtitle>
              </AnalyticsCard>

                    <AnalyticsCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <CardHeader>
                          <CardTitle>
                            <TrophyIcon style={{ fontSize: 20, color: '#10b981' }} />
                            Highest Score
                          </CardTitle>
                        </CardHeader>
                        <CardValue>{analytics.highestPercentage.toFixed(1)}%</CardValue>
                        <CardSubtitle>Best performer</CardSubtitle>
                      </div>
                      {analytics.topPerformers.length > 0 && analytics.topPerformers[0].percentage === analytics.highestPercentage && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end',
                          gap: '6px',
                          padding: '12px 16px',
                          background: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                          borderRadius: '12px',
                          border: `1px solid ${theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)'}`,
                          minWidth: '140px'
                        }}>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: '0.9rem',
                            color: theme === 'dark' ? '#10b981' : '#059669',
                            textAlign: 'right'
                          }}>
                            {analytics.topPerformers[0].student_name}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: theme === 'dark' ? '#a1a1aa' : '#6b7280',
                            textAlign: 'right'
                          }}>
                            {analytics.topPerformers[0].section_name 
                              ? `${analytics.topPerformers[0].class_name} (${analytics.topPerformers[0].section_name})`
                              : analytics.topPerformers[0].class_name
                            }
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: theme === 'dark' ? '#71717a' : '#6b7280',
                            textAlign: 'right',
                            fontWeight: 500
                          }}>
                            {analytics.topPerformers[0].obtained_marks.toFixed(0)}/{analytics.topPerformers[0].total_marks.toFixed(0)} marks
                          </div>
                        </div>
                      )}
                    </AnalyticsCard>

                    <AnalyticsCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <CardHeader>
                          <CardTitle>
                            <TrendingDownIcon style={{ fontSize: 20, color: '#ef4444' }} />
                            Lowest Score
                          </CardTitle>
                        </CardHeader>
                        <CardValue>{analytics.lowestPercentage.toFixed(1)}%</CardValue>
                        <CardSubtitle>Needs improvement</CardSubtitle>
                      </div>
                      {analytics.lowestScorer && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end',
                          gap: '6px',
                          padding: '12px 16px',
                          background: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                          borderRadius: '12px',
                          border: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`,
                          minWidth: '140px'
                        }}>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: '0.9rem',
                            color: theme === 'dark' ? '#ef4444' : '#dc2626',
                            textAlign: 'right'
                          }}>
                            {analytics.lowestScorer.student_name}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: theme === 'dark' ? '#a1a1aa' : '#6b7280',
                            textAlign: 'right'
                          }}>
                            {analytics.lowestScorer.section_name 
                              ? `${analytics.lowestScorer.class_name} (${analytics.lowestScorer.section_name})`
                              : analytics.lowestScorer.class_name
                            }
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: theme === 'dark' ? '#71717a' : '#6b7280',
                            textAlign: 'right',
                            fontWeight: 500
                          }}>
                            {analytics.lowestScorer.obtained_marks.toFixed(0)}/{analytics.lowestScorer.total_marks.toFixed(0)} marks
                          </div>
                        </div>
                      )}
                    </AnalyticsCard>
            </AnalyticsGrid>

                  {/* Grade Distribution */}
                  {analytics.gradeDistribution.length > 0 && (
                    <AnalyticsGrid>
                      <AnalyticsCard style={{ gridColumn: '1 / -1' }}>
                        <CardTitle>
                          <GradeIcon style={{ fontSize: 20, color: '#8b5cf6' }} />
                          Grade Distribution
                        </CardTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          {analytics.gradeDistribution.map((grade, index) => (
                            <MetricCard key={grade.grade} $color={grade.grade.includes('A') ? '#10b981' : grade.grade.includes('B') ? '#3b82f6' : grade.grade.includes('C') ? '#f59e0b' : '#ef4444'} style={{ position: 'relative' }}>
                              {/* Large Grade Text in Top Right Corner */}
                              <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '16px',
                                fontSize: '5rem',
                                fontWeight: '900',
                                color: grade.grade.includes('A') ? 'rgba(16, 185, 129, 0.15)' : 
                                       grade.grade.includes('B') ? 'rgba(59, 130, 246, 0.15)' : 
                                       grade.grade.includes('C') ? 'rgba(245, 158, 11, 0.15)' : 
                                       'rgba(239, 68, 68, 0.15)',
                                lineHeight: '1',
                                zIndex: 1,
                                pointerEvents: 'none',
                                userSelect: 'none'
                              }}>
                                {grade.grade === 'A+' ? (
                                  <>
                                    A<span style={{ fontSize: '2.5rem', verticalAlign: 'top' }}>+</span>
                                  </>
                                ) : (
                                  grade.grade
                                )}
                              </div>
                              
                              <MetricLabel style={{ position: 'relative', zIndex: 2 }}>
                                <GradeIcon style={{ fontSize: 16 }} />
                                Grade {grade.grade}
                              </MetricLabel>
                              <MetricValue $color={grade.grade.includes('A') ? '#10b981' : grade.grade.includes('B') ? '#3b82f6' : grade.grade.includes('C') ? '#f59e0b' : '#ef4444'} style={{ position: 'relative', zIndex: 2 }}>
                                {grade.count}
                              </MetricValue>
                              <div style={{ fontSize: '0.8rem', color: theme === 'dark' ? '#71717a' : '#6b7280', position: 'relative', zIndex: 2 }}>
                                {grade.percentage.toFixed(1)}% of students
                              </div>
                              <ProgressBar style={{ position: 'relative', zIndex: 2 }}>
                                <ProgressFill 
                                  $width={grade.percentage} 
                                  $color={grade.grade.includes('A') ? '#10b981' : grade.grade.includes('B') ? '#3b82f6' : grade.grade.includes('C') ? '#f59e0b' : '#ef4444'}
                                />
                              </ProgressBar>
                            </MetricCard>
                          ))}
                        </div>
                      </AnalyticsCard>
                    </AnalyticsGrid>
                  )}

                  {/* Top Performers */}
                  {analytics.topPerformers.length > 0 && (
                    <TableContainer>
                      <div style={{ padding: '1.5rem', borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#e5e7eb'}` }}>
                        <CardTitle>
                          <TrophyIcon style={{ fontSize: 20, color: '#f59e0b' }} />
                          Top Performers
                        </CardTitle>
                      </div>
                      <Table>
                        <TableHeader>
                          <tr>
                            <TableHeaderCell>Rank</TableHeaderCell>
                            <TableHeaderCell>Student Name</TableHeaderCell>
                            <TableHeaderCell>Father Name</TableHeaderCell>
                            <TableHeaderCell>Class</TableHeaderCell>
                            <TableHeaderCell>Section</TableHeaderCell>
                            <TableHeaderCell>Marks</TableHeaderCell>
                            <TableHeaderCell>Percentage</TableHeaderCell>
                            <TableHeaderCell>Grade</TableHeaderCell>
                            <TableHeaderCell>Status</TableHeaderCell>
                          </tr>
                        </TableHeader>
                        <TableBody>
                          {analytics.topPerformers.map((performer, index) => (
                            <TableRow key={performer.student_id}>
                              <TableCell style={{ fontWeight: 700, color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {performer.position <= 3 && (
                                    <TrophyIcon style={{ 
                                      fontSize: 16, 
                                      color: performer.position === 1 ? '#ffd700' : 
                                             performer.position === 2 ? '#c0c0c0' : '#cd7f32' 
                                    }} />
                                  )}
                                  {performer.position}
                                </div>
                              </TableCell>
                              <TableCell style={{ fontWeight: 600 }}>
                                {performer.student_name}
                              </TableCell>
                              <TableCell style={{ color: theme === 'dark' ? '#a1a1aa' : '#6b7280' }}>
                                {performer.father_name || 'N/A'}
                              </TableCell>
                              <TableCell style={{ fontWeight: 500 }}>
                                {performer.class_name}
                              </TableCell>
                              <TableCell style={{ color: theme === 'dark' ? '#a1a1aa' : '#6b7280' }}>
                                {performer.section_name || ''}
                              </TableCell>
                              <TableCell>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {performer.obtained_marks.toFixed(0)}/{performer.total_marks.toFixed(0)}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: theme === 'dark' ? '#a1a1aa' : '#6b7280' }}>
                                    Marks
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span style={{
                                  color: performer.percentage >= 90 ? '#10b981' :
                                         performer.percentage >= 80 ? '#3b82f6' :
                                         performer.percentage >= 70 ? '#f59e0b' :
                                         '#ef4444',
                                  fontWeight: 700,
                                  fontSize: '1rem'
                                }}>
                                  {performer.percentage.toFixed(1)}%
                                </span>
                              </TableCell>
                              <TableCell>
                                <span style={{
                                  display: 'inline-flex',
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  background: performer.grade?.includes('A') ? '#dcfce7' :
                                             performer.grade?.includes('B') ? '#dbeafe' :
                                             performer.grade?.includes('C') ? '#fef3c7' :
                                             '#f3f4f6',
                                  color: performer.grade?.includes('A') ? '#166534' :
                                         performer.grade?.includes('B') ? '#1e40af' :
                                         performer.grade?.includes('C') ? '#92400e' :
                                         '#6b7280'
                                }}>
                                  {performer.grade}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span style={{
                                  display: 'inline-flex',
                                  padding: '4px 8px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  borderRadius: '8px',
                                  textTransform: 'uppercase',
                                  background: performer.status === 'pass' ? '#dcfce7' :
                                             performer.status === 'fail' ? '#fef2f2' :
                                             '#f3f4f6',
                                  color: performer.status === 'pass' ? '#166534' :
                                         performer.status === 'fail' ? '#dc2626' :
                                         '#6b7280'
                                }}>
                                  {performer.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

            {/* Subject Performance */}
            {analytics.subjectPerformance.length > 0 && (
              <TableContainer>
                <div style={{ padding: '1.5rem', borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#e5e7eb'}` }}>
                  <CardTitle>
                    <SubjectIcon style={{ fontSize: 20, color: '#8b5cf6' }} />
                    Subject-wise Performance
                  </CardTitle>
                </div>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHeaderCell>Subject</TableHeaderCell>
                      <TableHeaderCell>Average %</TableHeaderCell>
                      <TableHeaderCell>Pass Rate</TableHeaderCell>
                      <TableHeaderCell>Students</TableHeaderCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {analytics.subjectPerformance.map((subject, index) => (
                      <TableRow key={index}>
                        <TableCell style={{ fontWeight: 600 }}>
                          {subject.subject_name}
                        </TableCell>
                        <TableCell>
                          <span style={{
                            color: subject.average_percentage >= 80 ? '#10b981' :
                                   subject.average_percentage >= 60 ? '#3b82f6' :
                                   subject.average_percentage >= 40 ? '#f59e0b' :
                                   '#ef4444',
                            fontWeight: 700
                          }}>
                            {subject.average_percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ProgressBar>
                              <ProgressFill 
                                $width={subject.pass_percentage} 
                                $color="#10b981"
                              />
                            </ProgressBar>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              {subject.pass_percentage.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {subject.total_students}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Class Performance */}
            {analytics.classPerformance.length > 0 && (
              <TableContainer>
                <div style={{ padding: '1.5rem', borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#e5e7eb'}` }}>
                  <CardTitle>
                    <ClassIcon style={{ fontSize: 20, color: '#06b6d4' }} />
                    Class-wise Performance
                  </CardTitle>
                </div>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHeaderCell>Class</TableHeaderCell>
                      <TableHeaderCell>Average %</TableHeaderCell>
                      <TableHeaderCell>Pass Rate</TableHeaderCell>
                      <TableHeaderCell>Students</TableHeaderCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {analytics.classPerformance.map((classPerf, index) => (
                      <TableRow key={index}>
                        <TableCell style={{ fontWeight: 600 }}>
                          {classPerf.class_name}
                        </TableCell>
                        <TableCell>
                          <span style={{
                            color: classPerf.average_percentage >= 80 ? '#10b981' :
                                   classPerf.average_percentage >= 60 ? '#3b82f6' :
                                   classPerf.average_percentage >= 40 ? '#f59e0b' :
                                   '#ef4444',
                            fontWeight: 700
                          }}>
                            {classPerf.average_percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ProgressBar>
                              <ProgressFill 
                                $width={classPerf.pass_percentage} 
                                $color="#10b981"
                              />
                            </ProgressBar>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              {classPerf.pass_percentage.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {classPerf.total_students}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

                  {/* Failed Students List */}
                  {analytics.failedStudentsList.length > 0 && (
                    <TableContainer>
                      <div style={{ padding: '1.5rem', borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#e5e7eb'}` }}>
                        <CardTitle>
                          <TrendingDownIcon style={{ fontSize: 20, color: '#ef4444' }} />
                          Failed Students ({analytics.failedStudentsList.length})
                        </CardTitle>
                      </div>
                      <div style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto',
                        padding: '0'
                      }}>
                        <Table>
                          <TableHeader>
                            <tr>
                              <TableHeaderCell>S.No</TableHeaderCell>
                              <TableHeaderCell>Rank</TableHeaderCell>
                              <TableHeaderCell>Student Name</TableHeaderCell>
                              <TableHeaderCell>Father Name</TableHeaderCell>
                              <TableHeaderCell>Class</TableHeaderCell>
                              <TableHeaderCell>Section</TableHeaderCell>
                              <TableHeaderCell>Marks</TableHeaderCell>
                              <TableHeaderCell>Percentage</TableHeaderCell>
                              <TableHeaderCell>Grade</TableHeaderCell>
                            </tr>
                          </TableHeader>
                          <TableBody>
                            {analytics.failedStudentsList.map((student, index) => (
                              <TableRow key={student.student_id}>
                                <TableCell style={{ fontWeight: 600, color: theme === 'dark' ? '#a1a1aa' : '#6b7280', textAlign: 'center' }}>
                                  {index + 1}
                                </TableCell>
                                <TableCell style={{ fontWeight: 700, color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}>
                                  {student.position}
                                </TableCell>
                                <TableCell style={{ fontWeight: 600 }}>
                                  {student.student_name}
                                </TableCell>
                                <TableCell style={{ color: theme === 'dark' ? '#a1a1aa' : '#6b7280' }}>
                                  {student.father_name || 'N/A'}
                                </TableCell>
                                <TableCell style={{ fontWeight: 500 }}>
                                  {student.class_name}
                                </TableCell>
                                <TableCell style={{ color: theme === 'dark' ? '#a1a1aa' : '#6b7280' }}>
                                  {student.section_name || ''}
                                </TableCell>
                                <TableCell>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                      {student.obtained_marks.toFixed(0)}/{student.total_marks.toFixed(0)}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: theme === 'dark' ? '#a1a1aa' : '#6b7280' }}>
                                      Marks
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span style={{
                                    color: '#ef4444',
                                    fontWeight: 700,
                                    fontSize: '1rem'
                                  }}>
                                    {student.percentage.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span style={{
                                    display: 'inline-flex',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '12px',
                                    background: '#fef2f2',
                                    color: '#dc2626'
                                  }}>
                                    {student.grade}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableContainer>
                  )}
          </>
        )}

        {/* No Data Message */}
        {selectedExam && !analytics && !analyticsLoading && (
          <NoResults>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: 700, 
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b', 
              margin: '0 0 8px 0' 
            }}>No Analytics Data</h3>
            <p style={{ 
              fontSize: '0.9rem', 
              color: theme === 'dark' ? '#71717a' : '#6b7280', 
              margin: 0 
            }}>No analytics data available for the selected examination.</p>
          </NoResults>
        )}
      </MainContent>

      {/* To Top Button */}
      {showToTop && (
        <ToTopButton onClick={scrollToTop}>
          <KeyboardArrowUpIcon style={{ fontSize: 24 }} />
        </ToTopButton>
      )}
    </PageContainer>
  );
};

export default ExaminationAnalytics;
