import React from 'react';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  GroupAdd as GroupAddIcon,
  Block as BlockIcon,
  School as SchoolIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  ListAlt as ListAltIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  AccountBalance as AccountBalanceIcon,
  AttachMoney as AttachMoneyIcon,
  Receipt as ReceiptIcon,
  Wallet as WalletIcon,
  PieChart as PieChartIcon,
  Forum as ForumIcon,
  EventBusy as EventBusyIcon,
  CalendarMonth as CalendarMonthIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  CloudDownload as CloudDownloadIcon,
  EmojiEvents as EmojiEventsIcon,
  Business as BusinessIcon,
  BeachAccess as BeachAccessIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  List as ListIcon,
  Event as EventIcon,
  Feedback as FeedbackIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Analytics as AnalyticsIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from '@mui/icons-material';

export interface MenuItem {
  title: string;
  description: string;
  icon: React.ReactElement;
  path: string;
  color: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
  expenseItems?: MenuItem[];
}

export interface MainMenuItem {
  icon: React.ReactElement;
  path: string;
  label: string;
  hasDropdown: boolean;
  menuItems: MenuSection[];
  columns: number;
}

// Student menu items
export const studentMenuItems: MenuItem[] = [
  {
    title: 'All Students',
    description: 'View and manage all student records',
    icon: React.createElement(PeopleIcon),
    path: '/students/list',
    color: '#3b82f6'
  },
  {
    title: 'Add Student',
    description: 'Register new students',
    icon: React.createElement(PersonAddIcon),
    path: '/students/add',
    color: '#10b981'
  },
  {
    title: 'Bulk Add Students',
    description: 'Add multiple students at once',
    icon: React.createElement(GroupAddIcon),
    path: '/bulk-student-admission',
    color: '#06b6d4'
  },
  {
    title: 'Student Status',
    description: 'Manage enrollment status',
    icon: React.createElement(BlockIcon),
    path: '/students/status',
    color: '#f59e0b'
  },
  {
    title: 'Promotion',
    description: 'Handle student promotions',
    icon: React.createElement(SchoolIcon),
    path: '/bulk-promote-demote',
    color: '#8b5cf6'
  },
  {
    title: 'Family Management',
    description: 'Manage family relationships',
    icon: React.createElement(PeopleIcon),
    path: '/family-management',
    color: '#ef4444'
  },
  {
    title: 'Withdrawal Register',
    description: 'View admission and withdrawal',
    icon: React.createElement(DescriptionIcon),
    path: '/students/withdrawal-register',
    color: '#14b8a6'
  }
];

// Attendance menu items (Student only)
export const attendanceMenuItems: MenuItem[] = [
  {
    title: 'Mark Student Attendance',
    description: 'Record daily student attendance',
    icon: React.createElement(AssessmentIcon),
    path: '/attendance/mark',
    color: '#3b82f6'
  },
  {
    title: 'Student Attendance Report',
    description: 'Generate attendance reports',
    icon: React.createElement(BarChartIcon),
    path: '/attendance/report',
    color: '#10b981'
  },
  {
    title: 'Student Half Leaves',
    description: 'Record and manage student half-day leaves',
    icon: React.createElement(AccessTimeIcon),
    path: '/attendance/half-leaves',
    color: '#ec4899'
  }
];

// Reports menu items
export const studentReportsMenuItems: MenuItem[] = [
  {
    title: 'Student Reports',
    description: 'Generate comprehensive student reports',
    icon: React.createElement(BarChartIcon),
    path: '/reports',
    color: '#3b82f6'
  }
];

export const employeeReportsMenuItems: MenuItem[] = [
  {
    title: 'Employee Reports',
    description: 'Generate comprehensive employee reports',
    icon: React.createElement(BarChartIcon),
    path: '/reports/employee-reports',
    color: '#3b82f6'
  }
];

// Employee attendance menu items
export const employeeAttendanceMenuItems: MenuItem[] = [
  {
    title: 'Mark Staff Attendance',
    description: 'Record daily staff attendance',
    icon: React.createElement(WorkIcon),
    path: '/attendance/staff',
    color: '#f59e0b'
  },
  {
    title: 'Staff Attendance Report',
    description: 'Generate staff reports',
    icon: React.createElement(BarChartIcon),
    path: '/attendance/staff-report',
    color: '#8b5cf6'
  },
  {
    title: 'Staff Half Leaves',
    description: 'Record and manage staff half-day leaves',
    icon: React.createElement(AccessTimeIcon),
    path: '/attendance/staff-half-leaves',
    color: '#ec4899'
  }
];

