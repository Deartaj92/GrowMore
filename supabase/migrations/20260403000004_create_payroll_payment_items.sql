alter table public.payroll_payments
add column if not exists total_remaining_before_payment numeric(12,2) not null default 0,
add column if not exists remaining_after_payment numeric(12,2) not null default 0,
add column if not exists old_balance_amount numeric(12,2) not null default 0,
add column if not exists current_month_gross numeric(12,2) not null default 0,
add column if not exists current_month_deductions numeric(12,2) not null default 0,
add column if not exists prior_payments_current_month numeric(12,2) not null default 0,
add column if not exists net_amount numeric(12,2) not null default 0;

create table if not exists public.payroll_payment_items (
    id serial primary key,
    school_id bigint not null references public.schools(id) on delete cascade,
    payment_id integer not null references public.payroll_payments(id) on delete cascade,
    generation_id integer not null references public.payroll_generations(id) on delete cascade,
    amount_due_before_payment numeric(12,2) not null default 0 check (amount_due_before_payment >= 0),
    paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
    remaining_after_payment numeric(12,2) not null default 0 check (remaining_after_payment >= 0),
    display_order integer not null default 0,
    created_at timestamp with time zone default now()
);

create index if not exists idx_payroll_payment_items_school_id
on public.payroll_payment_items (school_id);

create index if not exists idx_payroll_payment_items_payment_id
on public.payroll_payment_items (payment_id);

create index if not exists idx_payroll_payment_items_generation_id
on public.payroll_payment_items (generation_id);

grant all on public.payroll_payment_items to authenticated;
grant usage on sequence public.payroll_payment_items_id_seq to authenticated;

comment on table public.payroll_payment_items is 'Month-wise allocation records for each payroll payment transaction';
comment on column public.payroll_payments.total_remaining_before_payment is 'Total collectible payroll balance before this payment was posted';
comment on column public.payroll_payments.remaining_after_payment is 'Total collectible payroll balance remaining after this payment';
comment on column public.payroll_payments.old_balance_amount is 'Combined remaining balance from payroll months older than the latest month context';
comment on column public.payroll_payments.current_month_gross is 'Gross salary of the latest/current payroll month context';
comment on column public.payroll_payments.current_month_deductions is 'Total deductions of the latest/current payroll month context';
comment on column public.payroll_payments.prior_payments_current_month is 'Sum of earlier completed payments already applied to the latest/current payroll month';
comment on column public.payroll_payments.net_amount is 'Saved receipt net amount used for payroll payment history and receipts';
