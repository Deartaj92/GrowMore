-- Add category-specific notification preferences to notification_preferences table
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS notify_attendance BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_test_marks BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_examination_marks BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_homework_diary BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_subject_assignment BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_reports BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_announcements BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_system BOOLEAN DEFAULT TRUE;

-- Update existing rows to have all categories enabled by default
UPDATE notification_preferences 
SET 
  notify_attendance = COALESCE(notify_attendance, TRUE),
  notify_test_marks = COALESCE(notify_test_marks, TRUE),
  notify_examination_marks = COALESCE(notify_examination_marks, TRUE),
  notify_homework_diary = COALESCE(notify_homework_diary, TRUE),
  notify_subject_assignment = COALESCE(notify_subject_assignment, TRUE),
  notify_reports = COALESCE(notify_reports, TRUE),
  notify_announcements = COALESCE(notify_announcements, TRUE),
  notify_system = COALESCE(notify_system, TRUE)
WHERE notify_attendance IS NULL 
   OR notify_test_marks IS NULL 
   OR notify_examination_marks IS NULL 
   OR notify_homework_diary IS NULL 
   OR notify_subject_assignment IS NULL 
   OR notify_reports IS NULL 
   OR notify_announcements IS NULL 
   OR notify_system IS NULL;


