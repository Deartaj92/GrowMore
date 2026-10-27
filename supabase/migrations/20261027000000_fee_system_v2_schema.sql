-- ==============================================================================
-- Migration: 20261027000000_fee_system_v2_schema.sql
-- Phase 1 of Fee System v2: schema, sequences, immutability, RLS.
--
-- SAFETY GUARANTEES
--  * ONLY fee objects are touched. students, classes, sessions, users, enrollments,
--    attendance, exams, expenses, etc. are never altered or dropped.
--  * v1 fee tables are MOVED (not dropped) into schema `fee_v1_archive`, so even
--    fee data is preserved and recoverable.
--  * No CASCADE is used: if any non-fee object depends on a v1 fee function, the
--    migration aborts and rolls back instead of silently dropping it.
--  * Not applied yet. Review, then `supabase db push`.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. ARCHIVE v1 (move, don't drop)
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS fee_v1_archive;
REVOKE ALL ON SCHEMA fee_v1_archive FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t TEXT;
BEGIN
    -- children first is irrelevant for SET SCHEMA; FKs follow the tables.
    FOREACH t IN ARRAY ARRAY[
        'fee_audit_events','fee_reversals_refunds','fee_waivers_adjustments','fee_ledger_entries',
        'fee_allocations','fee_receipts','fee_demand_items','fee_demands','cashier_shifts',
        'student_concessions','student_fee_plans','fee_policy_versions','fee_heads',
        'student_billing_accounts','family_billing_accounts']
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA fee_v1_archive', t);
        END IF;
    END LOOP;
END $$;

-- v1 RPCs are code only (still in the old migration file); drop WITHOUT cascade.
DROP FUNCTION IF EXISTS public.fn_collect_fee_payment(BIGINT, BIGINT, NUMERIC, VARCHAR, INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS public.fn_collect_student_multi_payment(BIGINT, BIGINT, NUMERIC, VARCHAR, INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BIGINT, BIGINT[]);
DROP FUNCTION IF EXISTS public.fn_void_fee_payment(BIGINT, BIGINT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.fn_generate_monthly_demands(BIGINT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, DATE, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.fn_generate_family_monthly_demands(BIGINT, BIGINT, INTEGER, INTEGER, INTEGER, DATE, DATE, DATE, INTEGER);
DROP FUNCTION IF EXISTS public.fn_carry_forward_arrears(BIGINT, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.fn_get_student_ledger(BIGINT, INTEGER);
DROP FUNCTION IF EXISTS public.fn_delete_fee_demand(BIGINT, BIGINT, INTEGER);
-- student_enrollments is intentionally KEPT in public (identity vs placement is sound).

-- ------------------------------------------------------------------------------
-- 1. SEQUENCES (race-free numbering; replaces COUNT(*)+1)
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_sequences (
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    seq_key   VARCHAR(40) NOT NULL,          -- e.g. 'receipt:2026', 'challan:2026'
    last_value BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (school_id, seq_key)
);

CREATE OR REPLACE FUNCTION public.fn_fee_next_seq(p_school_id BIGINT, p_key VARCHAR)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE v BIGINT;
BEGIN
    INSERT INTO public.fee_sequences (school_id, seq_key, last_value)
    VALUES (p_school_id, p_key, 1)
    ON CONFLICT (school_id, seq_key)
    DO UPDATE SET last_value = public.fee_sequences.last_value + 1
    RETURNING last_value INTO v;
    RETURN v;
END $$;

-- ------------------------------------------------------------------------------
-- 2. CATALOG
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_heads (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'academic'
        CHECK (category IN ('academic','admission','transport','hostel','lab','library','activity','security_deposit','one_time','arrears','custom')),
    is_refundable BOOLEAN NOT NULL DEFAULT FALSE,
    priority_order INTEGER NOT NULL DEFAULT 10,   -- payment waterfall order (arrears = 1)
    gl_account_code VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, code)
);

-- One effective rate per head/session/class/section/period. Overlaps are impossible.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE public.fee_rates (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    fee_head_id BIGINT NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES public.classes(id) ON DELETE CASCADE,       -- NULL = school default
    section_id INTEGER REFERENCES public.sections(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly'
        CHECK (frequency IN ('monthly','quarterly','biannual','annual','one_time')),
    billing_months INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,7,8,9,10,11,12}',
    due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28),
    allow_partial BOOLEAN NOT NULL DEFAULT TRUE,
    allow_concession BOOLEAN NOT NULL DEFAULT TRUE,
    valid_during DATERANGE NOT NULL DEFAULT daterange(CURRENT_DATE, NULL),
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fee_rates_months_valid CHECK (billing_months <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]),
    CONSTRAINT fee_rates_no_overlap EXCLUDE USING gist (
        school_id WITH =, fee_head_id WITH =, session_id WITH =,
        COALESCE(class_id, 0) WITH =, COALESCE(section_id, 0) WITH =,
        valid_during WITH &&
    )
);
CREATE INDEX idx_fee_rates_lookup ON public.fee_rates(school_id, session_id, class_id, fee_head_id);

CREATE TABLE public.fee_late_rules (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    fee_head_id BIGINT REFERENCES public.fee_heads(id) ON DELETE CASCADE,   -- NULL = all heads
    grace_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_days >= 0),
    fine_type VARCHAR(20) NOT NULL CHECK (fine_type IN ('fixed','per_day','percentage')),
    fine_value NUMERIC(12,2) NOT NULL CHECK (fine_value >= 0),
    max_fine NUMERIC(12,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. STUDENT-LEVEL RULES (with maker-checker)
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_concessions (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    fee_head_id BIGINT REFERENCES public.fee_heads(id) ON DELETE CASCADE,   -- NULL = all eligible heads
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('sibling','staff_child','scholarship','need_based','merit','other')),
    value_type VARCHAR(10) NOT NULL CHECK (value_type IN ('percent','fixed')),
    value NUMERIC(12,2) NOT NULL CHECK (value > 0),
    CONSTRAINT fee_concessions_pct CHECK (value_type <> 'percent' OR value <= 100),
    valid_during DATERANGE NOT NULL DEFAULT daterange(CURRENT_DATE, NULL),
    reason TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
    requested_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    CONSTRAINT fee_concessions_maker_checker CHECK (approved_by IS NULL OR approved_by <> requested_by)
);
CREATE INDEX idx_fee_concessions_student ON public.fee_concessions(school_id, student_id, status);

CREATE TABLE public.student_fee_overrides (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    fee_head_id BIGINT NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),        -- 0 = exempt
    reason TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    requested_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
    UNIQUE (school_id, student_id, session_id, fee_head_id),
    CONSTRAINT fee_override_maker_checker CHECK (approved_by IS NULL OR approved_by <> requested_by)
);

-- ------------------------------------------------------------------------------
-- 4. FAMILY ACCOUNTS (siblings; the wallet/ledger account can be family or student)
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_accounts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('student','family')),
    student_id INTEGER,
    family_id BIGINT,
    label VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fee_accounts_shape CHECK (
        (account_type = 'student' AND student_id IS NOT NULL) OR
        (account_type = 'family'  AND family_id  IS NOT NULL)),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_fee_accounts_student ON public.fee_accounts(school_id, student_id) WHERE account_type = 'student';
