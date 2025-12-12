-- Add Payroll Management Permissions

INSERT INTO permissions (key, name, description, category, path) VALUES
('payroll-view', 'View Payroll', 'Access payroll dashboard and view payroll information', 'Payroll', '/payroll'),
('payroll-create', 'Create Payroll', 'Create payroll plans and generate payroll', 'Payroll', '/payroll'),
('payroll-edit', 'Edit Payroll', 'Edit payroll plans and generated payrolls', 'Payroll', '/payroll'),
('payroll-delete', 'Delete Payroll', 'Delete payroll plans and cancel payrolls', 'Payroll', '/payroll'),
('payroll-payment', 'Process Payments', 'Process salary payments', 'Payroll', '/payroll'),
('payroll-approve', 'Approve Payroll', 'Approve generated payrolls', 'Payroll', '/payroll'),
('payroll-settings', 'Payroll Settings', 'Configure payroll settings', 'Payroll', '/payroll')
ON CONFLICT (key) DO NOTHING;


