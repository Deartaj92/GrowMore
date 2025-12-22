-- Migration: Add view-challans permission to permissions table
-- This adds the view-challans permission for viewing and managing generated challans

-- Insert the view-challans permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path) VALUES
('view-challans', 'View Challans', 'View and manage all generated fee challans', 'Fee Collection', '/challans')
ON CONFLICT (key) DO NOTHING;

-- Note: This permission will need to be assigned to roles manually through the Role Management interface
-- or through a separate migration that assigns it to default roles like Principal, Admin, and Accountant

