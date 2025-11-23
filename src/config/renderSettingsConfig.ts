/**
 * Render Settings Configuration
 * 
 * This file defines all available menu cards and tabs that can be controlled
 * via render settings. Adding new cards/tabs here automatically makes them
 * available in the Render Settings UI without database schema changes.
 */

export interface MenuItemConfig {
  key: string;
  label: string;
  description: string;
  defaultEnabled?: boolean;
  category?: 'teacher' | 'student' | 'guest' | 'parent';
}

// Teacher menu cards configuration (WelcomePage.tsx)
export const TEACHER_MENU_CARDS: MenuItemConfig[] = [
  {
    key: 'mark_attendance',
    label: 'Mark Attendance',
    description: 'Take attendance for your classes. Mark students as present, absent, or late.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'attendance_reports',
    label: 'Attendance Reports',
    description: 'View and analyze attendance records, generate reports, and track attendance patterns.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'View, create, and manage student and staff reports.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'test_marks_entry',
    label: 'Test Marks Entry',
    description: 'Create and manage test records, enter marks, and track student performance.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'test_records',
    label: 'Test Records',
    description: 'View comprehensive test records and performance analysis for students.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'my_timetable',
    label: 'My Timetable',
    description: 'View your assigned periods, subjects, and classes for the current session.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'assign_diary',
    label: 'Assign Diary',
    description: 'Assign daily homework diary entries for your classes and subjects.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'examination_marks_entry',
    label: 'Examination Marks Entry',
    description: 'Enter marks for published examinations.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'half_leaves',
    label: 'Half Leaves',
    description: 'Record and manage half-day leaves for students in your classes. Track first half and second half leave records.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'my_profile',
    label: 'My Profile',
    description: 'View and manage your own teacher profile, including personal information, attendance, timetable, and performance metrics.',
    defaultEnabled: true,
    category: 'teacher'
  }
];

export const EMPLOYEES_DASHBOARD_CARDS_GUEST: MenuItemConfig[] = [
  { key: 'employees_dash_all', label: 'All Employees Card', description: 'Show "All Employees" card.', defaultEnabled: true, category: 'guest' },
  { key: 'employees_dash_add', label: 'Add New Employee Card', description: 'Show "Add New" employee card.', defaultEnabled: true, category: 'guest' },
  { key: 'employees_dash_teacher_subjects', label: 'Teacher Subject Assignment Card', description: 'Show "Teacher Subject Assignment" card.', defaultEnabled: true, category: 'guest' },
];

export const FINE_DASHBOARD_CARDS_GUEST: MenuItemConfig[] = [
  { key: 'fine_dash_assign', label: 'Assign Fine Card', description: 'Show "Assign Fine" card.', defaultEnabled: true, category: 'guest' },
  { key: 'fine_dash_collect', label: 'Collect Fine Card', description: 'Show "Collect Fine" card.', defaultEnabled: true, category: 'guest' },
  { key: 'fine_dash_remaining', label: 'Remaining Fine Card', description: 'Show "Remaining Fine" card.', defaultEnabled: true, category: 'guest' },
  { key: 'fine_dash_statistics', label: 'Fine Statistics Card', description: 'Show "Fine Statistics" card.', defaultEnabled: true, category: 'guest' },
];

export const EXAMINATION_DASHBOARD_CARDS_GUEST: MenuItemConfig[] = [
  { key: 'exam_dash_manage', label: 'Manage Examinations Card', description: 'Show "Manage Examinations" card.', defaultEnabled: true, category: 'guest' },
  { key: 'exam_dash_marks_entry', label: 'Marks Entry Card', description: 'Show "Marks Entry" card.', defaultEnabled: true, category: 'guest' },
  { key: 'exam_dash_master_sheets', label: 'Master Sheets Card', description: 'Show "Master Sheets" card.', defaultEnabled: true, category: 'guest' },
  { key: 'exam_dash_dmc', label: 'DMC Generation Card', description: 'Show "DMC Generation" card.', defaultEnabled: true, category: 'guest' },
  { key: 'exam_dash_positions', label: 'Position Holders Card', description: 'Show "Position Holders" card.', defaultEnabled: true, category: 'guest' },
  { key: 'exam_dash_analytics', label: 'Exam Analytics Card', description: 'Show "Exam Analytics" card.', defaultEnabled: true, category: 'guest' },
  { key: 'exam_dash_subjects', label: 'Manage Subjects Card', description: 'Show "Manage Subjects" card.', defaultEnabled: true, category: 'guest' },
  { key: 'exam_dash_configuration', label: 'Examination Configuration Card', description: 'Show "Examination Configuration" card.', defaultEnabled: true, category: 'guest' },
];

