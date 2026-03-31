/**
 * Maps menu item paths to permission keys
 * This mapping is used to check if a user has permission to access a menu item
 */
export const pathToPermissionKey: Record<string, string> = {
  // Dashboard
  '/dashboard': 'dashboard',

  // Dashboard Tabs
  '/dashboard/tab/attendance': 'dashboard-tab-attendance',
  '/dashboard/tab/fee': 'dashboard-tab-fee',
  '/dashboard/tab/admissions': 'dashboard-tab-admissions',
  '/dashboard/tab/homework': 'dashboard-tab-homework',
  '/dashboard/tab/employeeAttendance': 'dashboard-tab-employee-attendance',
  '/dashboard/tab/accounts': 'dashboard-tab-accounts',
  '/dashboard/tab/predictions': 'dashboard-tab-predictions',

  // Students
  '/students/list': 'students-list',
  '/students/add': 'students-add',
  '/bulk-student-admission': 'students-bulk-admission',
  '/students/status': 'students-status',
  '/bulk-promote-demote': 'students-bulk-promote',
  '/family-management': 'family-management',
  '/students/withdrawal-register': 'withdrawal-register',
  '/students/cards': 'students-cards',
  '/misc/notebook-tags': 'notebook-tags',
  '/student/:id': 'student-profile',
  '/students/profile/:id': 'student-profile',
  '/profile': 'teacher-profile',
  '/employees/profile/:id': 'teacher-profile',

  // Attendance
  '/attendance/mark': 'attendance-mark',
  '/attendance/report': 'attendance-report',
  '/attendance/analytics': 'attendance-analytics',
  '/attendance/staff': 'attendance-staff',
  '/attendance/staff-report': 'attendance-staff-report',
  '/attendance/staff-analytics': 'attendance-staff-analytics',
  '/attendance/half-leaves': 'half-leaves',
  '/attendance/staff-half-leaves': 'staff-half-leaves',
  '/attendance/leave-requests': 'leave-requests',
  '/attendance/rfid-scanner': 'rfid-scanner',
  '/attendance/rfid-cards': 'rfid-card-assignment',

  // Reports
  '/reports': 'reports-students', // Student Reports page
  '/reports/students': 'reports-students',
  '/reports/attendance': 'reports-students', // Using same permission
  '/reports/academic': 'reports-students', // Using same permission
  '/reports/employee-reports': 'reports-employees',
  '/reports/staff-attendance': 'reports-students', // Using same permission
  '/reports/financial': 'reports-students', // Using same permission

  // Employees
  '/employees/list': 'employees-list',
  '/employees/add': 'employees-add',
  '/teacher-subjects': 'teacher-subjects',
  '/timetable': 'timetable',

  // Fee Collection
  '/fee-structure-management': 'fee-structure',
  '/fee-plans': 'fee-plans',
  '/fee-increments': 'fee-increments',
  '/generate-challans': 'generate-challans',
  '/challans': 'view-challans',
  '/fee-collection': 'fee-collection',
  '/family-fee-collection': 'fee-collection',
  '/fee-defaulters': 'fee-defaulters',
  '/fee-arrears': 'fee-arrears',
  '/fee-audit-logs': 'fee-audit-logs',
  '/fee-analytics': 'fee-analytics',
  '/payments-analytics': 'payments-analytics',
  '/setup-accounts': 'setup-accounts',
  '/balance-sheet': 'balance-sheet',
  '/cash-flow': 'cash-flow-view',
  '/payment-history': 'payment-history',
  '/ledger': 'fee-ledger',

  // Finance
  '/expense-manager': 'expense-manager',
  '/expense-analytics': 'expense-analytics',
  '/other-income-manager': 'other-income-manager',

  // Fine Management
  '/fines/assign': 'fine-assign',
  '/fines/collect': 'fine-collect',
  '/fines/remaining': 'fine-remaining',
  '/fines/statistics': 'fine-statistics',

  // Communication
  '/students/general-message': 'messages',
  '/settings/user-announcements': 'announcements',
  '/events': 'events',
  '/attendance/complaints-suggestions': 'complaints-suggestions',
  '/enquiries/dashboard': 'enquiry-dashboard',
  '/enquiries/list': 'enquiry-list',
  '/enquiries/create': 'enquiry-create',

  // Academics
  '/examinations': 'examinations',
  '/marks-entry': 'marks-entry',
  '/master-sheets': 'master-sheets',
  '/dmc-generation': 'dmc-generation',
  '/position-holders': 'position-holders',
  '/exam-analytics': 'exam-analytics',
  '/subjects': 'subjects',
  '/examination-configuration': 'examination-configuration',
  '/test-records': 'test-records',
  '/test-record-master-sheet': 'test-master-sheet',
  '/test-analytics': 'test-analytics',
  '/homework-diary': 'homework-diary',
  '/diary-analytics': 'diary-analytics',

  // Settings
  '/settings/institute-profile': 'settings-institute-profile',
  '/settings/classes': 'settings-classes',
  '/settings/sessions': 'settings-sessions',
  '/settings/holidays': 'settings-holidays',
  '/settings/user-management': 'settings-user-management',
  '/settings/role-management': 'settings-role-management',
  '/settings/user-permissions': 'settings-user-management', // Using same permission
  '/settings/rendersettings': 'settings-landing-page',
  '/settings/general-settings': 'settings-general',
  '/settings/notifications': 'settings-notifications',

  // Payroll Management
  '/payroll': 'payroll-view',

  // Assets & Liabilities Management
  '/assets-liabilities': 'assets-liabilities-view',

  // User Dashboard
  '/user': 'dashboard', // User dashboard uses dashboard permission

  // Additional routes
  '/employees': 'employees-list',
  '/finance': 'fee-structure', // Finance dashboard
  '/fines': 'fine-assign', // Fine dashboard
  '/expense-management': 'expense-manager', // Expense dashboard
  '/communication': 'messages', // Communication dashboard
  '/enquiries': 'enquiry-dashboard', // Enquiry dashboard
  '/settings': 'settings-institute-profile', // Settings dashboard  
  '/attendance': 'attendance-mark', // Attendance dashboard
  '/academics': 'examinations', // Academics dashboard
};

/**
 * Get permission key for a given path
 * Handles paths with query parameters by extracting the base path
 */
export function getPermissionKeyForPath(path: string): string | null {
  // Remove query parameters and hash from path
  const basePath = path.split('?')[0].split('#')[0];
  return pathToPermissionKey[basePath] || pathToPermissionKey[path] || null;
}

/**
 * Check if a menu item should be visible based on permissions
 * Returns true if:
 * - User has the required permission for the path
 * - No permission key is mapped (backward compatibility)
 */
export function shouldShowMenuItem(
  path: string,
  userRole: string | undefined,
  userPermissions: Set<string>
): boolean {
  // Get permission key for this path
  const permissionKey = getPermissionKeyForPath(path);
  if (!permissionKey) {
    // If no permission key mapped, allow access (backward compatibility)
    return true;
  }

  // Check permission based on role_id from roles table
  return userPermissions.has(permissionKey);
}




