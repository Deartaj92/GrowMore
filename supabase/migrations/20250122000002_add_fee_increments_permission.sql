-- Migration: Add fee-increments permission to permissions table
-- This adds the fee-increments permission for applying fee increments to fee plans and structures

-- Insert the fee-increments permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path) VALUES
('fee-increments', 'Fee Increments', 'Apply fee increments to fee plans and structures for new fee generations', 'Fee Collection', '/fee-increments')
ON CONFLICT (key) DO NOTHING;

-- Note: This permission will need to be assigned to roles manually through the Role Management interface
-- or through a separate migration that assigns it to default roles like Principal, Admin, and Accountant

