-- ==============================================================================
-- Migration: 20261027000100_fee_system_v2_rpcs.sql
-- Phase 2 of Fee System v2: transactional RPC engine.
-- Depends on 20261027000000_fee_system_v2_schema.sql.
--
-- Conventions
--  * All money writes happen ONLY here (SECURITY DEFINER); API roles have no
--    INSERT/UPDATE/DELETE on money tables.
--  * Every RPC re-checks the caller's permission server-side (fn_fee_require).
--  * Account row is locked (SELECT ... FOR UPDATE) to serialise per-student money ops.
--  * Ledger is append-only; paid/balance state is derived from allocations.
--  * Touches only fee objects. Nothing outside the fee system is read-modified
--    except an ADDITIVE insert of missing student_enrollments rows in demand generation.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. AUTHORISATION HELPERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fee_can(p_school_id BIGINT, p_user_id INTEGER, p_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role INTEGER; v_override BOOLEAN;
BEGIN
    SELECT role_id INTO v_role FROM public.users WHERE id = p_user_id AND school_id = p_school_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;

    SELECT up.granted INTO v_override
    FROM public.user_permissions up JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id AND p.key = p_key;
    IF FOUND THEN RETURN v_override; END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = v_role AND p.key = p_key);
END $$;

CREATE OR REPLACE FUNCTION public.fn_fee_require(p_school_id BIGINT, p_user_id INTEGER, VARIADIC p_keys TEXT[])
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE k TEXT;
BEGIN
    FOREACH k IN ARRAY p_keys LOOP
        IF public.fn_fee_can(p_school_id, p_user_id, k) THEN RETURN; END IF;
    END LOOP;
    RAISE EXCEPTION 'Permission denied: requires one of [%]', array_to_string(p_keys, ', ') USING ERRCODE = '42501';
END $$;

-- Allow privileged internal RPC writes to bypass approval-guard triggers.
CREATE OR REPLACE FUNCTION public.fn_fee_rpc_on() RETURNS VOID LANGUAGE sql AS
$$ SELECT set_config('app.fee_rpc', 'on', true) $$;

-- ------------------------------------------------------------------------------
-- 1. APPROVAL-GUARD TRIGGERS (clients cannot self-approve through direct writes)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fee_guard_concession() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF COALESCE(current_setting('app.fee_rpc', true), '') = 'on' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    IF TG_OP = 'INSERT' THEN
        IF NEW.requested_by IS NULL THEN RAISE EXCEPTION 'requested_by is required.'; END IF;
        NEW.status := 'pending'; NEW.approved_by := NULL; NEW.decided_at := NULL;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status <> 'pending' THEN
            RAISE EXCEPTION 'Only pending concessions can be edited. Use the approval workflow.';
        END IF;
        NEW.status := OLD.status; NEW.approved_by := OLD.approved_by; NEW.decided_at := OLD.decided_at;
        RETURN NEW;
    ELSE
        IF OLD.status = 'approved' THEN
            RAISE EXCEPTION 'Approved concessions cannot be deleted; revoke them instead.';
        END IF;
        RETURN OLD;
    END IF;
END $$;
CREATE TRIGGER trg_fee_guard_concession BEFORE INSERT OR UPDATE OR DELETE ON public.fee_concessions
    FOR EACH ROW EXECUTE FUNCTION public.fn_fee_guard_concession();

CREATE OR REPLACE FUNCTION public.fn_fee_guard_override() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF COALESCE(current_setting('app.fee_rpc', true), '') = 'on' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    IF TG_OP = 'INSERT' THEN
        IF NEW.requested_by IS NULL THEN RAISE EXCEPTION 'requested_by is required.'; END IF;
        NEW.status := 'pending'; NEW.approved_by := NULL;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status <> 'pending' THEN
            RAISE EXCEPTION 'Only pending overrides can be edited. Use the approval workflow.';
        END IF;
        NEW.status := OLD.status; NEW.approved_by := OLD.approved_by;
        RETURN NEW;
    ELSE
        IF OLD.status = 'approved' THEN
            RAISE EXCEPTION 'Approved overrides cannot be deleted.';
        END IF;
        RETURN OLD;
    END IF;
END $$;
CREATE TRIGGER trg_fee_guard_override BEFORE INSERT OR UPDATE OR DELETE ON public.student_fee_overrides
    FOR EACH ROW EXECUTE FUNCTION public.fn_fee_guard_override();

