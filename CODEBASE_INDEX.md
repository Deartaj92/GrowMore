# Grow More - School Management System
## Codebase Index

### Project Overview
**Grow More** is a comprehensive school management system built with React and TypeScript. It supports multiple platforms:
- **Web**: React web application
- **Desktop**: Electron-based desktop application
- **Mobile**: Capacitor-based Android/iOS application

**Version**: 1.4.2  
**Author**: Taj & co.

---

## Technology Stack

### Frontend
- **React** 18.2.0 with TypeScript
- **Material-UI (MUI)** 5.15.12 - UI component library
- **React Router** 6.11.1 - Routing
- **Styled Components** 5.3.11 - Styling
- **Zustand** 4.3.9 - State management
- **Framer Motion** 12.18.1 - Animations
- **React Hot Toast** 2.5.2 - Notifications

### Backend & Database
- **Supabase** - Backend-as-a-Service (PostgreSQL database)
- **Supabase JS** 2.49.9 - Client library
- **PostgreSQL** - Database (via Supabase)

### Platform Support
- **Electron** 36.2.0 - Desktop application
- **Capacitor** 7.2.0 - Mobile application
- **React Scripts** 5.0.1 - Build tooling

### Key Libraries
- **TinyMCE** 8.2.2 - Rich text editor
- **Chart.js / ApexCharts / Recharts** - Data visualization
- **React PDF** 4.3.1 - PDF generation
- **jsPDF** 3.0.1 - PDF manipulation
- **Firebase Admin** 13.6.0 - Push notifications
- **Date-fns / Day.js** - Date utilities

---

## Project Structure

### Root Directory
```
School_Project/
├── src/                    # Main source code
├── public/                 # Static assets and Electron files
├── supabase/              # Supabase configuration and migrations
├── android/               # Android native project (Capacitor)
├── assets/                # Application icons and images
├── scripts/               # Build and utility scripts
├── database/              # Database-related SQL files
├── docs/                  # Documentation
├── migrations/            # Legacy migration files
└── package.json           # Dependencies and scripts
```

---

## Source Code Structure (`src/`)

### Core Application Files
- `App.tsx` - Main application component with routing
- `index.tsx` - Application entry point
- `index.css` - Global styles
- `supabaseClient.ts` - Supabase client configuration

### Components (`src/components/`)
**Core Components:**
- `Layout/` - Main application layout with navigation
- `ProtectedRoute.tsx` - Route protection based on permissions
- `ErrorBoundary.tsx` - Error handling
- `Loader.tsx` - Loading indicators
- `NotificationBell.tsx` - Notification system

**Feature Components:**
- `ClassesManager.tsx` - Class management
- `StudentAdmissionForm.tsx` - Student admission
- `BulkStudentAdmission.tsx` - Bulk student import
- `StudentList.tsx` - Student listing
- `MarkAttendance.tsx` - Student attendance
- `MarkStaffAttendance.tsx` - Staff attendance
- `ExaminationManager.tsx` - Examination management
- `MarksEntryManager.tsx` - Marks entry
- `TimeTableManager.tsx` - Timetable management
- `HomeworkDiaryManager.tsx` - Homework management
- `FineManager.tsx` - Fine management
- `FeeManagementDashboard.tsx` - Fee management
- `ExpenseDashboard.tsx` - Expense management
- `FinanceDashboard.tsx` - Financial overview
- `CommunicationDashboard.tsx` - Communication tools
- `EmployeesDashboard.tsx` - Employee management

**UI Components:**
- `ui/` - Reusable UI components (Dock, etc.)
- `reports/` - Report generation components
- `StudentAdmission/` - Student admission form components

### Pages (`src/pages/`)
**Authentication & Access:**
- `Login.tsx` - User authentication
- `UnauthorizedPage.tsx` - Access denied page
- `WelcomePage.tsx` - Welcome screen
- `SchoolWelcomeScreen.tsx` - School-specific welcome

