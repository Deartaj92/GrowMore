-- Migration: Add Student Profile permission
-- This migration adds the student-profile permission to the permissions table

-- Insert the student-profile permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path)
VALUES 
('student-profile', 'Student Profile', 'View detailed student profile information including attendance, exams, fees, and reports', 'Students', '/student/:id')
ON CONFLICT (key) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  path = EXCLUDED.path;