-- ------------------------------------------------------------------------------
-- 2. INTERNAL HELPERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fee_account_for_student(p_school_id BIGINT, p_student_id INTEGER)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id BIGINT;
BEGIN
    SELECT id INTO v_id FROM public.fee_accounts
    WHERE school_id = p_school_id AND account_type = 'student' AND student_id = p_student_id;
    IF FOUND THEN RETURN v_id; END IF;

    INSERT INTO public.fee_accounts (school_id, account_type, student_id)
    VALUES (p_school_id, 'student', p_student_id)
    ON CONFLICT (school_id, student_id) WHERE account_type = 'student' DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM public.fee_accounts
        WHERE school_id = p_school_id AND account_type = 'student' AND student_id = p_student_id;
    END IF;
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.fn_fee_post(
    p_school_id BIGINT, p_account_id BIGINT, p_type TEXT, p_debit NUMERIC, p_credit NUMERIC,
    p_demand_id BIGINT, p_line_id BIGINT, p_receipt_id BIGINT, p_adjustment_id BIGINT,
    p_description TEXT, p_user_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF COALESCE(p_debit,0) = 0 AND COALESCE(p_credit,0) = 0 THEN RETURN; END IF;
    INSERT INTO public.fee_ledger (school_id, account_id, entry_type, debit, credit, demand_id,
                                   demand_line_id, receipt_id, adjustment_id, description, performed_by)
    VALUES (p_school_id, p_account_id, p_type, COALESCE(p_debit,0), COALESCE(p_credit,0), p_demand_id,
            p_line_id, p_receipt_id, p_adjustment_id, p_description, p_user_id);
END $$;

-- Waterfall: oldest due date first, then line priority. Caller MUST hold the account lock.
CREATE OR REPLACE FUNCTION public.fn_fee_allocate(
    p_school_id BIGINT, p_receipt_id BIGINT, p_account_id BIGINT, p_amount NUMERIC, p_demand_ids BIGINT[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r RECORD; v_left NUMERIC(12,2) := p_amount; v_alloc NUMERIC(12,2);
    v_total NUMERIC(12,2) := 0; v_list JSONB := '[]'::JSONB;
BEGIN
    FOR r IN
        SELECT b.line_id, b.demand_id, b.title, b.balance_amount, d.challan_no
        FROM public.v_fee_line_balances b
        JOIN public.fee_demands d ON d.id = b.demand_id
        WHERE d.school_id = p_school_id AND d.account_id = p_account_id AND d.status = 'issued'
          AND b.balance_amount > 0
          AND (p_demand_ids IS NULL OR d.id = ANY(p_demand_ids))
        ORDER BY d.due_date, d.id, b.priority_order, b.line_id
    LOOP
        EXIT WHEN v_left <= 0;
        v_alloc := LEAST(v_left, r.balance_amount);
        INSERT INTO public.fee_allocations (school_id, receipt_id, demand_line_id, amount)
        VALUES (p_school_id, p_receipt_id, r.line_id, v_alloc);
        v_left := v_left - v_alloc;
        v_total := v_total + v_alloc;
        v_list := v_list || jsonb_build_object('challan_no', r.challan_no, 'line', r.title, 'amount', v_alloc);
    END LOOP;
    RETURN jsonb_build_object('allocated', v_total, 'lines', v_list);
END $$;

-- Auto-apply an account's wallet credit against its unpaid demands.
CREATE OR REPLACE FUNCTION public.fn_fee_apply_wallet(p_school_id BIGINT, p_account_id BIGINT, p_user_id INTEGER)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_wallet NUMERIC(12,2); v_due NUMERIC(12,2); v_amt NUMERIC(12,2);
    v_receipt_id BIGINT; v_no TEXT; v_res JSONB;
BEGIN
    SELECT COALESCE(wallet_balance, 0) INTO v_wallet FROM public.v_fee_account_balances
    WHERE school_id = p_school_id AND account_id = p_account_id;
    IF COALESCE(v_wallet, 0) <= 0 THEN RETURN 0; END IF;

    SELECT COALESCE(SUM(b.balance_amount), 0) INTO v_due
    FROM public.v_fee_line_balances b JOIN public.fee_demands d ON d.id = b.demand_id
    WHERE d.school_id = p_school_id AND d.account_id = p_account_id AND d.status = 'issued' AND b.balance_amount > 0;

    v_amt := LEAST(v_wallet, v_due);
    IF v_amt <= 0 THEN RETURN 0; END IF;

    v_no := 'WAL-' || TO_CHAR(now(), 'YYYY') || '-' ||
            LPAD(public.fn_fee_next_seq(p_school_id, 'wallet:' || TO_CHAR(now(), 'YYYY'))::TEXT, 6, '0');
    INSERT INTO public.fee_receipts (school_id, receipt_no, account_id, payment_method, amount,
                                     allocated_amount, wallet_amount, collector_user_id, idempotency_key, payer_name)
    VALUES (p_school_id, v_no, p_account_id, 'wallet', v_amt, v_amt, 0, p_user_id, gen_random_uuid(), 'Wallet')
    RETURNING id INTO v_receipt_id;

    v_res := public.fn_fee_allocate(p_school_id, v_receipt_id, p_account_id, v_amt, NULL);

    PERFORM public.fn_fee_post(p_school_id, p_account_id, 'PAYMENT', 0, v_amt, NULL, NULL, v_receipt_id, NULL,
                               'Wallet applied (' || v_no || ')', p_user_id);
    PERFORM public.fn_fee_post(p_school_id, p_account_id, 'WALLET_DEBIT', v_amt, 0, NULL, NULL, v_receipt_id, NULL,
                               'Wallet consumed (' || v_no || ')', p_user_id);
    RETURN v_amt;
END $$;

-- Most-specific active rate per head (section > class > school default) for a student/period.
CREATE OR REPLACE FUNCTION public.fn_fee_applicable_rates(
    p_school_id BIGINT, p_session_id INTEGER, p_class_id INTEGER, p_section_id INTEGER,
    p_student_id INTEGER, p_month INTEGER, p_on DATE)
RETURNS SETOF public.fee_rates LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT * FROM (
        SELECT DISTINCT ON (r.fee_head_id) r.*
        FROM public.fee_rates r
        JOIN public.fee_heads h ON h.id = r.fee_head_id AND h.is_active
        WHERE r.school_id = p_school_id AND r.session_id = p_session_id
          AND r.valid_during @> p_on
          AND (r.class_id IS NULL OR r.class_id = p_class_id)
          AND (r.section_id IS NULL OR r.section_id = p_section_id)
          AND p_month = ANY (r.billing_months)
          AND (r.frequency <> 'one_time' OR NOT EXISTS (
                SELECT 1 FROM public.fee_demand_lines l JOIN public.fee_demands d ON d.id = l.demand_id
                WHERE d.school_id = p_school_id AND d.student_id = p_student_id
                  AND d.session_id = p_session_id AND d.status = 'issued' AND l.fee_head_id = r.fee_head_id
                  AND l.line_type = 'charge'))
        ORDER BY r.fee_head_id, (r.section_id IS NOT NULL) DESC, (r.class_id IS NOT NULL) DESC, lower(r.valid_during) DESC
    ) x
$$;

-- ------------------------------------------------------------------------------
-- 3. DEMAND GENERATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_demands(
    p_school_id BIGINT, p_user_id INTEGER, p_session_id INTEGER, p_month INTEGER, p_year INTEGER,
    p_issue_date DATE, p_due_date DATE,
    p_class_id INTEGER DEFAULT NULL, p_section_id INTEGER DEFAULT NULL, p_student_id INTEGER DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    e RECORD; rt RECORD;
    v_account BIGINT; v_demand BIGINT; v_line BIGINT; v_no TEXT;
    v_gross NUMERIC(12,2); v_conc NUMERIC(12,2); v_override NUMERIC(12,2);
    v_has_rates BOOLEAN;
    v_generated INT := 0; v_existing INT := 0; v_no_rates INT := 0; v_wallet_applied NUMERIC := 0;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-demands');
    IF p_due_date < p_issue_date THEN RAISE EXCEPTION 'Due date cannot be before issue date.'; END IF;
    IF p_month NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Invalid month %', p_month; END IF;

    -- Additive only: ensure active students have an enrollment row for this session.
    INSERT INTO public.student_enrollments (school_id, student_id, session_id, class_id, section_id, roll_number, enrollment_type, status)
    SELECT s.school_id, s.id, p_session_id, s.class_id, s.section_id, COALESCE(s.roll_number, ''), 'new_admission', 'active'
    FROM public.students s
    WHERE s.school_id = p_school_id AND s.class_id IS NOT NULL
      AND (p_class_id IS NULL OR s.class_id = p_class_id)
      AND (p_section_id IS NULL OR s.section_id = p_section_id)
      AND (p_student_id IS NULL OR s.id = p_student_id)
      AND (s.status IS NULL OR s.status ILIKE 'active' OR s.status ILIKE 'enrolled' OR s.status = '1')
      AND NOT EXISTS (SELECT 1 FROM public.student_enrollments se
                      WHERE se.school_id = p_school_id AND se.student_id = s.id AND se.session_id = p_session_id)
    ON CONFLICT DO NOTHING;

    FOR e IN
        SELECT en.id AS enrollment_id, en.student_id, en.class_id, en.section_id,
               s.name, s.father_name, s.roll_number, s.phone,
               c.name AS class_name, sec.name AS section_name
        FROM public.student_enrollments en
        JOIN public.students s ON s.id = en.student_id AND s.school_id = en.school_id
        LEFT JOIN public.classes c ON c.id = en.class_id
        LEFT JOIN public.sections sec ON sec.id = en.section_id
        WHERE en.school_id = p_school_id AND en.session_id = p_session_id AND en.status = 'active'
          AND (p_class_id IS NULL OR en.class_id = p_class_id)
          AND (p_section_id IS NULL OR en.section_id = p_section_id)
          AND (p_student_id IS NULL OR en.student_id = p_student_id)
        ORDER BY en.student_id
    LOOP
        IF EXISTS (SELECT 1 FROM public.fee_demands
                   WHERE school_id = p_school_id AND student_id = e.student_id AND session_id = p_session_id
                     AND period_year = p_year AND period_month = p_month AND kind = 'regular' AND status = 'issued') THEN
            v_existing := v_existing + 1; CONTINUE;
        END IF;

        SELECT EXISTS (SELECT 1 FROM public.fn_fee_applicable_rates(
                 p_school_id, p_session_id, e.class_id, e.section_id, e.student_id, p_month, p_issue_date)) INTO v_has_rates;
        IF NOT v_has_rates THEN v_no_rates := v_no_rates + 1; CONTINUE; END IF;

        v_account := public.fn_fee_account_for_student(p_school_id, e.student_id);
        PERFORM 1 FROM public.fee_accounts WHERE id = v_account FOR UPDATE;

        v_no := 'CH-' || p_year || LPAD(p_month::TEXT, 2, '0') || '-' ||
                LPAD(public.fn_fee_next_seq(p_school_id, 'challan:' || p_year)::TEXT, 6, '0');

        INSERT INTO public.fee_demands (school_id, challan_no, account_id, student_id, enrollment_id, session_id,
                                        period_month, period_year, kind, issue_date, due_date, snapshot, created_by)
        VALUES (p_school_id, v_no, v_account, e.student_id, e.enrollment_id, p_session_id,
                p_month, p_year, 'regular', p_issue_date, p_due_date,
                jsonb_build_object('student_id', e.student_id, 'student_name', e.name, 'father_name', e.father_name,
                                   'class_id', e.class_id, 'class_name', e.class_name,
                                   'section_id', e.section_id, 'section_name', e.section_name,
                                   'roll_number', e.roll_number, 'phone', e.phone),
                p_user_id)
        RETURNING id INTO v_demand;

        FOR rt IN
            SELECT r.*, h.title AS head_title, h.priority_order AS head_priority
            FROM public.fn_fee_applicable_rates(p_school_id, p_session_id, e.class_id, e.section_id,
                                                e.student_id, p_month, p_issue_date) r
            JOIN public.fee_heads h ON h.id = r.fee_head_id
            ORDER BY h.priority_order, r.fee_head_id
        LOOP
            v_gross := rt.amount;

            SELECT o.amount INTO v_override FROM public.student_fee_overrides o
            WHERE o.school_id = p_school_id AND o.student_id = e.student_id AND o.session_id = p_session_id
              AND o.fee_head_id = rt.fee_head_id AND o.status = 'approved';
            IF FOUND THEN v_gross := v_override; END IF;

            CONTINUE WHEN v_gross <= 0;   -- exempt

            v_conc := 0;
            IF rt.allow_concession THEN
                SELECT LEAST(v_gross, COALESCE(SUM(
                           CASE WHEN c.value_type = 'percent' THEN ROUND(v_gross * c.value / 100.0, 2) ELSE c.value END), 0))
                INTO v_conc
                FROM public.fee_concessions c
                WHERE c.school_id = p_school_id AND c.student_id = e.student_id AND c.status = 'approved'
                  AND (c.fee_head_id IS NULL OR c.fee_head_id = rt.fee_head_id)
                  AND c.valid_during @> p_issue_date;
            END IF;

            INSERT INTO public.fee_demand_lines (school_id, demand_id, fee_head_id, rate_id, line_type, title,
                                                 priority_order, gross_amount, concession_amount)
            VALUES (p_school_id, v_demand, rt.fee_head_id, rt.id, 'charge', rt.head_title,
                    rt.head_priority, v_gross, v_conc)
            RETURNING id INTO v_line;

            PERFORM public.fn_fee_post(p_school_id, v_account, 'CHARGE', v_gross, 0, v_demand, v_line, NULL, NULL,
                                       rt.head_title || ' (' || p_month || '/' || p_year || ') ' || v_no, p_user_id);
            PERFORM public.fn_fee_post(p_school_id, v_account, 'CONCESSION', 0, v_conc, v_demand, v_line, NULL, NULL,
                                       'Concession on ' || rt.head_title || ' ' || v_no, p_user_id);
        END LOOP;

        v_wallet_applied := v_wallet_applied + public.fn_fee_apply_wallet(p_school_id, v_account, p_user_id);
        v_generated := v_generated + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'generated_count', v_generated,
        'already_exists_count', v_existing, 'skipped_no_applicable_rates', v_no_rates,
        'wallet_applied', v_wallet_applied,
        'message', 'Generated ' || v_generated || ' challan(s); ' || v_existing || ' already existed; '
                   || v_no_rates || ' had no applicable fee rates.');
END $$;

-- Sibling/family convenience: generate for every active student with the same students.family_id.
CREATE OR REPLACE FUNCTION public.fn_generate_family_demands(
    p_school_id BIGINT, p_user_id INTEGER, p_family_id BIGINT, p_session_id INTEGER,
    p_month INTEGER, p_year INTEGER, p_issue_date DATE, p_due_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; v JSONB; v_gen INT := 0; v_ex INT := 0; v_n INT := 0;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-demands');
    FOR s IN SELECT id FROM public.students
             WHERE school_id = p_school_id AND family_id = p_family_id
               AND (status IS NULL OR status ILIKE 'active' OR status ILIKE 'enrolled' OR status = '1')
    LOOP
        v_n := v_n + 1;
        v := public.fn_generate_demands(p_school_id, p_user_id, p_session_id, p_month, p_year,
                                        p_issue_date, p_due_date, NULL, NULL, s.id);
        v_gen := v_gen + (v->>'generated_count')::INT;
        v_ex  := v_ex  + (v->>'already_exists_count')::INT;
    END LOOP;
    IF v_n = 0 THEN RAISE EXCEPTION 'No active students found for family %', p_family_id; END IF;
    RETURN jsonb_build_object('success', true, 'siblings', v_n, 'generated_count', v_gen, 'already_exists_count', v_ex,
        'message', 'Generated ' || v_gen || ' challan(s) for ' || v_n || ' sibling(s).');
END $$;

-- Cancel an UNPAID challan: reverses its ledger charges (never deletes anything).
CREATE OR REPLACE FUNCTION public.fn_cancel_demand(p_school_id BIGINT, p_user_id INTEGER, p_demand_id BIGINT, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d RECORD; l RECORD; v_paid NUMERIC;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-demands');
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'A cancellation reason is required.'; END IF;

    SELECT * INTO d FROM public.fee_demands WHERE id = p_demand_id AND school_id = p_school_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Challan not found.'; END IF;
    IF d.status = 'cancelled' THEN RAISE EXCEPTION 'Challan % is already cancelled.', d.challan_no; END IF;
    PERFORM 1 FROM public.fee_accounts WHERE id = d.account_id FOR UPDATE;

    SELECT COALESCE(SUM(paid_amount), 0) INTO v_paid FROM public.v_fee_line_balances WHERE demand_id = p_demand_id;
    IF v_paid > 0 THEN
        RAISE EXCEPTION 'Challan % has payments of Rs. %. Void those receipts first.', d.challan_no, v_paid;
    END IF;

    FOR l IN SELECT * FROM public.fee_demand_lines WHERE demand_id = p_demand_id LOOP
        -- Undo what the ledger recorded for this line: gross charge (+fine), less concession/waiver credits.
        PERFORM public.fn_fee_post(p_school_id, d.account_id, 'CHARGE_CANCEL', 0, l.gross_amount, p_demand_id, l.id, NULL, NULL,
                                   'Cancelled ' || l.title || ' ' || d.challan_no, p_user_id);
        PERFORM public.fn_fee_post(p_school_id, d.account_id, 'CHARGE_CANCEL', l.concession_amount + l.waived_amount, 0,
                                   p_demand_id, l.id, NULL, NULL,
                                   'Reverse concession/waiver ' || d.challan_no, p_user_id);
    END LOOP;

    UPDATE public.fee_demands SET status = 'cancelled', cancelled_reason = p_reason WHERE id = p_demand_id;
    RETURN jsonb_build_object('success', true, 'challan_no', d.challan_no, 'message', 'Challan ' || d.challan_no || ' cancelled.');
END $$;

-- ------------------------------------------------------------------------------
-- 4. SHIFTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_open_shift(p_school_id BIGINT, p_user_id INTEGER, p_opening_float NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id BIGINT;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-counter-pos');
    IF COALESCE(p_opening_float, 0) < 0 THEN RAISE EXCEPTION 'Opening float cannot be negative.'; END IF;
    BEGIN
        INSERT INTO public.cashier_shifts (school_id, cashier_user_id, opening_float)
        VALUES (p_school_id, p_user_id, COALESCE(p_opening_float, 0)) RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'You already have an open shift. Close it first.';
    END;
    RETURN jsonb_build_object('success', true, 'shift_id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.fn_shift_summary(p_school_id BIGINT, p_shift_id BIGINT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT jsonb_build_object(
        'shift_id', s.id, 'status', s.status, 'opening_float', s.opening_float,
        'cash',   COALESCE(SUM(r.amount) FILTER (WHERE r.payment_method = 'cash'), 0),
        'bank',   COALESCE(SUM(r.amount) FILTER (WHERE r.payment_method IN ('bank_transfer','cheque')), 0),
        'online', COALESCE(SUM(r.amount) FILTER (WHERE r.payment_method IN ('easypaisa','jazzcash','pos_card')), 0),
        'receipt_count', COUNT(r.id),
        'expected_cash', s.opening_float + COALESCE(SUM(r.amount) FILTER (WHERE r.payment_method = 'cash'), 0))
    FROM public.cashier_shifts s
    LEFT JOIN public.fee_receipts r ON r.shift_id = s.id AND r.status = 'posted'
    WHERE s.id = p_shift_id AND s.school_id = p_school_id
    GROUP BY s.id
$$;

CREATE OR REPLACE FUNCTION public.fn_close_shift(p_school_id BIGINT, p_user_id INTEGER, p_shift_id BIGINT, p_counted_cash NUMERIC, p_notes TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; v JSONB; v_expected NUMERIC(12,2);
BEGIN
    SELECT * INTO s FROM public.cashier_shifts WHERE id = p_shift_id AND school_id = p_school_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Shift not found.'; END IF;
    IF s.cashier_user_id <> p_user_id THEN
        PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-shifts');
    END IF;
    IF s.status <> 'open' THEN RAISE EXCEPTION 'Shift is already %.', s.status; END IF;
    IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN RAISE EXCEPTION 'Counted cash is required.'; END IF;

    v := public.fn_shift_summary(p_school_id, p_shift_id);
    v_expected := (v->>'expected_cash')::NUMERIC;

    UPDATE public.cashier_shifts
    SET status = 'closed', closed_at = now(), counted_cash = p_counted_cash,
        expected_cash = v_expected, variance = p_counted_cash - v_expected, notes = p_notes
    WHERE id = p_shift_id;

    RETURN v || jsonb_build_object('counted_cash', p_counted_cash, 'variance', p_counted_cash - v_expected, 'success', true);
END $$;

CREATE OR REPLACE FUNCTION public.fn_reconcile_shift(p_school_id BIGINT, p_user_id INTEGER, p_shift_id BIGINT, p_notes TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-shifts');
    SELECT * INTO s FROM public.cashier_shifts WHERE id = p_shift_id AND school_id = p_school_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Shift not found.'; END IF;
    IF s.status <> 'closed' THEN RAISE EXCEPTION 'Only closed shifts can be reconciled.'; END IF;
    IF s.cashier_user_id = p_user_id THEN RAISE EXCEPTION 'A cashier cannot reconcile their own shift.'; END IF;
    UPDATE public.cashier_shifts SET status = 'reconciled', reconciled_by = p_user_id,
           notes = COALESCE(notes || E'\n', '') || COALESCE(p_notes, '') WHERE id = p_shift_id;
    RETURN jsonb_build_object('success', true);
END $$;

-- ------------------------------------------------------------------------------
-- 5. PAYMENT COLLECTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_collect_payment(
    p_school_id BIGINT, p_user_id INTEGER, p_student_id INTEGER, p_amount NUMERIC,
    p_method TEXT, p_idempotency_key UUID, p_shift_id BIGINT DEFAULT NULL,
    p_demand_ids BIGINT[] DEFAULT NULL, p_reference_no TEXT DEFAULT NULL, p_bank_name TEXT DEFAULT NULL,
    p_payer_name TEXT DEFAULT NULL, p_instrument_date DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_exist RECORD; v_account BIGINT; v_shift RECORD; v_due NUMERIC(12,2);
    v_alloc_amt NUMERIC(12,2); v_wallet_amt NUMERIC(12,2); v_receipt_id BIGINT; v_no TEXT;
    v_res JSONB; v_student RECORD; v_snapshot JSONB; v_balance_after NUMERIC;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-counter-pos');
    IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'An idempotency key is required.'; END IF;
    IF p_method = 'wallet' THEN RAISE EXCEPTION 'Wallet is applied automatically; it cannot be collected at the counter.'; END IF;

    -- Idempotent replay
    SELECT id, receipt_no, status, snapshot INTO v_exist FROM public.fee_receipts
    WHERE school_id = p_school_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'is_duplicate', true, 'receipt_id', v_exist.id,
                                  'receipt_no', v_exist.receipt_no, 'snapshot', v_exist.snapshot);
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be greater than zero.'; END IF;
    IF p_amount <> ROUND(p_amount, 2) THEN RAISE EXCEPTION 'Payment amount has too many decimals.'; END IF;

    SELECT id, name, father_name, roll_number INTO v_student FROM public.students
    WHERE id = p_student_id AND school_id = p_school_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student % not found.', p_student_id; END IF;

    v_account := public.fn_fee_account_for_student(p_school_id, p_student_id);
    PERFORM 1 FROM public.fee_accounts WHERE id = v_account FOR UPDATE;

    -- Shift validation (cash requires an open shift owned by the collector)
    IF p_shift_id IS NOT NULL THEN
        SELECT * INTO v_shift FROM public.cashier_shifts WHERE id = p_shift_id AND school_id = p_school_id;
        IF NOT FOUND OR v_shift.status <> 'open' THEN RAISE EXCEPTION 'The cashier shift is not open.'; END IF;
        IF v_shift.cashier_user_id <> p_user_id THEN RAISE EXCEPTION 'This shift belongs to another cashier.'; END IF;
    ELSIF p_method = 'cash' THEN
        RAISE EXCEPTION 'Open a cashier shift before accepting cash.';
    END IF;

    SELECT COALESCE(SUM(b.balance_amount), 0) INTO v_due
    FROM public.v_fee_line_balances b JOIN public.fee_demands d ON d.id = b.demand_id
    WHERE d.school_id = p_school_id AND d.account_id = v_account AND d.status = 'issued' AND b.balance_amount > 0
      AND (p_demand_ids IS NULL OR d.id = ANY(p_demand_ids));

    v_alloc_amt  := LEAST(p_amount, v_due);
    v_wallet_amt := p_amount - v_alloc_amt;     -- overpayment / advance -> wallet

    v_no := 'REC-' || TO_CHAR(now(), 'YYYY') || '-' ||
            LPAD(public.fn_fee_next_seq(p_school_id, 'receipt:' || TO_CHAR(now(), 'YYYY'))::TEXT, 6, '0');

    INSERT INTO public.fee_receipts (school_id, receipt_no, account_id, shift_id, payment_method, amount,
        allocated_amount, wallet_amount, reference_no, bank_name, instrument_date, payer_name,
        collector_user_id, idempotency_key)
    VALUES (p_school_id, v_no, v_account, p_shift_id, p_method, p_amount, v_alloc_amt, v_wallet_amt,
        p_reference_no, p_bank_name, p_instrument_date, COALESCE(p_payer_name, v_student.name),
        p_user_id, p_idempotency_key)
    RETURNING id INTO v_receipt_id;

    v_res := jsonb_build_object('allocated', 0, 'lines', '[]'::JSONB);
    IF v_alloc_amt > 0 THEN
        v_res := public.fn_fee_allocate(p_school_id, v_receipt_id, v_account, v_alloc_amt, p_demand_ids);
        IF (v_res->>'allocated')::NUMERIC <> v_alloc_amt THEN
            RAISE EXCEPTION 'Allocation mismatch (expected %, got %). Aborting.', v_alloc_amt, v_res->>'allocated';
        END IF;
        PERFORM public.fn_fee_post(p_school_id, v_account, 'PAYMENT', 0, v_alloc_amt, NULL, NULL, v_receipt_id, NULL,
                                   'Payment ' || v_no || ' via ' || UPPER(p_method), p_user_id);
    END IF;
    IF v_wallet_amt > 0 THEN
        PERFORM public.fn_fee_post(p_school_id, v_account, 'WALLET_CREDIT', 0, v_wallet_amt, NULL, NULL, v_receipt_id, NULL,
                                   'Advance/overpayment credited to wallet (' || v_no || ')', p_user_id);
    END IF;

    SELECT COALESCE(balance, 0) INTO v_balance_after FROM public.v_fee_account_balances
    WHERE school_id = p_school_id AND account_id = v_account;

    v_snapshot := jsonb_build_object(
        'receipt_no', v_no, 'paid_at', now(), 'student_id', p_student_id,
        'student_name', v_student.name, 'father_name', v_student.father_name, 'roll_number', v_student.roll_number,
        'payment_method', p_method, 'reference_no', p_reference_no, 'amount', p_amount,
        'allocated_amount', v_alloc_amt, 'wallet_amount', v_wallet_amt,
        'allocations', v_res->'lines', 'balance_after', v_balance_after, 'collector_id', p_user_id);
    UPDATE public.fee_receipts SET snapshot = v_snapshot WHERE id = v_receipt_id;

    RETURN jsonb_build_object('success', true, 'receipt_id', v_receipt_id, 'receipt_no', v_no,
        'amount', p_amount, 'allocated_amount', v_alloc_amt, 'wallet_amount', v_wallet_amt,
        'balance_after', v_balance_after, 'snapshot', v_snapshot);
END $$;

-- ------------------------------------------------------------------------------
-- 6. MAKER-CHECKER: ADJUSTMENTS (waiver / refund / void)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_request_adjustment(
    p_school_id BIGINT, p_user_id INTEGER, p_kind TEXT, p_reason TEXT,
    p_demand_line_id BIGINT DEFAULT NULL, p_receipt_id BIGINT DEFAULT NULL, p_amount NUMERIC DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id BIGINT; v_amt NUMERIC(12,2); r RECORD;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-counter-pos', 'fee-approvals');
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'A reason of at least 5 characters is required.'; END IF;

    IF p_kind = 'waiver' THEN
        IF p_demand_line_id IS NULL THEN RAISE EXCEPTION 'Select a challan line to waive.'; END IF;
        PERFORM 1 FROM public.fee_demand_lines WHERE id = p_demand_line_id AND school_id = p_school_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Line not found.'; END IF;
        v_amt := p_amount;
    ELSIF p_kind IN ('void','refund') THEN
        SELECT * INTO r FROM public.fee_receipts WHERE id = p_receipt_id AND school_id = p_school_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Receipt not found.'; END IF;
        IF r.status <> 'posted' THEN RAISE EXCEPTION 'Receipt % is %.', r.receipt_no, r.status; END IF;
        v_amt := CASE WHEN p_kind = 'void' THEN r.amount ELSE p_amount END;
    ELSE
        RAISE EXCEPTION 'Unknown adjustment kind %', p_kind;
    END IF;
    IF v_amt IS NULL OR v_amt <= 0 THEN RAISE EXCEPTION 'A positive amount is required.'; END IF;

    INSERT INTO public.fee_adjustments (school_id, kind, demand_line_id, receipt_id, amount, reason, requested_by)
    VALUES (p_school_id, p_kind, CASE WHEN p_kind = 'waiver' THEN p_demand_line_id END,
            CASE WHEN p_kind <> 'waiver' THEN p_receipt_id END, v_amt, p_reason, p_user_id)
    RETURNING id INTO v_id;
    RETURN jsonb_build_object('success', true, 'adjustment_id', v_id, 'status', 'pending');
END $$;

CREATE OR REPLACE FUNCTION public.fn_decide_adjustment(
    p_school_id BIGINT, p_user_id INTEGER, p_adjustment_id BIGINT, p_approve BOOLEAN, p_remarks TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    a RECORD; rc RECORD; ln RECORD; v_account BIGINT; v_wallet NUMERIC(12,2);
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-approvals');
    SELECT * INTO a FROM public.fee_adjustments WHERE id = p_adjustment_id AND school_id = p_school_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Adjustment not found.'; END IF;
    IF a.status <> 'pending' THEN RAISE EXCEPTION 'Adjustment already %.', a.status; END IF;
    IF a.requested_by = p_user_id THEN RAISE EXCEPTION 'You cannot approve your own request (maker-checker).'; END IF;

    IF NOT p_approve THEN
        UPDATE public.fee_adjustments SET status = 'rejected', approved_by = p_user_id, decided_at = now() WHERE id = a.id;
        RETURN jsonb_build_object('success', true, 'status', 'rejected');
    END IF;

    IF a.kind = 'waiver' THEN
        SELECT l.*, d.account_id, d.status AS demand_status INTO ln
        FROM public.fee_demand_lines l JOIN public.fee_demands d ON d.id = l.demand_id WHERE l.id = a.demand_line_id;
        PERFORM 1 FROM public.fee_accounts WHERE id = ln.account_id FOR UPDATE;
        IF ln.demand_status <> 'issued' THEN RAISE EXCEPTION 'Challan is not active.'; END IF;
        PERFORM 1 FROM public.v_fee_line_balances WHERE line_id = ln.id AND balance_amount >= a.amount;
        IF NOT FOUND THEN RAISE EXCEPTION 'Waiver exceeds the outstanding balance of the line.'; END IF;
        UPDATE public.fee_demand_lines SET waived_amount = waived_amount + a.amount WHERE id = ln.id;
        PERFORM public.fn_fee_post(p_school_id, ln.account_id, 'WAIVER', 0, a.amount, ln.demand_id, ln.id, NULL, a.id,
                                   'Waiver: ' || a.reason, p_user_id);

    ELSIF a.kind = 'void' THEN
        SELECT * INTO rc FROM public.fee_receipts WHERE id = a.receipt_id FOR UPDATE;
        IF rc.status <> 'posted' THEN RAISE EXCEPTION 'Receipt % is already %.', rc.receipt_no, rc.status; END IF;
        PERFORM 1 FROM public.fee_accounts WHERE id = rc.account_id FOR UPDATE;

        -- Reverse EXACTLY the allocations this receipt made (works for multi-challan receipts)
        UPDATE public.fee_allocations SET reversed = TRUE WHERE receipt_id = rc.id AND reversed = FALSE;

        IF rc.allocated_amount > 0 THEN
            PERFORM public.fn_fee_post(p_school_id, rc.account_id, 'PAYMENT_REVERSAL', rc.allocated_amount, 0, NULL, NULL, rc.id, a.id,
                                       'Void of ' || rc.receipt_no || ': ' || a.reason, p_user_id);
        END IF;
        IF rc.payment_method = 'wallet' THEN
            -- restoring a wallet application gives the credit back
            PERFORM public.fn_fee_post(p_school_id, rc.account_id, 'WALLET_CREDIT', 0, rc.allocated_amount, NULL, NULL, rc.id, a.id,
                                       'Wallet restored (void ' || rc.receipt_no || ')', p_user_id);
        END IF;
        IF rc.wallet_amount > 0 THEN
            SELECT COALESCE(wallet_balance, 0) INTO v_wallet FROM public.v_fee_account_balances
            WHERE school_id = p_school_id AND account_id = rc.account_id;
            IF v_wallet < rc.wallet_amount THEN
                RAISE EXCEPTION 'Cannot void: the advance (Rs. %) from this receipt was already spent or refunded.', rc.wallet_amount;
            END IF;
            PERFORM public.fn_fee_post(p_school_id, rc.account_id, 'WALLET_DEBIT', rc.wallet_amount, 0, NULL, NULL, rc.id, a.id,
                                       'Advance reversed (void ' || rc.receipt_no || ')', p_user_id);
        END IF;
        UPDATE public.fee_receipts SET status = 'voided', voided_at = now(), void_reason = a.reason WHERE id = rc.id;

    ELSIF a.kind = 'refund' THEN
        SELECT * INTO rc FROM public.fee_receipts WHERE id = a.receipt_id FOR UPDATE;
        PERFORM 1 FROM public.fee_accounts WHERE id = rc.account_id FOR UPDATE;
        SELECT COALESCE(wallet_balance, 0) INTO v_wallet FROM public.v_fee_account_balances
        WHERE school_id = p_school_id AND account_id = rc.account_id;
        IF a.amount > v_wallet THEN RAISE EXCEPTION 'Refund (Rs. %) exceeds refundable wallet balance (Rs. %).', a.amount, v_wallet; END IF;
        PERFORM public.fn_fee_post(p_school_id, rc.account_id, 'REFUND', a.amount, 0, NULL, NULL, rc.id, a.id,
                                   'Cash refund: ' || a.reason, p_user_id);
    END IF;

    UPDATE public.fee_adjustments SET status = 'approved', approved_by = p_user_id, decided_at = now() WHERE id = a.id;
    RETURN jsonb_build_object('success', true, 'status', 'approved', 'kind', a.kind);
END $$;

-- ------------------------------------------------------------------------------
-- 7. CONCESSION / OVERRIDE APPROVAL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_decide_concession(
    p_school_id BIGINT, p_user_id INTEGER, p_concession_id BIGINT, p_action TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; v_new TEXT;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-approvals');
    PERFORM public.fn_fee_rpc_on();
    SELECT * INTO c FROM public.fee_concessions WHERE id = p_concession_id AND school_id = p_school_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Concession not found.'; END IF;

    IF p_action IN ('approve','reject') THEN
        IF c.status <> 'pending' THEN RAISE EXCEPTION 'Concession is already %.', c.status; END IF;
        IF c.requested_by = p_user_id THEN RAISE EXCEPTION 'You cannot approve your own request (maker-checker).'; END IF;
        v_new := CASE p_action WHEN 'approve' THEN 'approved' ELSE 'rejected' END;
    ELSIF p_action = 'revoke' THEN
        IF c.status <> 'approved' THEN RAISE EXCEPTION 'Only approved concessions can be revoked.'; END IF;
        v_new := 'revoked';
    ELSE
        RAISE EXCEPTION 'Unknown action %', p_action;
    END IF;

    UPDATE public.fee_concessions
    SET status = v_new, approved_by = CASE WHEN p_action = 'revoke' THEN approved_by ELSE p_user_id END, decided_at = now()
    WHERE id = c.id;
    RETURN jsonb_build_object('success', true, 'status', v_new);
END $$;

CREATE OR REPLACE FUNCTION public.fn_decide_override(
    p_school_id BIGINT, p_user_id INTEGER, p_override_id BIGINT, p_approve BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-approvals');
    PERFORM public.fn_fee_rpc_on();
    SELECT * INTO o FROM public.student_fee_overrides WHERE id = p_override_id AND school_id = p_school_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Override not found.'; END IF;
    IF o.status <> 'pending' THEN RAISE EXCEPTION 'Override is already %.', o.status; END IF;
    IF o.requested_by = p_user_id THEN RAISE EXCEPTION 'You cannot approve your own request (maker-checker).'; END IF;
    UPDATE public.student_fee_overrides
    SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, approved_by = p_user_id WHERE id = o.id;
    RETURN jsonb_build_object('success', true);
END $$;

-- ------------------------------------------------------------------------------
-- 8. LATE FINE ENGINE (idempotent; safe to run daily via pg_cron or manually)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_assess_late_fines(
    p_school_id BIGINT, p_user_id INTEGER, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r RECORD; rule RECORD; v_days INT; v_fine NUMERIC(12,2); v_existing RECORD; v_line BIGINT;
    v_created INT := 0; v_increased INT := 0; v_total NUMERIC(12,2) := 0;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-demands');

    FOR r IN
        SELECT b.line_id, b.demand_id, b.fee_head_id, b.title, b.net_amount, b.balance_amount,
               d.due_date, d.account_id, d.challan_no
        FROM public.v_fee_line_balances b JOIN public.fee_demands d ON d.id = b.demand_id
        WHERE d.school_id = p_school_id AND d.status = 'issued' AND b.line_type = 'charge'
          AND b.balance_amount > 0 AND d.due_date < p_as_of
        ORDER BY d.account_id
    LOOP
        -- head-specific rule beats the school-wide rule
        SELECT * INTO rule FROM public.fee_late_rules
        WHERE school_id = p_school_id AND is_active AND (fee_head_id = r.fee_head_id OR fee_head_id IS NULL)
        ORDER BY (fee_head_id IS NOT NULL) DESC, id DESC LIMIT 1;
        CONTINUE WHEN NOT FOUND;

        v_days := (p_as_of - (r.due_date + rule.grace_days));
        CONTINUE WHEN v_days <= 0;

        v_fine := CASE rule.fine_type
                    WHEN 'fixed'      THEN rule.fine_value
                    WHEN 'per_day'    THEN rule.fine_value * v_days
                    WHEN 'percentage' THEN ROUND(r.net_amount * rule.fine_value / 100.0, 2) END;
        IF rule.max_fine IS NOT NULL THEN v_fine := LEAST(v_fine, rule.max_fine); END IF;
        CONTINUE WHEN v_fine <= 0;

        PERFORM 1 FROM public.fee_accounts WHERE id = r.account_id FOR UPDATE;

        SELECT id, gross_amount, waived_amount INTO v_existing FROM public.fee_demand_lines
        WHERE demand_id = r.demand_id AND fee_head_id = r.fee_head_id AND line_type = 'late_fine';

        IF NOT FOUND THEN
            INSERT INTO public.fee_demand_lines (school_id, demand_id, fee_head_id, line_type, title, priority_order, gross_amount)
            VALUES (p_school_id, r.demand_id, r.fee_head_id, 'late_fine', 'Late fine - ' || r.title, 90, v_fine)
            RETURNING id INTO v_line;
            PERFORM public.fn_fee_post(p_school_id, r.account_id, 'LATE_FINE', v_fine, 0, r.demand_id, v_line, NULL, NULL,
                                       'Late fine (' || v_days || ' days) on ' || r.challan_no, p_user_id);
            v_created := v_created + 1; v_total := v_total + v_fine;
        ELSIF v_fine > v_existing.gross_amount AND v_existing.waived_amount = 0 THEN
            UPDATE public.fee_demand_lines SET gross_amount = v_fine WHERE id = v_existing.id;
            PERFORM public.fn_fee_post(p_school_id, r.account_id, 'LATE_FINE', v_fine - v_existing.gross_amount, 0,
                                       r.demand_id, v_existing.id, NULL, NULL,
                                       'Late fine increased (' || v_days || ' days) on ' || r.challan_no, p_user_id);
            v_increased := v_increased + 1; v_total := v_total + (v_fine - v_existing.gross_amount);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'fines_created', v_created, 'fines_increased', v_increased,
                              'total_fine_added', v_total, 'as_of', p_as_of);
END $$;

-- ------------------------------------------------------------------------------
-- 9. READ MODELS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_statement(p_school_id BIGINT, p_student_id INTEGER)
RETURNS TABLE (entry_id BIGINT, entry_date TIMESTAMPTZ, entry_type VARCHAR, description TEXT,
               debit NUMERIC, credit NUMERIC, running_balance NUMERIC,
               challan_no VARCHAR, receipt_no VARCHAR, performed_by_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT l.id, l.created_at, l.entry_type, l.description, l.debit, l.credit,
           SUM(l.debit - l.credit) OVER (ORDER BY l.id)::NUMERIC(12,2),
           d.challan_no, r.receipt_no, u.name::TEXT
    FROM public.fee_ledger l
    JOIN public.fee_accounts a ON a.id = l.account_id
    LEFT JOIN public.fee_demands d ON d.id = l.demand_id
    LEFT JOIN public.fee_receipts r ON r.id = l.receipt_id
    LEFT JOIN public.users u ON u.id = l.performed_by
    WHERE l.school_id = p_school_id AND a.account_type = 'student' AND a.student_id = p_student_id
    ORDER BY l.id
$$;

CREATE OR REPLACE FUNCTION public.fn_aging_report(p_school_id BIGINT, p_session_id INTEGER DEFAULT NULL, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (student_id INTEGER, student_name TEXT, father_name TEXT, class_name TEXT,
               not_due NUMERIC, d1_30 NUMERIC, d31_60 NUMERIC, d61_90 NUMERIC, d90_plus NUMERIC, total_due NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT v.student_id, s.name::TEXT, s.father_name::TEXT, c.name::TEXT,
           COALESCE(SUM(v.balance_amount) FILTER (WHERE v.due_date >= p_as_of), 0),
           COALESCE(SUM(v.balance_amount) FILTER (WHERE p_as_of - v.due_date BETWEEN 1 AND 30), 0),
           COALESCE(SUM(v.balance_amount) FILTER (WHERE p_as_of - v.due_date BETWEEN 31 AND 60), 0),
           COALESCE(SUM(v.balance_amount) FILTER (WHERE p_as_of - v.due_date BETWEEN 61 AND 90), 0),
           COALESCE(SUM(v.balance_amount) FILTER (WHERE p_as_of - v.due_date > 90), 0),
           SUM(v.balance_amount)
    FROM public.v_fee_demand_balances v
    JOIN public.students s ON s.id = v.student_id AND s.school_id = v.school_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE v.school_id = p_school_id AND v.doc_status = 'issued' AND v.balance_amount > 0
      AND (p_session_id IS NULL OR v.session_id = p_session_id)
    GROUP BY v.student_id, s.name, s.father_name, c.name
    ORDER BY SUM(v.balance_amount) DESC
$$;

-- ------------------------------------------------------------------------------
-- 10. EXECUTE GRANTS (internal helpers stay private)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.fn_fee_post(BIGINT, BIGINT, TEXT, NUMERIC, NUMERIC, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fee_allocate(BIGINT, BIGINT, BIGINT, NUMERIC, BIGINT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fee_apply_wallet(BIGINT, BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fee_account_for_student(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fee_next_seq(BIGINT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fee_rpc_on() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.fn_generate_demands(BIGINT, INTEGER, INTEGER, INTEGER, INTEGER, DATE, DATE, INTEGER, INTEGER, INTEGER),
    public.fn_generate_family_demands(BIGINT, INTEGER, BIGINT, INTEGER, INTEGER, INTEGER, DATE, DATE),
    public.fn_cancel_demand(BIGINT, INTEGER, BIGINT, TEXT),
    public.fn_open_shift(BIGINT, INTEGER, NUMERIC),
    public.fn_shift_summary(BIGINT, BIGINT),
    public.fn_close_shift(BIGINT, INTEGER, BIGINT, NUMERIC, TEXT),
    public.fn_reconcile_shift(BIGINT, INTEGER, BIGINT, TEXT),
    public.fn_collect_payment(BIGINT, INTEGER, INTEGER, NUMERIC, TEXT, UUID, BIGINT, BIGINT[], TEXT, TEXT, TEXT, DATE),
    public.fn_request_adjustment(BIGINT, INTEGER, TEXT, TEXT, BIGINT, BIGINT, NUMERIC),
    public.fn_decide_adjustment(BIGINT, INTEGER, BIGINT, BOOLEAN, TEXT),
    public.fn_decide_concession(BIGINT, INTEGER, BIGINT, TEXT),
    public.fn_decide_override(BIGINT, INTEGER, BIGINT, BOOLEAN),
    public.fn_assess_late_fines(BIGINT, INTEGER, DATE),
    public.fn_get_statement(BIGINT, INTEGER),
    public.fn_aging_report(BIGINT, INTEGER, DATE)
TO anon, authenticated;
