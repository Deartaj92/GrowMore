-- Add staff support to leave_requests table
-- This allows teachers/staff to request leave for themselves

-- Add staff_id column (nullable, since existing records are for students)
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE;

-- Make student_id nullable (since staff requests won't have a student_id)
ALTER TABLE leave_requests
ALTER COLUMN student_id DROP NOT NULL;

-- Update the requested_by check constraint to include 'staff'
ALTER TABLE leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_requested_by_check;

ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_requested_by_check
CHECK (requested_by IN ('student', 'parent', 'staff'));

-- Add constraint to ensure either student_id or staff_id is provided
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_subject_check
CHECK (
  (student_id IS NOT NULL AND staff_id IS NULL) OR
  (student_id IS NULL AND staff_id IS NOT NULL)
);

-- Create index for staff_id
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_id ON leave_requests(staff_id);

-- Update the requested_by index to include staff
DROP INDEX IF EXISTS idx_leave_requests_requested_by;
CREATE INDEX idx_leave_requests_requested_by ON leave_requests(requested_by, requested_by_id);


