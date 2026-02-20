import React, { useContext, useRef, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/useToast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout, { ProgressProvider } from './components/Layout';
import UpdateNotification, { UpdateNotificationRef } from './components/UpdateNotification';
import { ensurePermissionsSynced } from './services/permissionService';
import Login from './pages/Login';
import UnauthorizedPage from './pages/UnauthorizedPage';
import Dashboard from './pages/Dashboard';
import WelcomePage from './pages/WelcomePage';
import ClassesManager from './components/ClassesManager';
import StudentAdmissionForm from './components/StudentAdmissionForm';
import BulkStudentAdmission from './components/BulkStudentAdmission';
import StudentList from './components/StudentList';
import WithdrawalRegister from './components/WithdrawalRegister';
import SessionsManager from './components/SessionsManager';
import MarkAttendance from './components/MarkAttendance';
import MarkStaffAttendance from './components/MarkStaffAttendance';
import StaffAttendanceReport from './components/StaffAttendanceReport';
import AttendanceReport from './components/AttendanceReport';
import HalfLeaves from './components/HalfLeaves';
import StaffHalfLeaves from './components/StaffHalfLeaves';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import ComplaintsSuggestionsPage from './pages/ComplaintsSuggestionsPage';
import FineManager from './components/FineManager';
import FineCollection from './pages/FineCollection';
import RemainingFine from './pages/RemainingFine';
import FineStatistics from './pages/FineStatistics';
import FamilyManagementPage from './pages/FamilyManagementPage';
import InstituteProfile from './pages/InstituteProfile';
import PageNotFound from './pages/PageNotFound';
import StudentStatusManager from './pages/StudentStatusManager';
import BulkPromoteDemote from './pages/BulkPromoteDemote';
import UserManagement from './pages/UserManagement';
import GeneralSettings from './pages/GeneralSettings';
import UserAnnouncements from './pages/UserAnnouncements';
import NotificationSettings from './pages/NotificationSettings';
import RenderSettings from './pages/RenderSettings';
import RoleManagement from './pages/RoleManagement';
import UserPermissionManagement from './pages/UserPermissionManagement';
import CustomLandingPage from './pages/CustomLandingPage';
import UserDashboard from './pages/UserDashboard';
import Events from './pages/Events';
import StaffAddForm from './pages/StaffAddForm';
import { useAuth } from './contexts/AuthContext';
import HolidayManager from './components/HolidayManager';
import EmployeeList from './pages/EmployeeList';
import PayrollDashboard from './pages/Payroll';
import SubjectManager from './pages/SubjectManager';
import TeacherSubjectManager from './pages/TeacherSubjectManager';
import MyTimetable from './pages/MyTimetable';
import TimeTableManager from './pages/TimeTableManager';
import { Reports } from './pages/Reports';
import { EmployeeReports } from './pages/EmployeeReports';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StudentProfile } from './pages/StudentProfile';
import { TeacherProfile } from './pages/TeacherProfile';
import SchoolsManagement from './pages/SchoolsManagement';
import SchoolWelcomeScreen from './pages/SchoolWelcomeScreen';
import FeeStructureManager from './pages/FeeStructureManager';
import FeePlans from './pages/FeePlans';
import FeeIncrements from './pages/FeeIncrements';
import FeeCollection from './pages/FeeCollectionNew';
import FamilyFeeCollection from './pages/FamilyFeeCollection';
import FeeDefaultersList from './pages/FeeDefaultersList';
import FeeArrearsManager from './pages/FeeArrearsManager';
import FeeAuditLogsPage from './pages/FeeAuditLogsPage';
import ChallanGenerationPage from './pages/ChallanGenerationPage';
import ChallansListPage from './pages/ChallansListPage';
import FeeAnalyticsPage from './pages/FeeAnalyticsPage';
import PaymentsAnalyticsPage from './pages/PaymentsAnalyticsPage';
import FeeSettings from './pages/FeeSettings';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import LedgerPage from './pages/LedgerPage';
import SetupAccountsPage from './pages/SetupAccountsPage';
import BalanceSheetPage from './pages/BalanceSheetPage';
import CashFlowPage from './pages/CashFlowPage';
// Enquiry Management Components
import EnquiryManagementDashboardPage from './pages/EnquiryManagementDashboardPage';
import EnquiryDashboardPage from './pages/EnquiryDashboardPage';
import EnquiryListPage from './pages/EnquiryListPage';
import EnquiryDetailPage from './pages/EnquiryDetailPage';
import EnquiryFormPage from './pages/EnquiryFormPage';
// Examination Management Components
import ExaminationManager from './components/ExaminationManager';
import StudentExclusionManager from './components/StudentExclusionManager';
import MarksEntryManager from './components/MarksEntryManager';
import TestRecordManager from './components/TestRecordManager';
import TestRecordMasterSheet from './components/TestRecordMasterSheet';
import TestAnalytics from './components/TestAnalytics';
import MasterSheetManager from './components/MasterSheetManager';
import DetailedMarksCertificate from './components/DetailedMarksCertificate';
import PositionHolders from './components/PositionHolders';
import ExaminationAnalytics from './components/ExaminationAnalytics';
import ExaminationConfiguration from './pages/ExaminationConfiguration';
// Homework Diary Management
import HomeworkDiaryManager from './components/HomeworkDiaryManager';
import DiaryAnalytics from './components/DiaryAnalytics';
// Student Management Components
import GeneralMessagePage from './pages/GeneralMessagePage';
// Fine Management Components
import FineDashboard from './components/FineDashboard';
// Attendance Management Components
// Expense Management Components
import ExpenseDashboard from './components/ExpenseDashboard';
import ExpenseManager from './pages/ExpenseManager';
import ExpenseAnalyticsPage from './pages/ExpenseAnalyticsPage';
import OtherIncomeManager from './pages/OtherIncomeManager';
// Assets & Liabilities Management Components
import AssetsLiabilitiesManager from './pages/AssetsLiabilities/AssetsLiabilitiesManager';
// Finance Management Components
import FinanceDashboard from './components/FinanceDashboard';
// Communication Management Components
import CommunicationDashboard from './components/CommunicationDashboard';
// Settings Management Components
// Employee Management Components
import EmployeesDashboard from './components/EmployeesDashboard';
import { LoadingProvider } from './contexts/LoadingContext';
// import RouteChangeLoader from './components/RouteChangeLoader'; // Disabled - using page-specific loaders instead
import { ThemeContext, darkTheme, lightTheme } from './contexts/ThemeContext';
import GlobalBackHandler from './components/GlobalBackHandler';
import { NavigationProvider } from './contexts/NavigationContext';
import InitialRouteHandler from './components/InitialRouteHandler';
import { Capacitor } from '@capacitor/core';
import { isWeb } from './utils/platformDetection';

