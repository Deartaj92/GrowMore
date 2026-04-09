import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import { supabase } from '../../supabaseClient';
import { useToast } from '../../components/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserPermissions } from '../../services/permissionService';
import { shouldShowMenuItem } from '../../utils/permissionMapping';
import { useLoading } from '../../contexts/LoadingContext';
import { useProgress } from '../../components/Layout';
import { PageHeaderContext } from '../../components/Layout';
import { usePageFooter } from '../../components/Layout/contexts/PageFooterContext';
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
import { DashboardTab, FineToDelete, FeeSummary, FeeCollectionDetails, DefaulterData } from './types';
import {
  isDark as checkIsDark,
  getFooterNavButtonStyle,
  getFooterNavIconStyle,
  getFooterNavTooltipStyle,
  getFooterNavTooltipArrowStyle
} from '../../styles/DesignSystem';
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
  fetchFeeSummary as fetchFeeSummaryService,
  fetchCollectionChartsData as fetchCollectionChartsDataService,
  fetchFeeCollectionDetails as fetchFeeCollectionDetailsService,
  fetchDefaultersData as fetchDefaultersDataService
} from './services/feeService';
import { fetchAllRows } from '../../utils/paginationHelper';
import { fetchAdmissionsData as fetchAdmissionsDataService } from './services/admissionsService';
import { fetchHomeworkDiary as fetchHomeworkDiaryService } from './services/homeworkService';
import { fetchAbsentees as fetchAbsenteesService } from './services/attendanceService';
import { fetchEmployeeAbsentees } from './services/employeeAttendanceService';
import { fetchAccountsData, AccountsData } from './services/accountsService';
import TabNavigation from './components/shared/TabNavigation';
import DeleteModal from './components/shared/DeleteModal';
import AttendanceTab from './components/AttendanceTab/AttendanceTab';
import FeeTab from './components/FeeTab/FeeTab';
import AdmissionsTab from './components/AdmissionsTab/AdmissionsTab';
import HomeworkTab from './components/HomeworkTab/HomeworkTab';
import EmployeeAttendanceTab from './components/EmployeeAttendanceTab/EmployeeAttendanceTab';
import AccountsTab from './components/AccountsTab/AccountsTab';
import PredictionsTab from './components/PredictionsTab/PredictionsTab';
import { Box } from '@mui/material';
import { Assessment, Groups, Payment, PersonAdd, BarChart, People, AttachMoney, AccountBalanceWallet, Contactless } from '@mui/icons-material';

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
  const { setFooterContent } = usePageFooter();
  const theme = useTheme();
  const isDark = checkIsDark(theme);
  const savePdf = useCapacitorPdfSave();

  // Core data state
  const [students, setStudents] = useState<any[]>([]);
  const [studentClassHistory, setStudentClassHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [allDataLoaded, setAllDataLoaded] = useState(false);

  // Date state
  const [absentDate, setAbsentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dashboardDate, setDashboardDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fineDate, setFineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [admissionsDateFrom, setAdmissionsDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [admissionsDateTo, setAdmissionsDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Accounts date range state
  const [accountsDateFrom, setAccountsDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 11); // 12 months ago
    return date.toISOString().slice(0, 10);
  });
  const [accountsDateTo, setAccountsDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Tab state
  const [activeTab, setActiveTab] = useState<DashboardTab>('attendance');
  const prevActiveTabRef = useRef<DashboardTab | null>(null);
  const [allowedTabs, setAllowedTabs] = useState<Set<DashboardTab>>(new Set());
  const [userPerms, setUserPerms] = useState<Set<string>>(new Set());

  // Fetch dashboard tab permissions
  useEffect(() => {
    const fetchTabPermissions = async () => {
      if (!user?.id || !user?.school_id) return;

      // Super admin / owner sees all tabs
      if (user.role === 'owner' || user.role === 'super_admin') {
        setAllowedTabs(new Set()); // Empty means show all
        setUserPerms(new Set()); // Empty means allow all
        return;
      }

      try {
        const perms = await getUserPermissions(user.id, user.school_id);
        setUserPerms(perms);

        const tabPermissionMap: Record<string, DashboardTab> = {
          'dashboard-tab-attendance': 'attendance',
          'dashboard-tab-fee': 'fee',
          'dashboard-tab-admissions': 'admissions',
          'dashboard-tab-homework': 'homework',
          'dashboard-tab-employee-attendance': 'employeeAttendance',
          'dashboard-tab-accounts': 'accounts',
          'dashboard-tab-predictions': 'predictions',
        };

        const allowed = new Set<DashboardTab>();
        let hasAnyTabPermission = false;

        for (const [permKey, tabId] of Object.entries(tabPermissionMap)) {
          if (perms.has(permKey)) {
            allowed.add(tabId);
            hasAnyTabPermission = true;
          }
        }

        // If no tab permissions are set at all, show all tabs (backward compatibility)
        if (!hasAnyTabPermission) {
          setAllowedTabs(new Set());
        } else {
          setAllowedTabs(allowed);
          // Set active tab to first allowed tab if current is not allowed
          if (allowed.size > 0 && !allowed.has(activeTab)) {
            const firstAllowed = Array.from(allowed)[0];
            setActiveTab(firstAllowed);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard tab permissions:', error);
        setAllowedTabs(new Set()); // On error, show all tabs
        setUserPerms(new Set());
      }
    };

    fetchTabPermissions();
  }, [user?.id, user?.school_id, user?.role]);

  // Handle tab change with immediate loading state reset
  const handleTabChange = useCallback((newTab: DashboardTab) => {
    if (newTab === activeTab) return;

    // Immediately set loading states for the new tab before changing
    if (newTab === 'attendance') {
      setAttendanceStatsLoading(true);
      setAttendanceChartsLoading(true);
      setConsecutiveAbsentLoading(true);
    } else if (newTab === 'fee') {
      setFeeSummaryLoading(true);
      setCollectionChartsLoading(true);
      setFeeCollectionDetailsLoading(true);
      setDefaultersLoading(true);
    } else if (newTab === 'admissions') {
      setAdmissionsLoading(true);
    } else if (newTab === 'homework') {
      setHomeworkLoading(true);
    } else if (newTab === 'employeeAttendance') {
      setEmployeeAttendanceStatsLoading(true);
      setEmployeeAttendanceChartsLoading(true);
    } else if (newTab === 'accounts') {
      setAccountsLoading(true);
    }

    setActiveTab(newTab);
  }, [activeTab]);

  // Attendance state
  const [absentees, setAbsentees] = useState<any[]>([]);
  const [studentDetails, setStudentDetails] = useState<Record<string, any>>({});
  const [attendanceDataForDate, setAttendanceDataForDate] = useState<any[]>([]);
  const [halfLeavesForDate, setHalfLeavesForDate] = useState<any[]>([]);
  const [attendanceStatsLoading, setAttendanceStatsLoading] = useState(false);
  const [attendanceTrendData, setAttendanceTrendData] = useState<Array<{ day: string; rate: number; present: number; absent: number; leave: number; late: number; presentWithLate: number; dayOfWeek?: string; dateStr?: string; change?: number; isIncrease?: boolean | null }>>([]);
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

  // Employee attendance state
  const [employeeAbsentees, setEmployeeAbsentees] = useState<any[]>([]);
  const [staffDetails, setStaffDetails] = useState<Record<string, any>>({});
  const [employeeAttendanceDataForDate, setEmployeeAttendanceDataForDate] = useState<any[]>([]);
  const [employeeAttendanceStatsLoading, setEmployeeAttendanceStatsLoading] = useState(false);
  const [employeeAttendanceTrendData, setEmployeeAttendanceTrendData] = useState<Array<{ day: string; rate: number; dayOfWeek: string; dateStr: string; present: number; absent: number; leave: number; late: number; presentWithLate: number }>>([]);
  const [employeeAttendanceChartsLoading, setEmployeeAttendanceChartsLoading] = useState(false);
  const [employeeTodayAttendanceRate, setEmployeeTodayAttendanceRate] = useState(0);
  const [employeeWeekAvgAttendanceRate, setEmployeeWeekAvgAttendanceRate] = useState(0);
  const [employeeAbsentDate, setEmployeeAbsentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isEmployeeAbsenteesExpanded, setIsEmployeeAbsenteesExpanded] = useExpandedState('dashboard_employee_absentees_expanded');
  const [exportEmployeeAbsentLoading, setExportEmployeeAbsentLoading] = useState(false);
  const [exportEmployeePresentLoading, setExportEmployeePresentLoading] = useState(false);

  // Accounts state
  const [accountsData, setAccountsData] = useState<AccountsData>({
    summary: { income: 0, expenses: 0, profitLoss: 0, cash: 0 },
    cashAccounts: [],
    incomeVsExpenses: { income: 0, expenses: 0 },
    monthlyData: [],
    balanceSheet: null,
    assetsLiabilities: null,
    cashFlow: null
  });
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Fee state
  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalDiscount: 0,
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
      remaining: 0,
      balance: 0
    },
    currentMonth: {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0,
      balance: 0
    },
    nextMonths: {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0,
      balance: 0
    },
    total: {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0,
      balance: 0
    }
  });
  const [feeCollectionDetailsLoading, setFeeCollectionDetailsLoading] = useState(false);
  const [defaultersData, setDefaultersData] = useState<DefaulterData[]>([]);
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
    recentStudents: [] as any[],
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
  const sessionCacheRef = useRef<{ data: any; timestamp: number } | null>(null);

  // ==========================================
  // SESSION HELPERS
  // ==========================================
  const SESSION_CACHE_TTL = 60000; // 1 minute

  const getCachedSession = useCallback(async () => {
    const now = Date.now();
    if (sessionCacheRef.current && (now - sessionCacheRef.current.timestamp) < SESSION_CACHE_TTL) {
      return sessionCacheRef.current.data;
    }

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id, start_date, end_date')
      .eq('is_active', true)
      .eq('school_id', user?.school_id)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    sessionCacheRef.current = { data: sessionData, timestamp: now };
    return sessionData;
  }, [user?.school_id]);

  useEffect(() => {
    let cancelled = false;

    const syncAdmissionsRangeToLatestActiveSession = async () => {
      if (!user?.school_id) return;

      const latestActiveSession = await getCachedSession();
      if (cancelled || !latestActiveSession) return;

      if (latestActiveSession.start_date) {
        setAdmissionsDateFrom(latestActiveSession.start_date);
      }
      if (latestActiveSession.end_date) {
        setAdmissionsDateTo(latestActiveSession.end_date);
      }
    };

    syncAdmissionsRangeToLatestActiveSession();

    return () => {
      cancelled = true;
    };
  }, [user?.school_id, getCachedSession]);

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
      setStaff(Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Staff ${i + 1}`,
        role: ['Teacher', 'Principal', 'Admin'][i % 3],
      })));
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

    // Use fetchAllRows for all queries to handle 1000+ records
    const [studentsData, classesData, sectionsData, attendanceData, staffData] = await Promise.all([
      fetchAllRows(async (from, to) => {
        return await supabase.from('students')
          .select('id, name, father_name, gender, status, class_id, section_id')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .range(from, to);
      }),
      fetchAllRows(async (from, to) => {
        return await supabase.from('classes')
          .select('id, name')
          .eq('school_id', user.school_id)
          .range(from, to);
      }),
      fetchAllRows(async (from, to) => {
        return await supabase.from('sections')
          .select('id, name')
          .eq('school_id', user.school_id)
          .range(from, to);
      }),
      fetchAllRows(async (from, to) => {
        return await supabase.from('attendance_records')
          .select('student_id, status, date')
          .eq('date', today)
          .eq('session_id', sessionDataResult.id)
          .eq('school_id', user.school_id)
          .range(from, to);
      }),
      fetchAllRows(async (from, to) => {
        return await supabase.from('staff')
          .select('id, name, role')
          .eq('school_id', user.school_id)
          .range(from, to);
      }),
    ]);

    setProgress(80);
    setStudents(studentsData);
    setStudentClassHistory(schData || []);
    setClasses(classesData);
    setSections(sectionsData);
    setAttendanceToday(attendanceData);
    setStaff(staffData);

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
    if (activeTab !== 'attendance') return;

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
  }, [activeTab, dashboardDate, user?.school_id, students, sessionData?.id, getCachedSession]);

  // Calculate attendance stats
  // Present count includes both 'present' and 'late' statuses
  const presentToday = attendanceDataForDate.filter(a => a.status === 'present' || a.status === 'late').length;
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
    if (activeTab !== 'attendance') return;

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
        const trendData: Array<{ day: string; rate: number; dayOfWeek: string; dateStr: string; present: number; absent: number; leave: number; late: number; presentWithLate: number; change?: number; isIncrease?: boolean | null }> = [];
        let totalRate = 0;

        const selectedDateStr = selectedDate.toISOString().slice(0, 10);
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        // Look back enough days to find 30 working days (excluding Sundays and holidays)
        // Estimate ~42 calendar days needed to get 30 working days (accounting for weekends)
        const startDate = new Date(selectedDate);
        startDate.setDate(startDate.getDate() - 42);
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

        // Build array of 30 working days (excluding Sundays and holidays) from selected date going backwards
        const days: Array<{ date: Date; dateStr: string; dayName: string; dayOfWeek: string }> = [];

        // Get day names for tooltip
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Start from selected date and go back enough days to find 30 working days
        let daysBack = 0;
        let workingDaysCount = 0;
        const maxDaysToCheck = 60; // Look back up to 60 days to find 30 working days

        // First, add the selected date if it's a working day
        if (isSelectedDateWorkingDay) {
          const dayName = `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`;
          days.push({
            date: new Date(selectedDate),
            dateStr: selectedDateStr,
            dayName,
            dayOfWeek: dayNames[selectedDayOfWeek]
          });
          workingDaysCount++;
          daysBack = 1;
        } else {
          daysBack = 1;
        }

        // Continue looking back to find 30 working days total
        while (workingDaysCount < 30 && daysBack < maxDaysToCheck) {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() - daysBack);
          const dateStr = date.toISOString().slice(0, 10);
          const dayOfWeek = date.getDay();

          // Only include if it's not Sunday and not a holiday
          if (dayOfWeek !== 0 && !holidayDates.has(dateStr) && dateStr >= startDateStr) {
            const dayName = `${date.getDate()}/${date.getMonth() + 1}`;
            days.push({
              date,
              dateStr,
              dayName,
              dayOfWeek: dayNames[dayOfWeek]
            });
            workingDaysCount++;
          }
          daysBack++;
        }

        // Sort days chronologically (oldest first)
        days.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

        if (days.length === 0) {
          setAttendanceTrendData([]);
          setTodayAttendanceRate(0);
          setWeekAvgAttendanceRate(0);
          setAttendanceChartsLoading(false);
          return;
        }

        const daysDateStrs = new Set(days.map(d => d.dateStr));
        const minDate = days[0].dateStr;
        const maxDate = days[days.length - 1].dateStr;

        // Use fetchAllRows to get ALL attendance records in the range (handles pagination)
        const allAttendanceData = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('attendance_records')
            .select('date, status')
            .gte('date', minDate)
            .lte('date', maxDate)
            .eq('session_id', sessionData.id)
            .eq('school_id', user.school_id)
            .range(from, to);
          return { data: result.data, error: result.error };
        });

        if (!allAttendanceData) {
          console.error('Error fetching attendance trend: Failed to fetch data');
          setAttendanceChartsLoading(false);
          return;
        }

        const attendanceByDate = new Map<string, { total: number; present: number; absent: number; leave: number; late: number }>();

        days.forEach(({ dateStr }) => {
          attendanceByDate.set(dateStr, { total: 0, present: 0, absent: 0, leave: 0, late: 0 });
        });

        // Process ALL attendance data
        if (allAttendanceData && allAttendanceData.length > 0) {
          allAttendanceData.forEach((record: any) => {
            // Ensure date is in YYYY-MM-DD format
            let dateStr = record.date;
            if (dateStr && typeof dateStr === 'string') {
              // If date includes time, extract just the date part
              dateStr = dateStr.split('T')[0];

              // Only process if it's in our date range
              if (daysDateStrs.has(dateStr)) {
                const stats = attendanceByDate.get(dateStr);
                if (stats) {
                  stats.total++;
                  if (record.status === 'present' || record.status === 'late' || record.status === 'half_day') {
                    stats.present++;
                  } else if (record.status === 'absent' || record.status === 'leave') {
                    stats.absent++;
                  }
                }
              }
            }
          });
        }

        if (isSelectedDateWorkingDay && daysDateStrs.has(selectedDateStr)) {
          const selectedDatePresent = attendanceDataForDate.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'half_day').length;
          const selectedDateAbsent = attendanceDataForDate.filter(a => a.status === 'absent' || a.status === 'leave').length;
          const selectedDateLeave = attendanceDataForDate.filter(a => a.status === 'leave').length;
          const selectedDateLate = attendanceDataForDate.filter(a => a.status === 'late').length;
          const selectedDateTotal = attendanceDataForDate.length;

          attendanceByDate.set(selectedDateStr, {
            total: selectedDateTotal,
            present: selectedDatePresent,
            absent: selectedDateAbsent,
            leave: selectedDateLeave,
            late: selectedDateLate
          });
        }

        days.forEach(({ dateStr, dayName, dayOfWeek }) => {
          const stats = attendanceByDate.get(dateStr) || { total: 0, present: 0, absent: 0, leave: 0, late: 0 };
          const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
          trendData.push({
            day: dayName,
            rate,
            dayOfWeek,
            dateStr,
            present: stats.present,
            absent: stats.absent,
            leave: stats.leave,
            late: stats.late,
            presentWithLate: stats.present
          });
          totalRate += rate;
        });

        // Calculate trend (increase/decrease) for each data point
        const trendDataWithChange = trendData.map((item, index) => {
          if (index === 0) {
            return { ...item, change: 0, isIncrease: null };
          }
          const prevRate = trendData[index - 1].rate;
          const change = item.rate - prevRate;
          return { ...item, change, isIncrease: change > 0 };
        });

        setAttendanceTrendData(trendDataWithChange);

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
  }, [activeTab, dashboardDate, user?.school_id, sessionData?.id, attendanceDataForDate]);

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
    if (activeTab !== 'attendance') return;

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
  }, [activeTab, user?.school_id, sessionData?.id, dashboardDate]);

  // Fetch fee summary
  useEffect(() => {
    if (activeTab !== 'fee') return;
    if (!user?.school_id) return;

    // Set loading state before fetching
    setFeeSummaryLoading(true);
    fetchFeeSummaryService(
      String(user.school_id),
      dashboardDate,
      setFeeSummary,
      setFeeSummaryLoading,
      getCachedSession
    );
  }, [activeTab, dashboardDate, user?.school_id, getCachedSession]);

  // Fetch collection charts
  useEffect(() => {
    if (activeTab !== 'fee') return;
    if (!user?.school_id) return;

    // Set loading state before fetching
    setCollectionChartsLoading(true);
    fetchCollectionChartsDataService(
      String(user.school_id),
      dashboardDate,
      setDailyCollectionData,
      setMonthlyCollectionData,
      setCollectionChartsLoading
    );
  }, [activeTab, dashboardDate, user?.school_id]);

  // Fetch fee collection details
  useEffect(() => {
    if (activeTab !== 'fee') return;
    if (!user?.school_id) return;

    // Set loading state before fetching
    setFeeCollectionDetailsLoading(true);
    fetchFeeCollectionDetailsService(
      String(user.school_id),
      dashboardDate,
      setFeeCollectionDetails,
      setFeeCollectionDetailsLoading
    );
  }, [activeTab, dashboardDate, user?.school_id]);

  // Fetch defaulters
  useEffect(() => {
    if (activeTab !== 'fee') return;
    if (!user?.school_id) return;

    // Set loading state before fetching
    setDefaultersLoading(true);
    fetchDefaultersDataService(
      String(user.school_id),
      dashboardDate,
      setDefaultersData,
      setDefaultersLoading
    );
  }, [activeTab, dashboardDate, user?.school_id]);

  // Fetch admissions data
  useEffect(() => {
    if (activeTab !== 'admissions') {
      prevTabRef.current = activeTab;
      return;
    }

    if (!user?.school_id) return;

    // Set loading state before fetching
    setAdmissionsLoading(true);
    fetchAdmissionsDataService(
      String(user.school_id),
      admissionsDateFrom,
      admissionsDateTo,
      setAdmissionsData,
      setAdmissionsLoading,
      getCachedSession
    );
  }, [activeTab, admissionsDateFrom, admissionsDateTo, user?.school_id, getCachedSession]);

  // Fetch homework diary
  useEffect(() => {
    if (activeTab !== 'homework') return;
    if (!user?.school_id) return;
    if (homeworkFetchingRef.current) return;

    // Set loading state before fetching
    setHomeworkLoading(true);
    homeworkFetchingRef.current = true;
    fetchHomeworkDiaryService(
      String(user.school_id),
      dashboardDate,
      setHomeworkDiaryData,
      setHomeworkLoading
    ).finally(() => {
      homeworkFetchingRef.current = false;
    });
  }, [activeTab, dashboardDate, user?.school_id]);

  // Fetch employee absentees
  useEffect(() => {
    if (activeTab !== 'employeeAttendance') return;
    if (!employeeAbsentDate || !user?.school_id) return;
    fetchEmployeeAbsentees(
      String(user.school_id),
      employeeAbsentDate,
      sessionData?.id || '',
      staff,
      setEmployeeAbsentees,
      setStaffDetails,
      getCachedSession
    );
  }, [activeTab, employeeAbsentDate, user?.school_id, sessionData?.id, getCachedSession]);

  // Fetch employee attendance for date
  useEffect(() => {
    if (activeTab !== 'employeeAttendance') return;

    const fetchEmployeeAttendanceForDate = async () => {
      if (!user?.school_id || !dashboardDate) return;

      setEmployeeAttendanceStatsLoading(true);
      try {
        if (USE_DUMMY_DATA) {
          const dummyStaffIds = staff.length > 0
            ? staff.map(s => s.id)
            : Array.from({ length: 50 }, (_, i) => i + 1);
          const dummyAttendance = dummyStaffIds.map((staffId, i) => ({
            id: i + 1,
            staff_id: staffId,
            status: ['present', 'absent', 'leave', 'late', 'half_day'][i % 5],
            date: dashboardDate,
            session_id: sessionData?.id || 1,
          }));
          setEmployeeAttendanceDataForDate(dummyAttendance);
          setEmployeeAttendanceStatsLoading(false);
          return;
        }

        const sessionDataResult = await getCachedSession();
        if (!sessionDataResult?.id) {
          setEmployeeAttendanceDataForDate([]);
          setEmployeeAttendanceStatsLoading(false);
          return;
        }

        const { data: attendanceData } = await supabase
          .from('staff_attendance_records')
          .select('staff_id, status, date')
          .eq('date', dashboardDate)
          .eq('session_id', sessionDataResult.id)
          .eq('school_id', user.school_id);

        setEmployeeAttendanceDataForDate(attendanceData || []);
      } catch (error) {
        console.error('Error fetching employee attendance:', error);
        setEmployeeAttendanceDataForDate([]);
      } finally {
        setEmployeeAttendanceStatsLoading(false);
      }
    };
    fetchEmployeeAttendanceForDate();
  }, [activeTab, dashboardDate, user?.school_id, sessionData?.id, getCachedSession]);

  // Calculate employee attendance stats
  // Present count includes both 'present' and 'late' statuses
  const employeePresentToday = employeeAttendanceDataForDate.filter(a => a.status === 'present' || a.status === 'late').length;
  const employeeLeaveToday = employeeAttendanceDataForDate.filter(a => a.status === 'leave').length;
  const employeeLateToday = employeeAttendanceDataForDate.filter(a => a.status === 'late').length;
  const employeeHalfDayCount = employeeAttendanceDataForDate.filter(a => a.status === 'half_day').length;
  const employeeAbsentToday = employeeAttendanceDataForDate.filter(a => a.status === 'absent').length;
  const employeeTotalMarked = employeeAttendanceDataForDate.length;
  const employeePresentPercent = employeeTotalMarked ? Math.round((employeePresentToday / employeeTotalMarked) * 1000) / 10 : 0;
  const employeeAbsentPercent = employeeTotalMarked ? Math.round((employeeAbsentToday / employeeTotalMarked) * 1000) / 10 : 0;
  const employeeLeavePercent = employeeTotalMarked ? Math.round((employeeLeaveToday / employeeTotalMarked) * 1000) / 10 : 0;
  const employeeLatePercent = employeeTotalMarked ? Math.round((employeeLateToday / employeeTotalMarked) * 1000) / 10 : 0;
  const employeeHalfDayPercent = employeeTotalMarked ? Math.round((employeeHalfDayCount / employeeTotalMarked) * 1000) / 10 : 0;

  // Fetch employee attendance trend (simplified)
  useEffect(() => {
    const fetchEmployeeAttendanceTrend = async () => {
      if (!user?.school_id || !sessionData?.id || !dashboardDate || activeTab !== 'employeeAttendance') return;

      setEmployeeAttendanceChartsLoading(true);
      try {
        if (USE_DUMMY_DATA) {
          await new Promise(resolve => setTimeout(resolve, 100));
          // Generate dummy data excluding Sundays (matching students attendance structure)
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const trendData: Array<{ day: string; rate: number; dayOfWeek: string; dateStr: string; present: number; absent: number; leave: number; late: number; presentWithLate: number }> = [];
          const selectedDate = new Date(dashboardDate);
          for (let i = 29; i >= 0; i--) {
            const date = new Date(selectedDate);
            date.setDate(date.getDate() - i);
            // Skip Sundays (day of week === 0)
            if (date.getDay() === 0) continue;
            const dateStr = date.toISOString().slice(0, 10);
            const dayOfWeek = dayNames[date.getDay()];
            const dayName = `${date.getDate()}/${date.getMonth() + 1}`;

            // Generate random counts
            const present = Math.floor(Math.random() * 40) + 30;
            const absent = Math.floor(Math.random() * 10) + 2;
            const leave = Math.floor(Math.random() * 5) + 1;
            const late = Math.floor(Math.random() * 8) + 1;
            const total = present + absent + leave + late;
            const presentWithLate = present + late;
            const rate = total > 0 ? Math.round((presentWithLate / total) * 100) : 0;

            trendData.push({
              day: dayName,
              rate,
              dayOfWeek,
              dateStr,
              present,
              absent,
              leave,
              late,
              presentWithLate
            });
          }
          setEmployeeAttendanceTrendData(trendData);
          const lastRate = trendData[trendData.length - 1]?.rate || 85;
          setEmployeeTodayAttendanceRate(lastRate);
          const avg = trendData.length > 0
            ? Math.round(trendData.reduce((sum, d) => sum + d.rate, 0) / trendData.length)
            : 0;
          setEmployeeWeekAvgAttendanceRate(avg);
          setEmployeeAttendanceChartsLoading(false);
          return;
        }

        // Fetch employee attendance trend (matching students attendance logic)
        const selectedDate = new Date(dashboardDate);
        const selectedDateStr = selectedDate.toISOString().slice(0, 10);
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        // Look back enough days to find 30 working days (excluding Sundays and holidays)
        const startDate = new Date(selectedDate);
        startDate.setDate(startDate.getDate() - 42);
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

        // Build array of 30 working days (excluding Sundays and holidays) from selected date going backwards
        const days: Array<{ date: Date; dateStr: string; dayName: string; dayOfWeek: string }> = [];

        // Get day names for tooltip
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Start from selected date and go back enough days to find 30 working days
        let daysBack = 0;
        let workingDaysCount = 0;
        const maxDaysToCheck = 60; // Look back up to 60 days to find 30 working days

        // First, add the selected date if it's a working day
        if (isSelectedDateWorkingDay) {
          const dayName = `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`;
          days.push({
            date: new Date(selectedDate),
            dateStr: selectedDateStr,
            dayName,
            dayOfWeek: dayNames[selectedDayOfWeek]
          });
          workingDaysCount++;
          daysBack = 1;
        } else {
          daysBack = 1;
        }

        // Continue looking back to find 30 working days total
        while (workingDaysCount < 30 && daysBack < maxDaysToCheck) {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() - daysBack);
          const dateStr = date.toISOString().slice(0, 10);
          const dayOfWeek = date.getDay();

          // Only include if it's not Sunday and not a holiday
          if (dayOfWeek !== 0 && !holidayDates.has(dateStr) && dateStr >= startDateStr) {
            const dayName = `${date.getDate()}/${date.getMonth() + 1}`;
            days.push({
              date,
              dateStr,
              dayName,
              dayOfWeek: dayNames[dayOfWeek]
            });
            workingDaysCount++;
          }
          daysBack++;
        }

        // Sort days chronologically (oldest first)
        days.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

        if (days.length === 0) {
          setEmployeeAttendanceTrendData([]);
          setEmployeeTodayAttendanceRate(0);
          setEmployeeWeekAvgAttendanceRate(0);
          setEmployeeAttendanceChartsLoading(false);
          return;
        }

        const daysDateStrs = new Set(days.map(d => d.dateStr));
        const minDate = days[0].dateStr;
        const maxDate = days[days.length - 1].dateStr;

        // Use fetchAllRows to get ALL attendance records in the range (handles pagination)
        const allAttendanceData = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('staff_attendance_records')
            .select('date, status')
            .gte('date', minDate)
            .lte('date', maxDate)
            .eq('session_id', sessionData.id)
            .eq('school_id', user.school_id)
            .range(from, to);
          return { data: result.data, error: result.error };
        });

        if (!allAttendanceData) {
          console.error('Error fetching employee attendance trend: Failed to fetch data');
          setEmployeeAttendanceChartsLoading(false);
          return;
        }

        const attendanceByDate = new Map<string, { total: number; present: number; absent: number; leave: number; late: number }>();

        days.forEach(({ dateStr }) => {
          attendanceByDate.set(dateStr, { total: 0, present: 0, absent: 0, leave: 0, late: 0 });
        });

        // Process ALL attendance data
        if (allAttendanceData && allAttendanceData.length > 0) {
          allAttendanceData.forEach((record: any) => {
            // Ensure date is in YYYY-MM-DD format
            let dateStr = record.date;
            if (dateStr && typeof dateStr === 'string') {
              // If date includes time, extract just the date part
              dateStr = dateStr.split('T')[0];

              // Only process if it's in our date range
              if (daysDateStrs.has(dateStr)) {
                const stats = attendanceByDate.get(dateStr);
                if (stats) {
                  stats.total++;
                  if (record.status === 'present') {
                    stats.present++;
                  } else if (record.status === 'absent') {
                    stats.absent++;
                  } else if (record.status === 'leave') {
                    stats.leave++;
                  } else if (record.status === 'late' || record.status === 'half_day') {
                    stats.late++;
                  }
                }
              }
            }
          });
        }

        // Build trend data array with detailed counts
        const trendData: Array<{ day: string; rate: number; dayOfWeek: string; dateStr: string; present: number; absent: number; leave: number; late: number; presentWithLate: number }> = [];
        let totalRate = 0;

        days.forEach(({ dateStr, dayName, dayOfWeek }) => {
          const stats = attendanceByDate.get(dateStr) || { total: 0, present: 0, absent: 0, leave: 0, late: 0 };
          const rate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;
          trendData.push({
            day: dayName,
            rate,
            dayOfWeek,
            dateStr,
            present: stats.present,
            absent: stats.absent,
            leave: stats.leave,
            late: stats.late,
            presentWithLate: stats.present + stats.late // Present includes late
          });
          totalRate += rate;
        });

        setEmployeeAttendanceTrendData(trendData);

        let todayRate = 0;
        if (isSelectedDateWorkingDay) {
          // Use the last data point if available
          todayRate = trendData[trendData.length - 1]?.rate || 0;
        } else {
          todayRate = trendData[trendData.length - 1]?.rate || 0;
        }
        const avg = trendData.length > 0 ? Math.round(totalRate / trendData.length) : 0;
        setEmployeeTodayAttendanceRate(todayRate);
        setEmployeeWeekAvgAttendanceRate(avg);
      } catch (error) {
        console.error('Error fetching employee attendance trend:', error);
      } finally {
        setEmployeeAttendanceChartsLoading(false);
      }
    };
    fetchEmployeeAttendanceTrend();
  }, [dashboardDate, user?.school_id, sessionData?.id, activeTab]);

  // Fetch accounts data
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user?.school_id || !accountsDateFrom || !accountsDateTo || activeTab !== 'accounts') return;

      await fetchAccountsData(
        String(user.school_id),
        accountsDateFrom,
        accountsDateTo,
        setAccountsData,
        setAccountsLoading,
        getCachedSession
      );
    };
    fetchAccounts();
  }, [accountsDateFrom, accountsDateTo, user?.school_id, activeTab]);

  // Reset loading states when switching tabs
  useEffect(() => {
    if (prevActiveTabRef.current !== null && prevActiveTabRef.current !== activeTab) {
      // Tab changed - reset loading states for the new tab
      if (activeTab === 'fee') {
        setFeeSummaryLoading(true);
        setCollectionChartsLoading(true);
        setFeeCollectionDetailsLoading(true);
        setDefaultersLoading(true);
      } else if (activeTab === 'admissions') {
        setAdmissionsLoading(true);
      } else if (activeTab === 'homework') {
        setHomeworkLoading(true);
      } else if (activeTab === 'employeeAttendance') {
        setEmployeeAttendanceStatsLoading(true);
        setEmployeeAttendanceChartsLoading(true);
      } else if (activeTab === 'accounts') {
        setAccountsLoading(true);
      } else {
        // Reset employee attendance loading states when switching away
        if (prevActiveTabRef.current === 'employeeAttendance') {
          setEmployeeAttendanceStatsLoading(false);
          setEmployeeAttendanceChartsLoading(false);
        }
        // Reset accounts loading states when switching away
        if (prevActiveTabRef.current === 'accounts') {
          setAccountsLoading(false);
        }
      }
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  // ==========================================
  // INITIAL DATA LOADING
  // ==========================================
  useEffect(() => {
    if (user?.school_id && !dataLoadedRef.current) {
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

  // Set footer content with real-time clock and shortcut buttons
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Helper: check if a footer shortcut should be visible for this user
  const isSuperAdmin = user?.role === 'owner' || user?.role === 'super_admin';
  const canAccessFooterShortcut = useCallback((path: string): boolean => {
    if (isSuperAdmin || userPerms.size === 0) return true;
    return shouldShowMenuItem(path, user?.role, userPerms);
  }, [isSuperAdmin, userPerms, user?.role]);

  // Add style to ensure no transitions on footer buttons
  useEffect(() => {
    const styleId = 'footer-buttons-no-transition';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .footer-icon-button,
        .footer-icon-button *,
        .footer-icon-button svg,
        .footer-icon-button .MuiSvgIcon-root {
          transition: none !important;
          -webkit-transition: none !important;
          -moz-transition: none !important;
          -o-transition: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const styleEl = document.getElementById(styleId);
      if (styleEl) styleEl.remove();
    };
  }, []);

  useEffect(() => {
    const updateFooter = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Check if mobile device
      const isMobile = window.innerWidth <= 768;

      setFooterContent({
        visible: true,
        content: (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            width: '100%',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{timeStr}</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>{dateStr}</span>
            </div>
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Student Attendance Button */}
                {canAccessFooterShortcut('/attendance/mark') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('student')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/attendance/mark')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#3b82f6', hoveredButton === 'student')}
                    >
                      <Assessment
                        sx={getFooterNavIconStyle(theme, '#3b82f6', hoveredButton === 'student')}
                      />
                    </button>
                    {hoveredButton === 'student' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Mark Student Attendance
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Employee Attendance Button */}
                {canAccessFooterShortcut('/attendance/staff') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('employee')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/attendance/staff')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#10b981', hoveredButton === 'employee')}
                    >
                      <Groups
                        sx={getFooterNavIconStyle(theme, '#10b981', hoveredButton === 'employee')}
                      />
                    </button>
                    {hoveredButton === 'employee' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Mark Employee Attendance
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Fee Collection Button */}
                {canAccessFooterShortcut('/fee-collection') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('fee')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/fee-collection')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#8b5cf6', hoveredButton === 'fee')}
                    >
                      <Payment
                        sx={getFooterNavIconStyle(theme, '#8b5cf6', hoveredButton === 'fee')}
                      />
                    </button>
                    {hoveredButton === 'fee' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Fee Collection
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Add Student Button */}
                {canAccessFooterShortcut('/students/add') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('addStudent')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/students/add')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#22c55e', hoveredButton === 'addStudent')}
                    >
                      <PersonAdd
                        sx={getFooterNavIconStyle(theme, '#22c55e', hoveredButton === 'addStudent')}
                      />
                    </button>
                    {hoveredButton === 'addStudent' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Add Student
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* RFID Scanner Button */}
                {canAccessFooterShortcut('/attendance/rfid-scanner') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('rfidScanner')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/attendance/rfid-scanner')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#f97316', hoveredButton === 'rfidScanner')}
                    >
                      <Contactless
                        sx={getFooterNavIconStyle(theme, '#f97316', hoveredButton === 'rfidScanner')}
                      />
                    </button>
                    {hoveredButton === 'rfidScanner' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Scanner mode
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Reports Button */}
                {canAccessFooterShortcut('/reports') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('reports')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/reports')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#eab308', hoveredButton === 'reports')}
                    >
                      <BarChart
                        sx={getFooterNavIconStyle(theme, '#eab308', hoveredButton === 'reports')}
                      />
                    </button>
                    {hoveredButton === 'reports' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Reports
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Students List Button */}
                {canAccessFooterShortcut('/students/list') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('students')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/students/list')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#6366f1', hoveredButton === 'students')}
                    >
                      <People
                        sx={getFooterNavIconStyle(theme, '#6366f1', hoveredButton === 'students')}
                      />
                    </button>
                    {hoveredButton === 'students' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Students List
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Fine Collection Button */}
                {canAccessFooterShortcut('/fines/collect') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('fineCollect')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/fines/collect')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#10b981', hoveredButton === 'fineCollect')}
                    >
                      <AttachMoney
                        sx={getFooterNavIconStyle(theme, '#10b981', hoveredButton === 'fineCollect')}
                      />
                    </button>
                    {hoveredButton === 'fineCollect' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Fine Collection
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Remaining Fine Button */}
                {canAccessFooterShortcut('/fines/remaining') && (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredButton('remainingFine')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <button
                      onClick={() => navigate('/fines/remaining')}
                      className="footer-icon-button"
                      style={getFooterNavButtonStyle(theme, '#f59e0b', hoveredButton === 'remainingFine')}
                    >
                      <AccountBalanceWallet
                        sx={getFooterNavIconStyle(theme, '#f59e0b', hoveredButton === 'remainingFine')}
                      />
                    </button>
                    {hoveredButton === 'remainingFine' && (
                      <div style={getFooterNavTooltipStyle(theme)}>
                        Remaining Fine
                        <div style={getFooterNavTooltipArrowStyle(theme)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      });
    };

    // Update immediately
    updateFooter();

    // Update every second for real-time clock
    const interval = setInterval(updateFooter, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      setFooterContent(null);
    };
  }, [setFooterContent, navigate, isDark, hoveredButton, canAccessFooterShortcut]);

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

      // Present count includes both 'present' and 'late' statuses
      const presentCount = completeAttendanceData?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
      const absentCount = completeAttendanceData?.filter(a => a.status === 'absent').length || 0;
      const leaveCount = completeAttendanceData?.filter(a => a.status === 'leave').length || 0;
      const lateCount = completeAttendanceData?.filter(a => a.status === 'late').length || 0;
      const totalCount = completeAttendanceData?.length || 0;
      const attPercent = totalCount ? (((presentCount) / totalCount) * 100).toFixed(1) : '0.0';

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

  const exportConsecutiveAbsentPDF = useCallback(async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    if (!consecutiveAbsentStudents || consecutiveAbsentStudents.length === 0) {
      toast.showToast('No consecutive absent students to export.', 'error');
      return;
    }

    setExportAbsentLoading(true);
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileDevice) {
        toast.showToast('Generating PDF for mobile... Please wait.', 'success');
      }

      const [yyyy, mm, dd] = absentDate.split('-');
      const formattedDate = `${dd}-${mm}-${yyyy}`;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Consecutive Absent Students Report', 15, 18);
      doc.setFontSize(11);
      doc.text(`Date: ${formattedDate}`, 15, 26);
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text(`Total: ${consecutiveAbsentStudents.length}`, 120, 18);
      doc.setTextColor(239, 68, 68);
      doc.text(`Consecutive Absentees`, 120, 24);
      doc.setTextColor(0, 0, 0);

      const sortedStudents = [...consecutiveAbsentStudents].sort((a, b) => {
        const classComparison = compareClassNames(a.class_name, b.class_name);
        if (classComparison !== 0) return classComparison;
        return a.student_name.localeCompare(b.student_name);
      });

      autoTable(doc, {
        startY: 36,
        head: [['SNo', 'ID', 'Name', 'Father Name', 'Mobile', 'Class', 'Consecutive Days']],
        body: sortedStudents.map((student, idx) => [
          idx + 1,
          getStudentDisplayId({ id: student.student_id, roll_number: student.roll_number }),
          student.student_name,
          student.father_name || '-',
          student.mobile || '-',
          `${student.class_name}${student.section_name ? ` (${student.section_name})` : ''}`,
          student.consecutive_days
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
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 30, halign: 'left' },
          6: { cellWidth: 25, halign: 'center' },
        },
        didParseCell: function (data) {
          if (data.column.index === 6) {
            const days = parseInt(String(data.cell.raw || '0'));
            if (days >= 5) data.cell.styles.textColor = [239, 68, 68];
            else if (days >= 3) data.cell.styles.textColor = [234, 179, 8];
            else data.cell.styles.textColor = [59, 130, 246];
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
        await savePdf(pdfBlob, `Consecutive Absent Students (${formattedDate}).pdf`, true);
      } else if (isElectron) {
        let electron;
        try {
          electron = (window as any).electron || (window as any).require && (window as any).require('electron');
        } catch (e) { electron = null; }
        if (electron && electron.remote && electron.remote.dialog && electron.remote.app) {
          const path = electron.remote.require('path');
          const documentsPath = electron.remote.app.getPath('documents');
          const defaultFilePath = path.join(documentsPath, `Consecutive Absent Students (${formattedDate}).pdf`);
          const { filePath } = await electron.remote.dialog.showSaveDialog({
            title: 'Save Consecutive Absent Students Report',
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
          const fileName = `Consecutive Absent Students (${formatDateForFileName(new Date())}).pdf`;
          doc.save(fileName);
          toast.showToast('Consecutive absent students PDF generated successfully', 'success');
        }
      } else {
        const formatDateForFileName = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
        const fileName = `Consecutive Absent Students (${formatDateForFileName(new Date())}).pdf`;
        doc.save(fileName);
        toast.showToast('Consecutive absent students PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting consecutive absent students PDF:', error);
      toast.showToast('Failed to export consecutive absent students PDF', 'error');
    } finally {
      setExportAbsentLoading(false);
    }
  }, [consecutiveAbsentStudents, user?.school_id, absentDate, toast, savePdf]);

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

  // Export absent employees PDF
  const exportEmployeeAbsenteesPDF = useCallback(async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    setExportEmployeeAbsentLoading(true);
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
        setExportEmployeeAbsentLoading(false);
        return;
      }

      if (!sessionData?.id) {
        toast.showToast('No active session found', 'error');
        setExportEmployeeAbsentLoading(false);
        return;
      }

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance_records')
        .select(`
          id,
          staff_id,
          status,
          remarks,
          date
        `)
        .eq('date', employeeAbsentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id)
        .or('status.eq.absent,status.eq.leave');

      if (attendanceError || !attendanceData || attendanceData.length === 0) {
        toast.showToast('No absent employees to export.', 'error');
        setExportEmployeeAbsentLoading(false);
        return;
      }

      const staffIds = attendanceData
        .map(record => record.staff_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      if (staffIds.length === 0) {
        toast.showToast('No absent employees to export.', 'error');
        setExportEmployeeAbsentLoading(false);
        return;
      }

      const { data: staffData } = await supabase
        .from('staff')
        .select(`
          id,
          name,
          role,
          mobile
        `)
        .in('id', staffIds)
        .eq('school_id', user.school_id);

      if (!staffData) {
        toast.showToast('Failed to fetch absent employees details.', 'error');
        setExportEmployeeAbsentLoading(false);
        return;
      }

      const monthStart = format(startOfMonth(parseISO(employeeAbsentDate)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(parseISO(employeeAbsentDate)), 'yyyy-MM-dd');

      const { data: monthlyAttendance } = await supabase
        .from('staff_attendance_records')
        .select('staff_id, status, date')
        .in('staff_id', staffIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('school_id', user.school_id);

      const absentEmployees = staffData.map(employee => {
        const attendanceRecord = attendanceData.find(record => record.staff_id === employee.id);
        const employeeMonthlyAttendance = monthlyAttendance?.filter(a => a.staff_id === employee.id) || [];
        const totalDays = employeeMonthlyAttendance.length;
        const absentDays = employeeMonthlyAttendance.filter(a => a.status === 'absent' || a.status === 'leave').length;
        const attendancePercentage = totalDays > 0 ? ((totalDays - absentDays) / totalDays * 100).toFixed(1) : '100.0';

        return {
          id: employee.id,
          name: employee.name || '',
          role: employee.role || '',
          mobile: employee.mobile || '',
          status: attendanceRecord?.status || 'absent',
          monthly_absences: absentDays,
          attendance_percentage: attendancePercentage
        };
      }).sort((a, b) => {
        const roleComparison = (a.role || '').localeCompare(b.role || '');
        if (roleComparison !== 0) return roleComparison;
        return a.name.localeCompare(b.name);
      });

      const { data: completeAttendanceData } = await supabase
        .from('staff_attendance_records')
        .select('staff_id, status, date')
        .eq('date', employeeAbsentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id);

      // Present count includes both 'present' and 'late' statuses
      const presentCount = completeAttendanceData?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
      const absentCount = completeAttendanceData?.filter(a => a.status === 'absent').length || 0;
      const leaveCount = completeAttendanceData?.filter(a => a.status === 'leave').length || 0;
      const lateCount = completeAttendanceData?.filter(a => a.status === 'late').length || 0;
      const halfDayCount = completeAttendanceData?.filter(a => a.status === 'half_day').length || 0;
      const totalCount = completeAttendanceData?.length || 0;
      const attPercent = totalCount ? (((presentCount + halfDayCount) / totalCount) * 100).toFixed(1) : '0.0';

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Absent Employees Report', 15, 18);
      doc.setFontSize(11);
      const [yyyy, mm, dd] = employeeAbsentDate.split('-');
      const formattedDate = `${dd}-${mm}-${yyyy}`;
      doc.text(`Date: ${formattedDate}`, 15, 26);
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text(`Total: ${totalCount}`, 120, 18);
      doc.setTextColor(34, 197, 94);
      doc.text(`Present: ${presentCount + halfDayCount}`, 120, 24);
      doc.setTextColor(239, 68, 68);
      doc.text(`Absent: ${absentCount}`, 170, 18);
      doc.setTextColor(37, 99, 235);
      doc.text(`Leave: ${leaveCount}`, 170, 24);
      doc.setTextColor(234, 179, 8);
      doc.text(`Late: ${lateCount}`, 120, 30);
      doc.setTextColor(139, 92, 246);
      doc.text(`Half Day: ${halfDayCount}`, 170, 30);
      let perColor: [number, number, number] = [34, 197, 94];
      const perVal = parseFloat(attPercent);
      if (perVal < 75) perColor = [239, 68, 68];
      else if (perVal < 85) perColor = [234, 179, 8];
      doc.setTextColor(...perColor);
      doc.text(`Per%: ${attPercent}%`, 120, 36);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 42,
        head: [['SNo', 'ID', 'Name', 'Role', 'Mobile', 'Status', 'M.A', 'Att%']],
        body: absentEmployees.map((employee, idx) => [
          idx + 1,
          `E${employee.id}`,
          employee.name,
          employee.role,
          employee.mobile,
          employee.status === 'absent' ? 'Absent' : 'Leave',
          employee.monthly_absences,
          `${employee.attendance_percentage}%`
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
        margin: { top: 42, left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 14, halign: 'center' },
          2: { cellWidth: 32, halign: 'left' },
          3: { cellWidth: 28, halign: 'left' },
        },
        didParseCell: function (data) {
          if (data.column.index === 5) {
            if (data.cell.raw === 'Absent') data.cell.styles.textColor = [239, 68, 68];
            if (data.cell.raw === 'Leave') data.cell.styles.textColor = [37, 99, 235];
          }
          if (data.column.index === 7) {
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
        await savePdf(pdfBlob, `Absent Employees (${formattedDate}).pdf`, true);
      } else if (isElectron) {
        let electron;
        try {
          electron = (window as any).electron || (window as any).require && (window as any).require('electron');
        } catch (e) { electron = null; }
        if (electron && electron.remote && electron.remote.dialog && electron.remote.app) {
          const path = electron.remote.require('path');
          const documentsPath = electron.remote.app.getPath('documents');
          const defaultFilePath = path.join(documentsPath, `Absent Employees (${formattedDate}).pdf`);
          const { filePath } = await electron.remote.dialog.showSaveDialog({
            title: 'Save Absent Employees Report',
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
          const fileName = `Absent Employees (${formatDateForFileName(new Date())}).pdf`;
          doc.save(fileName);
          toast.showToast('Absent employees PDF generated successfully', 'success');
        }
      } else {
        const formatDateForFileName = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
        const fileName = `Absent Employees (${formatDateForFileName(new Date())}).pdf`;
        doc.save(fileName);
        toast.showToast('Absent employees PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting absent employees PDF:', error);
      toast.showToast('Failed to export absent employees PDF', 'error');
    } finally {
      setExportEmployeeAbsentLoading(false);
    }
  }, [employeeAbsentees, user?.school_id, employeeAbsentDate, schoolName, toast, savePdf, getCachedSession]);

  // Export present employees PDF
  const exportPresentEmployeesPDF = useCallback(async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    setExportEmployeePresentLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError && !isNoSessionError(sessionError)) {
        toast.showToast('Failed to fetch active session', 'error');
        setExportEmployeePresentLoading(false);
        return;
      }

      if (!sessionData?.id) {
        toast.showToast('No active session found', 'error');
        setExportEmployeePresentLoading(false);
        return;
      }

      const presentRecords = employeeAttendanceDataForDate.filter(a =>
        a.status === 'present' || a.status === 'late' || a.status === 'half_day'
      );
      if (presentRecords.length === 0) {
        toast.showToast('No present employees to export.', 'error');
        setExportEmployeePresentLoading(false);
        return;
      }

      const staffIds = presentRecords
        .map(record => record.staff_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      const { data: staffData } = await supabase
        .from('staff')
        .select(`
          id,
          name,
          role,
          mobile
        `)
        .in('id', staffIds)
        .eq('school_id', user.school_id);

      if (!staffData) {
        toast.showToast('Failed to fetch present employees details.', 'error');
        setExportEmployeePresentLoading(false);
        return;
      }

      const presentEmployees = staffData.map(employee => {
        const attendanceRecord = presentRecords.find(record => record.staff_id === employee.id);
        return {
          id: employee.id,
          name: employee.name || '',
          role: employee.role || '',
          mobile: employee.mobile || '',
          status: attendanceRecord?.status || 'present'
        };
      }).sort((a, b) => {
        const roleComparison = (a.role || '').localeCompare(b.role || '');
        if (roleComparison !== 0) return roleComparison;
        return a.name.localeCompare(b.name);
      });

      const { data: completeAttendanceData } = await supabase
        .from('staff_attendance_records')
        .select('staff_id, status, date')
        .eq('date', dashboardDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id);

      const presentCount = completeAttendanceData?.filter(a =>
        a.status === 'present' || a.status === 'late' || a.status === 'half_day'
      ).length || 0;
      const absentCount = completeAttendanceData?.filter(a => a.status === 'absent').length || 0;
      const leaveCount = completeAttendanceData?.filter(a => a.status === 'leave').length || 0;
      const lateCount = completeAttendanceData?.filter(a => a.status === 'late').length || 0;
      const halfDayCount = completeAttendanceData?.filter(a => a.status === 'half_day').length || 0;
      const totalCount = completeAttendanceData?.length || 0;
      const attPercent = totalCount ? (((presentCount) / totalCount) * 100).toFixed(1) : '0.0';

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Present Employees Report', 15, 18);
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
      doc.setTextColor(139, 92, 246);
      doc.text(`Half Day: ${halfDayCount}`, 170, 30);
      let perColor: [number, number, number] = [34, 197, 94];
      const perVal = parseFloat(attPercent);
      if (perVal < 75) perColor = [239, 68, 68];
      else if (perVal < 85) perColor = [234, 179, 8];
      doc.setTextColor(...perColor);
      doc.text(`Per%: ${attPercent}%`, 120, 36);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 42,
        head: [['SNo', 'ID', 'Name', 'Role', 'Mobile', 'Status']],
        body: presentEmployees.map((employee, idx) => [
          idx + 1,
          `E${employee.id}`,
          employee.name,
          employee.role,
          employee.mobile,
          employee.status === 'late' ? 'Late' :
            employee.status === 'half_day' ? 'Half Day' : 'Present'
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
        margin: { top: 42, left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 14, halign: 'center' },
          2: { cellWidth: 32, halign: 'left' },
          3: { cellWidth: 28, halign: 'left' },
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
        await savePdf(pdfBlob, `Present Employees (${formattedDate}).pdf`, true);
      } else if (isElectron) {
        let electron;
        try {
          electron = (window as any).electron || (window as any).require && (window as any).require('electron');
        } catch (e) { electron = null; }
        if (electron && electron.remote && electron.remote.dialog && electron.remote.app) {
          const path = electron.remote.require('path');
          const documentsPath = electron.remote.app.getPath('documents');
          const defaultFilePath = path.join(documentsPath, `Present Employees (${formattedDate}).pdf`);
          const { filePath } = await electron.remote.dialog.showSaveDialog({
            title: 'Save Present Employees Report',
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
          const fileName = `Present Employees (${formatDateForFileName(new Date())}).pdf`;
          doc.save(fileName);
          toast.showToast('Present employees PDF generated successfully', 'success');
        }
      } else {
        const formatDateForFileName = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
        const fileName = `Present Employees (${formatDateForFileName(new Date())}).pdf`;
        doc.save(fileName);
        toast.showToast('Present employees PDF generated successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting present employees PDF:', error);
      toast.showToast('Failed to export present employees PDF', 'error');
    } finally {
      setExportEmployeePresentLoading(false);
    }
  }, [employeeAttendanceDataForDate, user?.school_id, dashboardDate, schoolName, toast, savePdf, getCachedSession]);

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
    const rangeStudents = admissionsData.recentStudents || [];
    if (!rangeStudents.length || !classes.length) return [];
    const strengthMap = new Map<string, { boys: number; girls: number }>();
    rangeStudents.forEach((student: any) => {
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
  }, [admissionsData.recentStudents, classes, getClassName]);

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

  // Helper function to check if a tab is currently loading
  const isTabLoading = (tab: DashboardTab): boolean => {
    switch (tab) {
      case 'attendance':
        return attendanceStatsLoading || attendanceChartsLoading || consecutiveAbsentLoading;
      case 'fee':
        return feeSummaryLoading || collectionChartsLoading || feeCollectionDetailsLoading || defaultersLoading;
      case 'admissions':
        return admissionsLoading;
      case 'homework':
        return homeworkLoading;
      case 'employeeAttendance':
        return employeeAttendanceStatsLoading || employeeAttendanceChartsLoading;
      case 'accounts':
        return accountsLoading;
      default:
        return false;
    }
  };

  return (
    <DashboardContainer>
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        dashboardDate={dashboardDate}
        setDashboardDate={setDashboardDate}
        setAbsentDate={setAbsentDate}
        setFineDate={setFineDate}
        allowedTabs={allowedTabs}
      />

      {/* Show loader if tab is loading */}
      {isTabLoading(activeTab) ? (
        <Loader />
      ) : (
        <>
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
              exportConsecutiveAbsentPDF={exportConsecutiveAbsentPDF}
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

          {activeTab === 'employeeAttendance' && (
            <EmployeeAttendanceTab
              presentToday={employeePresentToday}
              absentToday={employeeAbsentToday}
              leaveToday={employeeLeaveToday}
              lateToday={employeeLateToday}
              halfDayCount={employeeHalfDayCount}
              presentPercent={employeePresentPercent}
              absentPercent={employeeAbsentPercent}
              leavePercent={employeeLeavePercent}
              latePercent={employeeLatePercent}
              halfDayPercent={employeeHalfDayPercent}
              attendanceStatsLoading={employeeAttendanceStatsLoading}
              attendanceChartsLoading={employeeAttendanceChartsLoading}
              attendanceTrendData={employeeAttendanceTrendData}
              todayAttendanceRate={employeeTodayAttendanceRate}
              weekAvgAttendanceRate={employeeWeekAvgAttendanceRate}
              absentDate={employeeAbsentDate}
              setAbsentDate={setEmployeeAbsentDate}
              isAbsenteesExpanded={isEmployeeAbsenteesExpanded}
              setIsAbsenteesExpanded={setIsEmployeeAbsenteesExpanded}
              absentees={employeeAbsentees}
              staffDetails={staffDetails}
              attendanceDataForDate={employeeAttendanceDataForDate}
              exportAbsentLoading={exportEmployeeAbsentLoading}
              exportPresentLoading={exportEmployeePresentLoading}
              exportAbsenteesPDF={exportEmployeeAbsenteesPDF}
              exportPresentEmployeesPDF={exportPresentEmployeesPDF}
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
              setAbsentees={setEmployeeAbsentees}
              setAttendanceDataForDate={setEmployeeAttendanceDataForDate}
              user={user}
              schoolName={schoolName}
              showAbsentees={true}
              isMobile={isMobile}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab
              accountsData={accountsData}
              accountsLoading={accountsLoading}
              accountsDateFrom={accountsDateFrom}
              setAccountsDateFrom={setAccountsDateFrom}
              accountsDateTo={accountsDateTo}
              setAccountsDateTo={setAccountsDateTo}
            />
          )}

          {activeTab === 'predictions' && (
            <PredictionsTab user={user} />
          )}
        </>
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
            border: `2px solid ${(theme as any).ACCENT}`,
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