**Dashboard & Overview:**
- `Dashboard/` - Main dashboard with tabs (Accounts, Admissions, Attendance, Fees, Homework)
- `UserDashboard.tsx` - User-specific dashboard
- `CustomLandingPage.tsx` - Customizable landing page

**Student Management:**
- `StudentProfile.tsx` - Student profile view/edit
- `StudentStatusManager.tsx` - Student status management
- `BulkPromoteDemote.tsx` - Bulk promotion/demotion
- `FamilyManagementPage.tsx` - Family management

**Employee Management:**
- `EmployeeList.tsx` - Employee listing
- `StaffAddForm.tsx` - Add/edit staff
- `TeacherProfile.tsx` - Teacher profile
- `Payroll/` - Payroll management system

**Fee Management:**
- `FeeStructureManager.tsx` - Fee structure configuration
- `FeePlans/` - Fee plans management
- `FeeIncrements/` - Fee increment management
- `LoadFeePage.tsx` - Load fees for students
- `FeeCollectionNew.tsx` - Fee collection interface
- `FeeDefaultersList.tsx` - Fee defaulters
- `FeeArrearsManager.tsx` - Fee arrears management
- `FeeAnalyticsPage.tsx` - Fee analytics
- `ConcessionsPage.tsx` - Fee concessions
- `FeeSettings.tsx` - Fee system settings
- `ChallanGenerationPage.tsx` - Challan generation
- `ChallansListPage.tsx` - Challans listing
- `PaymentHistoryPage.tsx` - Payment history
- `LedgerPage.tsx` - Fee ledger
- `FeeAuditLogsPage.tsx` - Fee audit logs

**Financial Management:**
- `ExpenseManager.tsx` - Expense management
- `OtherIncomeManager.tsx` - Other income tracking
- `ExpenseAnalyticsPage.tsx` - Expense analytics
- `SetupAccountsPage.tsx` - Account setup
- `BalanceSheetPage.tsx` - Balance sheet
- `CashFlowPage.tsx` - Cash flow statement
- `AssetsLiabilities/` - Assets & liabilities management

**Attendance Management:**
- `AttendanceReport.tsx` - Attendance reports
- `StaffAttendanceReport.tsx` - Staff attendance reports
- `LeaveRequestsPage.tsx` - Leave request management
- `ComplaintsSuggestionsPage.tsx` - Complaints and suggestions

**Examination Management:**
- `ExaminationConfiguration.tsx` - Examination configuration
- `ReportCards.tsx` - Report card generation
- `Reports.tsx` - Student reports
- `EmployeeReports.tsx` - Employee reports

**Academic Management:**
- `SubjectManager.tsx` - Subject management
- `TeacherSubjectManager.tsx` - Teacher-subject assignment
- `MyTimetable.tsx` - Personal timetable view
- `TimeTableManager.tsx` - Timetable management

**Communication:**
- `GeneralMessagePage.tsx` - General messaging
- `UserAnnouncements.tsx` - Announcement management
- `Events.tsx` - Events management

**Enquiry Management:**
- `EnquiryManagementDashboardPage.tsx` - Enquiry dashboard
- `EnquiryDashboardPage.tsx` - Enquiry overview
- `EnquiryListPage.tsx` - Enquiry listing
- `EnquiryDetailPage.tsx` - Enquiry details
- `EnquiryFormPage.tsx` - Create/edit enquiries

**Settings:**
- `GeneralSettings.tsx` - General application settings
- `InstituteProfile.tsx` - Institute profile
- `NotificationSettings.tsx` - Notification preferences
- `RenderSettings.tsx` - Landing page customization
- `UserManagement.tsx` - User management
- `RoleManagement.tsx` - Role management
- `UserPermissionManagement.tsx` - Permission management
- `SchoolsManagement.tsx` - Multi-school management

**Fine Management:**
- `FineCollection.tsx` - Fine collection
- `RemainingFine.tsx` - Remaining fines
- `FineStatistics.tsx` - Fine statistics

