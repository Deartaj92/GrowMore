-- Migration: Add staff-half-leaves permission
-- This adds a separate permission for staff half leaves management

INSERT INTO permissions (key, name, description, category, path)
VALUES 
('staff-half-leaves', 'Staff Half Leaves', 'Record and manage staff half-day leaves', 'Attendance', '/attendance/staff-half-leaves')
ON CONFLICT (key) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  path = EXCLUDED.path;