CREATE UNIQUE INDEX uq_fee_accounts_family  ON public.fee_accounts(school_id, family_id)  WHERE account_type = 'family';

-- ------------------------------------------------------------------------------
-- 5. CASHIER SHIFTS (totals are DERIVED from receipts; no mutable counters)
-- ------------------------------------------------------------------------------
CREATE TABLE public.cashier_shifts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    cashier_user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opening_float NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_float >= 0),
    counted_cash NUMERIC(12,2),
    expected_cash NUMERIC(12,2),             -- frozen at close
    variance NUMERIC(12,2),                  -- frozen at close
    status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','reconciled')),
    reconciled_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT
);
-- A cashier can have at most one open shift (DB-enforced).
CREATE UNIQUE INDEX uq_one_open_shift ON public.cashier_shifts(school_id, cashier_user_id) WHERE status = 'open';

-- ------------------------------------------------------------------------------
-- 6. DEMANDS (challans) + LINES
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_demands (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    challan_no VARCHAR(40) NOT NULL,
    account_id BIGINT NOT NULL REFERENCES public.fee_accounts(id) ON DELETE RESTRICT,
    student_id INTEGER NOT NULL,
    enrollment_id BIGINT REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
    period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL,
    kind VARCHAR(12) NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular','arrears','adhoc')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','cancelled')),  -- paid-state is DERIVED
    snapshot JSONB NOT NULL DEFAULT '{}',
    cancelled_reason TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE RESTRICT,
    UNIQUE (school_id, challan_no),
    CONSTRAINT fee_demands_dates CHECK (due_date >= issue_date)
);
-- No duplicate regular challan for the same student/period.
CREATE UNIQUE INDEX uq_fee_demand_period ON public.fee_demands(school_id, student_id, session_id, period_year, period_month)
    WHERE kind = 'regular' AND status = 'issued';
