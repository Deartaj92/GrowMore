-- Migration: Add generate-challans permission to permissions table
-- This adds the generate-challans permission for generating fee challans based on fee plans

-- Insert the generate-challans permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path) VALUES
('generate-challans', 'Generate Challans', 'Generate fee challans for students based on fee plans and frequency settings', 'Fee Collection', '/generate-challans')
ON CONFLICT (key) DO NOTHING;

-- Note: This permission will need to be assigned to roles manually through the Role Management interface
-- or through a separate migration that assigns it to default roles like Principal, Admin, and Accountant















