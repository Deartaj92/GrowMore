-- Migration: Add cash-flow-view permission
-- This adds the permission for the Cash Flow Statement feature

-- Insert the permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path)
VALUES (
  'cash-flow-view',
  'View Cash Flow',
  'View cash flow statement with inflows, outflows, and net cash flow',
  'Accounts',
  '/cash-flow'
)
ON CONFLICT (key) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  path = EXCLUDED.path;