// Employee menu items
export const employeeMenuItems: MenuItem[] = [
  {
    title: 'All Employees',
    description: 'View and manage all staff members',
    icon: React.createElement(SchoolIcon),
    path: '/employees/list',
    color: '#3b82f6'
  },
  {
    title: 'Add New',
    description: 'Register new employees and create profiles',
    icon: React.createElement(PersonAddIcon),
    path: '/employees/add',
    color: '#10b981'
  },
  {
    title: 'Teacher Subject Assignment',
    description: 'Assign subjects to teachers',
    icon: React.createElement(AssignmentIcon),
    path: '/teacher-subjects',
    color: '#f59e0b'
  },
  {
    title: 'Timetable',
    description: 'Create and manage class schedules',
    icon: React.createElement(CalendarMonthIcon),
    path: '/timetable',
    color: '#8b5cf6'
  }
];

// Payroll menu items
export const payrollMenuItems: MenuItem[] = [
  {
    title: 'Payroll Dashboard',
    description: 'Manage employee salaries and payroll operations',
    icon: React.createElement(DashboardIcon),
    path: '/payroll',
    color: '#3b82f6'
  },
  {
    title: 'Payroll Plans',
    description: 'Create and manage salary structures',
    icon: React.createElement(AccountBalanceIcon),
    path: '/payroll?tab=1',
    color: '#10b981'
  },
  {
    title: 'Generate Payroll',
    description: 'Calculate and generate monthly payroll',
    icon: React.createElement(CalculateIcon),
    path: '/payroll?tab=2',
    color: '#f59e0b'
  },
  {
    title: 'Process Payments',
    description: 'Process salary payments to employees',
    icon: React.createElement(PaymentIcon),
    path: '/payroll?tab=3',
    color: '#8b5cf6'
  },
  {
    title: 'Payment History',
    description: 'View complete payment history and records',
    icon: React.createElement(HistoryIcon),
    path: '/payroll?tab=4',
    color: '#ec4899'
  },
  {
    title: 'Payroll Analytics',
    description: 'View payroll reports and analytics',
    icon: React.createElement(AnalyticsIcon),
    path: '/payroll?tab=5',
    color: '#06b6d4'
  },
  {
    title: 'Advance Payments',
    description: 'Manage employee salary advances',
    icon: React.createElement(AccountBalanceWalletIcon),
    path: '/payroll?tab=6',
    color: '#f43f5e'
  },
  {
    title: 'Adjustments',
    description: 'Apply bonuses, fines, or extra cuts',
    icon: React.createElement(SettingsIcon),
    path: '/payroll?tab=7',
    color: '#a855f7'
  },
  {
    title: 'Payroll Settings',
    description: 'Configure general payroll settings',
    icon: React.createElement(SettingsIcon),
    path: '/payroll?tab=8',
    color: '#6366f1'
  }
];

// Accounts menu items
export const accountsMenuItems: MenuItem[] = [
  {
    title: 'Setup Accounts',
    description: 'Manage bank accounts, EasyPaisa, JazzCash and other payment accounts',
    icon: React.createElement(AccountBalanceWalletIcon),
    path: '/setup-accounts',
    color: '#3b82f6'
  },
  {
    title: 'Balance Sheet',
    description: 'View account balances including income and expenses',
    icon: React.createElement(AccountBalanceIcon),
    path: '/balance-sheet',
    color: '#10b981'
  },
  {
    title: 'Cash Flow',
    description: 'View cash inflows, outflows, and net cash flow statement',
    icon: React.createElement(TrendingUpIcon),
    path: '/cash-flow',
    color: '#f59e0b'
  },
  {
    title: 'Assets & Liabilities',
    description: 'Manage school assets and liabilities',
    icon: React.createElement(AccountBalanceIcon),
    path: '/assets-liabilities',
    color: '#8b5cf6'
  }
];