### Services (`src/services/`)
Business logic and API interactions:
- `feeService.ts` - Fee operations
- `feeServiceWithAudit.ts` - Fee operations with audit logging
- `feeAuditService.ts` - Fee audit logging
- `examinationService.ts` - Examination operations
- `examinationConfigurationService.ts` - Exam configuration
- `examinationSummaryService.ts` - Exam summaries
- `testRecordService.ts` - Test record management
- `homeworkDiaryService.ts` - Homework diary operations
- `expenseService.ts` - Expense management
- `incomeService.ts` - Income tracking
- `payrollService.ts` - Payroll operations
- `enquiryService.ts` - Enquiry management
- `notificationService.ts` - Notification handling
- `pushNotificationService.ts` - Push notifications
- `permissionService.ts` - Permission management
- `permissionSyncService.ts` - Permission synchronization
- `renderSettingsService.ts` - Landing page settings
- `landingPageService.ts` - Landing page content
- `reportCardService.ts` - Report card generation
- `updateService.ts` - Application updates
- `activityTrackingService.ts` - User activity tracking
- `whatsappSemiAuto.ts` - WhatsApp integration

### Types (`src/types/`)
TypeScript type definitions:
- `fee.ts` - Fee-related types
- `examinations.ts` - Examination types
- `testRecords.ts` - Test record types
- `homeworkDiary.ts` - Homework diary types
- `expense.ts` - Expense types
- `income.ts` - Income types
- `payroll.ts` - Payroll types
- `enquiry.ts` - Enquiry types
- `asset.ts` - Asset types
- `liability.ts` - Liability types
- `reports.ts` - Report types
- `reportCards.ts` - Report card types
- `global.d.ts` - Global type definitions
- `electron-api.d.ts` - Electron API types

### Utils (`src/utils/`)
Utility functions:
- `auth.ts` - Authentication utilities
- `classUtils.ts` - Class-related utilities
- `studentUtils.ts` - Student utilities
- `crypto.ts` - Cryptographic utilities
- `paginationHelper.ts` - Pagination utilities
- `payrollCalculations.ts` - Payroll calculations
- `permissionMapping.ts` - Permission mapping
- `platformDetection.ts` - Platform detection (web/electron/mobile)
- `releaseNotes.ts` - Release notes handling
- `reportService.ts` - Report utilities
- `requestQueue.ts` - Request queuing
- `studentSessionEvents.ts` - Student session events
- `testNotifications.ts` - Test notification utilities
- `lazyWithRetry.ts` - Lazy loading with retry
- `supabaseClient.ts` - Supabase client utilities

### Contexts (`src/contexts/`)
React context providers:
- `AuthContext.tsx` - Authentication context
- `ThemeContext.tsx` - Theme management (dark/light)
- `LoadingContext.tsx` - Loading state management
- `NavigationContext.tsx` - Navigation context
- `NotificationContext.tsx` - Notification context
- `ToastContext.tsx` - Toast notification context

### Hooks (`src/hooks/`)
Custom React hooks:
- `useAuth.ts` - Authentication hook
- `useActivityTracking.ts` - Activity tracking
- `useBackNavigation.ts` - Back navigation handling
- `useCapacitorPdfSave.ts` - PDF saving on mobile
- `useGlobalClickSound.ts` - Click sound effects
- `usePageReady.ts` - Page ready state
- `useScrollAnimation.ts` - Scroll animations
- `useWhatsAppBulkSender.ts` - WhatsApp bulk sending

### Scripts (`src/scripts/`)
Development and testing scripts:
- `clearAllData.ts` - Data clearing utility
- `generate500PakistaniStudents.ts` - Test data generation
- `generateDummyStudents.ts` - Dummy student generation
- `generateRandomExpensesAndIncomes.ts` - Test financial data

---

## Database Schema (Supabase Migrations)

### Key Database Tables

**Student Management:**
- `students` - Student records
- `student_class_history` - Class promotion history
- `families` - Family records
- `student_fee_concessions` - Fee concessions

