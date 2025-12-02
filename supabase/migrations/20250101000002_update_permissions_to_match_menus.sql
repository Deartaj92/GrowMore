-- Migration: Update permissions to match actual menu items in header
-- This migration updates existing permissions to match the actual pages/menus

-- First, add path column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'permissions' AND column_name = 'path'
    ) THEN
        ALTER TABLE permissions ADD COLUMN path VARCHAR(255);
    END IF;
END $$;

-- Delete all existing role_permissions (they will be recreated when roles are reassigned)
DELETE FROM role_permissions;

-- Delete all existing permissions (they will be re-inserted with correct data)
DELETE FROM permissions;

-- Re-insert permissions based on actual pages/menus in the header
INSERT INTO permissions (key, name, description, category, path) VALUES
-- Dashboard permissions
('dashboard', 'Dashboard', 'Access to main dashboard', 'Dashboard', '/dashboard'),

-- Students permissions
('students-list', 'Student List', 'View and manage student list', 'Students', '/students/list'),
('students-add', 'Add New Student', 'Add new student admission', 'Students', '/students/add'),
('students-bulk-admission', 'Bulk Student Admission', 'Bulk student admission', 'Students', '/bulk-student-admission'),
('students-status', 'Student Status', 'Manage student status', 'Students', '/students/status'),
('students-bulk-promote', 'Bulk Promote/Demote', 'Bulk promote or demote students', 'Students', '/bulk-promote-demote'),
('family-management', 'Family Management', 'Manage family information', 'Students', '/family-management'),
('withdrawal-register', 'Withdrawal Register', 'View admission and withdrawal', 'Students', '/students/withdrawal-register'),
('student-profile', 'Student Profile', 'View detailed student profile information including attendance, exams, fees, and reports', 'Students', '/student/:id'),

-- Attendance permissions
('attendance-mark', 'Mark Student Attendance', 'Record daily student attendance', 'Attendance', '/attendance/mark'),
('attendance-report', 'Student Attendance Report', 'Generate attendance reports', 'Attendance', '/attendance/report'),
('attendance-staff', 'Mark Staff Attendance', 'Record daily staff attendance', 'Attendance', '/attendance/staff'),
('attendance-staff-report', 'Staff Attendance Report', 'Generate staff reports', 'Attendance', '/attendance/staff-report'),
('half-leaves', 'Half Leaves', 'Record and manage half-day leaves', 'Attendance', '/attendance/half-leaves'),
('leave-requests', 'Leave Requests', 'Review and manage leave requests', 'Attendance', '/attendance/leave-requests'),

-- Reports permissions
('reports-students', 'Student Reports', 'Generate comprehensive student reports', 'Reports', '/reports/students'),

-- Employees permissions
('employees-list', 'All Employees', 'View and manage all staff members', 'Employees', '/employees/list'),
('employees-add', 'Add New Employee', 'Register new employees and create profiles', 'Employees', '/employees/add'),
('teacher-subjects', 'Teacher Subject Assignment', 'Assign subjects to teachers', 'Employees', '/teacher-subjects'),
('timetable', 'Timetable', 'Create and manage class schedules', 'Employees', '/timetable'),

-- Fee Collection permissions
('fee-structure', 'Fee Structure', 'Create and manage fee structures', 'Fee Collection', '/fee-structure-management'),
('load-fee', 'Load Fee', 'Import and load fee data', 'Fee Collection', '/load-fee'),
('fee-collection', 'Fee Collection', 'Enhanced fee collection interface', 'Fee Collection', '/fee-collection'),
('fee-defaulters', 'Fee Defaulters', 'View students with outstanding fees', 'Fee Collection', '/fee-defaulters'),
('fee-audit-logs', 'Fee Audit Logs', 'Track all fee-related changes', 'Fee Collection', '/fee-audit-logs'),
('fee-analytics', 'Fee Analytics', 'Comprehensive fee analytics dashboard', 'Fee Collection', '/fee-analytics'),
('fee-concessions', 'Fee Concessions', 'Manage student fee concessions', 'Fee Collection', '/concessions'),
('payment-history', 'Payment History', 'View complete payment history', 'Fee Collection', '/payment-history'),
('fee-ledger', 'Fee Ledger', 'View comprehensive fee ledger', 'Fee Collection', '/ledger'),

