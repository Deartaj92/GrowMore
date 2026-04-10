import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../supabaseClient';
import { useLoading } from '../contexts/LoadingContext';
import {
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Class as ClassIcon,
  Subject as SubjectIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  People as PeopleIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './useToast';
import { formatAppDate } from '../utils/dateUtils';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 8px 0 8px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  overflow: hidden;
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

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0 8px 0;
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

interface Teacher {
  id: number;
  name: string;
  staff_id: number;
}

interface TeacherAnalytics {
  teacher_id: number;
  teacher_name: string;
  total_homework: number;
  total_classes: number;
  total_subjects: number;
  classes: Array<{
    name: string;
    count: number;
  }>;
  subjects: Array<{
    name: string;
    count: number;
  }>;
}

interface TeacherMonthlyHomework {
  teacher_id: number;
  teacher_name: string;
  months: Array<{
    month: string;
    monthKey: string;
    weeks: Array<{
      week: string;
      weekNumber: number;
      homework: number;
      classes: Array<{
        className: string;
        homeworkCount: number;
      }>;
    }>;
    totalHomework: number;
  }>;
  totalHomework: number;
}

interface ClassAnalytics {
  class_id: number;
  class_name: string;
  total_homework: number;
  total_teachers: number;
  total_subjects: number;
}

interface SubjectAnalytics {
  subject_id: number;
  subject_name: string;
  total_homework: number;
  total_classes: number;
  total_teachers: number;
}

// Helper function to fetch all rows from Supabase (handles pagination)
// Note: Supabase has a default limit of 1000 rows, so we need to paginate
const fetchAllRows = async <T = any>(
  queryBuilder: any,
  pageSize: number = 1000
): Promise<T[]> => {
  const allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + pageSize - 1;
    // Create a new query with range for this page
    const pageQuery = queryBuilder.range(from, to);
    const { data, error } = await pageQuery;

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...(data as T[]));
      // If we got less than pageSize, we've reached the end
      hasMore = data.length === pageSize;
      from += pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
};

const DiaryAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const { setLoading, loading } = useLoading();
  const toast = useToast();
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
  const [teacherAnalytics, setTeacherAnalytics] = useState<TeacherAnalytics[]>([]);
  const [teacherMonthlyHomework, setTeacherMonthlyHomework] = useState<TeacherMonthlyHomework[]>([]);
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalHomework: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
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
  }, [selectedSession, selectedClass, selectedSubject, selectedTeacher, user?.school_id]);

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
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      setIsLoadingAnalytics(true);
      await loadOverallStats();
      await loadTeacherAnalytics();
      await loadTeacherMonthlyHomework();
      await loadClassAnalytics();
      await loadSubjectAnalytics();
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadOverallStats = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      // Get total homework count
      let homeworkQuery = supabase
        .from('homework_diary')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        homeworkQuery = homeworkQuery.eq('class_id', selectedClass);
      }

      if (selectedSubject !== null && selectedSubject !== undefined) {
        if (selectedSubject === 0) {
          homeworkQuery = homeworkQuery.is('subject_id', null);
        } else {
          homeworkQuery = homeworkQuery.eq('subject_id', selectedSubject);
        }
      }

      const { count: totalHomework } = await homeworkQuery;

      // Get unique teachers
      let teachersQuery = supabase
        .from('homework_diary')
        .select('assigned_by')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id)
        .not('assigned_by', 'is', null);

      if (selectedClass) {
        teachersQuery = teachersQuery.eq('class_id', selectedClass);
      }

      if (selectedSubject !== null && selectedSubject !== undefined) {
        if (selectedSubject === 0) {
          teachersQuery = teachersQuery.is('subject_id', null);
        } else {
          teachersQuery = teachersQuery.eq('subject_id', selectedSubject);
        }
      }

      const teachersData = await fetchAllRows<{ assigned_by: number | null }>(teachersQuery);
      const uniqueTeachers = new Set(teachersData?.map((t: { assigned_by: number | null }) => t.assigned_by).filter(Boolean) || []);
      const totalTeachers = uniqueTeachers.size;

      // Get unique classes
      let classesQuery = supabase
        .from('homework_diary')
        .select('class_id')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedSubject !== null && selectedSubject !== undefined) {
        if (selectedSubject === 0) {
          classesQuery = classesQuery.is('subject_id', null);
        } else {
          classesQuery = classesQuery.eq('subject_id', selectedSubject);
        }
      }

      const classesData = await fetchAllRows<{ class_id: number }>(classesQuery);
      const uniqueClasses = new Set(classesData?.map((c: { class_id: number }) => c.class_id) || []);
      const totalClasses = uniqueClasses.size;

      // Get unique subjects
      let subjectsQuery = supabase
        .from('homework_diary')
        .select('subject_id')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id)
        .not('subject_id', 'is', null);

      if (selectedClass) {
        subjectsQuery = subjectsQuery.eq('class_id', selectedClass);
      }

      const subjectsData = await fetchAllRows<{ subject_id: number | null }>(subjectsQuery);
      const uniqueSubjects = new Set(subjectsData?.map((s: { subject_id: number | null }) => s.subject_id).filter(Boolean) || []);
      const totalSubjects = uniqueSubjects.size;

      setOverallStats({
        totalHomework: totalHomework || 0,
        totalTeachers,
        totalClasses,
        totalSubjects,
      });
    } catch (error) {
      console.error('Error loading overall stats:', error);
    }
  };

  const loadTeacherAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      // Get homework diary entries with assigned_by
      let query = supabase
        .from('homework_diary')
        .select(`
          id,
          class_id,
          subject_id,
          assigned_by,
          classes:class_id (id, name),
          subjects:subject_id (id, name),
          users:assigned_by (id, name, staff_id)
        `)
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id)
        .not('assigned_by', 'is', null);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject !== null && selectedSubject !== undefined) {
        if (selectedSubject === 0) {
          query = query.is('subject_id', null);
        } else {
          query = query.eq('subject_id', selectedSubject);
        }
      }

      // Filter by selected teacher if provided
      if (selectedTeacher) {
        const { data: usersWithStaff } = await supabase
          .from('users')
          .select('id, staff_id')
          .eq('school_id', user.school_id)
          .eq('staff_id', selectedTeacher);
        
        const userIds = usersWithStaff?.map(u => u.id) || [];
        if (userIds.length > 0) {
          query = query.in('assigned_by', userIds);
        } else {
          setTeacherAnalytics([]);
          return;
        }
      }

      const homeworkData = await fetchAllRows<any>(query);

      if (!homeworkData || homeworkData.length === 0) {
        setTeacherAnalytics([]);
        return;
      }

      // Get unique user IDs (assigned_by)
      const userIds = Array.from(new Set(homeworkData.map((h: any) => h.assigned_by).filter(Boolean)));

      // Get user details and their staff_id
      const { data: usersData } = await supabase
        .from('users')
        .select('id, staff_id, name')
        .in('id', userIds)
        .eq('school_id', user.school_id);

      if (!usersData) return;

      // Get staff details for teachers
      const staffIds = usersData.map(u => u.staff_id).filter(Boolean);
      const { data: staffData } = staffIds.length > 0 ? await supabase
        .from('staff')
        .select('id, name')
        .in('id', staffIds)
        .eq('school_id', user.school_id) : { data: [] };

      const staffMap = new Map(staffData?.map(s => [s.id, s.name]) || []);
      const userToStaffMap = new Map(usersData.map(u => [u.id, u.staff_id]));

      // Calculate analytics per teacher
      const analyticsMap = new Map<number, TeacherAnalytics>();
      const teacherClassesMap = new Map<number, Map<number, number>>();
      const teacherSubjectsMap = new Map<number, Map<number | null, number>>();

      homeworkData.forEach((entry: any) => {
        const userId = entry.assigned_by;
        if (!userId) return;

        const userData = usersData.find(u => u.id === userId);
        if (!userData || !userData.staff_id) return;

        const staffId = userData.staff_id;
        const teacherName = staffMap.get(staffId) || userData.name || 'Unknown';

        if (!analyticsMap.has(staffId)) {
          analyticsMap.set(staffId, {
            teacher_id: staffId,
            teacher_name: teacherName,
            total_homework: 0,
            total_classes: 0,
            total_subjects: 0,
            classes: [],
            subjects: [],
          });
          teacherClassesMap.set(staffId, new Map());
          teacherSubjectsMap.set(staffId, new Map());
        }

        const analytics = analyticsMap.get(staffId)!;
        analytics.total_homework++;

        // Track classes
        const classId = entry.class_id;
        const classMap = teacherClassesMap.get(staffId)!;
        const className = entry.classes?.name || 'Unknown';
        classMap.set(classId, (classMap.get(classId) || 0) + 1);

        // Track subjects
        const subjectId = entry.subject_id;
        const subjectMap = teacherSubjectsMap.get(staffId)!;
        subjectMap.set(subjectId, (subjectMap.get(subjectId) || 0) + 1);
      });

      // Get all unique class and subject IDs
      const allClassIds = Array.from(new Set(homeworkData.map((h: any) => h.class_id)));
      const allSubjectIds = Array.from(new Set(homeworkData.map((h: any) => h.subject_id).filter(Boolean)));

      // Fetch class names
      const { data: classesData } = allClassIds.length > 0 ? await supabase
        .from('classes')
        .select('id, name')
        .in('id', allClassIds)
        .eq('school_id', user.school_id) : { data: [] };

      const classesNameMap = new Map(classesData?.map(c => [c.id, c.name]) || []);

      // Fetch subject names
      const { data: subjectsData } = allSubjectIds.length > 0 ? await supabase
        .from('subjects')
        .select('id, name')
        .in('id', allSubjectIds)
        .eq('school_id', user.school_id) : { data: [] };

      const subjectsNameMap = new Map(subjectsData?.map(s => [s.id, s.name]) || []);

      // Convert maps to arrays
      analyticsMap.forEach((analytics, staffId) => {
        const classMap = teacherClassesMap.get(staffId)!;
        const subjectMap = teacherSubjectsMap.get(staffId)!;

        analytics.classes = Array.from(classMap.entries()).map(([classId, count]) => ({
          name: classesNameMap.get(classId) || 'Unknown',
          count,
        })).sort((a, b) => b.count - a.count);

        analytics.total_classes = analytics.classes.length;

        analytics.subjects = Array.from(subjectMap.entries())
          .map(([subjectId, count]) => ({
            name: subjectId === null ? 'General' : (subjectsNameMap.get(subjectId) || 'Unknown'),
            count,
          }))
          .sort((a, b) => b.count - a.count);

        analytics.total_subjects = analytics.subjects.length;
      });

      // Sort by total homework descending
      const analyticsArray = Array.from(analyticsMap.values()).sort(
        (a, b) => b.total_homework - a.total_homework
      );

      setTeacherAnalytics(analyticsArray);

      // Also update teachers list for filter
      const teachersList = Array.from(analyticsMap.values()).map(a => ({
        id: a.teacher_id,
        name: a.teacher_name,
        staff_id: a.teacher_id,
      }));
      setTeachers(teachersList);
    } catch (error) {
      console.error('Error loading teacher analytics:', error);
    }
  };

  const loadTeacherMonthlyHomework = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('homework_diary')
        .select('id, homework_date, assigned_by, class_id, section_id')
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id)
        .not('assigned_by', 'is', null);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject !== null && selectedSubject !== undefined) {
        if (selectedSubject === 0) {
          query = query.is('subject_id', null);
        } else {
          query = query.eq('subject_id', selectedSubject);
        }
      }

      if (selectedTeacher) {
        const { data: usersWithStaff } = await supabase
          .from('users')
          .select('id, staff_id')
          .eq('school_id', user.school_id)
          .eq('staff_id', selectedTeacher);
        
        const userIds = usersWithStaff?.map(u => u.id) || [];
        if (userIds.length > 0) {
          query = query.in('assigned_by', userIds);
        } else {
          setTeacherMonthlyHomework([]);
          return;
        }
      }

      const homeworkData = await fetchAllRows(query);

      if (!homeworkData || homeworkData.length === 0) {
        setTeacherMonthlyHomework([]);
        return;
      }

      // Get user details
      const userIds = Array.from(new Set(homeworkData.map((h: any) => h.assigned_by).filter(Boolean)));
      const { data: usersData } = await supabase
        .from('users')
        .select('id, staff_id, name')
        .in('id', userIds)
        .eq('school_id', user.school_id);

      if (!usersData) return;

      const staffIds = usersData.map(u => u.staff_id).filter(Boolean);
      const { data: staffData } = staffIds.length > 0 ? await supabase
        .from('staff')
        .select('id, name')
        .in('id', staffIds)
        .eq('school_id', user.school_id) : { data: [] };

      const staffMap = new Map(staffData?.map(s => [s.id, s.name]) || []);
      const userToStaffMap = new Map(usersData.map(u => [u.id, u.staff_id]));

      // Get class and section names
      const classIds = Array.from(new Set(homeworkData.map((h: any) => h.class_id).filter(Boolean)));
      const sectionIds = Array.from(new Set(homeworkData.map((h: any) => h.section_id).filter(Boolean)));

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

      // Group by teacher, then by month and week
      const teacherMap = new Map<number, TeacherMonthlyHomework>();

      homeworkData.forEach((entry: any) => {
        const userId = entry.assigned_by;
        if (!userId) return;

        const userData = usersData.find(u => u.id === userId);
        if (!userData || !userData.staff_id) return;

        const staffId = userData.staff_id;
        const teacherName = staffMap.get(staffId) || userData.name || 'Unknown';

        if (!teacherMap.has(staffId)) {
          teacherMap.set(staffId, {
            teacher_id: staffId,
            teacher_name: teacherName,
            months: [],
            totalHomework: 0,
          });
        }

        const teacherData = teacherMap.get(staffId)!;
        const date = new Date(entry.homework_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Find or create month
        let monthData = teacherData.months.find(m => m.monthKey === monthKey);
        if (!monthData) {
          monthData = {
            month: monthName,
            monthKey,
            weeks: [],
            totalHomework: 0,
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
            homework: 0,
            classes: [],
          };
          monthData.weeks.push(weekData);
        }

        // Get class name
        const className = classesMap.get(entry.class_id) || 'Unknown';
        const sectionName = entry.section_id ? sectionsMap.get(entry.section_id) : null;
        const classDisplayName = sectionName ? `${className}-${sectionName}` : className;

        // Find or create class entry
        let classEntry = weekData.classes.find(c => c.className === classDisplayName);
        if (!classEntry) {
          classEntry = {
            className: classDisplayName,
            homeworkCount: 0,
          };
          weekData.classes.push(classEntry);
        }

        classEntry.homeworkCount++;
        weekData.homework++;
        monthData.totalHomework++;
        teacherData.totalHomework++;
      });

      // Sort months and weeks
      teacherMap.forEach((teacherData) => {
        teacherData.months.sort((a, b) => {
          return new Date(a.monthKey).getTime() - new Date(b.monthKey).getTime();
        });
        teacherData.months.forEach(month => {
          month.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
          month.weeks.forEach(week => {
            week.classes.sort((a, b) => a.className.localeCompare(b.className));
          });
        });
      });

      const monthlyHomeworkArray = Array.from(teacherMap.values()).sort((a, b) => 
        b.totalHomework - a.totalHomework
      );

      setTeacherMonthlyHomework(monthlyHomeworkArray);
    } catch (error) {
      console.error('Error loading teacher monthly homework:', error);
    }
  };

  const loadClassAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('homework_diary')
        .select(`
          id,
          class_id,
          subject_id,
          assigned_by,
          classes:class_id (id, name)
        `)
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject !== null && selectedSubject !== undefined) {
        if (selectedSubject === 0) {
          query = query.is('subject_id', null);
        } else {
          query = query.eq('subject_id', selectedSubject);
        }
      }

      const homeworkData = await fetchAllRows(query);

      if (!homeworkData || homeworkData.length === 0) {
        setClassAnalytics([]);
        return;
      }

      const classMap = new Map<number, ClassAnalytics>();
      const classTeachersMap = new Map<number, Set<number>>();
      const classSubjectsMap = new Map<number, Set<number | null>>();

      homeworkData.forEach((entry: any) => {
        const classId = entry.class_id;
        const classData = entry.classes;
        if (!classData) return;

        if (!classMap.has(classId)) {
          classMap.set(classId, {
            class_id: classId,
            class_name: classData.name,
            total_homework: 0,
            total_teachers: 0,
            total_subjects: 0,
          });
          classTeachersMap.set(classId, new Set());
          classSubjectsMap.set(classId, new Set());
        }

        const analytics = classMap.get(classId)!;
        analytics.total_homework++;

        if (entry.assigned_by) {
          classTeachersMap.get(classId)!.add(entry.assigned_by);
        }

        classSubjectsMap.get(classId)!.add(entry.subject_id);
      });

      classMap.forEach((analytics, classId) => {
        analytics.total_teachers = classTeachersMap.get(classId)?.size || 0;
        analytics.total_subjects = classSubjectsMap.get(classId)?.size || 0;
      });

      const analyticsArray = Array.from(classMap.values()).sort(
        (a, b) => b.total_homework - a.total_homework
      );

      setClassAnalytics(analyticsArray);
    } catch (error) {
      console.error('Error loading class analytics:', error);
    }
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
      const teacherName = selectedTeacher 
        ? teachers.find(t => t.id === selectedTeacher)?.name 
        : null;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text('Diary Analytics Report', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Session: ${sessionName}`, 105, 30, { align: 'center' });
      doc.text(`Class: ${className} | Subject: ${subjectName}`, 105, 36, { align: 'center' });
      if (teacherName) {
        doc.text(`Teacher: ${teacherName}`, 105, 42, { align: 'center' });
      }

      let yPos = 50;

      // Overall Stats
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Overall Statistics', 14, yPos);
      yPos += 10;

      const statsData = [
        ['Total Homework', overallStats.totalHomework.toString()],
        ['Total Teachers', overallStats.totalTeachers.toString()],
        ['Classes Covered', overallStats.totalClasses.toString()],
        ['Subjects Covered', overallStats.totalSubjects.toString()],
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

      // Teacher Analytics
      if (teacherAnalytics.length > 0) {
        doc.setFontSize(14);
        doc.text('Teacher Performance', 14, yPos);
        yPos += 10;

        const teacherData = teacherAnalytics.map(teacher => [
          teacher.teacher_name,
          teacher.total_homework.toString(),
          teacher.total_classes.toString(),
          teacher.total_subjects.toString(),
          teacher.subjects.map(s => `${s.name} (${s.count})`).join(', '),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Teacher', 'Homework', 'Classes', 'Subjects', 'Subject Details']],
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

      // Class Analytics
      if (classAnalytics.length > 0) {
        doc.setFontSize(14);
        doc.text('Class Performance', 14, yPos);
        yPos += 10;

        const classData = classAnalytics.map(classItem => [
          classItem.class_name,
          classItem.total_homework.toString(),
          classItem.total_teachers.toString(),
          classItem.total_subjects.toString(),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Class', 'Homework', 'Teachers', 'Subjects']],
          body: classData,
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
          subject.total_homework.toString(),
          subject.total_classes.toString(),
          subject.total_teachers.toString(),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Subject', 'Homework', 'Classes', 'Teachers']],
          body: subjectData,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Monthly Distribution (if month is selected)
      if (teacherMonthlyHomework.length > 0 && selectedMonth) {
        doc.setFontSize(14);
        doc.text('Monthly Homework Distribution', 14, yPos);
        yPos += 10;

        const formatMonthForDisplay = (monthKey: string) => {
          const [year, month] = monthKey.split('-').map(Number);
          const date = new Date(year, month - 1, 1);
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        };

        const monthlyData: any[] = [];
        teacherMonthlyHomework.forEach(teacher => {
          const monthData = teacher.months.find(m => m.monthKey === selectedMonth);
          if (monthData && monthData.totalHomework > 0) {
            monthData.weeks.forEach(week => {
              if (week.homework > 0) {
                monthlyData.push([
                  teacher.teacher_name,
                  formatMonthForDisplay(monthData.monthKey),
                  `Week ${week.weekNumber}`,
                  week.homework.toString(),
                  week.classes.map(c => `${c.className} (${c.homeworkCount})`).join(', ') || 'N/A',
                ]);
              }
            });
          }
        });

        if (monthlyData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Teacher', 'Month', 'Week', 'Homework', 'Classes']],
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

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Generated on ${formatAppDate(new Date())}`,
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
          const fileName = `Diary_Analytics_${sessionName}_${new Date().toISOString().split('T')[0]}.pdf`;
          
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
                    <title>Diary Analytics PDF</title>
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
                        <h2>📄 Diary Analytics PDF Generated</h2>
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
        const fileName = `Diary_Analytics_${sessionName}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        toast.showToast('PDF exported successfully!', 'success');
      }
    } catch (error) {
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const loadSubjectAnalytics = async () => {
    if (!user?.school_id || !selectedSession) return;

    try {
      let query = supabase
        .from('homework_diary')
        .select(`
          id,
          subject_id,
          class_id,
          assigned_by,
          subjects:subject_id (id, name)
        `)
        .eq('session_id', selectedSession)
        .eq('school_id', user.school_id)
        .not('subject_id', 'is', null);

      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      }

      const homeworkData = await fetchAllRows(query);

      if (!homeworkData || homeworkData.length === 0) {
        setSubjectAnalytics([]);
        return;
      }

      const subjectMap = new Map<number, SubjectAnalytics>();
      const subjectClassesMap = new Map<number, Set<number>>();
      const subjectTeachersMap = new Map<number, Set<number>>();

      homeworkData.forEach((entry: any) => {
        const subjectId = entry.subject_id;
        const subjectData = entry.subjects;
        if (!subjectData || !subjectId) return;

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subject_id: subjectId,
            subject_name: subjectData.name,
            total_homework: 0,
            total_classes: 0,
            total_teachers: 0,
          });
          subjectClassesMap.set(subjectId, new Set());
          subjectTeachersMap.set(subjectId, new Set());
        }

        const analytics = subjectMap.get(subjectId)!;
        analytics.total_homework++;

        subjectClassesMap.get(subjectId)!.add(entry.class_id);
        if (entry.assigned_by) {
          subjectTeachersMap.get(subjectId)!.add(entry.assigned_by);
        }
      });

      subjectMap.forEach((analytics, subjectId) => {
        analytics.total_classes = subjectClassesMap.get(subjectId)?.size || 0;
        analytics.total_teachers = subjectTeachersMap.get(subjectId)?.size || 0;
      });

      const analyticsArray = Array.from(subjectMap.values()).sort(
        (a, b) => b.total_homework - a.total_homework
      );

      setSubjectAnalytics(analyticsArray);
    } catch (error) {
      console.error('Error loading subject analytics:', error);
    }
  };

  return (
    <PageContainer theme={theme}>
      <Header>
        <Title>
          <BarChartIcon style={{ fontSize: '1.2rem' }} />
          Diary Analytics
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
          {teachers.length > 0 && (
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
          <LoadingSpinner>
            <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
          </LoadingSpinner>
        ) : selectedSession ? (
          <>
            {/* Overall Stats */}
            <StatsGrid>
              <StatCard>
                <StatHeader>
                  <StatLabel>Total Homework</StatLabel>
                  <StatIcon $color="#3b82f6">
                    <AssignmentIcon />
                  </StatIcon>
                </StatHeader>
                <StatValue>{overallStats.totalHomework}</StatValue>
              </StatCard>
              <StatCard>
                <StatHeader>
                  <StatLabel>Total Teachers</StatLabel>
                  <StatIcon $color="#f59e0b">
                    <SchoolIcon />
                  </StatIcon>
                </StatHeader>
                <StatValue>{overallStats.totalTeachers}</StatValue>
              </StatCard>
              <StatCard>
                <StatHeader>
                  <StatLabel>Classes Covered</StatLabel>
                  <StatIcon $color="#10b981">
                    <ClassIcon />
                  </StatIcon>
                </StatHeader>
                <StatValue>{overallStats.totalClasses}</StatValue>
              </StatCard>
              <StatCard>
                <StatHeader>
                  <StatLabel>Subjects Covered</StatLabel>
                  <StatIcon $color="#8b5cf6">
                    <SubjectIcon />
                  </StatIcon>
                </StatHeader>
                <StatValue>{overallStats.totalSubjects}</StatValue>
              </StatCard>
            </StatsGrid>

            {/* Teacher Analytics */}
            {teacherAnalytics.length > 0 && (
              <Section>
                <SectionTitle>
                  <SchoolIcon />
                  Teacher Performance
                </SectionTitle>
                <Grid2Col>
                  {teacherAnalytics.map((teacher) => (
                    <CompactCard key={teacher.teacher_id}>
                      <CompactCardHeader>
                        <CompactCardTitle>{teacher.teacher_name}</CompactCardTitle>
                        <CompactCardValue>{teacher.total_homework}</CompactCardValue>
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
                          📚 {teacher.total_classes} classes
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
                          📖 {teacher.total_subjects} subjects
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {teacher.subjects.map((subject, idx) => (
                          <TestTag key={idx} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                            {subject.name} ({subject.count})
                          </TestTag>
                        ))}
                      </div>
                    </CompactCard>
                  ))}
                </Grid2Col>
              </Section>
            )}

            {/* Monthly Homework Distribution by Teacher */}
            {teacherMonthlyHomework.length > 0 && (() => {
              // Extract all unique months from teacherMonthlyHomework
              const allMonths = new Set<string>();
              teacherMonthlyHomework.forEach(teacher => {
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
              const filteredTeachers = teacherMonthlyHomework
                .map(teacher => {
                  const monthData = teacher.months.find(m => m.monthKey === displayMonth);
                  if (!monthData || monthData.totalHomework === 0) return null;
                  
                  return {
                    ...teacher,
                    months: [monthData] // Only show the selected month
                  };
                })
                .filter((teacher): teacher is TeacherMonthlyHomework => teacher !== null);

              return (
                <Section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <SectionTitle style={{ margin: 0 }}>
                      <TimelineIcon />
                      Monthly Homework Distribution by Teacher
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
                        <CompactCardValue>{teacherData.months[0]?.totalHomework || 0}</CompactCardValue>
                      </CompactCardHeader>
                      <div style={{ marginTop: '12px' }}>
                        {teacherData.months.map((monthData) => (
                          <div key={monthData.monthKey}>
                            {monthData.weeks.map((week, idx) => (
                              <WeekBlock key={idx} style={{ marginBottom: '8px' }}>
                                <WeekHeader>
                                  <WeekLabel style={{ fontSize: '0.8rem' }}>Week {week.weekNumber}: {week.week}</WeekLabel>
                                  <WeekCount style={{ fontSize: '0.8rem' }}>{week.homework} assignment{week.homework !== 1 ? 's' : ''}</WeekCount>
                                </WeekHeader>
                                {week.homework > 0 && week.classes.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                    {week.classes.map((classData, classIdx) => (
                                      <TestTag key={classIdx} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                        {classData.className} ({classData.homeworkCount})
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
                                    No assignments
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
                      <EmptyStateText>No homework data available for the selected month</EmptyStateText>
                    </EmptyState>
                  )}
                </Section>
              );
            })()}

            {/* Class Analytics */}
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
                        <CompactCardValue>{classData.total_homework}</CompactCardValue>
                      </CompactCardHeader>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Teachers: {classData.total_teachers}</span>
                          <span>Subjects: {classData.total_subjects}</span>
                        </div>
                      </div>
                    </CompactCard>
                  ))}
                </Grid2Col>
              </Section>
            )}

            {/* Subject Analytics */}
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
                        <CompactCardValue>{subject.total_homework}</CompactCardValue>
                      </CompactCardHeader>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Classes: {subject.total_classes}</span>
                          <span>Teachers: {subject.total_teachers}</span>
                        </div>
                      </div>
                    </CompactCard>
                  ))}
                </Grid2Col>
              </Section>
            )}

            {teacherAnalytics.length === 0 && classAnalytics.length === 0 && subjectAnalytics.length === 0 && (
              <EmptyState>
                <EmptyStateIcon>
                  <BarChartIcon />
                </EmptyStateIcon>
                <EmptyStateText>No homework data available for the selected filters</EmptyStateText>
              </EmptyState>
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

export default DiaryAnalytics;
