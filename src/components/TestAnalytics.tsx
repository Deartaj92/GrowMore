import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../supabaseClient';
import { useLoading } from '../contexts/LoadingContext';
import {
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  EmojiEvents as EmojiEventsIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Refresh as RefreshIcon,
  Subject as SubjectIcon,
  Class as ClassIcon,
  Quiz as QuizIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './useToast';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 8px 0 8px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 92vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
  min-width: 150px;

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }

  option {
    background: ${({ theme }) => theme.CARD};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  margin: 16px 0;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: ${({ $active, theme }) => $active ? theme.ACCENT : theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  font-weight: ${({ $active }) => $active ? '700' : '500'};
  cursor: pointer;
  border-bottom: 3px solid ${({ $active, theme }) => $active ? theme.ACCENT : 'transparent'};
  margin-bottom: -3px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  letter-spacing: -0.2px;

  &::before {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }

  ${({ $active }) => $active && `
    &::before {
      transform: scaleX(1);
    }
  `}

  &:hover {
    color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'};
    border-radius: 8px 8px 0 0;
  }
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0 32px 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};

  svg {
    font-size: 20px;
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 4px;
`;

const StatChange = styled.div<{ $positive: boolean }>`
  font-size: 0.8rem;
  color: ${({ $positive }) => $positive ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Section = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
`;

const CompactCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.ACCENT}40;
    
    &::before {
      opacity: 1;
    }
  }
`;

const CompactCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const CompactCardTitle = styled.h4`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: -0.2px;
`;

const CompactCardValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
`;

const WeekBlock = styled.div`
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #3b82f6, #8b5cf6);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb'};
    border-color: ${({ theme }) => theme.ACCENT}40;
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    &::before {
      opacity: 1;
    }
  }
`;

const WeekHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const WeekLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const WeekCount = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const TestList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const TestTag = styled.span`
  font-size: 0.75rem;
  padding: 6px 12px;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}20, ${({ theme }) => theme.ACCENT}10);
  color: ${({ theme }) => theme.ACCENT};
  border-radius: 8px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.ACCENT}30;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}30, ${({ theme }) => theme.ACCENT}20);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${({ theme }) => theme.ACCENT}20;
  }
`;

const Grid2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`;

const Grid3Col = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -0.3px;

  svg {
    color: ${({ theme }) => theme.ACCENT};
    filter: drop-shadow(0 2px 4px ${({ theme }) => theme.ACCENT}30);
  }
`;

const TableWrapper = styled.div`
  max-height: 440px; /* 10 rows + header = 11 * 40px */
  overflow-y: auto;
  overflow-x: auto;
  border-radius: 6px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1 #1e293b' : '#6366f1 #f1f5f9'};
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  
  @media (max-width: 600px) {
    max-height: 400px;
    margin-left: -10px;
    margin-right: -10px;
    padding-left: 8px;
    padding-right: 8px;
    border-radius: 0;
  }
  
  /* Custom scrollbar for WebKit browsers */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1e293b' : '#f1f5f9'};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1' : '#6366f1'};
    border-radius: 4px;
    border: 2px solid ${({ theme }) => theme.BG === '#252525' ? '#1e293b' : '#f1f5f9'};
    min-height: 30px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#818cf8' : '#818cf8'};
  }
  
  &::-webkit-scrollbar-thumb:active {
    background: ${({ theme }) => theme.BG === '#252525' ? '#4f46e5' : '#4f46e5'};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px 8px 0 0;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)'};
    transform: scale(1.01);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 14px 12px;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.75rem;
`;

const TableCell = styled.td`
  padding: 14px 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 6px;
  overflow: hidden;
  margin-top: 4px;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const ProgressFill = styled.div<{ $percentage: number; $color: string }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background: linear-gradient(90deg, ${({ $color }) => $color}, ${({ $color }) => $color}dd);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border-radius: 6px;
  box-shadow: 0 1px 4px ${({ $color }) => $color}40;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.3;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  margin: 0;
`;

// Skeleton Loader Components
const SkeletonCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

const SkeletonLine = styled.div<{ $width?: string; $height?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '16px'};
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;
  margin-bottom: 8px;
`;

const SkeletonCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const SkeletonWeekBlock = styled.div`
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
`;