-- Finance permissions
('expense-manager', 'Expense Manager', 'Track and manage all school expenditures', 'Finance', '/expense-manager'),
('expense-analytics', 'Expense Analytics', 'View comprehensive expense analytics and insights', 'Finance', '/expense-analytics'),

-- Fine permissions
('fine-assign', 'Assign Fine', 'Set and assign fines for violations', 'Fine Management', '/fines/assign'),
('fine-collect', 'Collect Fine', 'Process fine payments and track collections', 'Fine Management', '/fines/collect'),
('fine-remaining', 'Remaining Fine', 'View outstanding fines and track payments', 'Fine Management', '/fines/remaining'),
('fine-statistics', 'Fine Statistics', 'Analyze fine trends and generate reports', 'Fine Management', '/fines/statistics'),
('fine-history', 'Fine History', 'View complete fine payment history', 'Fine Management', '/fines/history'),
('fine-reports', 'Fine Reports', 'Generate comprehensive fine reports', 'Fine Management', '/fines/reports'),

-- Communication permissions
('messages', 'Messages', 'Send and receive messages', 'Communication', '/students/general-message'),
('announcements', 'Announcements', 'Create and manage announcements', 'Communication', '/settings/user-announcements'),
('enquiry-dashboard', 'Enquiry Dashboard', 'Overview of all enquiries', 'Communication', '/enquiries/dashboard'),
('enquiry-list', 'All Enquiries', 'View and manage all enquiries', 'Communication', '/enquiries/list'),
('enquiry-create', 'New Enquiry', 'Create new enquiries', 'Communication', '/enquiries/create'),

-- Academics permissions
('examinations', 'Manage Examinations', 'Create and manage examination schedules', 'Academics', '/examinations'),
('marks-entry', 'Marks Entry', 'Enter and manage student marks', 'Academics', '/marks-entry'),
('master-sheets', 'Master Sheets', 'Generate comprehensive master sheets', 'Academics', '/master-sheets'),
('dmc-generation', 'DMC Generation', 'Generate detailed marks certificates', 'Academics', '/dmc-generation'),
('position-holders', 'Position Holders', 'View student positions and rankings', 'Academics', '/position-holders'),
('exam-analytics', 'Exam Analytics', 'Analyze examination performance', 'Academics', '/exam-analytics'),
('subjects', 'Manage Subjects', 'Add, edit, and manage subjects', 'Academics', '/subjects'),
('examination-configuration', 'Examination Configuration', 'Configure grade criteria and settings', 'Academics', '/examination-configuration'),
('test-dashboard', 'Test Dashboard', 'Overview of test records and management', 'Academics', '/test-dashboard'),
('test-records', 'Test Records', 'View and manage test records', 'Academics', '/test-records'),
('test-master-sheet', 'Test Master Sheet', 'Generate test master sheets', 'Academics', '/test-record-master-sheet'),
('test-analytics', 'Test Analytics', 'Analyze test performance and statistics', 'Academics', '/test-analytics'),
('homework-diary', 'Assign Diary', 'Create and manage daily homework assignments', 'Academics', '/homework-diary'),
('diary-analytics', 'Diary Analytics', 'Analyze homework assignment patterns', 'Academics', '/diary-analytics'),

-- Settings permissions
('settings-institute-profile', 'Institute Profile', 'Manage school information and settings', 'Settings', '/settings/institute-profile'),
('settings-classes', 'Classes', 'Create and manage class structures', 'Settings', '/settings/classes'),
('settings-sessions', 'Sessions', 'Configure academic sessions and terms', 'Settings', '/settings/sessions'),
('settings-holidays', 'Holidays', 'Set up holiday calendar', 'Settings', '/settings/holidays'),
('settings-user-management', 'User Management', 'Manage user accounts and permissions', 'Settings', '/settings/user-management'),
('settings-role-management', 'Role Management', 'Configure roles and access permissions', 'Settings', '/settings/role-management'),
('settings-landing-page', 'Landing Page Configuration', 'Configure custom landing page widgets', 'Settings', '/settings/landing-page-config'),
('settings-general', 'General Settings', 'Configure general system settings', 'Settings', '/settings/general-settings'),
('settings-notifications', 'Notification Settings', 'Manage notification preferences', 'Settings', '/settings/notifications');