export const TEST_DASHBOARD_CARDS_GUEST: MenuItemConfig[] = [
  { key: 'test_dash_record_entry', label: 'Test Record Entry Card', description: 'Show "Test Record Entry" card.', defaultEnabled: true, category: 'guest' },
  { key: 'test_dash_master_sheet', label: 'Test Master Sheet Card', description: 'Show "Test Master Sheet" card.', defaultEnabled: true, category: 'guest' },
  { key: 'test_dash_analytics', label: 'Test Analytics Card', description: 'Show "Test Analytics" card.', defaultEnabled: true, category: 'guest' },
];

export const ATTENDANCE_DASHBOARD_CARDS_GUEST: MenuItemConfig[] = [
  { key: 'attendance_dash_mark_student', label: 'Mark Student Attendance Card', description: 'Show "Mark Student Attendance" card.', defaultEnabled: true, category: 'guest' },
  { key: 'attendance_dash_student_report', label: 'Student Attendance Report Card', description: 'Show "Student Attendance Report" card.', defaultEnabled: true, category: 'guest' },
  { key: 'attendance_dash_mark_staff', label: 'Mark Staff Attendance Card', description: 'Show "Mark Staff Attendance" card.', defaultEnabled: true, category: 'guest' },
  { key: 'attendance_dash_staff_report', label: 'Staff Attendance Report Card', description: 'Show "Staff Attendance Report" card.', defaultEnabled: true, category: 'guest' },
];

