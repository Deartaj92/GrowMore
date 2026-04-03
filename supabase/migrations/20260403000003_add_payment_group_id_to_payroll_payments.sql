alter table payroll_payments
add column if not exists payment_group_id text;

create index if not exists idx_payroll_payments_payment_group_id
on payroll_payments (payment_group_id);