// Fee menu items - split into two groups
export const feeMenuItems1: MenuItem[] = [
  {
    title: 'Fee Structure',
    description: 'Create and manage fee structures',
    icon: React.createElement(AccountBalanceIcon),
    path: '/fee-structure-management',
    color: '#10b981'
  },
  {
    title: 'Fee Plans',
    description: 'Create and manage individual student fee plans',
    icon: React.createElement(DescriptionIcon),
    path: '/fee-plans',
    color: '#06b6d4'
  },
  {
    title: 'Generate Challans',
    description: 'Generate fee challans for students based on fee plans',
    icon: React.createElement(ReceiptIcon),
    path: '/generate-challans',
    color: '#3b82f6'
  },
  {
    title: 'Challans List',
    description: 'View and manage all generated challans',
    icon: React.createElement(ListIcon),
    path: '/challans',
    color: '#6366f1'
  },
  {
    title: 'Fee Collection',
    description: 'Enhanced fee collection interface',
    icon: React.createElement(AttachMoneyIcon),
    path: '/fee-collection',
    color: '#8b5cf6'
  },
  {
    title: 'Fee Defaulters',
    description: 'View students with outstanding fees',
    icon: React.createElement(AttachMoneyIcon),
    path: '/fee-defaulters',
    color: '#ef4444'
  },
  {
    title: 'Fee Arrears',
    description: 'Add and manage other payments/arrears without challans',
    icon: React.createElement(ReceiptIcon),
    path: '/fee-arrears',
    color: '#f59e0b'
  }
];

export const feeMenuItems2: MenuItem[] = [
  {
    title: 'Fee Analytics',
    description: 'Comprehensive fee analytics dashboard',
    icon: React.createElement(AssessmentIcon),
    path: '/fee-analytics',
    color: '#059669'
  },
  {
    title: 'Payment History',
    description: 'View complete payment history',
    icon: React.createElement(ListAltIcon),
    path: '/payment-history',
    color: '#3b82f6'
  },
  {
    title: 'Fee Ledger',
    description: 'View comprehensive fee ledger',
    icon: React.createElement(AccountBalanceIcon),
    path: '/ledger',
    color: '#14b8a6'
  },
  {
    title: 'Fee Increments',
    description: 'Apply increments to fee plans and structures',
    icon: React.createElement(TrendingUpIcon),
    path: '/fee-increments',
    color: '#f97316'
  },
  {
    title: 'Other Incomes',
    description: 'Record and track non-fee income sources',
    icon: React.createElement(AttachMoneyIcon),
    path: '/other-income-manager',
    color: '#16a34a'
  },
  {
    title: 'Fee Audit Logs',
    description: 'Track all fee-related changes',
    icon: React.createElement(ListAltIcon),
    path: '/fee-audit-logs',
    color: '#6b7280'
  },
  {
    title: 'Payroll Management',
    description: 'Manage employee salaries, payments, and payroll operations',
    icon: React.createElement(CalculateIcon),
    path: '/payroll',
    color: '#3b82f6'
  }
];

// Expense menu items
export const expenseMenuItems: MenuItem[] = [
  {
    title: 'Expense Manager',
    description: 'Track and manage all school expenditures',
    icon: React.createElement(ReceiptIcon),
    path: '/expense-manager',
    color: '#dc2626'
  },
  {
    title: 'Expense Analytics',
    description: 'View comprehensive expense analytics and insights',
    icon: React.createElement(BarChartIcon),
    path: '/expense-analytics',
    color: '#3b82f6'
  }
];

// Fine menu items
export const fineMenuItems: MenuItem[] = [
  {
    title: 'Assign Fine',
    description: 'Set and assign fines for violations',
    icon: React.createElement(AttachMoneyIcon),
    path: '/fines/assign',
    color: '#3b82f6'
  },
  {
    title: 'Collect Fine',
    description: 'Process fine payments and track collections',
    icon: React.createElement(AttachMoneyIcon),
    path: '/fines/collect',
    color: '#10b981'
  },
  {
    title: 'Remaining Fine',
    description: 'View outstanding fines and track payments',
    icon: React.createElement(WalletIcon),
    path: '/fines/remaining',
    color: '#f59e0b'
  },
  {
    title: 'Fine Statistics',
    description: 'Analyze fine trends and generate reports',
    icon: React.createElement(PieChartIcon),
    path: '/fines/statistics',
    color: '#8b5cf6'
  }
];

// Assets & Liabilities menu items
export const assetsLiabilitiesMenuItems: MenuItem[] = [
  {
    title: 'Assets & Liabilities',
    description: 'Manage school assets and liabilities',
    icon: React.createElement(AccountBalanceIcon),
    path: '/assets-liabilities',
    color: '#3b82f6'
  }
];

