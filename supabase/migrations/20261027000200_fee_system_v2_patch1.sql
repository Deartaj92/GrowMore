-- ==============================================================================
-- Migration: 20261027000200_fee_system_v2_patch1.sql
-- Patch 1 for Fee System v2 (found by the transactional smoke test + frontend needs)
--  1. v_fee_demand_balances exposes `snapshot` (student/class info for UI search & print)
--  2. fn_close_shift returns the post-close status ('closed') instead of the stale 'open'
-- Fee objects only.
-- ==============================================================================

-- 1. Append `snapshot` as the LAST column (CREATE OR REPLACE VIEW only allows appending).
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
       END AS pay_status,
       d.snapshot AS snapshot
FROM public.fee_demands d
LEFT JOIN public.v_fee_line_balances b ON b.demand_id = d.id
GROUP BY d.id;

-- 2. fn_close_shift: report the real post-close state.
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

    RETURN v || jsonb_build_object('status', 'closed', 'counted_cash', p_counted_cash,
                                   'variance', p_counted_cash - v_expected, 'success', true);
END $$;