// Per-dashboard cards toggles for guest users
export const STUDENT_DASHBOARD_CARDS_GUEST: MenuItemConfig[] = [
  { key: 'student_dash_all_students', label: 'All Students Card', description: 'Show "All Students" card on Student Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'student_dash_add_student', label: 'Add Student Card', description: 'Show "Add Student" card on Student Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'student_dash_bulk_add', label: 'Bulk Add Students Card', description: 'Show "Bulk Add Students" card on Student Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'student_dash_status', label: 'Student Status Card', description: 'Show "Student Status" card on Student Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'student_dash_promotion', label: 'Promotion Card', description: 'Show "Promotion" card on Student Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'student_dash_family', label: 'Family Management Card', description: 'Show "Family Management" card on Student Dashboard.', defaultEnabled: true, category: 'guest' },
];

export const FEE_DASHBOARD_CARDS_GUEST: MenuItemConfig[] = [
  { key: 'fee_dash_structure', label: 'Fee Structure Card', description: 'Show "Fee Structure" card on Fee Management Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'fee_dash_load_fee', label: 'Load Fee Card', description: 'Show "Load Fee" card on Fee Management Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'fee_dash_collection', label: 'Fee Collection Card', description: 'Show "Fee Collection" card on Fee Management Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'fee_dash_defaulters', label: 'Fee Defaulters Card', description: 'Show "Fee Defaulters" card on Fee Management Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'fee_dash_audit_logs', label: 'Fee Audit Logs Card', description: 'Show "Fee Audit Logs" card on Fee Management Dashboard.', defaultEnabled: true, category: 'guest' },
  { key: 'fee_dash_analytics', label: 'Fee Analytics Card', description: 'Show "Fee Analytics" card on Fee Management Dashboard.', defaultEnabled: true, category: 'guest' },
];

// Student menu cards configuration (CustomLandingPage.tsx)
export const STUDENT_MENU_CARDS: MenuItemConfig[] = [
  {
    key: 'my_profile',
    label: 'My Profile',
    description: 'View your profile, attendance records, examination results, test records, and reports.',
    defaultEnabled: true,
    category: 'student'
  }
];

// Parent menu cards configuration (CustomLandingPage.tsx)
export const PARENT_MENU_CARDS: MenuItemConfig[] = [
  {
    key: 'linked_students',
    label: 'Linked Students',
    description: 'View and manage students linked to your family account.',
    defaultEnabled: true,
    category: 'parent'
  }
];

// Student profile tabs configuration (StudentProfile.tsx)
export const STUDENT_PROFILE_TABS: MenuItemConfig[] = [
  {
    key: 'profile_tab',
    label: 'Profile Tab',
    description: 'Display student profile information including personal details, family information, and academic details.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'reports_tab',
    label: 'Reports Tab',
    description: 'Display student reports and homework diary entries.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'examinations_tab',
    label: 'Examinations Tab',
    description: 'Display examination results and performance summaries.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'test_records_tab',
    label: 'Test Records Tab',
    description: 'Display test records and performance analysis.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'attendance_tab',
    label: 'Attendance Tab',
    description: 'Display attendance records, statistics, and patterns.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'fines_tab',
    label: 'Fines Tab',
    description: 'Display fine history and payment information.',
    defaultEnabled: true,
    category: 'student'
  }
];

// Teacher profile tabs configuration (TeacherProfile.tsx)
export const TEACHER_PROFILE_TABS: MenuItemConfig[] = [
  {
    key: 'info_tab',
    label: 'Info Tab',
    description: 'Display teacher profile information including personal details, contact information, and assigned classes.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'attendance_tab',
    label: 'Attendance Tab',
    description: 'Display attendance records, statistics, and patterns for the teacher.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'timetable_tab',
    label: 'Timetable Tab',
    description: 'Display teacher timetable with assigned periods, subjects, and classes.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'test_analysis_tab',
    label: 'Test Analysis Tab',
    description: 'Display test records and performance analysis for tests created by the teacher.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'diary_analysis_tab',
    label: 'Diary Analysis Tab',
    description: 'Display homework diary assignments and analysis for the teacher.',
    defaultEnabled: true,
    category: 'teacher'
  }
];

// Student profile summary cards configuration (StudentProfile.tsx)
export const STUDENT_PROFILE_SUMMARY_CARDS: MenuItemConfig[] = [
  {
    key: 'attendance_summary_card',
    label: 'Attendance Summary Card',
    description: 'Display attendance statistics including present, absent, late, and leave counts with percentages.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'reports_summary_card',
    label: 'Reports/Homework Summary Card',
    description: 'Display reports count and homework diary entries for the selected date.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'examinations_summary_card',
    label: 'Examinations Summary Card',
    description: 'Display examination average score, total exams, passed, and failed counts.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'fines_summary_card',
    label: 'Fines Summary Card',
    description: 'Display fine details including total fines, paid amount, and remaining balance.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'test_records_summary_card',
    label: 'Test Records Summary Card',
    description: 'Display test records summary including total tests, subjects, and average percentage.',
    defaultEnabled: true,
    category: 'student'
  },
  {
    key: 'test_records_summary_card_duplicate',
    label: 'Test Records Summary Card (Duplicate)',
    description: 'Display test records summary including total tests, subjects, and average percentage (duplicate card).',
    defaultEnabled: false,
    category: 'student'
  }
];

// Teacher profile summary cards configuration (TeacherProfile.tsx)
export const TEACHER_PROFILE_SUMMARY_CARDS: MenuItemConfig[] = [
  {
    key: 'attendance_summary_card',
    label: 'Attendance Summary Card',
    description: 'Display attendance statistics including present, absent, late, leave, and half leave counts with percentages.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'test_summary_card',
    label: 'Test Summary Card',
    description: 'Display test records summary including total tests, students, and average percentage.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'homework_diary_summary_card',
    label: 'Homework Diary Summary Card',
    description: 'Display homework diary assignments summary including total assignments and average per day.',
    defaultEnabled: true,
    category: 'teacher'
  },
  {
    key: 'timetable_summary_card',
    label: 'Timetable Summary Card',
    description: 'Display timetable summary including total periods and assigned classes.',
    defaultEnabled: true,
    category: 'teacher'
  }
];

// Guest user accessible pages configuration
export const GUEST_ACCESSIBLE_PAGES: MenuItemConfig[] = [
  {
    key: 'students_list',
    label: 'Students List',
    description: 'Allow guest users to view the list of students (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'student_profile',
    label: 'Student Profile',
    description: 'Allow guest users to view student profiles (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'attendance_reports',
    label: 'Attendance Reports',
    description: 'Allow guest users to view attendance reports (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'examination_results',
    label: 'Examination Results',
    description: 'Allow guest users to view examination results (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'test_records',
    label: 'Test Records',
    description: 'Allow guest users to view test records (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Allow guest users to view student reports (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'fee_analytics',
    label: 'Fee Analytics',
    description: 'Allow guest users to view fee analytics and statistics (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'fine_statistics',
    label: 'Fine Statistics',
    description: 'Allow guest users to view fine statistics (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'employees_list',
    label: 'Employees List',
    description: 'Allow guest users to view the list of employees (read-only).',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Allow guest users to view the main dashboard (read-only).',
    defaultEnabled: true,
    category: 'guest'
  }
];

// Dashboard cards configuration for guest users
export const DASHBOARD_CARDS: MenuItemConfig[] = [
  {
    key: 'class_strength_card',
    label: 'Class Wise Strength',
    description: 'Display class-wise student strength with boys and girls count.',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'fine_collection_card',
    label: 'Fine Collection Details',
    description: 'Display fine collection details for the selected date.',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'absentees_card',
    label: 'Today\'s Absentees',
    description: 'Display list of absent and leave students for the selected date.',
    defaultEnabled: true,
    category: 'guest'
  },
  {
    key: 'homework_diary_card',
    label: 'Today\'s Homework Diary',
    description: 'Display homework assignments for today.',
    defaultEnabled: true,
    category: 'guest'
  }
];

// Guest sidebar menus configuration (maps to main sidebar items)
export const GUEST_SIDEBAR_MENUS: MenuItemConfig[] = [
  { key: 'menu_dashboard', label: 'Dashboard', description: 'Show Dashboard in sidebar for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_students', label: 'Students', description: 'Show Students menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_attendance', label: 'Attendance', description: 'Show Attendance menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_reports', label: 'Reports', description: 'Show Reports menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_fines', label: 'Fine Management', description: 'Show Fines menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_fee_management', label: 'Fee Management', description: 'Show Fee Management menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_enquiries', label: 'Enquiry Management', description: 'Show Enquiries menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_timetable', label: 'Timetable', description: 'Show Timetable menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_employees', label: 'Employees', description: 'Show Employees menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_examination', label: 'Examination', description: 'Show Examination menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_daily_diary', label: 'Daily Diary', description: 'Show Daily Diary menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_test_record', label: 'Test Record', description: 'Show Test Record menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_settings', label: 'Settings', description: 'Show Settings menu for guests.', defaultEnabled: true, category: 'guest' },
  { key: 'menu_schools_management', label: 'Schools Management', description: 'Show Schools Management menu for guests.', defaultEnabled: true, category: 'guest' },
];

// Helper function to get all menu items
export const getAllMenuItems = (): MenuItemConfig[] => {
  return [
    ...TEACHER_MENU_CARDS, 
    ...TEACHER_PROFILE_TABS,
    ...TEACHER_PROFILE_SUMMARY_CARDS,
    ...STUDENT_MENU_CARDS,
    ...STUDENT_PROFILE_TABS, 
    ...STUDENT_PROFILE_SUMMARY_CARDS,
    ...PARENT_MENU_CARDS,
    ...GUEST_ACCESSIBLE_PAGES, 
    ...DASHBOARD_CARDS
  ];
};

// Helper function to get default settings
export const getDefaultSettings = () => {
  const teacherSettings: Record<string, boolean> = {};
  const studentSettings: Record<string, boolean> = {};
  const parentSettings: Record<string, boolean> = {};
  const guestSettings: Record<string, boolean> = {};

  TEACHER_MENU_CARDS.forEach(card => {
    teacherSettings[card.key] = card.defaultEnabled !== false;
  });

  TEACHER_PROFILE_TABS.forEach(tab => {
    teacherSettings[tab.key] = tab.defaultEnabled !== false;
  });

  TEACHER_PROFILE_SUMMARY_CARDS.forEach(card => {
    teacherSettings[card.key] = card.defaultEnabled !== false;
  });

  STUDENT_MENU_CARDS.forEach(card => {
    studentSettings[card.key] = card.defaultEnabled !== false;
  });

  STUDENT_PROFILE_TABS.forEach(tab => {
    studentSettings[tab.key] = tab.defaultEnabled !== false;
  });

  STUDENT_PROFILE_SUMMARY_CARDS.forEach(card => {
    studentSettings[card.key] = card.defaultEnabled !== false;
  });

  PARENT_MENU_CARDS.forEach(card => {
    parentSettings[card.key] = card.defaultEnabled !== false;
  });

  GUEST_ACCESSIBLE_PAGES.forEach(page => {
    guestSettings[page.key] = page.defaultEnabled !== false;
  });

  DASHBOARD_CARDS.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  GUEST_SIDEBAR_MENUS.forEach(menu => {
    guestSettings[menu.key] = menu.defaultEnabled !== false;
  });

  STUDENT_DASHBOARD_CARDS_GUEST.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  FEE_DASHBOARD_CARDS_GUEST.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  ATTENDANCE_DASHBOARD_CARDS_GUEST.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  EMPLOYEES_DASHBOARD_CARDS_GUEST.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  FINE_DASHBOARD_CARDS_GUEST.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  EXAMINATION_DASHBOARD_CARDS_GUEST.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  TEST_DASHBOARD_CARDS_GUEST.forEach(card => {
    guestSettings[card.key] = card.defaultEnabled !== false;
  });

  return {
    teacher: teacherSettings,
    student: studentSettings,
    parent: parentSettings,
    guest: guestSettings
  };
};

// Helper function to merge settings with defaults
export const mergeWithDefaults = (settings: any) => {
  const defaults = getDefaultSettings();
  
  return {
    teacher: {
      ...defaults.teacher,
      ...(settings?.teacher || {})
    },
    student: {
      ...defaults.student,
      ...(settings?.student || {})
    },
    parent: {
      ...defaults.parent,
      ...(settings?.parent || {})
    },
    guest: {
      ...defaults.guest,
      ...(settings?.guest || {})
    }
  };
};