**Staff Management:**
- `staff` - Staff/employee records
- `teacher_subjects` - Teacher-subject assignments

**Fee Management:**
- `fee_structures` - Fee structure definitions
- `fee_plans` - Student fee plans
- `fee_plan_items` - Fee plan line items
- `fee_challans` - Fee challans
- `fee_challan_items` - Challan line items
- `fee_payments` - Payment records
- `fee_payment_items` - Payment line items
- `fee_arrears` - Fee arrears
- `fee_increment_history` - Fee increment history
- `fee_settings` - Fee system settings
- `fee_audit_logs` - Fee audit trail

**Financial Management:**
- `expenses` - Expense records
- `other_income` - Other income records
- `accounts` - Chart of accounts
- `assets` - Asset records
- `liabilities` - Liability records
- `liability_payments` - Liability payment records

**Payroll:**
- `payroll_plans` - Payroll plan definitions
- `payroll_generations` - Payroll generation records
- `payroll_payments` - Payroll payment records
- `payroll_advances` - Payroll advances
- `payroll_adjustments` - Payroll adjustments

**Attendance:**
- `attendance` - Student attendance
- `staff_attendance` - Staff attendance
- `half_leaves` - Half-day leaves
- `staff_half_leaves` - Staff half-day leaves
- `leave_requests` - Leave requests

**Examinations:**
- `examinations` - Examination records
- `examination_configurations` - Exam configurations
- `examination_summaries` - Exam summaries
- `test_records` - Test records
- `marks` - Marks entries

**Academic:**
- `subjects` - Subject definitions
- `timetable` - Timetable entries
- `homework_diary` - Homework diary entries

**Communication:**
- `announcements` - Announcements
- `announcement_views` - Announcement views
- `announcement_dismissals` - Announcement dismissals
- `notifications` - System notifications
- `notification_preferences` - User notification preferences
- `notification_logs` - Notification delivery logs
- `device_push_tokens` - Push notification tokens
- `events` - Events calendar
- `notices` - Notices board
- `complaints` - Complaints
- `suggestions` - Suggestions

**Enquiry Management:**
- `enquiries` - Enquiry records
- `enquiry_follow_ups` - Follow-up records

**User Management:**
- `users` - User accounts
- `roles` - User roles
- `permissions` - System permissions
- `user_permissions` - User-specific permissions
- `schools` - Multi-school support

**Settings:**
- `institute_profile` - Institute information
- `sessions` - Academic sessions
- `classes` - Class definitions
- `sections` - Section definitions
- `holidays` - Holiday calendar
- `dashboard_widgets` - Dashboard widget configuration
- `render_settings` - Landing page settings
- `default_passwords` - Default password configuration

### Recent Migrations (Key Features)
- Fee arrears management (2025-12-24)
- Fee payment items with arrear linking (2025-12-24)
- Assets & liabilities management (2025-12-17)
- Payroll system (2025-12-01)
- Complaints and suggestions (2025-11-30)
- Leave requests (2025-11-28)
- Fee settings table (2025-11-26)
- Fee challans system (2025-02-20)
- Fee increments (2025-01-23)
- Expense management (2025-01-20)
- Roles and permissions system (2025-01-01)

---

## Key Features

### 1. Student Management
- Student admission (single & bulk)
- Student profiles with photos
- Class promotion/demotion
- Student status management
- Withdrawal register
- Family management
- Custom student IDs

### 2. Fee Management
- Fee structure configuration
- Fee plans per student
- Fee increments
- Challan generation
- Fee collection
- Fee arrears tracking
- Fee concessions
- Payment history
- Fee ledger
- Fee analytics
- Fee audit logs

### 3. Financial Management
- Expense tracking
- Other income tracking
- Chart of accounts
- Balance sheet
- Cash flow statement
- Assets & liabilities management
- Account management (bank, cash, etc.)

### 4. Payroll Management
- Payroll plans
- Payroll generation
- Payroll payments
- Payroll advances
- Payroll adjustments
- Payroll analytics