// Enquiry Management menu items (moved to Communication)
export const enquiryMenuItems: MenuItem[] = [
  {
    title: 'Enquiry Dashboard',
    description: 'Overview of all enquiries',
    icon: React.createElement(DashboardIcon),
    path: '/enquiries/dashboard',
    color: '#3b82f6'
  },
  {
    title: 'All Enquiries',
    description: 'View and manage all enquiries',
    icon: React.createElement(ListIcon),
    path: '/enquiries/list',
    color: '#10b981'
  },
  {
    title: 'New Enquiry',
    description: 'Create new enquiries',
    icon: React.createElement(AddIcon),
    path: '/enquiries/create',
    color: '#f59e0b'
  }
];

// Communication menu items
export const communicationMenuItems: MenuItem[] = [
  {
    title: 'Messages',
    description: 'Send and receive messages',
    icon: React.createElement(ForumIcon),
    path: '/students/general-message',
    color: '#3b82f6'
  },
  {
    title: 'Announcements',
    description: 'Create and manage announcements',
    icon: React.createElement(ListAltIcon),
    path: '/settings/user-announcements',
    color: '#10b981'
  },
  {
    title: 'Events',
    description: 'Create and manage school events',
    icon: React.createElement(EventIcon),
    path: '/events',
    color: '#8b5cf6'
  },
  {
    title: 'Leave Requests',
    description: 'Review and manage leave requests',
    icon: React.createElement(EventBusyIcon),
    path: '/attendance/leave-requests',
    color: '#ef4444'
  },
  {
    title: 'Complaints & Suggestions',
    description: 'Review and manage student and parent complaints and suggestions',
    icon: React.createElement(FeedbackIcon),
    path: '/attendance/complaints-suggestions',
    color: '#f59e0b'
  }
];

// Examination menu items
export const examinationMenuItems: MenuItem[] = [
  {
    title: 'Manage Examinations',
    description: 'Create and manage examination schedules',
    icon: React.createElement(AssessmentIcon),
    path: '/examinations',
    color: '#3b82f6'
  },
  {
    title: 'Marks Entry',
    description: 'Enter and manage student marks',
    icon: React.createElement(ListAltIcon),
    path: '/marks-entry',
    color: '#10b981'
  },
  {
    title: 'Master Sheets',
    description: 'Generate comprehensive master sheets',
    icon: React.createElement(BarChartIcon),
    path: '/master-sheets',
    color: '#f59e0b'
  },
  {
    title: 'DMC Generation',
    description: 'Generate detailed marks certificates',
    icon: React.createElement(CloudDownloadIcon),
    path: '/dmc-generation',
    color: '#8b5cf6'
  },
  {
    title: 'Position Holders',
    description: 'View student positions and rankings',
    icon: React.createElement(EmojiEventsIcon),
    path: '/position-holders',
    color: '#ef4444'
  },
  {
    title: 'Exam Analytics',
    description: 'Analyze examination performance',
    icon: React.createElement(PieChartIcon),
    path: '/exam-analytics',
    color: '#06b6d4'
  },
  {
    title: 'Manage Subjects',
    description: 'Add, edit, and manage subjects',
    icon: React.createElement(SchoolIcon),
    path: '/subjects',
    color: '#84cc16'
  },
  {
    title: 'Examination Configuration',
    description: 'Configure grade criteria and settings',
    icon: React.createElement(SettingsIcon),
    path: '/examination-configuration',
    color: '#6366f1'
  }
];

// Test Record menu items
export const testRecordMenuItems: MenuItem[] = [
  {
    title: 'Test Marks Entry',
    description: 'View and manage test records',
    icon: React.createElement(QuizIcon),
    path: '/test-records',
    color: '#10b981'
  },
  {
    title: 'Test Master Sheet',
    description: 'Generate test master sheets',
    icon: React.createElement(AssessmentIcon),
    path: '/test-record-master-sheet',
    color: '#f59e0b'
  },
  {
    title: 'Test Analytics',
    description: 'Analyze test performance and statistics',
    icon: React.createElement(BarChartIcon),
    path: '/test-analytics',
    color: '#8b5cf6'
  }
];

// Daily Diary menu items
export const diaryMenuItems: MenuItem[] = [
  {
    title: 'Assign Diary',
    description: 'Create and manage daily homework assignments',
    icon: React.createElement(AssignmentIcon),
    path: '/homework-diary',
    color: '#3b82f6'
  },
  {
    title: 'Diary Analytics',
    description: 'Analyze homework assignment patterns',
    icon: React.createElement(BarChartIcon),
    path: '/diary-analytics',
    color: '#10b981'
  }
];

