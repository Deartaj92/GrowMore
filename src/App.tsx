import React, { useContext, useRef, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/useToast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout, { ProgressProvider } from './components/Layout';
import UpdateNotification, { UpdateNotificationRef } from './components/UpdateNotification';
import Login from './pages/Login';
import UnauthorizedPage from './pages/UnauthorizedPage';
import Dashboard from './pages/Dashboard';
import GuestDashboard from './pages/GuestDashboard';
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
import LeaveRequestsPage from './pages/LeaveRequestsPage';
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
import LandingPageConfiguration from './pages/LandingPageConfiguration';
import CustomLandingPage from './pages/CustomLandingPage';
import StaffAddForm from './pages/StaffAddForm';
import { useAuth } from './contexts/AuthContext';
import HolidayManager from './components/HolidayManager';
import EmployeeList from './pages/EmployeeList';
import SubjectManager from './pages/SubjectManager';
import TeacherSubjectManager from './pages/TeacherSubjectManager';
import MyTimetable from './pages/MyTimetable';
import TimeTableManager from './pages/TimeTableManager';
import { Reports } from './pages/Reports';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StudentProfile } from './pages/StudentProfile';
import { TeacherProfile } from './pages/TeacherProfile';
import SchoolsManagement from './pages/SchoolsManagement';
import SchoolWelcomeScreen from './pages/SchoolWelcomeScreen';
import FeeStructureManager from './pages/FeeStructureManager';
import LoadFeePage from './pages/LoadFeePage';
import FeeCollection from './pages/FeeCollectionNew';
import FeeDefaultersList from './pages/FeeDefaultersList';
import FeeAuditLogsPage from './pages/FeeAuditLogsPage';
import FeeAnalyticsPage from './pages/FeeAnalyticsPage';
import ConcessionsPage from './pages/ConcessionsPage';
import FeeSettings from './pages/FeeSettings';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import LedgerPage from './pages/LedgerPage';
// Enquiry Management Components
import EnquiryManagementDashboardPage from './pages/EnquiryManagementDashboardPage';
import EnquiryDashboardPage from './pages/EnquiryDashboardPage';
import EnquiryListPage from './pages/EnquiryListPage';
import EnquiryDetailPage from './pages/EnquiryDetailPage';
import EnquiryFormPage from './pages/EnquiryFormPage';
// Examination Management Components
import ExaminationDashboard from './components/ExaminationDashboard';
import ExaminationManager from './components/ExaminationManager';
import MarksEntryManager from './components/MarksEntryManager';
import TestRecordManager from './components/TestRecordManager';
import TestRecordMasterSheet from './components/TestRecordMasterSheet';
import TestDashboard from './components/TestDashboard';
import TestAnalytics from './components/TestAnalytics';
import MasterSheetManager from './components/MasterSheetManager';
import DetailedMarksCertificate from './components/DetailedMarksCertificate';
import PositionHolders from './components/PositionHolders';
import ExaminationAnalytics from './components/ExaminationAnalytics';
import ExaminationConfiguration from './pages/ExaminationConfiguration';
// Homework Diary Management
import HomeworkDiaryManager from './components/HomeworkDiaryManager';
// Student Management Components
import StudentDashboard from './components/StudentDashboard';
import GeneralMessagePage from './pages/GeneralMessagePage';
// Fine Management Components
import FineDashboard from './components/FineDashboard';
// Attendance Management Components
import AttendanceDashboard from './components/AttendanceDashboard';
// Fee Management Components
import FeeManagementDashboard from './components/FeeManagementDashboard';
// Settings Management Components
import SettingsDashboard from './components/SettingsDashboard';
// Employee Management Components
import EmployeesDashboard from './components/EmployeesDashboard';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import Loader from './components/Loader';
import RouteChangeLoader from './components/RouteChangeLoader';
import { ThemeContext, darkTheme, lightTheme } from './contexts/ThemeContext';
import GlobalBackHandler from './components/GlobalBackHandler';
import { NavigationProvider } from './contexts/NavigationContext';
import InitialRouteHandler from './components/InitialRouteHandler';
import { Capacitor } from '@capacitor/core';
import { isWeb } from './utils/platformDetection';

// Use HashRouter in Electron, BrowserRouter in web
const isElectron = Boolean((window as any).electronAPI);
const AppRouter = isElectron ? HashRouter : BrowserRouter;

const GlobalLoaderOverlay: React.FC = () => {
  const { loading } = useLoading();
  const { theme } = useContext(ThemeContext);

  if (!loading) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: theme === 'dark'
        ? 'rgba(37, 37, 37, 0.95)' // Dark theme with slight transparency
        : 'rgba(245, 247, 250, 0.95)', // Light theme with slight transparency
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 99999, // Very high z-index to ensure it's above everything
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.3s ease-in-out',
    }}>
      <Loader />
    </div>
  );
};

