-- Migration: Add fee-plans permission to permissions table
-- This adds the fee-plans permission for managing individual student fee plans

-- Insert the fee-plans permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path) VALUES
('fee-plans', 'Fee Plans', 'Create and manage individual student fee plans', 'Fee Collection', '/fee-plans')
ON CONFLICT (key) DO NOTHING;

-- Note: This permission will need to be assigned to roles manually through the Role Management interface
-- or through a separate migration that assigns it to default roles like Principal, Admin, and Accountant

