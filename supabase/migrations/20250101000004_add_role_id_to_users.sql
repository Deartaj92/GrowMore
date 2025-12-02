-- Migration: Add role_id column to users table
-- This links users to roles in the roles table for proper role management

-- Add role_id column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

-- Add comment to document the purpose
COMMENT ON COLUMN public.users.role_id IS 'References the roles table. If set, this role_id determines the user permissions. The role column (VARCHAR) is kept for backward compatibility.';

-- Optional: Create a function to automatically sync role_id from role name
-- This can be used to populate role_id based on existing role column values
CREATE OR REPLACE FUNCTION sync_role_id_from_role_name()
RETURNS void AS $$
BEGIN
  UPDATE users u
  SET role_id = r.id
  FROM roles r
  WHERE u.role = r.name 
    AND u.school_id = r.school_id
    AND u.role_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the sync function to populate role_id for existing users
SELECT sync_role_id_from_role_name();

