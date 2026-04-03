alter table public.payroll_payments
add column if not exists attendance_present integer not null default 0,
add column if not exists attendance_leave integer not null default 0,
add column if not exists attendance_absent integer not null default 0,
add column if not exists attendance_late integer not null default 0,
add column if not exists absent_deduction_amount numeric(12,2) not null default 0,
add column if not exists leave_deduction_amount numeric(12,2) not null default 0,
add column if not exists late_deduction_amount numeric(12,2) not null default 0,
add column if not exists advance_deduction_amount numeric(12,2) not null default 0;

comment on column public.payroll_payments.attendance_present is 'Saved present count snapshot for the receipt month context';
comment on column public.payroll_payments.attendance_leave is 'Saved leave count snapshot for the receipt month context';
comment on column public.payroll_payments.attendance_absent is 'Saved absent count snapshot for the receipt month context';
comment on column public.payroll_payments.attendance_late is 'Saved late count snapshot for the receipt month context';
comment on column public.payroll_payments.absent_deduction_amount is 'Saved absent deduction snapshot for the receipt month context';
comment on column public.payroll_payments.leave_deduction_amount is 'Saved leave deduction snapshot for the receipt month context';
comment on column public.payroll_payments.late_deduction_amount is 'Saved late deduction snapshot for the receipt month context';
comment on column public.payroll_payments.advance_deduction_amount is 'Saved advance deduction snapshot for the receipt month context';
