-- Migration: Add complaints-suggestions permission
-- This permission is required for accessing the Complaints & Suggestions page

-- Insert the complaints-suggestions permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path) VALUES
('complaints-suggestions', 'Complaints & Suggestions', 'Review and manage student and parent complaints and suggestions', 'Communication', '/attendance/complaints-suggestions')
ON CONFLICT (key) DO NOTHING;

