import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import { supabase } from '../../supabaseClient';
import { useToast } from '../../components/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLoading } from '../../contexts/LoadingContext';
import { useProgress } from '../../components/Layout';
import { PageHeaderContext } from '../../components/Layout';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import NoStudentsFound from '../../components/NoStudentsFound';
import NoSessionsFound from '../../components/NoSessionsFound';
import Loader from '../../components/Loader';
import WhatsAppBulkSender from '../../components/WhatsAppBulkSender';
import { whatsappSemiAutoService, AttendanceNotificationData } from '../../services/whatsappSemiAuto';
import { fetchRenderSettings, isDashboardCardVisible, isGuestPageAccessible, RenderSettings } from '../../services/renderSettingsService';
import { sortClasses } from '../../utils/classUtils';
import { getStudentDisplayId } from '../../utils/studentUtils';
import { useCapacitorPdfSave } from '../../hooks/useCapacitorPdfSave';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import extracted components, types, styles, utils, hooks, and services
import { DashboardTab, FineToDelete, FeeSummary, FeeCollectionDetails } from './types';
import { USE_DUMMY_DATA } from './constants';
import { DashboardContainer } from './styles';
import { useExpandedState } from './hooks/useExpandedState';
import { 
  isNoSessionError, 
  compareClassNames, 
  formatCurrency, 
  getStatus,
  getCurrentMonthRange
} from './utils/dashboardUtils';
import {
  generateDummyStudents,
  generateDummyClasses,
  generateDummySections,
  generateDummyAttendance,
  generateDummySession,
  generateDummyStudentClassHistory,
  generateDummyAbsentees,
  generateDummyAttendanceTrend,
  generateDummyClassAttendance,
  generateDummyConsecutiveAbsent
} from './utils/dummyData';
import {
  getTabCacheKey,
  isTabCacheValid,
  getCachedTabData
} from './utils/cacheUtils';
import {
  fetchFeeSummary as fetchFeeSummaryService,
  fetchCollectionChartsData as fetchCollectionChartsDataService,
  fetchFeeCollectionDetails as fetchFeeCollectionDetailsService,
  fetchDefaultersData as fetchDefaultersDataService,
  fetchAllRows
} from './services/feeService';
import { fetchAdmissionsData as fetchAdmissionsDataService } from './services/admissionsService';
import { fetchHomeworkDiary as fetchHomeworkDiaryService } from './services/homeworkService';
import { fetchAbsentees as fetchAbsenteesService } from './services/attendanceService';
import TabNavigation from './components/shared/TabNavigation';
import DeleteModal from './components/shared/DeleteModal';
import AttendanceTab from './components/AttendanceTab/AttendanceTab';
import FeeTab from './components/FeeTab/FeeTab';
import AdmissionsTab from './components/AdmissionsTab/AdmissionsTab';
import HomeworkTab from './components/HomeworkTab/HomeworkTab';

// TypeScript declaration for jsPDF autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => jsPDF;
  }
}

