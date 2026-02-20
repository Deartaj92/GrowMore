-- Migration: Backfill activity_log_id for existing notifications
-- This migration links existing notifications to their corresponding activity logs
-- by matching on notification type, teacher name, entity name, and creation time

-- Step 1: Update notifications that have a matching activity log
-- Match criteria:
-- 1. notification_type = activity_type
-- 2. title (teacher name) matches staff.name for the teacher_id
-- 3. message contains entity_name or matches activity details
-- 4. created_at is within 5 minutes of activity_log.created_at
UPDATE notifications n
SET activity_log_id = al.id
FROM activity_logs al
INNER JOIN staff s ON al.teacher_id = s.id
WHERE n.activity_log_id IS NULL
  AND n.notification_type = al.activity_type
  AND n.title = s.name
  AND n.created_at BETWEEN al.created_at - INTERVAL '5 minutes' AND al.created_at + INTERVAL '5 minutes'
  AND (
    -- Match for report notifications: message contains entity_name (Report #XXX)
    (n.notification_type = 'report' AND al.entity_name IS NOT NULL AND n.message LIKE '%' || al.entity_name || '%')
    OR
    -- Match for other activity types: check if message structure matches
    (n.notification_type != 'report' AND al.entity_name IS NOT NULL AND n.message LIKE '%' || al.entity_name || '%')
  )
  AND NOT EXISTS (
    -- Don't update if another notification already has this activity_log_id
    SELECT 1 FROM notifications n2 
    WHERE n2.activity_log_id = al.id AND n2.id != n.id
  );

-- Step 2: For report notifications specifically, try to match by entity_id
-- Extract report ID from message (format: "Report #123" or "New Student Report - ...")
-- and match with activity_logs.entity_id
UPDATE notifications n
SET activity_log_id = al.id
FROM activity_logs al
INNER JOIN staff s ON al.teacher_id = s.id
WHERE n.activity_log_id IS NULL
  AND n.notification_type = 'report'
  AND n.notification_type = al.activity_type
  AND n.title = s.name
  AND al.entity_id IS NOT NULL
  AND n.message LIKE '%Report #' || al.entity_id::text || '%'
  AND n.created_at BETWEEN al.created_at - INTERVAL '5 minutes' AND al.created_at + INTERVAL '5 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n2 
    WHERE n2.activity_log_id = al.id AND n2.id != n.id
  );

-- Step 3: Log how many notifications were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM notifications
  WHERE activity_log_id IS NOT NULL;
  
  RAISE NOTICE 'Total notifications with activity_log_id: %', updated_count;
END $$;