### 5. Attendance Management
- Student attendance marking
- Staff attendance marking
- Attendance reports
- Half-day leaves
- Leave requests
- Online status tracking

### 6. Examination Management
- Examination configuration
- Marks entry
- Test records
- Master sheets
- Report cards (DMC)
- Position holders
- Examination analytics

### 7. Academic Management
- Subject management
- Teacher-subject assignment
- Timetable management
- Homework diary
- Diary analytics

### 8. Communication
- Announcements
- Notifications (push & in-app)
- Events calendar
- Notices board
- General messaging
- WhatsApp integration
- Complaints & suggestions

### 9. Enquiry Management
- Enquiry creation and tracking
- Follow-up management
- Enquiry dashboard and analytics

### 10. Reports
- Student reports
- Employee reports
- Attendance reports
- Fee reports
- Financial reports
- Examination reports

### 11. User & Permission Management
- User management
- Role-based access control (RBAC)
- Permission management
- Multi-school support

### 12. Settings
- Institute profile
- General settings
- Notification settings
- Landing page customization
- Holiday management
- Session management
- Class & section management

---

## Build & Deployment

### Development
```bash
npm start              # Start development server
npm run android        # Build and open Android project
npm run electron       # Run Electron app
```

### Production Builds
```bash
npm run build                    # Web build
npm run electron-pack-win       # Windows installer
npm run electron-pack-mac       # macOS build
npm run electron-pack-linux     # Linux build
npm run android:build           # Android APK
```

### Update & Release
```bash
npm run update                  # Update APK
npm run update:desktop          # Update desktop installer
npm run update:bundle           # Deploy update bundle
```

---

## Platform-Specific Features

### Electron (Desktop)
- Auto-update system
- Window controls
- System tray integration
- File system access
- Native notifications

### Capacitor (Mobile)
- Push notifications
- File system access
- Camera access
- Native browser
- App updates (live updates)

### Web
- Progressive Web App (PWA) support
- Responsive design
- Browser-based notifications

---

## Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `capacitor.config.ts` - Capacitor configuration
- `supabase/config.toml` - Supabase local configuration
- `netlify.toml` - Netlify deployment config
- `vercel.json` - Vercel deployment config
- `render.yaml` - Render deployment config
- `firebase.json` - Firebase configuration
- `staticwebapp.config.json` - Azure Static Web Apps config

---

## Documentation Files

- `ANNOUNCEMENT_CLICK_IMPLEMENTATION.md`
- `CRITICAL_PERFORMANCE_FIXES.md`
- `DEBUGGING_STUDENT_NOTIFICATIONS.md`
- `GITHUB_SETUP_GUIDE.md`
- `HOSTING_CONFIGS.md`
- `HOW_TO_UPDATE.md`
- `NETLIFY_DEBUG_GUIDE.md`
- `NETWORK_PERFORMANCE_ISSUE.md`
- `NOTIFICATION_BELL_ENHANCEMENT.md`
- `PERFORMANCE_BOTTLENECKS.md`
- `PERFORMANCE_OPTIMIZATIONS.md`
- `RELEASE_NOTES.md`
- `STUDENT_NOTIFICATION_FIX.md`
- `UPDATE_SETUP_GUIDE.md`
- `docs/PUSH_NOTIFICATIONS.md`
- `docs/RENDER_SETTINGS_GUIDE.md`

---

## Security & Permissions

The application uses a comprehensive permission system:
- Role-based access control (RBAC)
- Permission-based route protection
- User-specific permissions
- Menu-based permission structure
- Permission synchronization system

---

## Notes

- The application supports multi-school/multi-tenant architecture
- Real-time features using Supabase realtime subscriptions
- Push notifications via Firebase Cloud Messaging
- Audit logging for fee operations
- Activity tracking for user actions
- Customizable landing pages
- Multi-language support (Urdu fonts included)

---

*Last Updated: Based on codebase structure as of 2025-12-24*