const SkeletonTag = styled.div`
  width: 80px;
  height: 24px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 6px;
  margin: 4px;
  display: inline-block;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const RefreshButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.ACCENT};
    color: white;
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

// Interfaces
interface Session {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Class {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

interface Student {
  id: number;
  name: string;
  class_id: number;
  section_id: number;
}

interface Teacher {
  id: number;
  name: string;
  staff_id: number;
}

interface StudentAnalytics {
  student_id: number;
  student_name: string;
  roll_number?: string | null;
  class_name: string;
  section_name: string;
  total_tests: number;
  total_obtained: number;
  total_max: number;
  average_percentage: number;
  grade: string;
}

interface TeacherAnalytics {
  teacher_id: number;
  teacher_name: string;
  total_tests: number;
  total_students: number;
  average_percentage: number;
  subjects: Array<{
    name: string;
    count: number;
  }>;
}

interface SubjectAnalytics {
  subject_id: number;
  subject_name: string;
  total_tests: number;
  total_students: number;
  average_percentage: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
}

interface ClassAnalytics {
  class_id: number;
  class_name: string;
  total_tests: number;
  total_students: number;
  average_percentage: number;
  pass_rate: number;
}

interface TestTypeAnalytics {
  test_type: string;
  count: number;
  average_percentage: number;
  total_students: number;
}

interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  tests: number;
  average_percentage: number;
  students: number;
}

interface TeacherMonthlyTest {
  teacher_id: number;
  teacher_name: string;
  months: Array<{
    month: string;
    monthKey: string;
    weeks: Array<{
      week: string;
      weekNumber: number;
      tests: number;
      classes: Array<{
        className: string;
        testCount: number;
      }>;
    }>;
    totalTests: number;
  }>;
  totalTests: number;
}

// Skeleton Loader Component
const TestAnalyticsSkeleton: React.FC<{ theme: any; activeTab: 'students' | 'teachers' }> = ({ theme, activeTab }) => {
  if (activeTab === 'students') {
    return (
      <>
        <SkeletonGrid>
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i}>
              <SkeletonLine $width="60%" $height="20px" />
              <SkeletonLine $width="40%" $height="32px" />
            </SkeletonCard>
          ))}
        </SkeletonGrid>
        <SkeletonCard>
          <SkeletonLine $width="40%" $height="24px" />
          <div style={{ marginTop: '16px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <SkeletonCircle />
                <div style={{ flex: 1 }}>
                  <SkeletonLine $width="70%" $height="16px" />
                  <SkeletonLine $width="50%" $height="12px" />
                </div>
                <SkeletonLine $width="60px" $height="24px" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonLine $width="40%" $height="24px" />
          <div style={{ marginTop: '16px' }}>
            {[1, 2, 3, 4].map(i => (
              <SkeletonCard key={i} style={{ marginBottom: '12px' }}>
                <SkeletonLine $width="50%" $height="16px" />
                <SkeletonLine $width="30%" $height="20px" />
              </SkeletonCard>
            ))}
          </div>
        </SkeletonCard>
      </>
    );
  } else {
    return (
      <>
        <SkeletonGrid>
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i}>
              <SkeletonLine $width="60%" $height="20px" />
              <SkeletonLine $width="40%" $height="32px" />
            </SkeletonCard>
          ))}
        </SkeletonGrid>
        <SkeletonGrid>
          {[1, 2].map(i => (
            <SkeletonCard key={i}>
              <SkeletonLine $width="50%" $height="20px" />
              <SkeletonLine $width="30%" $height="24px" />
              <SkeletonLine $width="80%" $height="8px" style={{ marginTop: '12px' }} />
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <SkeletonTag />
                <SkeletonTag />
                <SkeletonTag />
              </div>
            </SkeletonCard>
          ))}
        </SkeletonGrid>
        <SkeletonCard>
          <SkeletonLine $width="40%" $height="24px" />
          <div style={{ marginTop: '16px' }}>
            {[1, 2].map(i => (
              <SkeletonCard key={i} style={{ marginBottom: '16px' }}>
                <SkeletonLine $width="50%" $height="20px" />
                <SkeletonLine $width="30%" $height="24px" />
                <div style={{ marginTop: '12px' }}>
                  {[1, 2, 3].map(j => (
                    <SkeletonWeekBlock key={j} style={{ marginBottom: '8px' }}>
                      <SkeletonLine $width="60%" $height="16px" />
                      <SkeletonLine $width="40%" $height="16px" />
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <SkeletonTag />
                        <SkeletonTag />
                      </div>
                    </SkeletonWeekBlock>
                  ))}
                </div>
              </SkeletonCard>
            ))}
          </div>
        </SkeletonCard>
      </>
    );
  }
};

const TestAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const { setLoading, loading } = useLoading();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Filters
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Analytics Data
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>([]);
  const [teacherAnalytics, setTeacherAnalytics] = useState<TeacherAnalytics[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics[]>([]);
  const [testTypeAnalytics, setTestTypeAnalytics] = useState<TestTypeAnalytics[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [passFailStats, setPassFailStats] = useState({ pass: 0, fail: 0, passRate: 0 });
  const [topPerformers, setTopPerformers] = useState<StudentAnalytics[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<StudentAnalytics[]>([]);
  const [teacherMonthlyTests, setTeacherMonthlyTests] = useState<TeacherMonthlyTest[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTests: 0,
    totalStudents: 0,
    totalTeachers: 0,
    averagePercentage: 0,
  });

  // Load initial data
  useEffect(() => {
    if (user?.school_id) {
      loadInitialData();
    }
  }, [user?.school_id]);

  // Load analytics when filters change
  useEffect(() => {
    if (user?.school_id && selectedSession) {
      loadAnalytics();
    }
  }, [selectedSession, selectedClass, selectedSubject, selectedTeacher, activeTab, user?.school_id]);

  const loadInitialData = async () => {
    if (!user?.school_id) return;

    try {
      setLoading(true);

      // Load sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, is_active')
        .eq('school_id', user.school_id)
        .order('start_date', { ascending: false });

      if (sessionsData) {
        setSessions(sessionsData);
        const activeSession = sessionsData.find(s => s.is_active);
        if (activeSession) {
          setSelectedSession(activeSession.id);
        } else if (sessionsData.length > 0) {
          setSelectedSession(sessionsData[0].id);
        }
      }

      // Load classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name');

      if (classesData) setClasses(classesData);

      // Load subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name');

      if (subjectsData) setSubjects(subjectsData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      setIsLoadingAnalytics(true);

      if (activeTab === 'students') {
        await loadStudentAnalytics();
      } else {
        await loadTeacherAnalytics();
      }

      await loadOverallStats();
      
      if (activeTab === 'students') {
        await loadSubjectAnalytics();
        await loadClassAnalytics();
        await loadTestTypeAnalytics();
        await loadGradeDistribution();
        await loadMonthlyTrends();
        await loadPassFailStats();
      } else {
        await loadTeacherMonthlyTests();
      }
    } catch (error) {
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadStudentAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      // Build query for test results
      let query = supabase
        .from('test_results')
        .select(`
          student_id,
          obtained_marks,
          max_marks,
          test_records!inner(
            id,
            subject_id,
            class_id,
            session_id
          )
        `)
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        query = query.eq('test_records.class_id', selectedClass);
      }

      if (selectedSubject) {
        query = query.eq('test_records.subject_id', selectedSubject);
      }

      const { data: results, error } = await query;

      if (error) throw error;

      if (!results || results.length === 0) {
        setStudentAnalytics([]);
        return;
      }

      // Get unique student IDs
      const studentIds = Array.from(new Set(results.map(r => r.student_id)));

      // Get student details
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name, class_id, section_id, roll_number')
        .in('id', studentIds)
        .eq('school_id', user.school_id);

      if (!studentsData) return;

      // Get class and section names
      const classIds = Array.from(new Set(studentsData.map(s => s.class_id)));
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
        .eq('school_id', user.school_id);

      const sectionIds = Array.from(new Set(studentsData.map(s => s.section_id).filter(Boolean)));
      const { data: sectionsData } = sectionIds.length > 0 ? await supabase
        .from('sections')
        .select('id, name')
        .in('id', sectionIds)
        .eq('school_id', user.school_id) : { data: [] };

      const classesMap = new Map(classesData?.map(c => [c.id, c.name]) || []);
      const sectionsMap = new Map(sectionsData?.map(s => [s.id, s.name]) || []);

      // Calculate analytics per student
      const analyticsMap = new Map<number, StudentAnalytics>();

      results.forEach(result => {
        const studentId = result.student_id;
        const student = studentsData.find(s => s.id === studentId);
        if (!student) return;

        if (!analyticsMap.has(studentId)) {
          analyticsMap.set(studentId, {
            student_id: studentId,
            student_name: student.name,
            roll_number: student.roll_number,
            class_name: classesMap.get(student.class_id) || '-',
            section_name: sectionsMap.get(student.section_id) || '-',
            total_tests: 0,
            total_obtained: 0,
            total_max: 0,
            average_percentage: 0,
            grade: 'F',
          });
        }

        const analytics = analyticsMap.get(studentId)!;
        analytics.total_tests++;
        analytics.total_obtained += result.obtained_marks;
        analytics.total_max += result.max_marks;
      });

      // Calculate percentages and grades
      const analyticsArray = Array.from(analyticsMap.values()).map(analytics => {
        analytics.average_percentage = analytics.total_max > 0
          ? (analytics.total_obtained / analytics.total_max) * 100
          : 0;
        analytics.grade = calculateGrade(analytics.average_percentage);
        return analytics;
      });

      // Sort by average percentage descending
      analyticsArray.sort((a, b) => b.average_percentage - a.average_percentage);

      setStudentAnalytics(analyticsArray);
      setTopPerformers(analyticsArray.slice(0, 5));
      setBottomPerformers(analyticsArray.slice(-5).reverse());
    } catch (error) {
    }
  };

  const loadTeacherAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      // Get test records with created_by (teacher user ID)
      let query = supabase
        .from('test_records')
        .select(`
          id,
          name,
          subject_id,
          created_by,
          session_id
        `)
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      }

      const { data: testRecords, error: recordsError } = await query;

      if (recordsError) throw recordsError;

      if (!testRecords || testRecords.length === 0) {
        setTeacherAnalytics([]);
        return;
      }

      // Get unique created_by user IDs (these are teacher user IDs)
      const teacherUserIds = Array.from(new Set(testRecords.map(r => r.created_by).filter(Boolean)));

      if (teacherUserIds.length === 0) {
        setTeacherAnalytics([]);
        return;
      }

      // Get user details and their staff_id
      let usersQuery = supabase
        .from('users')
        .select('id, staff_id, name')
        .in('id', teacherUserIds)
        .eq('school_id', user.school_id);

      // Filter by selected teacher if provided
      if (selectedTeacher) {
        usersQuery = usersQuery.eq('staff_id', selectedTeacher);
      }

      const { data: usersData } = await usersQuery;

      if (!usersData) return;

      // Get staff details for teachers
      const staffIds = usersData.map(u => u.staff_id).filter(Boolean);
      const { data: staffData } = staffIds.length > 0 ? await supabase
        .from('staff')
        .select('id, name')
        .in('id', staffIds)
        .eq('school_id', user.school_id) : { data: [] };

      const staffMap = new Map(staffData?.map(s => [s.id, s.name]) || []);

      // Get subject names
      const subjectIds = Array.from(new Set(testRecords.map(r => r.subject_id)));
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds)
        .eq('school_id', user.school_id);

      const subjectsMap = new Map(subjectsData?.map(s => [s.id, s.name]) || []);

      // Get test results for these test records
      const testRecordIds = testRecords.map(r => r.id);
      const { data: testResults } = await supabase
        .from('test_results')
        .select('test_id, student_id, obtained_marks, max_marks')
        .in('test_id', testRecordIds)
        .eq('school_id', user.school_id);

      // Calculate analytics per teacher
      const analyticsMap = new Map<number, TeacherAnalytics>();
      const teacherTestIds = new Map<number, number[]>();

      testRecords.forEach(record => {
        const userId = record.created_by;
        if (!userId) return;

        const userData = usersData.find(u => u.id === userId);
        if (!userData || !userData.staff_id) return;

        const staffId = userData.staff_id;
        const teacherName = staffMap.get(staffId) || userData.name || 'Unknown';

        if (!analyticsMap.has(staffId)) {
          analyticsMap.set(staffId, {
            teacher_id: staffId,
            teacher_name: teacherName,
            total_tests: 0,
            total_students: 0,
            average_percentage: 0,
            subjects: [],
          });
          teacherTestIds.set(staffId, []);
        }

        const analytics = analyticsMap.get(staffId)!;
        analytics.total_tests++;
        teacherTestIds.get(staffId)!.push(record.id);

        const subjectName = subjectsMap.get(record.subject_id);
        if (subjectName) {
          const existingSubject = analytics.subjects.find(s => s.name === subjectName);
          if (existingSubject) {
            existingSubject.count++;
          } else {
            analytics.subjects.push({ name: subjectName, count: 1 });
          }
        }
      });

      // Calculate average percentage and student count per teacher
      analyticsMap.forEach((analytics, staffId) => {
        const testIds = teacherTestIds.get(staffId) || [];
        const results = testResults?.filter(r => testIds.includes(r.test_id)) || [];

        const uniqueStudents = new Set(results.map(r => r.student_id));
        analytics.total_students = uniqueStudents.size;

        if (results.length > 0) {
          const totalObtained = results.reduce((sum, r) => sum + r.obtained_marks, 0);
          const totalMax = results.reduce((sum, r) => sum + r.max_marks, 0);
          analytics.average_percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        }
      });

      // Sort subjects by count descending within each teacher
      analyticsMap.forEach((analytics) => {
        analytics.subjects.sort((a, b) => b.count - a.count);
      });

      // Sort by total tests descending
      const analyticsArray = Array.from(analyticsMap.values()).sort(
        (a, b) => b.total_tests - a.total_tests
      );

      setTeacherAnalytics(analyticsArray);
    } catch (error) {
    }
  };

  const loadOverallStats = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      // Get test records count
      let recordsQuery = supabase
        .from('test_records')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        recordsQuery = recordsQuery.eq('class_id', selectedClass);
      }

      if (selectedSubject) {
        recordsQuery = recordsQuery.eq('subject_id', selectedSubject);
      }

      const { count: totalTests } = await recordsQuery;

      // Get unique students count
      let testRecordIds: number[] = [];
      
      if (selectedClass || selectedSubject) {
        let recordsQuery = supabase
          .from('test_records')
          .select('id')
          .eq('session_id', selectedSession)
          .eq('school_id', user.school_id);

        if (selectedClass) {
          recordsQuery = recordsQuery.eq('class_id', selectedClass);
        }

        if (selectedSubject) {
          recordsQuery = recordsQuery.eq('subject_id', selectedSubject);
        }

        const { data: recordsData } = await recordsQuery;
        testRecordIds = recordsData?.map(r => r.id) || [];
      }

      let resultsQuery = supabase
        .from('test_results')
        .select('student_id')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (testRecordIds.length > 0) {
        resultsQuery = resultsQuery.in('test_id', testRecordIds);
      }

      const { data: resultsData } = await resultsQuery;
      const uniqueStudents = new Set(resultsData?.map(r => r.student_id) || []);
      const totalStudents = uniqueStudents.size;

      // Get unique teachers count
      let teachersQuery = supabase
        .from('test_records')
        .select('created_by')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id)
        .not('created_by', 'is', null);

      if (selectedClass) {
        teachersQuery = teachersQuery.eq('class_id', selectedClass);
      }

      if (selectedSubject) {
        teachersQuery = teachersQuery.eq('subject_id', selectedSubject);
      }

      const { data: testRecords } = await teachersQuery;
      const uniqueTeachers = new Set(testRecords?.map(r => r.created_by).filter(Boolean) || []);
      const totalTeachers = uniqueTeachers.size;

      // Calculate average percentage
      let allResultsQuery = supabase
        .from('test_results')
        .select('obtained_marks, max_marks')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (testRecordIds.length > 0) {
        allResultsQuery = allResultsQuery.in('test_id', testRecordIds);
      }

      const { data: allResults } = await allResultsQuery;

      let averagePercentage = 0;
      if (allResults && allResults.length > 0) {
        const totalObtained = allResults.reduce((sum, r) => sum + r.obtained_marks, 0);
        const totalMax = allResults.reduce((sum, r) => sum + r.max_marks, 0);
        averagePercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      }

      setOverallStats({
        totalTests: totalTests || 0,
        totalStudents,
        totalTeachers,
        averagePercentage,
      });
    } catch (error) {
    }
  };

  const loadSubjectAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('test_records')
        .select(`
          id,
          subject_id,
          subjects!inner(id, name)
        `)
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      const { data: testRecords } = await query;
      if (!testRecords || testRecords.length === 0) {
        setSubjectAnalytics([]);
        return;
      }

      const testRecordIds = testRecords.map(r => r.id);
      const { data: testResults } = await supabase
        .from('test_results')
        .select('test_id, student_id, obtained_marks, max_marks, test_records!inner(subject_id, passing_marks)')
        .in('test_id', testRecordIds)
        .eq('school_id', user.school_id);

      const subjectMap = new Map<number, SubjectAnalytics>();

      testRecords.forEach(record => {
        const subjectId = record.subject_id;
        const subject = (record.subjects as any);
        if (!subject) return;

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subject_id: subjectId,
            subject_name: subject.name,
            total_tests: 0,
            total_students: 0,
            average_percentage: 0,
            pass_count: 0,
            fail_count: 0,
            pass_rate: 0,
          });
        }

        subjectMap.get(subjectId)!.total_tests++;
      });

      const uniqueStudentsBySubject = new Map<number, Set<number>>();
      const marksBySubject = new Map<number, { obtained: number; max: number }>();

      testResults?.forEach(result => {
        const testRecord = (result.test_records as any);
        const subjectId = testRecord.subject_id;
        const passingMarks = testRecord.passing_marks || 40;

        if (!uniqueStudentsBySubject.has(subjectId)) {
          uniqueStudentsBySubject.set(subjectId, new Set());
          marksBySubject.set(subjectId, { obtained: 0, max: 0 });
        }

        uniqueStudentsBySubject.get(subjectId)!.add(result.student_id);
        const marks = marksBySubject.get(subjectId)!;
        marks.obtained += result.obtained_marks;
        marks.max += result.max_marks;

        const percentage = result.max_marks > 0 ? (result.obtained_marks / result.max_marks) * 100 : 0;
        if (percentage >= (passingMarks / result.max_marks) * 100) {
          subjectMap.get(subjectId)!.pass_count++;
        } else {
          subjectMap.get(subjectId)!.fail_count++;
        }
      });

      subjectMap.forEach((analytics, subjectId) => {
        analytics.total_students = uniqueStudentsBySubject.get(subjectId)?.size || 0;
        const marks = marksBySubject.get(subjectId);
        if (marks && marks.max > 0) {
          analytics.average_percentage = (marks.obtained / marks.max) * 100;
        }
        const total = analytics.pass_count + analytics.fail_count;
        analytics.pass_rate = total > 0 ? (analytics.pass_count / total) * 100 : 0;
      });

      const analyticsArray = Array.from(subjectMap.values()).sort(
        (a, b) => b.average_percentage - a.average_percentage
      );
      setSubjectAnalytics(analyticsArray);
    } catch (error) {
    }
  };

  const loadClassAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('test_records')
        .select(`
          id,
          class_id,
          classes!inner(id, name)
        `)
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      }

      const { data: testRecords } = await query;
      if (!testRecords || testRecords.length === 0) {
        setClassAnalytics([]);
        return;
      }

      const testRecordIds = testRecords.map(r => r.id);
      const { data: testResults } = await supabase
        .from('test_results')
        .select('test_id, student_id, obtained_marks, max_marks, test_records!inner(class_id, passing_marks)')
        .in('test_id', testRecordIds)
        .eq('school_id', user.school_id);

      const classMap = new Map<number, ClassAnalytics>();

      testRecords.forEach(record => {
        const classId = record.class_id;
        const classData = (record.classes as any);
        if (!classData) return;

        if (!classMap.has(classId)) {
          classMap.set(classId, {
            class_id: classId,
            class_name: classData.name,
            total_tests: 0,
            total_students: 0,
            average_percentage: 0,
            pass_rate: 0,
          });
        }

        classMap.get(classId)!.total_tests++;
      });

      const uniqueStudentsByClass = new Map<number, Set<number>>();
      const marksByClass = new Map<number, { obtained: number; max: number }>();
      const passFailByClass = new Map<number, { pass: number; fail: number }>();

      testResults?.forEach(result => {
        const testRecord = (result.test_records as any);
        const classId = testRecord.class_id;
        const passingMarks = testRecord.passing_marks || 40;

        if (!uniqueStudentsByClass.has(classId)) {
          uniqueStudentsByClass.set(classId, new Set());
          marksByClass.set(classId, { obtained: 0, max: 0 });
          passFailByClass.set(classId, { pass: 0, fail: 0 });
        }

        uniqueStudentsByClass.get(classId)!.add(result.student_id);
        const marks = marksByClass.get(classId)!;
        marks.obtained += result.obtained_marks;
        marks.max += result.max_marks;

        const percentage = result.max_marks > 0 ? (result.obtained_marks / result.max_marks) * 100 : 0;
        const passFail = passFailByClass.get(classId)!;
        if (percentage >= (passingMarks / result.max_marks) * 100) {
          passFail.pass++;
        } else {
          passFail.fail++;
        }
      });

      classMap.forEach((analytics, classId) => {
        analytics.total_students = uniqueStudentsByClass.get(classId)?.size || 0;
        const marks = marksByClass.get(classId);
        if (marks && marks.max > 0) {
          analytics.average_percentage = (marks.obtained / marks.max) * 100;
        }
        const passFail = passFailByClass.get(classId);
        if (passFail) {
          const total = passFail.pass + passFail.fail;
          analytics.pass_rate = total > 0 ? (passFail.pass / total) * 100 : 0;
        }
      });

      const analyticsArray = Array.from(classMap.values()).sort(
        (a, b) => b.average_percentage - a.average_percentage
      );
      setClassAnalytics(analyticsArray);
    } catch (error) {
    }
  };

  const loadTestTypeAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('test_records')
        .select('id, test_type')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      }

      const { data: testRecords } = await query;
      if (!testRecords || testRecords.length === 0) {
        setTestTypeAnalytics([]);
        return;
      }

      const testRecordIds = testRecords.map(r => r.id);
      const { data: testResults } = await supabase
        .from('test_results')
        .select('test_id, student_id, obtained_marks, max_marks, test_records!inner(test_type)')
        .in('test_id', testRecordIds)
        .eq('school_id', user.school_id);

      const typeMap = new Map<string, TestTypeAnalytics>();
      const uniqueStudentsByType = new Map<string, Set<number>>();
      const marksByType = new Map<string, { obtained: number; max: number }>();

      testRecords.forEach(record => {
        const testType = record.test_type;
        if (!typeMap.has(testType)) {
          typeMap.set(testType, {
            test_type: testType,
            count: 0,
            average_percentage: 0,
            total_students: 0,
          });
          uniqueStudentsByType.set(testType, new Set());
          marksByType.set(testType, { obtained: 0, max: 0 });
        }
        typeMap.get(testType)!.count++;
      });

      testResults?.forEach(result => {
        const testRecord = (result.test_records as any);
        const testType = testRecord.test_type;

        uniqueStudentsByType.get(testType)?.add(result.student_id);
        const marks = marksByType.get(testType);
        if (marks) {
          marks.obtained += result.obtained_marks;
          marks.max += result.max_marks;
        }
      });

      typeMap.forEach((analytics, testType) => {
        analytics.total_students = uniqueStudentsByType.get(testType)?.size || 0;
        const marks = marksByType.get(testType);
        if (marks && marks.max > 0) {
          analytics.average_percentage = (marks.obtained / marks.max) * 100;
        }
      });

      const analyticsArray = Array.from(typeMap.values()).sort(
        (a, b) => b.count - a.count
      );
      setTestTypeAnalytics(analyticsArray);
    } catch (error) {
    }
  };

  const loadGradeDistribution = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('test_results')
        .select('obtained_marks, max_marks')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass || selectedSubject) {
        let recordsQuery = supabase
          .from('test_records')
          .select('id')
          .eq('session_id', selectedSession)
          .eq('school_id', user.school_id);

        if (selectedClass) {
          recordsQuery = recordsQuery.eq('class_id', selectedClass);
        }

        if (selectedSubject) {
          recordsQuery = recordsQuery.eq('subject_id', selectedSubject);
        }

        const { data: recordsData } = await recordsQuery;
        const testRecordIds = recordsData?.map(r => r.id) || [];
        if (testRecordIds.length > 0) {
          query = query.in('test_id', testRecordIds);
        }
      }

      const { data: results } = await query;
      if (!results || results.length === 0) {
        setGradeDistribution([]);
        return;
      }

      const gradeCounts = new Map<string, number>();
      results.forEach(result => {
        const percentage = result.max_marks > 0 ? (result.obtained_marks / result.max_marks) * 100 : 0;
        const grade = calculateGrade(percentage);
        gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
      });

      const total = results.length;
      const distribution = Array.from(gradeCounts.entries()).map(([grade, count]) => ({
        grade,
        count,
        percentage: (count / total) * 100,
      })).sort((a, b) => {
        const order = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });

      setGradeDistribution(distribution);
    } catch (error) {
    }
  };

  const loadMonthlyTrends = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('test_records')
        .select('id, test_date')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      }

      const { data: testRecords } = await query;
      if (!testRecords || testRecords.length === 0) {
        setMonthlyTrends([]);
        return;
      }

      const testRecordIds = testRecords.map(r => r.id);
      const { data: testResults } = await supabase
        .from('test_results')
        .select('test_id, student_id, obtained_marks, max_marks, test_records!inner(test_date)')
        .in('test_id', testRecordIds)
        .eq('school_id', user.school_id);

      const monthMap = new Map<string, MonthlyTrend>();
      const uniqueStudentsByMonth = new Map<string, Set<number>>();

      testRecords.forEach(record => {
        const date = new Date(record.test_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            month: monthName,
            tests: 0,
            average_percentage: 0,
            students: 0,
          });
          uniqueStudentsByMonth.set(monthKey, new Set());
        }

        monthMap.get(monthKey)!.tests++;
      });

      const marksByMonth = new Map<string, { obtained: number; max: number }>();

      testResults?.forEach(result => {
        const testRecord = (result.test_records as any);
        const date = new Date(testRecord.test_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        uniqueStudentsByMonth.get(monthKey)?.add(result.student_id);
        if (!marksByMonth.has(monthKey)) {
          marksByMonth.set(monthKey, { obtained: 0, max: 0 });
        }
        const marks = marksByMonth.get(monthKey)!;
        marks.obtained += result.obtained_marks;
        marks.max += result.max_marks;
      });

      monthMap.forEach((trend, monthKey) => {
        trend.students = uniqueStudentsByMonth.get(monthKey)?.size || 0;
        const marks = marksByMonth.get(monthKey);
        if (marks && marks.max > 0) {
          trend.average_percentage = (marks.obtained / marks.max) * 100;
        }
      });

      const trendsArray = Array.from(monthMap.values()).sort((a, b) => {
        return new Date(a.month).getTime() - new Date(b.month).getTime();
      });

      setMonthlyTrends(trendsArray);
    } catch (error) {
    }
  };

  const loadPassFailStats = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('test_results')
        .select('obtained_marks, max_marks, test_records!inner(passing_marks)')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass || selectedSubject) {
        let recordsQuery = supabase
          .from('test_records')
          .select('id')
          .eq('session_id', selectedSession)
          .eq('school_id', user.school_id);

        if (selectedClass) {
          recordsQuery = recordsQuery.eq('class_id', selectedClass);
        }

        if (selectedSubject) {
          recordsQuery = recordsQuery.eq('subject_id', selectedSubject);
        }

        const { data: recordsData } = await recordsQuery;
        const testRecordIds = recordsData?.map(r => r.id) || [];
        if (testRecordIds.length > 0) {
          query = query.in('test_id', testRecordIds);
        }
      }

      const { data: results } = await query;
      if (!results || results.length === 0) {
        setPassFailStats({ pass: 0, fail: 0, passRate: 0 });
        return;
      }

      let passCount = 0;
      let failCount = 0;

      results.forEach(result => {
        const testRecord = (result.test_records as any);
        const passingMarks = testRecord.passing_marks || 40;
        const percentage = result.max_marks > 0 ? (result.obtained_marks / result.max_marks) * 100 : 0;
        const passingPercentage = (passingMarks / result.max_marks) * 100;

        if (percentage >= passingPercentage) {
          passCount++;
        } else {
          failCount++;
        }
      });

      const total = passCount + failCount;
      const passRate = total > 0 ? (passCount / total) * 100 : 0;

      setPassFailStats({ pass: passCount, fail: failCount, passRate });
    } catch (error) {
    }
  };

  const loadTeacherMonthlyTests = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('test_records')
        .select('id, name, test_date, created_by, class_id, section_id')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id)
        .not('created_by', 'is', null);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      }

      const { data: testRecords } = await query;
      if (!testRecords || testRecords.length === 0) {
        setTeacherMonthlyTests([]);
        return;
      }

      // Get user details to map created_by to teacher names
      let userIds = Array.from(new Set(testRecords.map(r => r.created_by).filter(Boolean)));
      
      // Filter by selected teacher if provided
      if (selectedTeacher) {
        const { data: usersWithStaff } = await supabase
          .from('users')
          .select('id, staff_id')
          .in('id', userIds)
          .eq('school_id', user.school_id)
          .eq('staff_id', selectedTeacher);
        userIds = usersWithStaff?.map(u => u.id) || [];
      }

      const { data: usersData } = await supabase
        .from('users')
        .select('id, staff_id, name')
        .in('id', userIds)
        .eq('school_id', user.school_id);

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name')
        .in('id', usersData?.map(u => u.staff_id).filter(Boolean) || [])
        .eq('school_id', user.school_id);

      const staffMap = new Map(staffData?.map(s => [s.id, s.name]) || []);
      const userToStaffMap = new Map(usersData?.map(u => [u.id, u.staff_id]) || []);

      // Get class and section names
      const classIds = Array.from(new Set(testRecords.map(r => r.class_id).filter(Boolean)));
      const sectionIds = Array.from(new Set(testRecords.map(r => r.section_id).filter(Boolean)));

      const { data: classesData } = classIds.length > 0 ? await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
        .eq('school_id', user.school_id) : { data: [] };

      const { data: sectionsData } = sectionIds.length > 0 ? await supabase
        .from('sections')
        .select('id, name')
        .in('id', sectionIds)
        .eq('school_id', user.school_id) : { data: [] };

      const classesMap = new Map(classesData?.map(c => [c.id, c.name]) || []);
      const sectionsMap = new Map(sectionsData?.map(s => [s.id, s.name]) || []);

      // Get all unique week keys across all teachers to ensure consistency
      const allWeekKeys = new Set<string>();
      testRecords.forEach(record => {
        const date = new Date(record.test_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const dayOfMonth = date.getDate();
        const weekNumber = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);
        allWeekKeys.add(`${monthKey}-W${weekNumber}`);
      });

      // Group by teacher first, then by month and week
      const teacherMap = new Map<number, TeacherMonthlyTest>();

      testRecords.forEach(record => {
        const userId = record.created_by;
        if (!userId) return;

        const userData = usersData?.find(u => u.id === userId);
        if (!userData || !userData.staff_id) return;

        const staffId = userData.staff_id;
        const teacherName = staffMap.get(staffId) || userData.name || 'Unknown';

        if (!teacherMap.has(staffId)) {
          teacherMap.set(staffId, {
            teacher_id: staffId,
            teacher_name: teacherName,
            months: [],
            totalTests: 0,
          });
        }

        const teacherData = teacherMap.get(staffId)!;
        const date = new Date(record.test_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Find or create month
        let monthData = teacherData.months.find(m => m.monthKey === monthKey);
        if (!monthData) {
          monthData = {
            month: monthName,
            monthKey,
            weeks: [],
            totalTests: 0,
          };
          teacherData.months.push(monthData);
        }

        // Calculate week number
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const dayOfMonth = date.getDate();
        const weekNumber = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);
        const weekStart = new Date(date);
        weekStart.setDate(dayOfMonth - ((date.getDay() + 6) % 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekLabel = `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`;

        // Find or create week
        let weekData = monthData.weeks.find(w => w.weekNumber === weekNumber);
        if (!weekData) {
          weekData = {
            week: weekLabel,
            weekNumber,
            tests: 0,
            classes: [],
          };
          monthData.weeks.push(weekData);
        }

        // Get class name
        const className = classesMap.get(record.class_id) || 'Unknown';
        const sectionName = record.section_id ? sectionsMap.get(record.section_id) : null;
        const classDisplayName = sectionName ? `${className}-${sectionName}` : className;

        // Find or create class entry
        let classEntry = weekData.classes.find(c => c.className === classDisplayName);
        if (!classEntry) {
          classEntry = {
            className: classDisplayName,
            testCount: 0,
          };
          weekData.classes.push(classEntry);
        }

        classEntry.testCount++;
        weekData.tests++;
        monthData.totalTests++;
        teacherData.totalTests++;
      });

      // Get all unique months across all teachers
      const allMonthKeys = new Set<string>();
      teacherMap.forEach((teacherData) => {
        teacherData.months.forEach((monthData) => {
          allMonthKeys.add(monthData.monthKey);
        });
      });

      // Ensure all teachers have all months and all weeks
      teacherMap.forEach((teacherData) => {
        // Add missing months
        allMonthKeys.forEach(monthKey => {
          if (!teacherData.months.find(m => m.monthKey === monthKey)) {
            const [year, month] = monthKey.split('-').map(Number);
            const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            teacherData.months.push({
              month: monthName,
              monthKey,
              weeks: [],
              totalTests: 0,
            });
          }
        });

        // For each month, ensure all weeks are present
        teacherData.months.forEach((monthData) => {
          // Get all possible weeks for this month from allWeekKeys
          const monthWeekKeys = Array.from(allWeekKeys).filter(key => key.startsWith(monthData.monthKey));
          const existingWeekNumbers = new Set(monthData.weeks.map(w => w.weekNumber));
          
          // Add missing weeks with no tests
          monthWeekKeys.forEach(weekKey => {
            const weekNumber = parseInt(weekKey.split('-W')[1]);
            if (!existingWeekNumbers.has(weekNumber)) {
              // Calculate week label for this week number
              const [year, month] = monthData.monthKey.split('-').map(Number);
              const firstDay = new Date(year, month - 1, 1);
              const weekStartDay = 1 + (weekNumber - 1) * 7 - firstDay.getDay();
              const weekStart = new Date(year, month - 1, Math.max(1, weekStartDay));
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              const weekLabel = `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`;
              
              monthData.weeks.push({
                week: weekLabel,
                weekNumber,
                tests: 0,
                classes: [],
              });
            }
          });
          
          monthData.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
          // Sort classes within each week
          monthData.weeks.forEach(week => {
            week.classes.sort((a, b) => a.className.localeCompare(b.className));
          });
        });
        
        // Sort months
        teacherData.months.sort((a, b) => {
          return new Date(a.monthKey).getTime() - new Date(b.monthKey).getTime();
        });
      });

      const monthlyTestsArray = Array.from(teacherMap.values()).sort((a, b) => 
        b.totalTests - a.totalTests
      );

      setTeacherMonthlyTests(monthlyTestsArray);
    } catch (error) {
    }
  };

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A+':
      case 'A':
        return '#10b981';
      case 'B+':
      case 'B':
        return '#f59e0b';
      case 'C+':
      case 'C':
        return '#f97316';
      default:
        return '#ef4444';
    }
  };

  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  const handleExportPDF = async () => {
    if (!selectedSession) {
      toast.showToast('Please select a session first', 'error');
      return;
    }

    setIsExportingPDF(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const sessionName = sessions.find(s => s.id === selectedSession)?.name || 'Unknown Session';
      const className = selectedClass ? classes.find(c => c.id === selectedClass)?.name : 'All Classes';
      const subjectName = selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : 'All Subjects';
      const teacherName = selectedTeacher && activeTab === 'teachers' 
        ? teachers.find(t => t.id === selectedTeacher)?.name 
        : null;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text('Test Analytics Report', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Session: ${sessionName}`, 105, 30, { align: 'center' });
      doc.text(`Class: ${className} | Subject: ${subjectName}`, 105, 36, { align: 'center' });
      if (teacherName) {
        doc.text(`Teacher: ${teacherName}`, 105, 42, { align: 'center' });
      }

      let yPos = 50;

      if (activeTab === 'students') {
        // Overall Stats
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Overall Statistics', 14, yPos);
        yPos += 10;

        const statsData = [
          ['Total Tests', overallStats.totalTests.toString()],
          ['Total Students', overallStats.totalStudents.toString()],
          ['Average Percentage', `${overallStats.averagePercentage.toFixed(2)}%`],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: statsData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Top Performers
        if (topPerformers.length > 0) {
          doc.setFontSize(14);
          doc.text('Top 5 Performers', 14, yPos);
          yPos += 10;

          const topData = topPerformers.map((student, idx) => [
            (idx + 1).toString(),
            student.student_name,
            student.class_name,
            `${student.average_percentage.toFixed(2)}%`,
            student.grade,
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Rank', 'Student Name', 'Class', 'Percentage', 'Grade']],
            body: topData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Subject Analytics
        if (subjectAnalytics.length > 0) {
          doc.setFontSize(14);
          doc.text('Subject Performance', 14, yPos);
          yPos += 10;

          const subjectData = subjectAnalytics.map(subject => [
            subject.subject_name,
            subject.total_tests.toString(),
            subject.total_students.toString(),
            `${subject.average_percentage.toFixed(2)}%`,
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Subject', 'Tests', 'Students', 'Avg %']],
            body: subjectData,
            theme: 'striped',
            headStyles: { fillColor: [139, 92, 246] },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
          });
          yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // All Students (first 50)
        if (studentAnalytics.length > 0) {
          doc.setFontSize(14);
          doc.text('Student Performance (Top 50)', 14, yPos);
          yPos += 10;

          const studentData = studentAnalytics.slice(0, 50).map((student, idx) => [
            (idx + 1).toString(),
            student.student_name,
            `${student.class_name}-${student.section_name}`,
            student.total_tests.toString(),
            `${student.average_percentage.toFixed(2)}%`,
            student.grade,
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Rank', 'Student Name', 'Class', 'Tests', 'Percentage', 'Grade']],
            body: studentData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
          });
        }
      } else {
        // Teacher Analytics
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Teacher Statistics', 14, yPos);
        yPos += 10;

        const teacherStatsData = [
          ['Total Teachers', overallStats.totalTeachers.toString()],
          ['Total Tests', overallStats.totalTests.toString()],
          ['Students Assessed', overallStats.totalStudents.toString()],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: teacherStatsData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Teacher List
        if (teacherAnalytics.length > 0) {
          doc.setFontSize(14);
          doc.text('Teacher Performance', 14, yPos);
          yPos += 10;

          const teacherData = teacherAnalytics.map(teacher => [
            teacher.teacher_name,
            teacher.total_tests.toString(),
            teacher.total_students.toString(),
            `${teacher.average_percentage.toFixed(2)}%`,
            teacher.subjects.map(s => `${s.name} (${s.count})`).join(', '),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Teacher', 'Tests', 'Students', 'Avg %', 'Subjects']],
            body: teacherData,
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
            columnStyles: {
              4: { cellWidth: 60 },
            },
          });
          yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Monthly Distribution
        if (teacherMonthlyTests.length > 0) {
          doc.setFontSize(14);
          doc.text('Monthly Test Distribution', 14, yPos);
          yPos += 10;

          const monthlyData: any[] = [];
          teacherMonthlyTests.forEach(teacher => {
            teacher.months.forEach(month => {
              month.weeks.forEach(week => {
                if (week.tests > 0) {
                  monthlyData.push([
                    teacher.teacher_name,
                    month.month,
                    `Week ${week.weekNumber}`,
                    week.tests.toString(),
                    week.classes.map(c => `${c.className} (${c.testCount})`).join(', ') || 'N/A',
                  ]);
                }
              });
            });
          });

          if (monthlyData.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Teacher', 'Month', 'Week', 'Tests', 'Classes']],
              body: monthlyData.slice(0, 100), // Limit to 100 rows
              theme: 'striped',
              headStyles: { fillColor: [139, 92, 246] },
              styles: { fontSize: 7 },
              margin: { left: 14, right: 14 },
              columnStyles: {
                4: { cellWidth: 50 },
              },
            });
          }
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`,
          105,
          285,
          { align: 'center' }
        );
      }

      // Check if mobile (Capacitor)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        (window as any).Capacitor?.isNativePlatform();

      if (isMobile) {
        try {
          const pdfDataUri = doc.output('datauristring');
          const fileName = `Test_Analytics_${sessionName}_${new Date().toISOString().split('T')[0]}.pdf`;
          
          // Try to use Capacitor Filesystem API
          if ((window as any).Capacitor?.Plugins?.Filesystem) {
            const base64Data = pdfDataUri.split(',')[1];
            const { Filesystem } = (window as any).Capacitor.Plugins;
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: 'DOCUMENTS',
            });
            toast.showToast('PDF saved to Documents folder', 'success');
          } else {
            // Fallback: open in new window
            const newWindow = window.open();
            if (newWindow) {
              newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Test Analytics PDF</title>
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
                        <h2>📄 Test Analytics PDF Generated</h2>
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
              toast.showToast('PDF opened in new tab. Use the download button in the new tab.', 'success');
            } else {
              toast.showToast('Please allow popups for this site to download the PDF', 'error');
            }
          }
        } catch (error) {
          toast.showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // Desktop: standard download
        const fileName = `Test_Analytics_${sessionName}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        toast.showToast('PDF exported successfully!', 'success');
      }
    } catch (error) {
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>
          <BarChartIcon style={{ fontSize: '1.2rem' }} />
          Test Analytics
        </Title>
        <FilterContainer>
          <Select
            value={selectedSession || ''}
            onChange={(e) => setSelectedSession(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Select Session</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.name} {session.is_active ? '(Active)' : ''}
              </option>
            ))}
          </Select>
          <Select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </Select>
          <Select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
          {activeTab === 'teachers' && (
            <Select
              value={selectedTeacher || ''}
              onChange={(e) => setSelectedTeacher(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Teachers</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </Select>
          )}
          <RefreshButton onClick={loadAnalytics}>
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </RefreshButton>
          {selectedSession && (
            <RefreshButton 
              onClick={handleExportPDF} 
              disabled={isExportingPDF}
              style={{ 
                background: isExportingPDF ? '#9ca3af' : '#ef4444',
                opacity: isExportingPDF ? 0.6 : 1,
                cursor: isExportingPDF ? 'not-allowed' : 'pointer'
              }}
            >
              <PictureAsPdfIcon style={{ fontSize: '1rem' }} />
              {isExportingPDF ? 'Exporting...' : 'Export PDF'}
            </RefreshButton>
          )}
        </FilterContainer>
      </Header>

      <MainContent>
        {loading ? (
          <LoadingSpinner>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </LoadingSpinner>
        ) : isLoadingAnalytics ? (
          <TestAnalyticsSkeleton theme={theme} activeTab={activeTab} />
        ) : selectedSession ? (
          <>
            {/* Tabs */}
            <TabContainer>
              <Tab $active={activeTab === 'students'} onClick={() => {
                setActiveTab('students');
                setSelectedTeacher(null);
              }}>
                <PeopleIcon style={{ fontSize: '1rem', marginRight: '6px', verticalAlign: 'middle' }} />
                Student Analytics
              </Tab>
              <Tab $active={activeTab === 'teachers'} onClick={() => setActiveTab('teachers')}>
                <SchoolIcon style={{ fontSize: '1rem', marginRight: '6px', verticalAlign: 'middle' }} />
                Teacher Analytics
              </Tab>
            </TabContainer>

            {/* Student Analytics */}
            {activeTab === 'students' && (
              <>
                {/* Student Overview Cards */}
                <Grid3Col>
                  <CompactCard>
                    <CompactCardHeader>
                      <CompactCardTitle>Total Students</CompactCardTitle>
                      <PeopleIcon style={{ fontSize: '1.2rem', color: '#10b981' }} />
                    </CompactCardHeader>
                    <CompactCardValue>{overallStats.totalStudents}</CompactCardValue>
                  </CompactCard>
                  <CompactCard>
                    <CompactCardHeader>
                      <CompactCardTitle>Average Performance</CompactCardTitle>
                      <TrendingUpIcon style={{ fontSize: '1.2rem', color: getPercentageColor(overallStats.averagePercentage) }} />
                    </CompactCardHeader>
                    <CompactCardValue>{overallStats.averagePercentage.toFixed(1)}%</CompactCardValue>
                    <ProgressBar style={{ marginTop: '8px' }}>
                      <ProgressFill
                        $percentage={overallStats.averagePercentage}
                        $color={getPercentageColor(overallStats.averagePercentage)}
                      />
                    </ProgressBar>
                  </CompactCard>
                  <CompactCard>
                    <CompactCardHeader>
                      <CompactCardTitle>Pass Rate</CompactCardTitle>
                      <CheckCircleIcon style={{ fontSize: '1.2rem', color: '#10b981' }} />
                    </CompactCardHeader>
                    <CompactCardValue>{passFailStats.passRate.toFixed(1)}%</CompactCardValue>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                      {passFailStats.pass} Pass / {passFailStats.fail} Fail
                    </div>
                  </CompactCard>
                </Grid3Col>

                {/* Top Performers */}
                {topPerformers.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <StarIcon />
                      Top 5 Performers
                    </SectionTitle>
                    <Grid2Col>
                      {topPerformers.map((student, index) => (
                        <CompactCard key={student.student_id}>
                          <CompactCardHeader>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <EmojiEventsIcon
                                style={{
                                  fontSize: '1.2rem',
                                  color: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#cd7f32',
                                }}
                              />
                              <CompactCardTitle>#{index + 1} {student.student_name}</CompactCardTitle>
                            </div>
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: `${getGradeColor(student.grade)}20`,
                                color: getGradeColor(student.grade),
                                fontWeight: '600',
                                fontSize: '0.8rem',
                              }}
                            >
                              {student.grade}
                            </span>
                          </CompactCardHeader>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px' }}>
                            {student.class_name} • {student.average_percentage.toFixed(1)}% • {student.total_tests} tests
                          </div>
                        </CompactCard>
                      ))}
                    </Grid2Col>
                  </Section>
                )}

                {/* Subject Performance */}
                {subjectAnalytics.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <SubjectIcon />
                      Subject Performance
                    </SectionTitle>
                    <Grid2Col>
                      {subjectAnalytics.map((subject) => (
                        <CompactCard key={subject.subject_id}>
                          <CompactCardHeader>
                            <CompactCardTitle>{subject.subject_name}</CompactCardTitle>
                            <CompactCardValue>{subject.average_percentage.toFixed(1)}%</CompactCardValue>
                          </CompactCardHeader>
                          <ProgressBar style={{ marginTop: '8px', marginBottom: '8px' }}>
                            <ProgressFill
                              $percentage={subject.average_percentage}
                              $color={getPercentageColor(subject.average_percentage)}
                            />
                          </ProgressBar>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                            <span>{subject.total_tests} tests</span>
                            <span>{subject.pass_rate.toFixed(1)}% pass rate</span>
                          </div>
                        </CompactCard>
                      ))}
                    </Grid2Col>
                  </Section>
                )}

                {/* Class Performance */}
                {classAnalytics.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <ClassIcon />
                      Class Performance
                    </SectionTitle>
                    <Grid2Col>
                      {classAnalytics.map((classData) => (
                        <CompactCard key={classData.class_id}>
                          <CompactCardHeader>
                            <CompactCardTitle>{classData.class_name}</CompactCardTitle>
                            <CompactCardValue>{classData.average_percentage.toFixed(1)}%</CompactCardValue>
                          </CompactCardHeader>
                          <ProgressBar style={{ marginTop: '8px', marginBottom: '8px' }}>
                            <ProgressFill
                              $percentage={classData.average_percentage}
                              $color={getPercentageColor(classData.average_percentage)}
                            />
                          </ProgressBar>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                            <span>{classData.total_students} students</span>
                            <span>{classData.pass_rate.toFixed(1)}% pass</span>
                          </div>
                        </CompactCard>
                      ))}
                    </Grid2Col>
                  </Section>
                )}

                {/* Grade Distribution */}
                {gradeDistribution.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <PieChartIcon />
                      Grade Distribution
                    </SectionTitle>
                    <Grid3Col>
                      {gradeDistribution.map((grade) => (
                        <CompactCard key={grade.grade}>
                          <CompactCardHeader>
                            <span
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: `${getGradeColor(grade.grade)}20`,
                                color: getGradeColor(grade.grade),
                                fontWeight: '700',
                                fontSize: '1rem',
                              }}
                            >
                              {grade.grade}
                            </span>
                            <CompactCardValue>{grade.count}</CompactCardValue>
                          </CompactCardHeader>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{grade.percentage.toFixed(1)}%</div>
                        </CompactCard>
                      ))}
                    </Grid3Col>
                  </Section>
                )}

                {/* Monthly Trends */}
                {monthlyTrends.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <TimelineIcon />
                      Monthly Trends
                    </SectionTitle>
                    <Grid2Col>
                      {monthlyTrends.map((trend, index) => {
                        const prevTrend = index > 0 ? monthlyTrends[index - 1] : null;
                        const change = prevTrend ? trend.average_percentage - prevTrend.average_percentage : 0;
                        return (
                          <CompactCard key={trend.month}>
                            <CompactCardHeader>
                              <CompactCardTitle>{trend.month}</CompactCardTitle>
                              {prevTrend && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: change >= 0 ? '#10b981' : '#ef4444', fontSize: '0.85rem' }}>
                                  {change >= 0 ? <ArrowUpwardIcon style={{ fontSize: '1rem' }} /> : <ArrowDownwardIcon style={{ fontSize: '1rem' }} />}
                                  {Math.abs(change).toFixed(1)}%
                                </div>
                              )}
                            </CompactCardHeader>
                            <CompactCardValue>{trend.average_percentage.toFixed(1)}%</CompactCardValue>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                              {trend.tests} tests • {trend.students} students
                            </div>
                          </CompactCard>
                        );
                      })}
                    </Grid2Col>
                  </Section>
                )}

                {/* Students Needing Attention */}
                {(() => {
                  const studentsNeedingAttention = studentAnalytics.filter(
                    student => student.average_percentage < 50
                  ).sort((a, b) => a.average_percentage - b.average_percentage);
                  
                  return studentsNeedingAttention.length > 0 && (
                    <Section>
                      <SectionTitle>
                        <WarningIcon />
                        Students Needing Attention ({studentsNeedingAttention.length})
                      </SectionTitle>
                      <TableWrapper>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHeaderCell>Rank</TableHeaderCell>
                              <TableHeaderCell>Student Name</TableHeaderCell>
                              <TableHeaderCell>Class</TableHeaderCell>
                              <TableHeaderCell>Tests</TableHeaderCell>
                              <TableHeaderCell>Percentage</TableHeaderCell>
                              <TableHeaderCell>Grade</TableHeaderCell>
                            </TableRow>
                          </TableHeader>
                          <tbody>
                            {studentsNeedingAttention.map((student, index) => {
                              const originalIndex = studentAnalytics.findIndex(s => s.student_id === student.student_id);
                              return (
                                <TableRow key={student.student_id}>
                                  <TableCell>{originalIndex + 1}</TableCell>
                                  <TableCell>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <PersonIcon style={{ fontSize: '1rem', color: '#6b7280' }} />
                                      {student.student_name}
                                    </div>
                                  </TableCell>
                                  <TableCell>{student.class_name}</TableCell>
                                  <TableCell>{student.total_tests}</TableCell>
                                  <TableCell>
                                    <div>
                                      {student.average_percentage.toFixed(1)}%
                                      <ProgressBar>
                                        <ProgressFill
                                          $percentage={student.average_percentage}
                                          $color={getPercentageColor(student.average_percentage)}
                                        />
                                      </ProgressBar>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        background: `${getGradeColor(student.grade)}20`,
                                        color: getGradeColor(student.grade),
                                        fontWeight: '600',
                                        fontSize: '0.85rem',
                                      }}
                                    >
                                      {student.grade}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                    </Section>
                  );
                })()}

                {/* All Students List */}
                {studentAnalytics.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <PeopleIcon />
                      All Students
                    </SectionTitle>
                    <TableWrapper>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Rank</TableHeaderCell>
                            <TableHeaderCell>Student Name</TableHeaderCell>
                            <TableHeaderCell>Class</TableHeaderCell>
                            <TableHeaderCell>Tests</TableHeaderCell>
                            <TableHeaderCell>Percentage</TableHeaderCell>
                            <TableHeaderCell>Grade</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <tbody>
                          {studentAnalytics.map((student, index) => (
                            <TableRow key={student.student_id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <PersonIcon style={{ fontSize: '1rem', color: '#6b7280' }} />
                                  {student.student_name}
                                </div>
                              </TableCell>
                              <TableCell>{student.class_name}</TableCell>
                              <TableCell>{student.total_tests}</TableCell>
                              <TableCell>
                                <div>
                                  {student.average_percentage.toFixed(1)}%
                                  <ProgressBar>
                                    <ProgressFill
                                      $percentage={student.average_percentage}
                                      $color={getPercentageColor(student.average_percentage)}
                                    />
                                  </ProgressBar>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    background: `${getGradeColor(student.grade)}20`,
                                    color: getGradeColor(student.grade),
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {student.grade}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </tbody>
                      </Table>
                    </TableWrapper>
                  </Section>
                )}

                {studentAnalytics.length === 0 && (
                  <EmptyState>
                    <EmptyStateIcon>
                      <PeopleIcon />
                    </EmptyStateIcon>
                    <EmptyStateText>No student data available for the selected filters</EmptyStateText>
                  </EmptyState>
                )}
              </>
            )}

            {/* Teacher Analytics */}
            {activeTab === 'teachers' && (
              <>
                {/* Teacher Overview Cards */}
                <Grid3Col>
                  <CompactCard>
                    <CompactCardHeader>
                      <CompactCardTitle>Total Teachers</CompactCardTitle>
                      <SchoolIcon style={{ fontSize: '1.2rem', color: '#f59e0b' }} />
                    </CompactCardHeader>
                    <CompactCardValue>{overallStats.totalTeachers}</CompactCardValue>
                  </CompactCard>
                  <CompactCard>
                    <CompactCardHeader>
                      <CompactCardTitle>Total Tests</CompactCardTitle>
                      <AssessmentIcon style={{ fontSize: '1.2rem', color: '#3b82f6' }} />
                    </CompactCardHeader>
                    <CompactCardValue>{overallStats.totalTests}</CompactCardValue>
                  </CompactCard>
                  <CompactCard>
                    <CompactCardHeader>
                      <CompactCardTitle>Students Assessed</CompactCardTitle>
                      <PeopleIcon style={{ fontSize: '1.2rem', color: '#10b981' }} />
                    </CompactCardHeader>
                    <CompactCardValue>{overallStats.totalStudents}</CompactCardValue>
                  </CompactCard>
                </Grid3Col>

                {/* Teacher List */}
                {teacherAnalytics.length > 0 && (
                  <Section>
                    <SectionTitle>
                      <SchoolIcon />
                      Teachers
                    </SectionTitle>
                    <Grid2Col>
                      {teacherAnalytics.map((teacher) => (
                        <CompactCard key={teacher.teacher_id}>
                          <CompactCardHeader>
                            <CompactCardTitle>{teacher.teacher_name}</CompactCardTitle>
                            <CompactCardValue>{teacher.total_tests}</CompactCardValue>
                          </CompactCardHeader>
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280', 
                            marginTop: '6px', 
                            marginBottom: '8px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            alignItems: 'center'
                          }}>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '3px',
                              padding: '3px 6px',
                              background: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                              borderRadius: '5px',
                              fontWeight: '500',
                              fontSize: '0.75rem'
                            }}>
                              👥 {teacher.total_students}
                            </span>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '3px',
                              padding: '3px 6px',
                              background: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                              borderRadius: '5px',
                              fontWeight: '500',
                              fontSize: '0.75rem'
                            }}>
                              📊 {teacher.average_percentage.toFixed(1)}%
                            </span>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '3px',
                              padding: '3px 6px',
                              background: theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
                              borderRadius: '5px',
                              fontWeight: '500',
                              fontSize: '0.75rem'
                            }}>
                              📚 {teacher.subjects.length}
                            </span>
                          </div>
                          <ProgressBar style={{ marginBottom: '6px', height: '6px' }}>
                            <ProgressFill
                              $percentage={teacher.average_percentage}
                              $color={getPercentageColor(teacher.average_percentage)}
                            />
                          </ProgressBar>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {teacher.subjects.map((subject, idx) => (
                              <TestTag key={idx} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>{subject.name} ({subject.count})</TestTag>
                            ))}
                          </div>
                        </CompactCard>
                      ))}
                    </Grid2Col>
                  </Section>
                )}

                {/* Month-wise Test Count with Week Blocks - Individual Teacher Cards */}
                {teacherMonthlyTests.length > 0 && (() => {
                  // Extract all unique months from teacherMonthlyTests
                  const allMonths = new Set<string>();
                  teacherMonthlyTests.forEach(teacher => {
                    teacher.months.forEach(month => {
                      allMonths.add(month.monthKey);
                    });
                  });
                  
                  const availableMonths = Array.from(allMonths).sort((a, b) => {
                    return new Date(a).getTime() - new Date(b).getTime();
                  });

                  // Get current month key
                  const now = new Date();
                  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  
                  // Set default to current month if available, otherwise first month
                  const defaultMonth = availableMonths.includes(currentMonthKey) 
                    ? currentMonthKey 
                    : (availableMonths.length > 0 ? availableMonths[0] : '');
                  
                  const displayMonth = selectedMonth || defaultMonth;

                  // Format month for display
                  const formatMonthForDisplay = (monthKey: string) => {
                    const [year, month] = monthKey.split('-').map(Number);
                    const date = new Date(year, month - 1, 1);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  };

                  // Filter teachers to show only those with data in selected month
                  const filteredTeachers = teacherMonthlyTests
                    .map(teacher => {
                      const monthData = teacher.months.find(m => m.monthKey === displayMonth);
                      if (!monthData || monthData.totalTests === 0) return null;
                      
                      return {
                        ...teacher,
                        months: [monthData] // Only show the selected month
                      };
                    })
                    .filter((teacher): teacher is TeacherMonthlyTest => teacher !== null);

                  return (
                    <Section>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <SectionTitle style={{ margin: 0 }}>
                          <TimelineIcon />
                          Monthly Test Distribution by Teacher
                        </SectionTitle>
                        <Select
                          value={displayMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          style={{ minWidth: '200px', marginLeft: '16px' }}
                        >
                          {availableMonths.map(monthKey => (
                            <option key={monthKey} value={monthKey}>
                              {formatMonthForDisplay(monthKey)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {filteredTeachers.length > 0 ? (
                        <Grid2Col>
                          {filteredTeachers.map((teacherData) => (
                        <CompactCard key={teacherData.teacher_id} style={{ marginBottom: '16px' }}>
                          <CompactCardHeader>
                            <CompactCardTitle>{teacherData.teacher_name}</CompactCardTitle>
                            <CompactCardValue>{teacherData.months[0]?.totalTests || 0}</CompactCardValue>
                          </CompactCardHeader>
                          <div style={{ marginTop: '12px' }}>
                            {teacherData.months.map((monthData) => (
                              <div key={monthData.monthKey}>
                                {monthData.weeks.map((week, idx) => (
                                  <WeekBlock key={idx} style={{ marginBottom: '8px' }}>
                                    <WeekHeader>
                                      <WeekLabel style={{ fontSize: '0.8rem' }}>Week {week.weekNumber}: {week.week}</WeekLabel>
                                      <WeekCount style={{ fontSize: '0.8rem' }}>{week.tests} test{week.tests !== 1 ? 's' : ''}</WeekCount>
                                    </WeekHeader>
                                    {week.tests > 0 && week.classes.length > 0 ? (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                        {week.classes.map((classData, classIdx) => (
                                          <TestTag key={classIdx} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                            {classData.className} ({classData.testCount})
                                          </TestTag>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: '#6b7280', 
                                        fontStyle: 'italic',
                                        marginTop: '8px',
                                        padding: '4px 0'
                                      }}>
                                        No tests
                                      </div>
                                    )}
                                  </WeekBlock>
                                ))}
                              </div>
                            ))}
                          </div>
                        </CompactCard>
                          ))}
                        </Grid2Col>
                      ) : (
                        <EmptyState>
                          <EmptyStateIcon>
                            <TimelineIcon />
                          </EmptyStateIcon>
                          <EmptyStateText>No test data available for the selected month</EmptyStateText>
                        </EmptyState>
                      )}
                    </Section>
                  );
                })()}

                {teacherAnalytics.length === 0 && teacherMonthlyTests.length === 0 && (
                  <EmptyState>
                    <EmptyStateIcon>
                      <SchoolIcon />
                    </EmptyStateIcon>
                    <EmptyStateText>No teacher data available for the selected filters</EmptyStateText>
                  </EmptyState>
                )}
              </>
            )}

          </>
        ) : (
          <EmptyState>
            <EmptyStateIcon>
              <BarChartIcon />
            </EmptyStateIcon>
            <EmptyStateText>Please select a session to view analytics</EmptyStateText>
          </EmptyState>
        )}
      </MainContent>
    </PageContainer>
  );
};

export default TestAnalytics;