CREATE INDEX idx_fee_demands_due ON public.fee_demands(school_id, due_date) WHERE status = 'issued';
CREATE INDEX idx_fee_demands_student ON public.fee_demands(school_id, student_id);

CREATE TABLE public.fee_demand_lines (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    demand_id BIGINT NOT NULL REFERENCES public.fee_demands(id) ON DELETE CASCADE,
    fee_head_id BIGINT NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
    rate_id BIGINT REFERENCES public.fee_rates(id) ON DELETE SET NULL,
    line_type VARCHAR(12) NOT NULL DEFAULT 'charge' CHECK (line_type IN ('charge','late_fine')),
    title VARCHAR(150) NOT NULL,
    priority_order INTEGER NOT NULL DEFAULT 10,
    gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 0),
    concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (concession_amount >= 0),
    waived_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (waived_amount >= 0),
    net_amount NUMERIC(12,2) GENERATED ALWAYS AS (gross_amount - concession_amount - waived_amount) STORED,
    CONSTRAINT fee_line_net_nonneg CHECK (gross_amount - concession_amount - waived_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- At most one late-fine line per demand per head (makes fine assessment idempotent).
CREATE UNIQUE INDEX uq_fee_line_fine ON public.fee_demand_lines(demand_id, fee_head_id) WHERE line_type = 'late_fine';
CREATE INDEX idx_fee_lines_demand ON public.fee_demand_lines(school_id, demand_id);

-- ------------------------------------------------------------------------------
-- 7. RECEIPTS + ALLOCATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_receipts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_no VARCHAR(40) NOT NULL,
    account_id BIGINT NOT NULL REFERENCES public.fee_accounts(id) ON DELETE RESTRICT,
    shift_id BIGINT REFERENCES public.cashier_shifts(id) ON DELETE RESTRICT,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','bank_transfer','cheque','easypaisa','jazzcash','pos_card','wallet')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    allocated_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
    wallet_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wallet_amount >= 0),   -- excess credited to wallet
    CONSTRAINT fee_receipt_split CHECK (allocated_amount + wallet_amount = amount),
    reference_no VARCHAR(100),
    bank_name VARCHAR(150),
    instrument_date DATE,
    payer_name VARCHAR(255),
    collector_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    idempotency_key UUID NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','voided')),
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    snapshot JSONB NOT NULL DEFAULT '{}',
    UNIQUE (school_id, receipt_no),
    UNIQUE (school_id, idempotency_key),
    CONSTRAINT fee_receipt_cash_shift CHECK (payment_method <> 'cash' OR shift_id IS NOT NULL)
);
CREATE INDEX idx_fee_receipts_account ON public.fee_receipts(school_id, account_id, paid_at);
CREATE INDEX idx_fee_receipts_shift ON public.fee_receipts(school_id, shift_id);

