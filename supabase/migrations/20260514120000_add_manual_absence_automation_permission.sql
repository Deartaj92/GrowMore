-- Permission for the Dashboard Attendance tab floating "A" button (trigger_attendance_automation RPC)

INSERT INTO permissions (key, name, description, category, path)
VALUES (
  'attendance.manual_absence_automation_trigger',
  'Dashboard Manual Absence Trigger',
  'Use the floating A button on the Dashboard attendance tab to run absence automation for the selected date',
  'Dashboard',
  '/dashboard/tab/attendance'
)
ON CONFLICT (key) DO NOTHING;