// Settings menu items - split into two columns
export const settingsColumn1Items: MenuItem[] = [
  {
    title: 'Institute Profile',
    description: 'Manage school information and settings',
    icon: React.createElement(BusinessIcon),
    path: '/settings/institute-profile',
    color: '#3b82f6'
  },
  {
    title: 'Classes',
    description: 'Create and manage class structures',
    icon: React.createElement(SchoolIcon),
    path: '/settings/classes',
    color: '#10b981'
  },
  {
    title: 'Sessions',
    description: 'Configure academic sessions and terms',
    icon: React.createElement(CalendarMonthIcon),
    path: '/settings/sessions',
    color: '#f59e0b'
  },
  {
    title: 'Holidays',
    description: 'Set up holiday calendar',
    icon: React.createElement(BeachAccessIcon),
    path: '/settings/holidays',
    color: '#8b5cf6'
  }
];

export const settingsColumn2Items: MenuItem[] = [
  {
    title: 'User Management',
    description: 'Manage user accounts and permissions',
    icon: React.createElement(PeopleIcon),
    path: '/settings/user-management',
    color: '#ef4444'
  },
  {
    title: 'Role Management',
    description: 'Configure roles and access permissions',
    icon: React.createElement(AdminPanelSettingsIcon),
    path: '/settings/role-management',
    color: '#8b5cf6'
  },
  {
    title: 'User Permissions',
    description: 'Manage individual user permissions',
    icon: React.createElement(PersonIcon),
    path: '/settings/user-permissions',
    color: '#10b981'
  },
  {
    title: 'Render Settings',
    description: 'Configure render settings for different user roles',
    icon: React.createElement(SettingsIcon),
    path: '/settings/rendersettings',
    color: '#ec4899'
  },
  {
    title: 'General Settings',
    description: 'Configure general system settings',
    icon: React.createElement(SettingsIcon),
    path: '/settings/general-settings',
    color: '#6366f1'
  },
  {
    title: 'Notification Settings',
    description: 'Manage notification preferences',
    icon: React.createElement(NotificationsIcon),
    path: '/settings/notifications',
    color: '#ec4899'
  },
];

// Main menu structure
export const menuStructure: MainMenuItem[] = [
  {
    icon: React.createElement(PeopleIcon),
    path: '/students',
    label: 'Students',
    hasDropdown: true,
    menuItems: [
      { title: 'Student Management', items: studentMenuItems },
      { title: 'Attendance', items: attendanceMenuItems },
      { title: 'Reports', items: studentReportsMenuItems }
    ],
    columns: 3
  },
  {
    icon: React.createElement(SchoolIcon),
    path: '/employees',
    label: 'Employees',
    hasDropdown: true,
    menuItems: [
      { title: 'Employee Management', items: employeeMenuItems },
      { 
        title: 'Attendance & Reports', 
        items: [...employeeAttendanceMenuItems, ...employeeReportsMenuItems]
      }
    ],
    columns: 2
  },
  {
    icon: React.createElement(AccountBalanceIcon),
    path: '/finance',
    label: 'Finance',
    hasDropdown: true,
    menuItems: [
      { 
        title: 'Fee Management', 
        items: feeMenuItems1
      },
      { 
        title: 'Fee Record', 
        items: feeMenuItems2
      },
      { 
        title: 'Expense Management', 
        items: expenseMenuItems
      },
      { 
        title: 'Fine Management', 
        items: fineMenuItems
      }
    ],
    columns: 3
  },
  {
    icon: React.createElement(AccountBalanceWalletIcon),
    path: '/accounts',
    label: 'Accounts',
    hasDropdown: true,
    menuItems: [
      { title: 'Account Management', items: accountsMenuItems }
    ],
    columns: 1
  },
  {
    icon: React.createElement(AssessmentIcon),
    path: '/academics',
    label: 'Academics',
    hasDropdown: true,
    menuItems: [
      { title: 'Examination', items: examinationMenuItems },
      { title: 'Test Management', items: testRecordMenuItems },
      { title: 'Daily Diary', items: diaryMenuItems }
    ],
    columns: 3
  },
  {
    icon: React.createElement(ForumIcon),
    path: '/communication',
    label: 'Communication',
    hasDropdown: true,
    menuItems: [
      { title: 'Communication', items: communicationMenuItems },
      { title: 'Enquiry Management', items: enquiryMenuItems }
    ],
    columns: 2
  },
  {
    icon: React.createElement(SettingsIcon),
    path: '/settings',
    label: 'Settings',
    hasDropdown: true,
    menuItems: [
      { title: 'School Configuration', items: settingsColumn1Items },
      { title: 'System Settings', items: settingsColumn2Items }
    ],
    columns: 2
  }
];

