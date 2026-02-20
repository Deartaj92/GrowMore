-- Add Assets and Liabilities Management Permissions

INSERT INTO permissions (key, name, description, category, path) VALUES
('assets-liabilities-view', 'View Assets & Liabilities', 'View assets and liabilities management system', 'Finance', '/assets-liabilities'),
('assets-manage', 'Manage Assets', 'Create, edit, and delete assets', 'Finance', '/assets-liabilities'),
('liabilities-manage', 'Manage Liabilities', 'Create, edit, and delete liabilities', 'Finance', '/assets-liabilities'),
('balance-sheet-view', 'View Balance Sheet', 'View balance sheet and financial position', 'Finance', '/assets-liabilities'),
('assets-liabilities-analytics', 'Assets & Liabilities Analytics', 'View analytics and reports for assets and liabilities', 'Finance', '/assets-liabilities')
ON CONFLICT (key) DO NOTHING;