CREATE TABLE public.fee_allocations (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_id BIGINT NOT NULL REFERENCES public.fee_receipts(id) ON DELETE RESTRICT,
    demand_line_id BIGINT NOT NULL REFERENCES public.fee_demand_lines(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reversed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fee_alloc_line ON public.fee_allocations(school_id, demand_line_id) WHERE reversed = FALSE;
CREATE INDEX idx_fee_alloc_receipt ON public.fee_allocations(school_id, receipt_id);

-- ------------------------------------------------------------------------------
-- 8. ADJUSTMENTS (waiver / refund / void requests, maker-checker)
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_adjustments (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    kind VARCHAR(12) NOT NULL CHECK (kind IN ('waiver','refund','void')),
    demand_line_id BIGINT REFERENCES public.fee_demand_lines(id) ON DELETE RESTRICT,
    receipt_id BIGINT REFERENCES public.fee_receipts(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL CHECK (length(trim(reason)) >= 5),
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    requested_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    approved_by INTEGER REFERENCES public.users(id) ON DELETE RESTRICT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fee_adj_target CHECK (
        (kind = 'waiver' AND demand_line_id IS NOT NULL) OR (kind IN ('refund','void') AND receipt_id IS NOT NULL)),
    CONSTRAINT fee_adj_maker_checker CHECK (approved_by IS NULL OR approved_by <> requested_by)
);

-- ------------------------------------------------------------------------------
-- 9. LEDGER (append-only; balance = SUM(debit - credit))
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_ledger (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES public.fee_accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN (
        'CHARGE','CONCESSION','LATE_FINE','WAIVER','PAYMENT','PAYMENT_REVERSAL',
        'WALLET_CREDIT','WALLET_DEBIT','REFUND','CHARGE_CANCEL','OPENING_BALANCE')),
    debit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    CONSTRAINT fee_ledger_one_side CHECK ((debit > 0) <> (credit > 0)),
    demand_id BIGINT REFERENCES public.fee_demands(id) ON DELETE RESTRICT,
    demand_line_id BIGINT REFERENCES public.fee_demand_lines(id) ON DELETE RESTRICT,
    receipt_id BIGINT REFERENCES public.fee_receipts(id) ON DELETE RESTRICT,
    adjustment_id BIGINT REFERENCES public.fee_adjustments(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    performed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fee_ledger_account ON public.fee_ledger(school_id, account_id, id);

-- Hard immutability: ledger and allocations/receipts can never be deleted; ledger never updated.
CREATE OR REPLACE FUNCTION public.fn_fee_block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Table % is append-only (% blocked).', TG_TABLE_NAME, TG_OP;
END $$;

CREATE TRIGGER trg_fee_ledger_immutable BEFORE UPDATE OR DELETE ON public.fee_ledger
    FOR EACH ROW EXECUTE FUNCTION public.fn_fee_block_mutation();
CREATE TRIGGER trg_fee_receipts_nodelete BEFORE DELETE ON public.fee_receipts
    FOR EACH ROW EXECUTE FUNCTION public.fn_fee_block_mutation();
CREATE TRIGGER trg_fee_alloc_nodelete BEFORE DELETE ON public.fee_allocations
    FOR EACH ROW EXECUTE FUNCTION public.fn_fee_block_mutation();
CREATE TRIGGER trg_fee_demands_nodelete BEFORE DELETE ON public.fee_demands
    FOR EACH ROW EXECUTE FUNCTION public.fn_fee_block_mutation();

-- ------------------------------------------------------------------------------
-- 10. DERIVED VIEWS (single source of truth = lines + allocations)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_fee_line_balances WITH (security_invoker = true) AS
SELECT l.id AS line_id, l.school_id, l.demand_id, l.fee_head_id, l.line_type, l.title, l.priority_order,
       l.gross_amount, l.concession_amount, l.waived_amount, l.net_amount,
       COALESCE(SUM(a.amount) FILTER (WHERE a.reversed = FALSE), 0)::NUMERIC(12,2) AS paid_amount,
       (l.net_amount - COALESCE(SUM(a.amount) FILTER (WHERE a.reversed = FALSE), 0))::NUMERIC(12,2) AS balance_amount
FROM public.fee_demand_lines l
LEFT JOIN public.fee_allocations a ON a.demand_line_id = l.id
GROUP BY l.id;

CREATE OR REPLACE VIEW public.v_fee_demand_balances WITH (security_invoker = true) AS
SELECT d.id AS demand_id, d.school_id, d.challan_no, d.account_id, d.student_id, d.session_id,
       d.period_month, d.period_year, d.kind, d.issue_date, d.due_date, d.status AS doc_status,
       COALESCE(SUM(b.net_amount), 0)::NUMERIC(12,2)     AS net_amount,
       COALESCE(SUM(b.paid_amount), 0)::NUMERIC(12,2)    AS paid_amount,
       COALESCE(SUM(b.balance_amount), 0)::NUMERIC(12,2) AS balance_amount,
       CASE
         WHEN d.status = 'cancelled' THEN 'cancelled'
         WHEN COALESCE(SUM(b.balance_amount),0) = 0 THEN 'paid'
         WHEN COALESCE(SUM(b.paid_amount),0) > 0 THEN 'partially_paid'
         WHEN d.due_date < CURRENT_DATE THEN 'overdue'
         ELSE 'unpaid'
       END AS pay_status
FROM public.fee_demands d
LEFT JOIN public.v_fee_line_balances b ON b.demand_id = d.id
GROUP BY d.id;

CREATE OR REPLACE VIEW public.v_fee_account_balances WITH (security_invoker = true) AS
SELECT school_id, account_id,
       SUM(debit - credit)::NUMERIC(12,2) AS balance,                                  -- >0 owes, <0 credit
       COALESCE(SUM(credit - debit) FILTER (WHERE entry_type IN ('WALLET_CREDIT','WALLET_DEBIT','REFUND')), 0)::NUMERIC(12,2) AS wallet_balance
FROM public.fee_ledger GROUP BY school_id, account_id;

-- ------------------------------------------------------------------------------
-- 11. AUDIT LOG (trigger-driven on config/approval tables)
-- ------------------------------------------------------------------------------
CREATE TABLE public.fee_audit_log (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT,
    table_name TEXT NOT NULL,
    row_id BIGINT,
    action TEXT NOT NULL,
    old_row JSONB,
    new_row JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.fn_fee_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.fee_audit_log (school_id, table_name, row_id, action, old_row, new_row)
    VALUES (COALESCE((to_jsonb(NEW)->>'school_id')::BIGINT, (to_jsonb(OLD)->>'school_id')::BIGINT),
            TG_TABLE_NAME,
            COALESCE((to_jsonb(NEW)->>'id')::BIGINT, (to_jsonb(OLD)->>'id')::BIGINT),
            TG_OP,
            CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
            CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
    RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_audit_fee_heads        AFTER INSERT OR UPDATE OR DELETE ON public.fee_heads        FOR EACH ROW EXECUTE FUNCTION public.fn_fee_audit();
CREATE TRIGGER trg_audit_fee_rates        AFTER INSERT OR UPDATE OR DELETE ON public.fee_rates        FOR EACH ROW EXECUTE FUNCTION public.fn_fee_audit();
CREATE TRIGGER trg_audit_fee_concessions  AFTER INSERT OR UPDATE OR DELETE ON public.fee_concessions  FOR EACH ROW EXECUTE FUNCTION public.fn_fee_audit();
CREATE TRIGGER trg_audit_fee_overrides    AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_overrides FOR EACH ROW EXECUTE FUNCTION public.fn_fee_audit();
CREATE TRIGGER trg_audit_fee_adjustments  AFTER INSERT OR UPDATE OR DELETE ON public.fee_adjustments  FOR EACH ROW EXECUTE FUNCTION public.fn_fee_audit();
CREATE TRIGGER trg_audit_fee_late_rules   AFTER INSERT OR UPDATE OR DELETE ON public.fee_late_rules   FOR EACH ROW EXECUTE FUNCTION public.fn_fee_audit();

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- The app uses custom auth (not auth.uid()), so tenant isolation cannot yet be
-- enforced in policies. Strategy for now:
--   * RLS enabled everywhere.
--   * MONEY tables: SELECT only for API roles; ALL writes via SECURITY DEFINER RPCs.
--   * CONFIG tables: open read/write (same as rest of app) until auth is unified.
-- TODO(auth): replace USING(true) with school_id = current_setting('app.school_id').
-- ------------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['fee_demands','fee_demand_lines','fee_receipts','fee_allocations','fee_ledger',
                             'fee_adjustments','cashier_shifts','fee_accounts','fee_sequences','fee_audit_log']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t || '_read', t);
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
    END LOOP;

    FOREACH t IN ARRAY ARRAY['fee_heads','fee_rates','fee_late_rules','fee_concessions','student_fee_overrides']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t || '_all', t);
    END LOOP;
END $$;
-- NOTE: concessions/overrides must be approved only through an RPC (Phase 2) so the
-- status column cannot be flipped by direct client updates; tighten then.

-- ------------------------------------------------------------------------------
-- 13. PERMISSIONS (replace v1 keys)
-- ------------------------------------------------------------------------------
INSERT INTO public.permissions (key, name, description, category, path) VALUES
 ('fee-dashboard',   'Fee Dashboard',          'Collection KPIs and trends',                'Fee System', '/fees'),
 ('fee-counter-pos', 'Fee Counter (POS)',      'Collect payments and issue receipts',       'Fee System', '/fee-counter'),
 ('fee-demands',     'Fee Demands',            'Generate and view challans',                'Fee System', '/fee-demands'),
 ('fee-catalog',     'Fee Catalog & Rates',    'Manage heads, rates and late-fine rules',   'Fee System', '/fee-catalog'),
 ('fee-concessions', 'Concessions',            'Request concessions and overrides',         'Fee System', '/fee-concessions'),
 ('fee-approvals',   'Fee Approvals',          'Approve concessions, waivers, voids, refunds','Fee System', '/fee-approvals'),
 ('fee-statements',  'Student Statements',     'View student/family ledger statements',     'Fee System', '/fee-statements'),
 ('fee-aging',       'Aging & Defaulters',     'Overdue aging and defaulter lists',         'Fee System', '/fee-aging'),
 ('fee-shifts',      'Cashier Shifts',         'Open/close and reconcile cashier drawers',  'Fee System', '/fee-shifts')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
    category = EXCLUDED.category, path = EXCLUDED.path;

DELETE FROM public.role_permissions WHERE permission_id IN (SELECT id FROM public.permissions WHERE category = 'Fee Ledger');
DELETE FROM public.user_permissions WHERE permission_id IN (SELECT id FROM public.permissions WHERE category = 'Fee Ledger');
DELETE FROM public.permissions WHERE category = 'Fee Ledger';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name IN ('Admin','Super Admin','Principal') AND p.category = 'Fee System'
ON CONFLICT DO NOTHING;