const App: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const updateNotificationRef = useRef<UpdateNotificationRef>(null);

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
      <AppRouter>
        <MuiThemeProvider theme={muiTheme}>
          <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
            <ProgressProvider>
              <LoadingProvider>
                <NavigationProvider>
                  <RouteChangeLoader />
                  <GlobalBackHandler
                    onExit={() => {
                      if (window.electronAPI) {
                        window.electronAPI.minimize();
                      }
                    }}
                  />
                  <AuthProvider>
                    <ToastProvider theme={theme} muted={false}>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/unauthorized" element={<UnauthorizedPage />} />


                        {/* School Welcome Screen - Shows after login */}
                        <Route
                          path="/welcome"
                          element={
                            <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Teacher', 'Super Admin']}>
                              <SchoolWelcomeScreen />
                            </ProtectedRoute>
                          }
                        />

                        {/* Dashboard Route - Main app entry point */}
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Super Admin', 'Guest']} guestPageKey="dashboard">
                              <Layout />
                            </ProtectedRoute>
                          }
                        >
                          <Route
                            index
                            element={<Dashboard />}
                          />
                        </Route>

                        {/* Guest Dashboard Route - Menu cards for guest users */}
                        <Route
                          path="/guest"
                          element={
                            <ProtectedRoute allowedRoles={['Guest']}>
                              <Layout />
                            </ProtectedRoute>
                          }
                        >
                          <Route
                            index
                            element={<GuestDashboard />}
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
                              <ProtectedRoute
                                allowedRoles={['Student']}
                              >
                                <StudentProfile isMyProfile={true} />
                              </ProtectedRoute>
                            }
                          />
                          {/* Public Student Profile (uses Layout providers for styles/contexts) - Students cannot access this directly */}
                          <Route
                            path="student/:id"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Academic Head', 'Guest', 'Parent']}
                                guestPageKey="student_profile"
                              >
                                <StudentProfile />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="teacher"
                            element={
                              <ProtectedRoute allowedRoles={['Teacher']}>
                                <WelcomePage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Teacher Timetable */}
                          <Route
                            path="my-timetable"
                            element={
                              <ProtectedRoute allowedRoles={['Teacher']}>
                                <MyTimetable />
                              </ProtectedRoute>
                            }
                          />


                          {/* Classes Management */}
                          <Route
                            path="classes/all"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <ClassesManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Student Dashboard */}
                          <Route
                            path="students"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Academic Head', 'Guest']}
                                guestPageKey="dashboard"
                              >
                                <StudentDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Student Management */}
                          <Route
                            path="students/list"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Academic Head', 'Guest']}
                                guestPageKey="students_list"
                              >
                                <StudentList />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/profile/:id"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Academic Head', 'Guest', 'Parent']}
                                guestPageKey="student_profile"
                              >
                                <StudentProfile />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/add"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Academic Head']}>
                                <StudentAdmissionForm />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bulk-student-admission"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Academic Head']}>
                                <BulkStudentAdmission />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/status"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Academic Head']}>
                                <StudentStatusManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/withdrawal-register"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Academic Head', 'Guest']}
                                guestPageKey="students_list"
                              >
                                <WithdrawalRegister />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="students/general-message"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Academic Head']}
                              >
                                <GeneralMessagePage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bulk-promote-demote"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Academic Head']}>
                                <BulkPromoteDemote />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="family-management"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Academic Head']}>
                                <FamilyManagementPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Employee Dashboard */}
                          <Route
                            path="employees"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <EmployeesDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Employee Management */}
                          <Route
                            path="employees/list"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Guest']}
                                guestPageKey="employees_list"
                              >
                                <EmployeeList />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="employees/add"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <StaffAddForm />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="employees/profile/:id"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Guest', 'Teacher']}
                                guestPageKey="employee_profile"
                              >
                                <TeacherProfile />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/teacher-subjects"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <TeacherSubjectManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Settings Dashboard */}
                          <Route
                            path="settings"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <SettingsDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Settings Routes */}
                          <Route
                            path="settings/sessions"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <SessionsManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/user-management"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <UserManagement />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/institute-profile"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <InstituteProfile />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/holidays"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <HolidayManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/classes"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <ClassesManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/general-settings"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <GeneralSettings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/user-announcements"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <UserAnnouncements />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/notifications"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <NotificationSettings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings/landing-page-config"
                            element={
                              <ProtectedRoute allowedRoles={['Principal']}>
                                <LandingPageConfiguration />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="home"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher', 'Student', 'Parent', 'Accountant', 'Guest']}>
                                <CustomLandingPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fine Dashboard */}
                          <Route
                            path="fines"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FineDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fine Management Routes */}
                          <Route
                            path="fines/assign"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FineManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fines/collect"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FineCollection />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fines/remaining"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <RemainingFine />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fines/statistics"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant', 'Guest']}
                                guestPageKey="fine_statistics"
                              >
                                <FineStatistics />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fee Management Dashboard */}
                          <Route
                            path="fee-management"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FeeManagementDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Fee Management Routes */}
                          <Route
                            path="fee-structure-management"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FeeStructureManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="load-fee"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <LoadFeePage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-collection"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FeeCollection />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-defaulters"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FeeDefaultersList />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-audit-logs"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FeeAuditLogsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-analytics"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant', 'Guest']}
                                guestPageKey="fee_analytics"
                              >
                                <FeeAnalyticsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="concessions"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <ConcessionsPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="fee-settings"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <FeeSettings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="payment-history"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <PaymentHistoryPage />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="ledger"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <LedgerPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Enquiry Management Routes */}
                          <Route
                            path="enquiries"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <EnquiryManagementDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/dashboard"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <EnquiryDashboardPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/list"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <EnquiryListPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/create"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <EnquiryFormPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/:id"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <EnquiryDetailPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="enquiries/:id/edit"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Accountant']}>
                                <EnquiryFormPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Reports Management */}
                          <Route
                            path="reports"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Teacher', 'Guest']}
                                guestPageKey="reports"
                              >
                                <Reports />
                              </ProtectedRoute>
                            }
                          />

                          {/* Attendance Dashboard */}
                          <Route
                            path="attendance"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Teacher']}>
                                <AttendanceDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Attendance Routes */}
                          <Route
                            path="attendance/mark"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Teacher']}>
                                <MarkAttendance />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/staff"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <MarkStaffAttendance />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/staff-report"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <StaffAttendanceReport />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/report"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Principal', 'Admin', 'Teacher', 'Guest']}
                                guestPageKey="attendance_reports"
                              >
                                <AttendanceReport />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/half-leaves"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Teacher']}>
                                <HalfLeaves />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="attendance/leave-requests"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Teacher']}>
                                <LeaveRequestsPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Subject Management */}
                          <Route
                            path="subjects"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <SubjectManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Examination Dashboard */}
                          <Route
                            path="examination"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher', 'Guest']}
                                guestPageKey="examination_results"
                              >
                                <ExaminationDashboard />
                              </ProtectedRoute>
                            }
                          />

                          {/* Examination Management */}
                          <Route
                            path="examinations"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher', 'Guest']}
                                guestPageKey="examination_results"
                              >
                                <ExaminationManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Examination Configuration */}
                          <Route
                            path="examination-configuration"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin']}>
                                <ExaminationConfiguration />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="marks-entry"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <MarksEntryManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="master-sheets"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <MasterSheetManager />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="dmc-generation"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <DetailedMarksCertificate />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="position-holders"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <PositionHolders />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="exam-analytics"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <ExaminationAnalytics />
                              </ProtectedRoute>
                            }
                          />

                          {/* Test Record Management */}
                          <Route
                            path="test-dashboard"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <TestDashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="test-records"
                            element={
                              <ProtectedRoute
                                allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher', 'Guest']}
                                guestPageKey="test_records"
                              >
                                <TestRecordManager />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="test-record-master-sheet"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <TestRecordMasterSheet />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="test-analytics"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal', 'Admin', 'Teacher']}>
                                <TestAnalytics />
                              </ProtectedRoute>
                            }
                          />

                          {/* Time Table Management */}
                          <Route
                            path="timetable"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin']}>
                                <TimeTableManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Homework Diary Management */}
                          <Route
                            path="homework-diary"
                            element={
                              <ProtectedRoute allowedRoles={['Principal', 'Admin', 'Teacher']}>
                                <HomeworkDiaryManager />
                              </ProtectedRoute>
                            }
                          />

                          {/* Schools Management */}
                          <Route
                            path="schools"
                            element={
                              <ProtectedRoute allowedRoles={['Super Admin', 'Principal']}>
                                <SchoolsManagement />
                              </ProtectedRoute>
                            }
                          />

                          {/* Default route */}
                          <Route path="*" element={<PageNotFound />} />
                        </Route>
                      </Routes>
                    </ToastProvider>
                  </AuthProvider>
                  {/* Only render UpdateNotification on Electron/Capacitor, not on web */}
                  {!isWeb() && <UpdateNotification ref={updateNotificationRef} />}
                </NavigationProvider>
              </LoadingProvider>
            </ProgressProvider>
          </ThemeProvider>
        </MuiThemeProvider>
      </AppRouter>
    </LocalizationProvider>
  );
};

export default App; 