// Use HashRouter in Electron, BrowserRouter in web
const isElectron = Boolean((window as any).electronAPI);
const AppRouter = isElectron ? HashRouter : BrowserRouter;

const App: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const updateNotificationRef = useRef<UpdateNotificationRef>(null);

  // Sync permissions from menu structure on app startup
  useEffect(() => {
    ensurePermissionsSynced().catch(err => {
      console.error('Failed to sync permissions:', err);
    });
  }, []);

  // Expose update check function globally for manual checks
  useEffect(() => {
    (window as any).checkForAppUpdates = () => {
      if (updateNotificationRef.current) {
        updateNotificationRef.current.checkForUpdates();
      }
    };
    // Expose ref for Layout component to check download state
    (window as any).updateNotificationRef = updateNotificationRef;
    return () => {
      delete (window as any).checkForAppUpdates;
      delete (window as any).updateNotificationRef;
    };
  }, []);
  // Remove all storage permission code: no useEffect needed!
  const muiTheme = React.useMemo(() => createTheme({
    palette: {
      mode: theme === 'dark' ? 'dark' : 'light',
      primary: { main: '#4a6cf7' },
      background: {
        default: theme === 'dark' ? darkTheme.BG : lightTheme.BG,
        paper: theme === 'dark' ? darkTheme.CARD : lightTheme.CARD,
      },
    },
  }), [theme]);


  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <AppRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <MuiThemeProvider theme={muiTheme}>
          <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
            <ProgressProvider>
              <LoadingProvider>
                {/* <RouteChangeLoader /> */} {/* Disabled - using page-specific loaders instead */}
                <GlobalBackHandler
                  onExit={() => {
                    if (window.electronAPI) {
                      window.electronAPI.minimize();
                    }
                  }}
                />
                <AuthProvider>
                  <NavigationProvider>
                    <ToastProvider theme={theme} muted={false}>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/unauthorized" element={<UnauthorizedPage />} />


                        {/* School Welcome Screen - Shows after login */}
                        <Route
                          path="/welcome"
                          element={
                            <ProtectedRoute requiredPermission="dashboard">
                              <SchoolWelcomeScreen />
                            </ProtectedRoute>
                          }
                        />

                        {/* Dashboard Route - Main app entry point */}
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute requiredPermission="dashboard">
                              <Layout />
                            </ProtectedRoute>
                          }
                        >
                          <Route
                            index
                            element={<Dashboard />}
                          />
                        </Route>

                        {/* Protected Routes */}
                        <Route path="/" element={<Layout />}>
                          {/* Root route - handle initial redirection based on user role */}
                          <Route
                            index
                            element={<InitialRouteHandler />}
                          />

                          {/* Teacher Welcome Page */}
                          {/* Student My Profile - Only accessible to students, no ID in URL */}
                          <Route
                            path="my-profile"
                            element={
                              <ProtectedRoute requiredPermission="student-profile">
                                <StudentProfile isMyProfile={true} />
                              </ProtectedRoute>
                            }
                          />
                          {/* Public Student Profile (uses Layout providers for styles/contexts) - Students cannot access this directly */}
                          <Route
                            path="student/:id"
                            element={
                              <ProtectedRoute
                                requiredPermission="student-profile"
                              >
                                <StudentProfile />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="user"
                            element={<UserDashboard />}
                          />

                          {/* Teacher Timetable */}
                          <Route
                            path="my-timetable"
                            element={
                              <ProtectedRoute requiredPermission="timetable">
                                <MyTimetable />
                              </ProtectedRoute>
                            }
                          />


                          {/* Classes Management */}
                          <Route
                            path="classes/all"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <ClassesManager />
                              </ProtectedRoute>
                            }
                          />


                          {/* Student Management */}
                          <Route
                            path="students/list"
                            element={
                              <ProtectedRoute
                                requiredPermission="students-list"
                              >
                                <StudentList />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/profile/:id"
                            element={
                              <ProtectedRoute
                                requiredPermission="student-profile"
                              >
                                <StudentProfile />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/add"
                            element={
                              <ProtectedRoute requiredPermission="students-add">
                                <StudentAdmissionForm />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bulk-student-admission"
                            element={
                              <ProtectedRoute requiredPermission="students-bulk-admission">
                                <BulkStudentAdmission />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/status"
                            element={
                              <ProtectedRoute requiredPermission="students-status">
                                <StudentStatusManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/withdrawal-register"
                            element={
                              <ProtectedRoute
                                requiredPermission="withdrawal-register"
                              >
                                <WithdrawalRegister />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/general-message"
                            element={
                              <ProtectedRoute requiredPermission="messages">
                                <GeneralMessagePage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="events"
                            element={
                              <ProtectedRoute requiredPermission="events">
                                <Events />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bulk-promote-demote"
                            element={
                              <ProtectedRoute requiredPermission="students-bulk-promote">
                                <BulkPromoteDemote />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="family-management"
                            element={
                              <ProtectedRoute requiredPermission="family-management">
                                <FamilyManagementPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Employee Dashboard */}
                          <Route
                            path="employees"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <EmployeesDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Employee Management */}
                          <Route
                            path="employees/list"
                            element={
                              <ProtectedRoute requiredPermission="employees-list">
                                <EmployeeList />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="employees/add"
                            element={
                              <ProtectedRoute requiredPermission="employees-add">
                                <StaffAddForm />
                              </ProtectedRoute>
                            }
                          />

                          {/* Teacher My Profile - Only accessible to teachers, no ID in URL */}
                          <Route
                            path="profile"
                            element={
                              <ProtectedRoute requiredPermission="teacher-profile">
                                <TeacherProfile isMyProfile={true} />
                              </ProtectedRoute>
                            }
                          />
                          {/* Public Teacher Profile (for viewing other teachers) */}
                          <Route
                            path="employees/profile/:id"
                            element={
                              <ProtectedRoute
                                requiredPermission="teacher-profile"
                              >
                                <TeacherProfile />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/teacher-subjects"
                            element={
                              <ProtectedRoute requiredPermission="teacher-subjects">
                                <TeacherSubjectManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Payroll Management */}
                          <Route
                            path="payroll"
                            element={
                              <ProtectedRoute requiredPermission="payroll-view">
                                <PayrollDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Settings Dashboard */}

                          {/* Settings Routes */}
                          <Route
                            path="settings/sessions"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <SessionsManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/user-management"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <UserManagement />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/role-management"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <RoleManagement />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/user-permissions"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <UserPermissionManagement />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/institute-profile"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <InstituteProfile />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/holidays"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <HolidayManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/classes"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <ClassesManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/general-settings"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <GeneralSettings />
                              </ProtectedRoute>
                            }
                          />


                          <Route
                            path="settings/user-announcements"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <UserAnnouncements />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/notifications"
                            element={
                              <ProtectedRoute requiredPermission="settings-classes">
                                <NotificationSettings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/rendersettings"
                            element={
                              <ProtectedRoute requiredPermission="settings-landing-page">
                                <RenderSettings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="home"
                            element={
                              <ProtectedRoute requiredPermission="dashboard">
                                <CustomLandingPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Finance Management Dashboard */}
                          <Route
                            path="finance"
                            element={
                              <ProtectedRoute requiredPermission="fee-structure">
                                <FinanceDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fine Dashboard */}
                          <Route
                            path="fines"
                            element={
                              <ProtectedRoute requiredPermission="fine-assign">
                                <FineDashboard />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fine-dashboard"
                            element={
                              <ProtectedRoute requiredPermission="fee-structure">
                                <FineDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fine Management Routes */}
                          <Route
                            path="fines/assign"
                            element={
                              <ProtectedRoute requiredPermission="fine-assign">
                                <FineManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fines/collect"
                            element={
                              <ProtectedRoute requiredPermission="fine-collect">
                                <FineCollection />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fines/remaining"
                            element={
                              <ProtectedRoute requiredPermission="fine-remaining">
                                <RemainingFine />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fines/statistics"
                            element={
                              <ProtectedRoute
                                requiredPermission="fine-statistics"
                              >
                                <FineStatistics />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fee Management Routes */}
                          <Route
                            path="fee-structure-management"
                            element={
                              <ProtectedRoute requiredPermission="fee-structure">
                                <FeeStructureManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-plans"
                            element={
                              <ProtectedRoute requiredPermission="fee-plans">
                                <FeePlans />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-increments"
                            element={
                              <ProtectedRoute requiredPermission="fee-increments">
                                <FeeIncrements />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="generate-challans"
                            element={
                              <ProtectedRoute requiredPermission="generate-challans">
                                <ChallanGenerationPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="challans"
                            element={
                              <ProtectedRoute requiredPermission="view-challans">
                                <ChallansListPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-collection"
                            element={
                              <ProtectedRoute requiredPermission="fee-collection">
                                <FeeCollection />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="family-fee-collection"
                            element={
                              <ProtectedRoute requiredPermission="fee-collection">
                                <FamilyFeeCollection />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-defaulters"
                            element={
                              <ProtectedRoute requiredPermission="fee-defaulters">
                                <FeeDefaultersList />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-arrears"
                            element={
                              <ProtectedRoute requiredPermission="fee-arrears">
                                <FeeArrearsManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-audit-logs"
                            element={
                              <ProtectedRoute requiredPermission="fee-audit-logs">
                                <FeeAuditLogsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-analytics"
                            element={
                              <ProtectedRoute
                                requiredPermission="fee-analytics"
                              >
                                <FeeAnalyticsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="payments-analytics"
                            element={
                              <ProtectedRoute
                                requiredPermission="payments-analytics"
                              >
                                <PaymentsAnalyticsPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="fee-settings"
                            element={
                              <ProtectedRoute requiredPermission="fee-structure">
                                <FeeSettings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="payment-history"
                            element={
                              <ProtectedRoute requiredPermission="payment-history">
                                <PaymentHistoryPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="ledger"
                            element={
                              <ProtectedRoute requiredPermission="fee-ledger">
                                <LedgerPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="setup-accounts"
                            element={
                              <ProtectedRoute requiredPermission="setup-accounts">
                                <SetupAccountsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="balance-sheet"
                            element={
                              <ProtectedRoute requiredPermission="setup-accounts">
                                <BalanceSheetPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="cash-flow"
                            element={
                              <ProtectedRoute requiredPermission="cash-flow-view">
                                <CashFlowPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Expense Management Dashboard */}
                          <Route
                            path="expense-management"
                            element={
                              <ProtectedRoute requiredPermission="expense-manager">
                                <ExpenseDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Expense Management Routes */}
                          <Route
                            path="expense-manager"
                            element={
                              <ProtectedRoute requiredPermission="expense-manager">
                                <ExpenseManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="other-income-manager"
                            element={
                              <ProtectedRoute requiredPermission="other-income-manager">
                                <OtherIncomeManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="expense-analytics"
                            element={
                              <ProtectedRoute
                                requiredPermission="expense-analytics">
                                <ExpenseAnalyticsPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Assets & Liabilities Management */}
                          <Route
                            path="assets-liabilities"
                            element={
                              <ProtectedRoute requiredPermission="assets-liabilities-view">
                                <AssetsLiabilitiesManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Communication Management Dashboard */}
                          <Route
                            path="communication"
                            element={
                              <ProtectedRoute requiredPermission="messages">
                                <CommunicationDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Enquiry Management Routes */}
                          <Route
                            path="enquiries"
                            element={
                              <ProtectedRoute requiredPermission="enquiry-dashboard">
                                <EnquiryManagementDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/dashboard"
                            element={
                              <ProtectedRoute requiredPermission="enquiry-dashboard">
                                <EnquiryDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/list"
                            element={
                              <ProtectedRoute requiredPermission="enquiry-list">
                                <EnquiryListPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/create"
                            element={
                              <ProtectedRoute requiredPermission="enquiry-create">
                                <EnquiryFormPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/:id"
                            element={
                              <ProtectedRoute requiredPermission="enquiry-list">
                                <EnquiryDetailPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/:id/edit"
                            element={
                              <ProtectedRoute requiredPermission="enquiry-create">
                                <EnquiryFormPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Reports Management */}
                          <Route
                            path="reports"
                            element={
                              <ProtectedRoute requiredPermission="reports-students">
                                <Reports />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="reports/students"
                            element={
                              <ProtectedRoute requiredPermission="reports-students">
                                <Reports />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="reports/employee-reports"
                            element={
                              <ProtectedRoute requiredPermission="reports-employees">
                                <EmployeeReports />
                              </ProtectedRoute>
                            }
                          />


                          {/* Attendance Routes */}
                          <Route
                            path="attendance/mark"
                            element={
                              <ProtectedRoute requiredPermission="attendance-mark">
                                <MarkAttendance />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/staff"
                            element={
                              <ProtectedRoute requiredPermission="attendance-staff">
                                <MarkStaffAttendance />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/staff-report"
                            element={
                              <ProtectedRoute requiredPermission="attendance-staff-report">
                                <StaffAttendanceReport />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/report"
                            element={
                              <ProtectedRoute
                                requiredPermission="attendance-report"
                              >
                                <AttendanceReport />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/half-leaves"
                            element={
                              <ProtectedRoute requiredPermission="half-leaves">
                                <HalfLeaves />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/staff-half-leaves"
                            element={
                              <ProtectedRoute requiredPermission="staff-half-leaves">
                                <StaffHalfLeaves />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/leave-requests"
                            element={
                              <ProtectedRoute requiredPermission="leave-requests">
                                <LeaveRequestsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/complaints-suggestions"
                            element={
                              <ProtectedRoute requiredPermission="complaints-suggestions">
                                <ComplaintsSuggestionsPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Subject Management */}
                          <Route
                            path="subjects"
                            element={
                              <ProtectedRoute requiredPermission="subjects">
                                <SubjectManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Examination Dashboard */}

                          {/* Examination Management */}
                          <Route
                            path="examinations"
                            element={
                              <ProtectedRoute
                                requiredPermission="examinations"
                              >
                                <ExaminationManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="student-exam-exclusion"
                            element={
                              <ProtectedRoute requiredPermission="examinations">
                                <StudentExclusionManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Examination Configuration */}
                          <Route
                            path="examination-configuration"
                            element={
                              <ProtectedRoute requiredPermission="examination-configuration">
                                <ExaminationConfiguration />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="marks-entry"
                            element={
                              <ProtectedRoute requiredPermission="marks-entry">
                                <MarksEntryManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="master-sheets"
                            element={
                              <ProtectedRoute requiredPermission="master-sheets">
                                <MasterSheetManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="dmc-generation"
                            element={
                              <ProtectedRoute requiredPermission="dmc-generation">
                                <DetailedMarksCertificate />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="position-holders"
                            element={
                              <ProtectedRoute requiredPermission="position-holders">
                                <PositionHolders />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="exam-analytics"
                            element={
                              <ProtectedRoute requiredPermission="exam-analytics">
                                <ExaminationAnalytics />
                              </ProtectedRoute>
                            }
                          />

                          {/* Test Record Management */}
                          <Route
                            path="test-records"
                            element={
                              <ProtectedRoute
                                requiredPermission="test-records"
                              >
                                <TestRecordManager />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="test-record-master-sheet"
                            element={
                              <ProtectedRoute requiredPermission="test-master-sheet">
                                <TestRecordMasterSheet />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="test-analytics"
                            element={
                              <ProtectedRoute requiredPermission="test-analytics">
                                <TestAnalytics />
                              </ProtectedRoute>
                            }
                          />

                          {/* Time Table Management */}
                          <Route
                            path="timetable"
                            element={
                              <ProtectedRoute requiredPermission="timetable">
                                <TimeTableManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Homework Diary Management */}
                          <Route
                            path="homework-diary"
                            element={
                              <ProtectedRoute requiredPermission="homework-diary">
                                <HomeworkDiaryManager />
                              </ProtectedRoute>
                            }
                          />
                          {/* Diary Analytics */}
                          <Route
                            path="diary-analytics"
                            element={
                              <ProtectedRoute requiredPermission="diary-analytics">
                                <DiaryAnalytics />
                              </ProtectedRoute>
                            }
                          />

                          {/* Schools Management */}
                          <Route
                            path="schools"
                            element={
                              <ProtectedRoute requiredPermission="settings-institute-profile">
                                <SchoolsManagement />
                              </ProtectedRoute>
                            }
                          />

                          {/* Default route */}
                          <Route path="*" element={<PageNotFound />} />
                        </Route>
                      </Routes>
                    </ToastProvider>
                    {/* Only render UpdateNotification on Electron/Capacitor, not on web */}
                    {!isWeb() && <UpdateNotification ref={updateNotificationRef} />}
                  </NavigationProvider>
                </AuthProvider>
              </LoadingProvider>
            </ProgressProvider>
          </ThemeProvider>
        </MuiThemeProvider>
      </AppRouter>
    </LocalizationProvider>
  );
};

export default App; 