const Dashboard: React.FC = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { setLoading, loading } = useLoading();
  const { startProgress, completeProgress, setProgress } = useProgress();
  const { setPageHeader } = React.useContext(PageHeaderContext);
  const theme = useTheme();
  const isDark = (theme as any).BG === '#252525' || (theme as any).BG === '#181c2a';
  const savePdf = useCapacitorPdfSave();

  // Core data state
  const [students, setStudents] = useState<any[]>([]);
  const [studentClassHistory, setStudentClassHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [allDataLoaded, setAllDataLoaded] = useState(false);

  // Date state
  const [absentDate, setAbsentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dashboardDate, setDashboardDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fineDate, setFineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [admissionsDateFrom, setAdmissionsDateFrom] = useState(() => getCurrentMonthRange().from);
  const [admissionsDateTo, setAdmissionsDateTo] = useState(() => getCurrentMonthRange().to);

  // Tab state
  const [activeTab, setActiveTab] = useState<DashboardTab>('attendance');

  // Attendance state
  const [absentees, setAbsentees] = useState<any[]>([]);
  const [studentDetails, setStudentDetails] = useState<Record<string, any>>({});
  const [attendanceDataForDate, setAttendanceDataForDate] = useState<any[]>([]);
  const [halfLeavesForDate, setHalfLeavesForDate] = useState<any[]>([]);
  const [attendanceStatsLoading, setAttendanceStatsLoading] = useState(false);
  const [attendanceTrendData, setAttendanceTrendData] = useState<Array<{ day: string; rate: number }>>([]);
  const [classAttendanceData, setClassAttendanceData] = useState<Array<{
    class: string;
    present: number;
    absent: number;
    leave: number;
    late: number;
    total: number;
  }>>([]);
  const [attendanceChartsLoading, setAttendanceChartsLoading] = useState(false);
  const [todayAttendanceRate, setTodayAttendanceRate] = useState(0);
  const [weekAvgAttendanceRate, setWeekAvgAttendanceRate] = useState(0);
  const [consecutiveAbsentStudents, setConsecutiveAbsentStudents] = useState<Array<{
    student_id: number;
    student_name: string;
    father_name?: string;
    mobile?: string;
    roll_number?: string | null;
    class_name: string;
    section_name?: string;
    consecutive_days: number;
  }>>([]);
  const [consecutiveAbsentLoading, setConsecutiveAbsentLoading] = useState(false);
  const [exportAbsentLoading, setExportAbsentLoading] = useState(false);
  const [exportPresentLoading, setExportPresentLoading] = useState(false);
  const [isAbsenteesExpanded, setIsAbsenteesExpanded] = useExpandedState('dashboard_absentees_expanded');

  // Fee state
  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    collectionRate: 0
  });
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(false);
  const [dailyCollectionData, setDailyCollectionData] = useState<Array<{ day: string; amount: number }>>([]);
  const [monthlyCollectionData, setMonthlyCollectionData] = useState<Array<{ month: string; amount: number }>>([]);
  const [collectionChartsLoading, setCollectionChartsLoading] = useState(false);
  const [feeCollectionDetails, setFeeCollectionDetails] = useState<FeeCollectionDetails>({
    previousArrears: {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0
    },
    currentMonth: {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0
    },
    nextMonths: {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0
    },
    total: {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0
    }
  });
  const [feeCollectionDetailsLoading, setFeeCollectionDetailsLoading] = useState(false);
  const [defaultersData, setDefaultersData] = useState<Array<{ month: string; challan: number; amount: number }>>([]);
  const [defaultersLoading, setDefaultersLoading] = useState(false);

  // Admissions state
  const [admissionsData, setAdmissionsData] = useState({
    totalInquiries: 0,
    inquiriesThisMonth: 0,
    totalStudents: 0,
    studentsThisMonth: 0,
    totalFamilies: 0,
    familiesThisMonth: 0,
    totalFeePlans: 0,
    feePlansThisMonth: 0,
    admissionsChart: [] as any[],
    withdrawalsChart: [] as any[],
    genderData: [] as any[],
    gradeDistribution: [] as any[],
    latestAdmissions: [] as any[],
    todaysBirthdays: [] as any[],
    todaysBirthdaysCount: 0
  });
  const [admissionsLoading, setAdmissionsLoading] = useState(false);

  // Homework state
  const [homeworkDiaryData, setHomeworkDiaryData] = useState<any[]>([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const homeworkDataLoadedRef = useRef<string | null>(null);
  const homeworkFetchingRef = useRef(false);
  const [homeworkViewMode, setHomeworkViewMode] = useState<'class' | 'teacher'>('class');

  // Fine state
  const [todayCollectedFine, setTodayCollectedFine] = useState<number>(0);
  const [fineDetails, setFineDetails] = useState<any[]>([]);
  const [isFineExpanded, setIsFineExpanded] = useExpandedState('dashboard_fine_expanded');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fineToDelete, setFineToDelete] = useState<FineToDelete | null>(null);

  // WhatsApp state
  const [showWhatsAppSender, setShowWhatsAppSender] = useState(false);
  const [whatsappNotificationData, setWhatsappNotificationData] = useState<AttendanceNotificationData[]>([]);
  const [whatsappProcessing, setWhatsappProcessing] = useState(false);

  // UI state
  const [schoolName, setSchoolName] = useState<string>('');
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [dropdownIdx, setDropdownIdx] = useState<number | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('up');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [hoveredAvatar, setHoveredAvatar] = useState<{ url: string; x: number; y: number } | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refs
  const progressActiveRef = useRef(false);
  const dataLoadedRef = useRef(false);
  const prevTabRef = useRef<DashboardTab | null>(null);
  const requestCacheRef = useRef<Map<string, { data: any; timestamp: number; promise?: Promise<any> }>>(new Map());
  const sessionCacheRef = useRef<{ data: any; timestamp: number } | null>(null);
  const tabCacheRef = useRef<Map<string, { data: any; timestamp: number; params?: string }>>(new Map());

  // ==========================================
  // CACHE HELPERS
  // ==========================================
  const REQUEST_CACHE_TTL = 30000; // 30 seconds
  const SESSION_CACHE_TTL = 60000; // 1 minute
  const TAB_CACHE_TTL = 300000; // 5 minutes

  const getCachedSession = useCallback(async () => {
    const now = Date.now();
    if (sessionCacheRef.current && (now - sessionCacheRef.current.timestamp) < SESSION_CACHE_TTL) {
      return sessionCacheRef.current.data;
    }

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_active', true)
      .eq('school_id', user?.school_id)
      .maybeSingle();

    sessionCacheRef.current = { data: sessionData, timestamp: now };
    return sessionData;
  }, [user?.school_id]);

  const setCachedTabData = useCallback((cacheKey: string, data: any, params?: Record<string, any>) => {
    const paramsStr = params ? JSON.stringify(params) : '';
    tabCacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
      params: paramsStr
    });
  }, []);

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  const getClassName = useCallback((classId: any) => {
    return classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  }, [classes]);

  const getSectionName = useCallback((sectionId: any) => {
    return sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';
  }, [sections]);

  // ==========================================
  // DATA FETCHING FUNCTIONS
  // ==========================================
  
  // Fetch all initial data
  const fetchAll = useCallback(async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    if (progressActiveRef.current) {
      return;
    }

    const minDuration = 500;
    const start = Date.now();
    setLoading(true);
    progressActiveRef.current = true;
    startProgress(false);
    setProgress(10);

    const today = new Date().toISOString().slice(0, 10);
    setProgress(20);

    // DUMMY DATA MODE
    if (USE_DUMMY_DATA) {
      const dummySession = generateDummySession();
      const dummyStudents = generateDummyStudents(500);
      const dummyClasses = generateDummyClasses();
      const dummySections = generateDummySections();
      const dummySch = generateDummyStudentClassHistory(
        dummyStudents.map(s => s.id),
        dummySession.id
      );
      const dummyAttendance = generateDummyAttendance(
        dummyStudents.map(s => s.id),
        today,
        dummySession.id
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      setSessionData(dummySession);
      setHasActiveSession(true);
      setStudents(dummyStudents);
      setStudentClassHistory(dummySch);
      setClasses(dummyClasses);
      setSections(dummySections);
      setAttendanceToday(dummyAttendance);
      setLoadingStudents(false);
      setAllDataLoaded(true);
      setInitialLoad(false);

      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false;
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
        progressActiveRef.current = false;
      }
      return;
    }

    const sessionDataResult = await getCachedSession();

    if (!sessionDataResult?.id) {
      setSessionData(null);
      setHasActiveSession(false);
      setAllDataLoaded(true);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false;
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
        progressActiveRef.current = false;
      }
      return;
    }

    setProgress(30);
    setSessionData(sessionDataResult);
    setHasActiveSession(true);

    setProgress(40);
    const { data: schData, error: schError } = await supabase
      .from('student_class_history')
      .select('student_id')
      .eq('session_id', sessionDataResult.id)
      .eq('school_id', user.school_id);

    if (schError || !schData || schData.length === 0) {
      setStudents([]);
      setClasses([]);
      setSections([]);
      setAttendanceToday([]);
      setLoadingStudents(false);
      setAllDataLoaded(true);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false;
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
        progressActiveRef.current = false;
      }
      return;
    }

    const studentIds = schData.map(sch => sch.student_id);
    setProgress(60);

    const limitedStudentIds = studentIds.slice(0, 5000);
    const [{ data: studentsData }, { data: classesData }, { data: sectionsData }, { data: attendanceData }] = await Promise.all([
      supabase.from('students')
        .select('id, name, father_name, gender, status, class_id, section_id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', limitedStudentIds),
      supabase.from('classes').select('id, name').eq('school_id', user.school_id),
      supabase.from('sections').select('id, name').eq('school_id', user.school_id),
      supabase.from('attendance_records')
        .select('student_id, status, date')
        .eq('date', today)
        .eq('session_id', sessionDataResult.id)
        .eq('school_id', user.school_id),
    ]);

    setProgress(80);
    setStudents(studentsData || []);
    setStudentClassHistory(schData || []);
    setClasses(classesData || []);
    setSections(sectionsData || []);
    setAttendanceToday(attendanceData || []);

    setProgress(90);
    setLoadingStudents(false);
    setProgress(100);
    setInitialLoad(false);
    setAllDataLoaded(true);

    const elapsed = Date.now() - start;
    if (elapsed < minDuration) {
      setTimeout(() => {
        setLoading(false);
        completeProgress();
        progressActiveRef.current = false;
      }, minDuration - elapsed);
    } else {
      setLoading(false);
      completeProgress();
      progressActiveRef.current = false;
    }
  }, [user?.school_id, toast, setLoading, getCachedSession, startProgress, completeProgress, setProgress]);

  // Fetch absentees
  useEffect(() => {
    if (!absentDate || !user?.school_id) return;
    fetchAbsenteesService(
      String(user.school_id),
      absentDate,
      sessionData?.id || '',
      students,
      setAbsentees,
      setStudentDetails,
      getCachedSession
    );
  }, [absentDate, user?.school_id, students, sessionData?.id, getCachedSession]);

  // Fetch attendance for date
  useEffect(() => {
    const fetchAttendanceForDate = async () => {
      if (!user?.school_id || !dashboardDate) return;

      setAttendanceStatsLoading(true);
      if (USE_DUMMY_DATA) {
        const dummyStudentIds = students.length > 0 
          ? students.map(s => s.id)
          : Array.from({ length: 500 }, (_, i) => i + 1);
        const dummyAttendance = generateDummyAttendance(dummyStudentIds, dashboardDate, sessionData?.id || 1);
        setAttendanceDataForDate(dummyAttendance);
        setHalfLeavesForDate([]);
        setAttendanceStatsLoading(false);
        return;
      }

      const sessionDataResult = await getCachedSession();
      if (!sessionDataResult?.id) {
        setAttendanceDataForDate([]);
        setHalfLeavesForDate([]);
        setAttendanceStatsLoading(false);
        return;
      }

      const [attendanceResult, halfLeavesResult] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('student_id, status, date')
          .eq('date', dashboardDate)
          .eq('session_id', sessionDataResult.id)
          .eq('school_id', user.school_id),
        supabase
          .from('half_leaves')
          .select('person_id')
          .eq('date', dashboardDate)
          .eq('session_id', sessionDataResult.id)
          .eq('school_id', user.school_id)
          .eq('person_type', 'student')
      ]);

      setAttendanceDataForDate(attendanceResult.data || []);
      setHalfLeavesForDate(halfLeavesResult.data || []);
      setAttendanceStatsLoading(false);
    };
    fetchAttendanceForDate();
  }, [dashboardDate, user?.school_id, students, sessionData?.id, getCachedSession]);

  // Calculate attendance stats
  const presentToday = attendanceDataForDate.filter(a => a.status === 'present').length;
  const absentToday = attendanceDataForDate.filter(a => a.status === 'absent').length;
  const leaveToday = attendanceDataForDate.filter(a => a.status === 'leave').length;
  const lateToday = attendanceDataForDate.filter(a => a.status === 'late').length;
  const halfLeaveCount = halfLeavesForDate.length;
  const totalMarked = attendanceDataForDate.length;
  const presentPercent = totalMarked ? Math.round((presentToday / totalMarked) * 1000) / 10 : 0;
  const absentPercent = totalMarked ? Math.round((absentToday / totalMarked) * 1000) / 10 : 0;
  const leavePercent = totalMarked ? Math.round((leaveToday / totalMarked) * 1000) / 10 : 0;
  const latePercent = totalMarked ? Math.round((lateToday / totalMarked) * 1000) / 10 : 0;
  const halfLeavePercent = totalMarked ? Math.round((halfLeaveCount / totalMarked) * 1000) / 10 : 0;

  // Fetch attendance trend
  useEffect(() => {
    const fetchAttendanceTrend = async () => {
      if (!user?.school_id || !sessionData?.id || !dashboardDate) return;

      setAttendanceChartsLoading(true);
      try {
        if (USE_DUMMY_DATA) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const trendData = generateDummyAttendanceTrend();
          setAttendanceTrendData(trendData);
          setTodayAttendanceRate(trendData[trendData.length - 1]?.rate || 85);
          setWeekAvgAttendanceRate(Math.round(trendData.reduce((sum, d) => sum + d.rate, 0) / trendData.length));
          setAttendanceChartsLoading(false);
          return;
        }

        const selectedDate = new Date(dashboardDate);
        const trendData: Array<{ day: string; rate: number }> = [];
        let totalRate = 0;

        const selectedDateStr = selectedDate.toISOString().slice(0, 10);
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        // Only look back 14 days to find 7 working days (to account for weekends/holidays)
        const startDate = new Date(selectedDate);
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);

        const startDateStr = startDate.toISOString().slice(0, 10);
        const endDateStr = endDate.toISOString().slice(0, 10);

        const { data: holidaysData } = await supabase
          .from('holidays')
          .select('start_date, end_date')
          .eq('school_id', user.school_id)
          .lte('start_date', endDateStr)
          .gte('end_date', startDateStr);

        const holidayDates = new Set<string>();
        if (holidaysData) {
          holidaysData.forEach((holiday: any) => {
            const holidayStart = new Date(holiday.start_date);
            const holidayEnd = new Date(holiday.end_date);
            const current = new Date(holidayStart);
            while (current <= holidayEnd) {
              const dateStr = current.toISOString().slice(0, 10);
              if (dateStr >= startDateStr && dateStr <= endDateStr) {
                holidayDates.add(dateStr);
              }
              current.setDate(current.getDate() + 1);
            }
          });
        }

        const selectedDayOfWeek = selectedDate.getDay();
        const isSelectedDateWorkingDay = selectedDayOfWeek !== 0 && !holidayDates.has(selectedDateStr);

        const workingDays: Array<{ date: Date; dateStr: string; dayName: string }> = [];
        let daysBack = 0;
        let workingDaysCount = 0;

        if (isSelectedDateWorkingDay) {
          const dayName = `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`;
          workingDays.push({
            date: new Date(selectedDate),
            dateStr: selectedDateStr,
            dayName
          });
          workingDaysCount++;
          daysBack = 1;
        } else {
          daysBack = 1;
        }

        // Only fetch 7 working days (one week) from selected date
        while (workingDaysCount < 7 && daysBack < 30) {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() - daysBack);
          const dateStr = date.toISOString().slice(0, 10);
          const dayOfWeek = date.getDay();

          if (dayOfWeek !== 0 && !holidayDates.has(dateStr) && dateStr >= startDateStr) {
            const dayName = `${date.getDate()}/${date.getMonth() + 1}`;
            workingDays.push({ date, dateStr, dayName });
            workingDaysCount++;
          }
          daysBack++;
        }

        workingDays.sort((a, b) => {
          if (a.dateStr === selectedDateStr) return 1;
          if (b.dateStr === selectedDateStr) return -1;
          return a.dateStr.localeCompare(b.dateStr);
        });

        const selectedDateIndex = workingDays.findIndex(wd => wd.dateStr === selectedDateStr);
        if (selectedDateIndex >= 0 && selectedDateIndex !== workingDays.length - 1) {
          const selectedDateItem = workingDays.splice(selectedDateIndex, 1)[0];
          workingDays.push(selectedDateItem);
        }

        if (workingDays.length === 0) {
          setAttendanceTrendData([]);
          setTodayAttendanceRate(0);
          setWeekAvgAttendanceRate(0);
          setAttendanceChartsLoading(false);
          return;
        }

        const workingDaysDateStrs = new Set(workingDays.map(wd => wd.dateStr));
        const minDate = workingDays[0].dateStr;
        const maxDate = workingDays[workingDays.length - 1].dateStr;

        const { data: allAttendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('date, status')
          .gte('date', minDate)
          .lte('date', maxDate)
          .eq('session_id', sessionData.id)
          .eq('school_id', user.school_id);
        
        if (attendanceError) {
          console.error('Error fetching attendance trend:', attendanceError);
          setAttendanceChartsLoading(false);
          return;
        }

        const attendanceByDate = new Map<string, { total: number; present: number }>();

        workingDays.forEach(({ dateStr }) => {
          attendanceByDate.set(dateStr, { total: 0, present: 0 });
        });

        if (allAttendanceData && allAttendanceData.length > 0) {
          allAttendanceData.forEach((record: any) => {
            let dateStr = record.date;
            if (dateStr && typeof dateStr === 'string') {
              dateStr = dateStr.split('T')[0];
              if (workingDaysDateStrs.has(dateStr)) {
                const stats = attendanceByDate.get(dateStr);
                if (stats) {
                  stats.total++;
                  if (record.status === 'present' || record.status === 'late') {
                    stats.present++;
                  }
                }
              }
            }
          });
        }

        if (isSelectedDateWorkingDay && workingDaysDateStrs.has(selectedDateStr)) {
          const selectedDatePresent = attendanceDataForDate.filter(a =>
            a.status === 'present' || a.status === 'late'
          ).length;
          const selectedDateTotal = attendanceDataForDate.length;

          attendanceByDate.set(selectedDateStr, {
            total: selectedDateTotal,
            present: selectedDatePresent
          });
        }

        workingDays.forEach(({ dateStr, dayName }) => {
          const stats = attendanceByDate.get(dateStr) || { total: 0, present: 0 };
          const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
          trendData.push({ day: dayName, rate });
          totalRate += rate;
        });

        setAttendanceTrendData(trendData);

        let todayRate = 0;
        if (isSelectedDateWorkingDay) {
          const selectedDatePresent = attendanceDataForDate.filter(a =>
            a.status === 'present' || a.status === 'late'
          ).length;
          const selectedDateTotal = attendanceDataForDate.length;
          todayRate = selectedDateTotal > 0
            ? Math.round((selectedDatePresent / selectedDateTotal) * 100)
            : 0;
        } else {
          todayRate = trendData[trendData.length - 1]?.rate || 0;
        }
        const avg = trendData.length > 0 ? Math.round(totalRate / trendData.length) : 0;
        setTodayAttendanceRate(todayRate);
        setWeekAvgAttendanceRate(avg);
      } catch (error) {
        console.error('Error fetching attendance trend:', error);
      } finally {
        setAttendanceChartsLoading(false);
      }
    };
    fetchAttendanceTrend();
  }, [dashboardDate, user?.school_id, sessionData?.id, attendanceDataForDate]);

  // Fetch class attendance
  useEffect(() => {
    const fetchClassAttendance = async () => {
      if (!user?.school_id || !sessionData?.id) return;

      try {
        if (USE_DUMMY_DATA) {
          const classData = generateDummyClassAttendance();
          setClassAttendanceData(classData);
          return;
        }

        const today = dashboardDate;

        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', user.school_id);

        if (classesError || !classesData || classesData.length === 0) {
          setClassAttendanceData([]);
          return;
        }

        const sortedClasses = sortClasses(classesData);
        const classIds = sortedClasses.map(c => c.id);

        let allStudentHistory: any[] = [];
        const { data: dataWithStatus, error: errorWithStatus } = await supabase
          .from('student_class_history')
          .select('student_id, new_class_id')
          .in('new_class_id', classIds)
          .eq('session_id', sessionData.id)
          .eq('school_id', user.school_id)
          .eq('status', 'active');

        if (!errorWithStatus && dataWithStatus) {
          allStudentHistory = dataWithStatus;
        } else {
          const { data: dataWithoutStatus } = await supabase
            .from('student_class_history')
            .select('student_id, new_class_id')
            .in('new_class_id', classIds)
            .eq('session_id', sessionData.id)
            .eq('school_id', user.school_id);

          if (dataWithoutStatus) {
            allStudentHistory = dataWithoutStatus;
          }
        }

        const allStudentIds = Array.from(new Set(allStudentHistory.map(sh => sh.student_id)));
        let allAttendanceRecords: any[] = [];
        
        if (allStudentIds.length > 0) {
          const chunkSize = 1000;
          for (let i = 0; i < allStudentIds.length; i += chunkSize) {
            const chunk = allStudentIds.slice(i, i + chunkSize);
            const { data: attendanceChunk } = await supabase
              .from('attendance_records')
              .select('status, student_id')
              .eq('date', today)
              .in('student_id', chunk)
              .eq('session_id', sessionData.id)
              .eq('school_id', user.school_id);

            if (attendanceChunk) {
              allAttendanceRecords.push(...attendanceChunk);
            }
          }
        }

        const studentsByClass = new Map<number, Set<number>>();
        allStudentHistory.forEach(sh => {
          if (!sh.new_class_id) return;
          if (!studentsByClass.has(sh.new_class_id)) {
            studentsByClass.set(sh.new_class_id, new Set());
          }
          studentsByClass.get(sh.new_class_id)!.add(sh.student_id);
        });

        const { data: allAttendanceWithClass } = await supabase
          .from('attendance_records')
          .select('class_id, status')
          .eq('date', today)
          .eq('session_id', sessionData.id)
          .eq('school_id', user.school_id)
          .in('class_id', classIds);

        const attendanceCounts = new Map<string, number>();
        if (allAttendanceWithClass) {
          allAttendanceWithClass.forEach(record => {
            const key = `${record.class_id}_${record.status}`;
            attendanceCounts.set(key, (attendanceCounts.get(key) || 0) + 1);
          });
        }

        const classAttendance: Array<{
          class: string;
          present: number;
          absent: number;
          leave: number;
          late: number;
          total: number;
        }> = [];

        for (const cls of sortedClasses) {
          const studentsInClass = studentsByClass.get(cls.id);
          if (!studentsInClass || studentsInClass.size === 0) {
            classAttendance.push({
              class: cls.name,
              present: 0,
              absent: 0,
              leave: 0,
              late: 0,
              total: 0
            });
            continue;
          }

          const presentCount = attendanceCounts.get(`${cls.id}_present`) || 0;
          const absentCount = attendanceCounts.get(`${cls.id}_absent`) || 0;
          const leaveCount = attendanceCounts.get(`${cls.id}_leave`) || 0;
          const lateCount = attendanceCounts.get(`${cls.id}_late`) || 0;

          classAttendance.push({
            class: cls.name,
            present: presentCount,
            absent: absentCount,
            leave: leaveCount,
            late: lateCount,
            total: studentsInClass.size
          });
        }

        setClassAttendanceData(classAttendance);
      } catch (error) {
        console.error('Error fetching class attendance:', error);
        setClassAttendanceData([]);
      }
    };
    fetchClassAttendance();
  }, [dashboardDate, user?.school_id, sessionData?.id]);

  // Fetch consecutive absent
  useEffect(() => {
    const fetchConsecutiveAbsent = async () => {
      if (!user?.school_id || !sessionData?.id) return;

      setConsecutiveAbsentLoading(true);
      try {
        if (USE_DUMMY_DATA) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setConsecutiveAbsentStudents(generateDummyConsecutiveAbsent());
          setConsecutiveAbsentLoading(false);
          return;
        }

        const today = dashboardDate;

        const { data: absentTodayRecords, error: absentTodayError } = await supabase
          .from('attendance_records')
          .select('student_id, class_id, section_id')
          .eq('date', dashboardDate)
          .eq('status', 'absent')
          .eq('session_id', sessionData.id)
          .eq('school_id', user.school_id);

        if (absentTodayError || !absentTodayRecords || absentTodayRecords.length === 0) {
          setConsecutiveAbsentStudents([]);
          setConsecutiveAbsentLoading(false);
          return;
        }

        const absentStudentIds = absentTodayRecords.map(r => r.student_id);
        const uniqueStudentIds = Array.from(new Set(absentStudentIds));

        const { data: studentsData } = await supabase
          .from('students')
          .select('id, name, father_name, phone, roll_number')
          .in('id', uniqueStudentIds)
          .eq('school_id', user.school_id);

        const allClassIds = absentTodayRecords.map(r => r.class_id).filter((id): id is number => Boolean(id));
        const classIds = Array.from(new Set(allClassIds));
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds)
          .eq('school_id', user.school_id);

        const allSectionIds = absentTodayRecords.map(r => r.section_id).filter((id): id is number => Boolean(id));
        const sectionIds = Array.from(new Set(allSectionIds));
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, name')
          .in('id', sectionIds)
          .eq('school_id', user.school_id);

        const studentsMap = new Map((studentsData || []).map(s => [s.id, s]));
        const classesMap = new Map((classesData || []).map(c => [c.id, c]));
        const sectionsMap = new Map((sectionsData || []).map(s => [s.id, s]));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

        const chunkSize = 1000;
        let allAttendanceRecords: any[] = [];

        for (let i = 0; i < absentStudentIds.length; i += chunkSize) {
          const chunk = absentStudentIds.slice(i, i + chunkSize);
          const { data: attendanceChunk } = await supabase
            .from('attendance_records')
            .select('student_id, date, status')
            .in('student_id', chunk)
            .gte('date', startDate)
            .lte('date', today)
            .eq('session_id', sessionData.id)
            .eq('school_id', user.school_id)
            .order('date', { ascending: false });

          if (attendanceChunk) {
            allAttendanceRecords.push(...attendanceChunk);
          }
        }

        const studentAttendanceMap = new Map<number, Array<{ date: string; status: string }>>();
        allAttendanceRecords.forEach(record => {
          if (!studentAttendanceMap.has(record.student_id)) {
            studentAttendanceMap.set(record.student_id, []);
          }
          studentAttendanceMap.get(record.student_id)!.push({
            date: record.date,
            status: record.status
          });
        });

        const consecutiveAbsent: Array<{
          student_id: number;
          student_name: string;
          father_name?: string;
          mobile?: string;
          roll_number?: string | null;
          class_name: string;
          section_name?: string;
          consecutive_days: number;
        }> = [];

        absentTodayRecords.forEach(absentRecord => {
          const studentId = absentRecord.student_id;
          const attendanceRecords = studentAttendanceMap.get(studentId) || [];

          if (attendanceRecords.length < 3) {
            return;
          }

          attendanceRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const previousRecord1 = attendanceRecords[1];
          const previousRecord2 = attendanceRecords[2];

          if (previousRecord1.status === 'absent' && previousRecord2.status === 'absent') {
            let consecutiveDays = 1;
            let checkIndex = 1;

            while (checkIndex < attendanceRecords.length) {
              const record = attendanceRecords[checkIndex];
              if (record.status === 'absent') {
                consecutiveDays++;
                checkIndex++;
              } else {
                break;
              }
            }

            const student = studentsMap.get(studentId);
            const classData = classesMap.get(absentRecord.class_id);
            const sectionData = sectionsMap.get(absentRecord.section_id);

            consecutiveAbsent.push({
              student_id: studentId,
              student_name: student?.name || 'Unknown',
              father_name: student?.father_name || '',
              mobile: student?.phone || '',
              roll_number: student?.roll_number || null,
              class_name: classData?.name || 'Unknown',
              section_name: sectionData?.name,
              consecutive_days: consecutiveDays
            });
          }
        });

        consecutiveAbsent.sort((a, b) => b.consecutive_days - a.consecutive_days);
        setConsecutiveAbsentStudents(consecutiveAbsent);
      } catch (error) {
        console.error('Error fetching consecutive absent:', error);
        setConsecutiveAbsentStudents([]);
      } finally {
        setConsecutiveAbsentLoading(false);
      }
    };
    fetchConsecutiveAbsent();
  }, [user?.school_id, sessionData?.id, dashboardDate]);

  // Fetch fee summary
  useEffect(() => {
    if (activeTab !== 'fee') return;
    const cacheKey = getTabCacheKey('fee_summary', { school_id: user?.school_id });
    const cached = tabCacheRef.current.get(cacheKey);
    if (isTabCacheValid(cached, { school_id: user?.school_id })) {
      const cachedData = getCachedTabData(cached);
      if (cachedData) {
        setFeeSummary(cachedData);
        setFeeSummaryLoading(false);
        return;
      }
    }
    fetchFeeSummaryService(
      user?.school_id ? String(user.school_id) : '',
      setFeeSummary,
      setFeeSummaryLoading,
      getCachedSession,
      setCachedTabData
    );
  }, [activeTab, user?.school_id, getCachedSession]);

  // Fetch collection charts
  useEffect(() => {
    if (activeTab !== 'fee') return;
    const cacheKey = getTabCacheKey('fee_collection_charts', { 
      school_id: user?.school_id, 
      dashboardDate 
    });
    const cached = tabCacheRef.current.get(cacheKey);
    if (isTabCacheValid(cached, { school_id: user?.school_id, dashboardDate })) {
      const cachedData = getCachedTabData(cached);
      if (cachedData) {
        setDailyCollectionData(cachedData.daily || []);
        setMonthlyCollectionData(cachedData.monthly || []);
        setCollectionChartsLoading(false);
        return;
      }
    }
    fetchCollectionChartsDataService(
      user?.school_id ? String(user.school_id) : '',
      dashboardDate,
      setDailyCollectionData,
      setMonthlyCollectionData,
      setCollectionChartsLoading,
      setCachedTabData
    );
  }, [activeTab, dashboardDate, user?.school_id, setCachedTabData]);

  // Fetch fee collection details
  useEffect(() => {
    if (activeTab !== 'fee') return;
    const cacheKey = getTabCacheKey('fee_collection_details', { 
      school_id: user?.school_id, 
      dashboardDate 
    });
    const cached = tabCacheRef.current.get(cacheKey);
    if (isTabCacheValid(cached, { school_id: user?.school_id, dashboardDate })) {
      const cachedData = getCachedTabData(cached);
      if (cachedData) {
        setFeeCollectionDetails(cachedData);
        setFeeCollectionDetailsLoading(false);
        return;
      }
    }
    fetchFeeCollectionDetailsService(
      user?.school_id ? String(user.school_id) : '',
      dashboardDate,
      setFeeCollectionDetails,
      setFeeCollectionDetailsLoading,
      setCachedTabData
    );
  }, [activeTab, dashboardDate, user?.school_id, setCachedTabData]);

  // Fetch defaulters
  useEffect(() => {
    if (activeTab !== 'fee') return;
    const cacheKey = getTabCacheKey('fee_defaulters', { 
      school_id: user?.school_id, 
      dashboardDate 
    });
    const cached = tabCacheRef.current.get(cacheKey);
    if (isTabCacheValid(cached, { school_id: user?.school_id, dashboardDate })) {
      const cachedData = getCachedTabData(cached);
      if (cachedData) {
        setDefaultersData(cachedData);
        setDefaultersLoading(false);
        return;
      }
    }
    fetchDefaultersDataService(
      user?.school_id ? String(user.school_id) : '',
      dashboardDate,
      setDefaultersData,
      setDefaultersLoading,
      setCachedTabData
    );
  }, [activeTab, dashboardDate, user?.school_id, setCachedTabData]);

  // Fetch admissions data
  useEffect(() => {
    if (activeTab !== 'admissions') {
      prevTabRef.current = activeTab;
      return;
    }

    const cacheKey = getTabCacheKey('admissions', { 
      school_id: user?.school_id, 
      fromDate: admissionsDateFrom, 
      toDate: admissionsDateTo 
    });
    const cached = tabCacheRef.current.get(cacheKey);
    
    if (isTabCacheValid(cached, { 
      school_id: user?.school_id, 
      fromDate: admissionsDateFrom, 
      toDate: admissionsDateTo 
    })) {
      const cachedData = getCachedTabData(cached);
      if (cachedData) {
        setAdmissionsData(cachedData);
        setAdmissionsLoading(false);
        return;
      }
    }

    fetchAdmissionsDataService(
      user?.school_id ? String(user.school_id) : '',
      admissionsDateFrom,
      admissionsDateTo,
      setAdmissionsData,
      setAdmissionsLoading,
      getCachedSession,
      setCachedTabData
    );
  }, [activeTab, admissionsDateFrom, admissionsDateTo, user?.school_id, getCachedSession, setCachedTabData]);

  // Fetch homework diary
  useEffect(() => {
    if (activeTab !== 'homework') return;
    if (homeworkFetchingRef.current) return;

    const cacheKey = getTabCacheKey('homework', { 
      school_id: user?.school_id, 
      dashboardDate 
    });
    const cached = tabCacheRef.current.get(cacheKey);

    if (isTabCacheValid(cached, { 
      school_id: user?.school_id, 
      dashboardDate 
    })) {
      const cachedData = getCachedTabData(cached);
      if (cachedData) {
        setHomeworkDiaryData(cachedData);
        setHomeworkLoading(false);
        return;
      }
    }

    homeworkFetchingRef.current = true;
    fetchHomeworkDiaryService(
      user?.school_id ? String(user.school_id) : '',
      dashboardDate,
      setHomeworkDiaryData,
      setHomeworkLoading,
      setCachedTabData
    ).finally(() => {
      homeworkFetchingRef.current = false;
    });
  }, [activeTab, dashboardDate, user?.school_id]);

  // ==========================================
  // INITIAL DATA LOADING
  // ==========================================
  useEffect(() => {
    if (user?.school_id && !dataLoadedRef.current) {
      const sessionData = sessionCacheRef.current?.data;
      if (sessionData?.id) {
        const cacheKey = getTabCacheKey('attendance_main', { 
          school_id: user.school_id,
          session_id: sessionData.id
        });
        const cached = tabCacheRef.current.get(cacheKey);
        
        if (isTabCacheValid(cached, { 
          school_id: user.school_id,
          session_id: sessionData.id
        })) {
          const cachedData = getCachedTabData(cached);
          if (cachedData) {
            setStudents(cachedData.students || []);
            setStudentClassHistory(cachedData.studentClassHistory || []);
            setClasses(cachedData.classes || []);
            setSections(cachedData.sections || []);
            setAttendanceToday(cachedData.attendanceToday || []);
            if (cachedData.sessionData) {
              setSessionData(cachedData.sessionData);
              setHasActiveSession(true);
            }
            setLoadingStudents(false);
            setAllDataLoaded(true);
            setInitialLoad(false);
            dataLoadedRef.current = true;
            return;
          }
        }
      }
      
      dataLoadedRef.current = true;
      setTimeout(() => {
        fetchAll();
      }, 0);
    }
  }, [user?.school_id, fetchAll]);

  // Fetch render settings
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.role !== 'Guest') {
        setSettingsLoading(false);
        return;
      }

      setSettingsLoading(true);
      try {
        const settings = await fetchRenderSettings(user.school_id as number);
        setRenderSettings(settings);
      } catch (error) {
        console.error('Error fetching render settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadSettings();
  }, [user?.school_id, user?.role]);

  // Fetch school name
  useEffect(() => {
    const fetchSchoolName = async () => {
      if (!user?.school_id) return;
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('name')
          .eq('id', user.school_id)
          .single();
        if (!error && data) {
          setSchoolName(data.name);
        }
      } catch (error) {
        console.error('Error fetching school name:', error);
      }
    };
    fetchSchoolName();
  }, [user?.school_id]);

  // Cleanup
  useEffect(() => {
    return () => {
      progressActiveRef.current = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownIdx(null);
      }
    }
    if (dropdownIdx !== null) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownIdx]);

  // ==========================================
  // EXPORT FUNCTIONS
  // ==========================================
  const exportAbsenteesPDF = useCallback(async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    setExportAbsentLoading(true);
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileDevice) {
        toast.showToast('Generating PDF for mobile... Please wait.', 'success');
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError && !isNoSessionError(sessionError)) {
        toast.showToast('Failed to fetch active session', 'error');
        setExportAbsentLoading(false);
        return;
      }

      if (!sessionData?.id) {
        toast.showToast('No active session found', 'error');
        setExportAbsentLoading(false);
        return;
      }

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          status,
          remarks,
          date,
          class_id,
          section_id
        `)
        .eq('date', absentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id)
        .or('status.eq.absent,status.eq.leave');

      if (attendanceError || !attendanceData || attendanceData.length === 0) {
        toast.showToast('No absentees to export.', 'error');
        setExportAbsentLoading(false);
        return;
      }

      const studentIds = attendanceData
        .map(record => record.student_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      if (studentIds.length === 0) {
        toast.showToast('No absentees to export.', 'error');
        setExportAbsentLoading(false);
        return;
      }

      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          phone,
          class_id,
          section_id
        `)
        .in('id', studentIds)
        .eq('school_id', user.school_id);

      if (!studentsData) {
        toast.showToast('Failed to fetch absentees details.', 'error');
        setExportAbsentLoading(false);
        return;
      }

      const classIds = studentsData.map(student => student.class_id).filter((id, index, self) => self.indexOf(id) === index);
      const sectionIds = studentsData.map(student => student.section_id).filter((id, index, self) => self.indexOf(id) === index);

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
        .eq('school_id', user.school_id);

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name')
        .in('id', sectionIds)
        .eq('school_id', user.school_id);

      const classMap = new Map((classesData || []).map(cls => [cls.id, cls.name]));
      const sectionMap = new Map((sectionsData || []).map(sec => [sec.id, sec.name]));

      const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

      const { data: monthlyAttendance } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .in('student_id', studentIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('school_id', user.school_id);

      const absentStudents = studentsData.map(student => {
        const attendanceRecord = attendanceData.find(record => record.student_id === student.id);
        const studentMonthlyAttendance = monthlyAttendance?.filter(a => a.student_id === student.id) || [];
        const totalDays = studentMonthlyAttendance.length;
        const absentDays = studentMonthlyAttendance.filter(a => a.status === 'absent' || a.status === 'leave').length;
        const attendancePercentage = totalDays > 0 ? ((totalDays - absentDays) / totalDays * 100).toFixed(1) : '100.0';

        return {
          id: student.id,
          name: student.name || '',
          father_name: student.father_name || '',
          phone: student.phone || '',
          class: `${classMap.get(student.class_id) || ''} (${sectionMap.get(student.section_id) || ''})`,
          class_name: classMap.get(student.class_id) || '',
          section_name: sectionMap.get(student.section_id) || '',
          status: attendanceRecord?.status || 'absent',
          monthly_absences: absentDays,
          attendance_percentage: attendancePercentage
        };
      }).sort((a, b) => {
        const classComparison = compareClassNames(a.class_name, b.class_name);
        if (classComparison !== 0) return classComparison;
        return a.name.localeCompare(b.name);
      });

      const { data: completeAttendanceData } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .eq('date', absentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id);

      const presentCount = completeAttendanceData?.filter(a => a.status === 'present').length || 0;
      const absentCount = completeAttendanceData?.filter(a => a.status === 'absent').length || 0;
      const leaveCount = completeAttendanceData?.filter(a => a.status === 'leave').length || 0;
      const lateCount = completeAttendanceData?.filter(a => a.status === 'late').length || 0;
      const totalCount = completeAttendanceData?.length || 0;
      const attPercent = totalCount ? (((presentCount + lateCount) / totalCount) * 100).toFixed(1) : '0.0';

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Absent Students Report', 15, 18);
      doc.setFontSize(11);
      const [yyyy, mm, dd] = absentDate.split('-');
      const formattedDate = `${dd}-${mm}-${yyyy}`;
      doc.text(`Date: ${formattedDate}`, 15, 26);
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text(`Total: ${totalCount}`, 120, 18);
      doc.setTextColor(34, 197, 94);
      doc.text(`Present: ${presentCount + lateCount}`, 120, 24);
      doc.setTextColor(239, 68, 68);
      doc.text(`Absent: ${absentCount}`, 170, 18);
      doc.setTextColor(37, 99, 235);
      doc.text(`Leave: ${leaveCount}`, 170, 24);
      doc.setTextColor(234, 179, 8);
      doc.text(`Late: ${lateCount}`, 120, 30);
      let perColor: [number, number, number] = [34, 197, 94];
      const perVal = parseFloat(attPercent);
      if (perVal < 75) perColor = [239, 68, 68];
      else if (perVal < 85) perColor = [234, 179, 8];
      doc.setTextColor(...perColor);
      doc.text(`Per%: ${attPercent}%`, 170, 30);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 36,
        head: [['SNo', 'ID', 'Name', 'Father Name', 'Mobile', 'Class', 'Status', 'M.A', 'Att%']],
        body: absentStudents.map((student, idx) => [
          idx + 1,
          getStudentDisplayId(student),
          student.name,
          student.father_name,
          student.phone,
          student.class,
          student.status,
          student.monthly_absences,
          `${student.attendance_percentage}%`
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2,
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          halign: 'center',
          textColor: [60, 60, 60],
          minCellHeight: 6,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        alternateRowStyles: { fillColor: [232, 240, 254] },
        margin: { top: 36, left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 14, halign: 'center' },
          2: { cellWidth: 32, halign: 'left' },
          3: { cellWidth: 32, halign: 'left' },
        },
        didParseCell: function (data) {
          if (data.column.index === 6) {
            if (data.cell.raw === 'Absent') data.cell.styles.textColor = [239, 68, 68];
            if (data.cell.raw === 'Leave') data.cell.styles.textColor = [37, 99, 235];
          }
          if (data.column.index === 8) {
            const percent = parseInt(String(data.cell.raw || '').replace('%', ''));
            if (percent < 75) data.cell.styles.textColor = [239, 68, 68];
            else if (percent < 85) data.cell.styles.textColor = [234, 179, 8];
            else data.cell.styles.textColor = [34, 197, 94];
          }
        },
      });

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        10,
        doc.internal.pageSize.height - 10
      );

      const isCapacitor = !!(window as any).Capacitor && !!(window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();
      const isElectron = !!(window as any).electron || (typeof window !== 'undefined' && (window as any).process?.type === 'renderer');
      
      if (isCapacitor) {
        const pdfBlob = doc.output('blob');
        await savePdf(pdfBlob, `Absent Students (${formattedDate}).pdf`, true);
      } else if (isElectron) {
        let electron;
        try {
          electron = (window as any).electron || (window as any).require && (window as any).require('electron');
        } catch (e) { electron = null; }
        if (electron && electron.remote && electron.remote.dialog && electron.remote.app) {
          const path = electron.remote.require('path');
          const documentsPath = electron.remote.app.getPath('documents');
          const defaultFilePath = path.join(documentsPath, `Absent Students (${formattedDate}).pdf`);
          const { filePath } = await electron.remote.dialog.showSaveDialog({
            title: 'Save Absent Students Report',
            defaultPath: defaultFilePath,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
          });
          if (filePath) {
            const pdfBuffer = doc.output('arraybuffer');
            const fs = electron.remote.require('fs');
            fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
            alert(`PDF saved successfully to: ${filePath}`);
          }
        } else {
          const formatDateForFileName = (date: Date) => {
            const day = date.getDate().toString().padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          };
          const fileName = `Absent Students (${formatDateForFileName(new Date())}).pdf`;
          doc.save(fileName);
          toast.showToast('Absent students PDF generated successfully', 'success');
        }
      } else {
        const formatDateForFileName = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
        const fileName = `Absent Students (${formatDateForFileName(new Date())}).pdf`;
        doc.save(fileName);
        toast.showToast('Absent students PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting absentees PDF:', error);
      toast.showToast('Failed to export absentees PDF', 'error');
    } finally {
      setExportAbsentLoading(false);
    }
  }, [absentees, user?.school_id, absentDate, schoolName, toast, savePdf, getCachedSession]);

  const exportPresentStudentsPDF = useCallback(async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    setExportPresentLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError && !isNoSessionError(sessionError)) {
        toast.showToast('Failed to fetch active session', 'error');
        setExportPresentLoading(false);
        return;
      }

      if (!sessionData?.id) {
        toast.showToast('No active session found', 'error');
        setExportPresentLoading(false);
        return;
      }

      const presentRecords = attendanceDataForDate.filter(a => a.status === 'present' || a.status === 'late');
      if (presentRecords.length === 0) {
        toast.showToast('No present students to export.', 'error');
        setExportPresentLoading(false);
        return;
      }

      const studentIds = presentRecords
        .map(record => record.student_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          phone,
          class_id,
          section_id
        `)
        .in('id', studentIds)
        .eq('school_id', user.school_id);

      if (!studentsData) {
        toast.showToast('Failed to fetch present students details.', 'error');
        setExportPresentLoading(false);
        return;
      }

      const classIds = studentsData.map(student => student.class_id).filter((id, index, self) => self.indexOf(id) === index);
      const sectionIds = studentsData.map(student => student.section_id).filter((id, index, self) => self.indexOf(id) === index);

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
        .eq('school_id', user.school_id);

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name')
        .in('id', sectionIds)
        .eq('school_id', user.school_id);

      const classMap = new Map((classesData || []).map(cls => [cls.id, cls.name]));
      const sectionMap = new Map((sectionsData || []).map(sec => [sec.id, sec.name]));

      const presentStudents = studentsData.map(student => {
        const attendanceRecord = presentRecords.find(record => record.student_id === student.id);
        return {
          id: student.id,
          name: student.name || '',
          father_name: student.father_name || '',
          phone: student.phone || '',
          class: `${classMap.get(student.class_id) || ''} (${sectionMap.get(student.section_id) || ''})`,
          status: attendanceRecord?.status || 'present'
        };
      }).sort((a, b) => {
        const aClass = a.class.split(' ')[0];
        const bClass = b.class.split(' ')[0];
        const classComparison = compareClassNames(aClass, bClass);
        if (classComparison !== 0) return classComparison;
        return a.name.localeCompare(b.name);
      });

      const { data: completeAttendanceData } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .eq('date', dashboardDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id);

      const presentCount = completeAttendanceData?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
      const absentCount = completeAttendanceData?.filter(a => a.status === 'absent').length || 0;
      const leaveCount = completeAttendanceData?.filter(a => a.status === 'leave').length || 0;
      const lateCount = completeAttendanceData?.filter(a => a.status === 'late').length || 0;
      const totalCount = completeAttendanceData?.length || 0;
      const attPercent = totalCount ? (((presentCount) / totalCount) * 100).toFixed(1) : '0.0';

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Present Students Report', 15, 18);
      doc.setFontSize(11);
      const [yyyy, mm, dd] = dashboardDate.split('-');
      const formattedDate = `${dd}-${mm}-${yyyy}`;
      doc.text(`Date: ${formattedDate}`, 15, 26);
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text(`Total: ${totalCount}`, 120, 18);
      doc.setTextColor(34, 197, 94);
      doc.text(`Present: ${presentCount}`, 120, 24);
      doc.setTextColor(239, 68, 68);
      doc.text(`Absent: ${absentCount}`, 170, 18);
      doc.setTextColor(37, 99, 235);
      doc.text(`Leave: ${leaveCount}`, 170, 24);
      doc.setTextColor(234, 179, 8);
      doc.text(`Late: ${lateCount}`, 120, 30);
      let perColor: [number, number, number] = [34, 197, 94];
      const perVal = parseFloat(attPercent);
      if (perVal < 75) perColor = [239, 68, 68];
      else if (perVal < 85) perColor = [234, 179, 8];
      doc.setTextColor(...perColor);
      doc.text(`Per%: ${attPercent}%`, 170, 30);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 36,
        head: [['SNo', 'ID', 'Name', 'Father Name', 'Mobile', 'Class', 'Status']],
        body: presentStudents.map((student, idx) => [
          idx + 1,
          getStudentDisplayId(student),
          student.name,
          student.father_name,
          student.phone,
          student.class,
          student.status === 'late' ? 'Late' : 'Present'
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2,
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          halign: 'center',
          textColor: [60, 60, 60],
          minCellHeight: 6,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { top: 36, left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 14, halign: 'center' },
          2: { cellWidth: 32, halign: 'left' },
          3: { cellWidth: 32, halign: 'left' },
        },
      });

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        10,
        doc.internal.pageSize.height - 10
      );

      const isCapacitor = !!(window as any).Capacitor && !!(window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();
      const isElectron = !!(window as any).electron || (typeof window !== 'undefined' && (window as any).process?.type === 'renderer');
      
      if (isCapacitor) {
        const pdfBlob = doc.output('blob');
        await savePdf(pdfBlob, `Present Students (${formattedDate}).pdf`, true);
      } else if (isElectron) {
        let electron;
        try {
          electron = (window as any).electron || (window as any).require && (window as any).require('electron');
        } catch (e) { electron = null; }
        if (electron && electron.remote && electron.remote.dialog && electron.remote.app) {
          const path = electron.remote.require('path');
          const documentsPath = electron.remote.app.getPath('documents');
          const defaultFilePath = path.join(documentsPath, `Present Students (${formattedDate}).pdf`);
          const { filePath } = await electron.remote.dialog.showSaveDialog({
            title: 'Save Present Students Report',
            defaultPath: defaultFilePath,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
          });
          if (filePath) {
            const pdfBuffer = doc.output('arraybuffer');
            const fs = electron.remote.require('fs');
            fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
            alert(`PDF saved successfully to: ${filePath}`);
          }
        } else {
          const formatDateForFileName = (date: Date) => {
            const day = date.getDate().toString().padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          };
          const fileName = `Present Students (${formatDateForFileName(new Date())}).pdf`;
          doc.save(fileName);
          toast.showToast('Present students PDF generated successfully', 'success');
        }
      } else {
        const formatDateForFileName = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
        const fileName = `Present Students (${formatDateForFileName(new Date())}).pdf`;
        doc.save(fileName);
        toast.showToast('Present students PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting present students PDF:', error);
      toast.showToast('Failed to export present students PDF', 'error');
    } finally {
      setExportPresentLoading(false);
    }
  }, [attendanceDataForDate, user?.school_id, dashboardDate, schoolName, toast, savePdf, getCachedSession]);

  // ==========================================
  // DELETE FINE HANDLERS
  // ==========================================
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setFineToDelete(null);
  };

  const handleDeleteFine = async () => {
    if (!fineToDelete || !user?.school_id) return;
    try {
      const { error } = await supabase
        .from('fine_payments')
        .delete()
        .eq('id', fineToDelete.id)
        .eq('school_id', user.school_id);

      if (error) throw error;

      setFineDetails(prev => prev.filter(f => f.id !== fineToDelete.id));
      setTodayCollectedFine(prev => prev - fineToDelete.amount);
      toast.showToast('Fine payment deleted successfully', 'success');
      cancelDelete();
    } catch (error) {
      console.error('Error deleting fine:', error);
      toast.showToast('Failed to delete fine payment', 'error');
    }
  };

  // ==========================================
  // MEMOIZED VALUES
  // ==========================================
  const gradeDistribution = useMemo(() => admissionsData.gradeDistribution || [], [admissionsData.gradeDistribution]);
  const latestAdmissions = useMemo(() => admissionsData.latestAdmissions || [], [admissionsData.latestAdmissions]);
  const todaysBirthdays = useMemo(() => admissionsData.todaysBirthdays || [], [admissionsData.todaysBirthdays]);
  const admissionsChartData = useMemo(() => admissionsData.admissionsChart || [], [admissionsData.admissionsChart]);
  const withdrawalsChartData = useMemo(() => admissionsData.withdrawalsChart || [], [admissionsData.withdrawalsChart]);
  const genderChartData = useMemo(() => admissionsData.genderData || [], [admissionsData.genderData]);
  const classStrengths = useMemo(() => {
    if (!students.length || !classes.length) return [];
    const strengthMap = new Map<string, { boys: number; girls: number }>();
    students.forEach(student => {
      const className = getClassName(student.class_id);
      if (!strengthMap.has(className)) {
        strengthMap.set(className, { boys: 0, girls: 0 });
      }
      const strength = strengthMap.get(className)!;
      if (student.gender === 'Male') {
        strength.boys++;
      } else if (student.gender === 'Female') {
        strength.girls++;
      }
    });
    return Array.from(strengthMap.entries()).map(([name, counts]) => ({
      name,
      boys: counts.boys,
      girls: counts.girls,
      total: counts.boys + counts.girls
    })).sort((a, b) => compareClassNames(a.name, b.name));
  }, [students, classes, getClassName]);

  // ==========================================
  // RENDER
  // ==========================================
  if (loading || !allDataLoaded || settingsLoading) {
    return <Loader />;
  }

  if (user?.role === 'Guest') {
    if (settingsLoading || !renderSettings) {
      return <Loader />;
    }
    if (!isGuestPageAccessible(renderSettings, 'dashboard')) {
      return (
        <DashboardContainer>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: isDark ? '#a0a7b8' : '#64748b',
            minHeight: '400px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>🔒</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: isDark ? '#e2e8f0' : '#1e293b' }}>
              Access Denied
            </div>
            <div style={{ fontSize: '0.95rem', opacity: 0.8 }}>
              Dashboard access is not enabled for guest users. Please contact your administrator.
            </div>
          </div>
        </DashboardContainer>
      );
    }
  }

  if (!hasActiveSession) {
    return <NoSessionsFound />;
  }

  if (students.length === 0) {
    return <NoStudentsFound />;
  }

  const isGuest = user?.role === 'Guest';
  const showAbsentees = !isGuest || isDashboardCardVisible(renderSettings, 'absentees_card');
  const showHomeworkDiary = !isGuest || isDashboardCardVisible(renderSettings, 'homework_diary_card');
  const hasRightCards = showAbsentees;

  const isMobile = window.innerWidth <= 700;

  return (
    <DashboardContainer>
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dashboardDate={dashboardDate}
        setDashboardDate={setDashboardDate}
        setAbsentDate={setAbsentDate}
        setFineDate={setFineDate}
      />

      {activeTab === 'attendance' && (
        <AttendanceTab
          presentToday={presentToday}
          absentToday={absentToday}
          leaveToday={leaveToday}
          lateToday={lateToday}
          halfLeaveCount={halfLeaveCount}
          presentPercent={presentPercent}
          absentPercent={absentPercent}
          leavePercent={leavePercent}
          latePercent={latePercent}
          halfLeavePercent={halfLeavePercent}
          attendanceStatsLoading={attendanceStatsLoading}
          attendanceChartsLoading={attendanceChartsLoading}
          attendanceTrendData={attendanceTrendData}
          classAttendanceData={classAttendanceData}
          todayAttendanceRate={todayAttendanceRate}
          weekAvgAttendanceRate={weekAvgAttendanceRate}
          consecutiveAbsentLoading={consecutiveAbsentLoading}
          consecutiveAbsentStudents={consecutiveAbsentStudents}
          absentDate={absentDate}
          setAbsentDate={setAbsentDate}
          isAbsenteesExpanded={isAbsenteesExpanded}
          setIsAbsenteesExpanded={setIsAbsenteesExpanded}
          absentees={absentees}
          studentDetails={studentDetails}
          attendanceDataForDate={attendanceDataForDate}
          whatsappProcessing={whatsappProcessing}
          setWhatsappProcessing={setWhatsappProcessing}
          setShowWhatsAppSender={setShowWhatsAppSender}
          setWhatsappNotificationData={setWhatsappNotificationData}
          exportAbsentLoading={exportAbsentLoading}
          exportPresentLoading={exportPresentLoading}
          exportAbsenteesPDF={exportAbsenteesPDF}
          exportPresentStudentsPDF={exportPresentStudentsPDF}
          showExportDropdown={showExportDropdown}
          setShowExportDropdown={setShowExportDropdown}
          exportDropdownRef={exportDropdownRef}
          dropdownIdx={dropdownIdx}
          setDropdownIdx={setDropdownIdx}
          dropdownPos={dropdownPos}
          setDropdownPos={setDropdownPos}
          dropdownDirection={dropdownDirection}
          setDropdownDirection={setDropdownDirection}
          dropdownRef={dropdownRef}
          hoveredAvatar={hoveredAvatar}
          setHoveredAvatar={setHoveredAvatar}
          setAbsentees={setAbsentees}
          setAttendanceDataForDate={setAttendanceDataForDate}
          user={user}
          schoolName={schoolName}
          hasRightCards={hasRightCards}
          showAbsentees={showAbsentees}
          isMobile={isMobile}
        />
      )}

      {activeTab === 'fee' && (
        <FeeTab
          feeSummary={feeSummary}
          feeSummaryLoading={feeSummaryLoading}
          collectionChartsLoading={collectionChartsLoading}
          dailyCollectionData={dailyCollectionData}
          monthlyCollectionData={monthlyCollectionData}
          feeCollectionDetails={feeCollectionDetails}
          feeCollectionDetailsLoading={feeCollectionDetailsLoading}
          defaultersData={defaultersData}
          defaultersLoading={defaultersLoading}
        />
      )}

      {activeTab === 'admissions' && (
        <AdmissionsTab
          admissionsDateFrom={admissionsDateFrom}
          setAdmissionsDateFrom={setAdmissionsDateFrom}
          admissionsDateTo={admissionsDateTo}
          setAdmissionsDateTo={setAdmissionsDateTo}
          admissionsLoading={admissionsLoading}
          admissionsData={admissionsData}
          admissionsChartData={admissionsChartData}
          withdrawalsChartData={withdrawalsChartData}
          genderChartData={genderChartData}
          classStrengths={classStrengths}
          latestAdmissions={latestAdmissions}
          todaysBirthdays={todaysBirthdays}
        />
      )}

      {activeTab === 'homework' && (
        <HomeworkTab
          showHomeworkDiary={showHomeworkDiary}
          homeworkViewMode={homeworkViewMode}
          setHomeworkViewMode={setHomeworkViewMode}
          homeworkLoading={homeworkLoading}
          homeworkDiaryData={homeworkDiaryData}
          dashboardDate={dashboardDate}
        />
      )}

      {hoveredAvatar && (
        <div
          style={{
            position: 'fixed',
            left: hoveredAvatar.x - 60,
            top: hoveredAvatar.y - 130,
            zIndex: 4000,
            pointerEvents: 'none',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 24px #0007',
            border: '2px solid #4a6cf7',
            padding: 4,
            width: 120,
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <img
            src={hoveredAvatar.url}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
      )}

      <DeleteModal
        show={showDeleteModal}
        fineToDelete={fineToDelete}
        onCancel={cancelDelete}
        onDelete={handleDeleteFine}
      />

      {showWhatsAppSender && (
        <WhatsAppBulkSender
          notificationData={whatsappNotificationData}
          schoolName={schoolName || 'School'}
          selectedDate={absentDate}
          onClose={() => {
            setShowWhatsAppSender(false);
            setWhatsappNotificationData([]);
          }}
        />
      )}
    </DashboardContainer>
  );
};

export default Dashboard;

