-- Migration: Add setup-accounts permission
-- This adds the permission for the Setup Accounts feature

-- Insert the permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path)
VALUES (
  'setup-accounts',
  'Setup Accounts',
  'Manage bank accounts, EasyPaisa, JazzCash and other payment accounts',
  'Accounts',
  '/setup-accounts'
)
ON CONFLICT (key) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  path = EXCLUDED.path;














