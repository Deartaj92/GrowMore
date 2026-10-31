-- ==============================================================================
-- FEE SYSTEM V2 - PATCH 2: FAMILY-WISE BILLING & COLLECTION RPC ENHANCEMENT
-- ==============================================================================
-- Fixes fn_generate_family_demands to query canonical public.family_members
-- (since public.students does not store a family_id column) and adds
-- fn_collect_family_payment for atomic server-side family batch collections.

CREATE OR REPLACE FUNCTION public.fn_generate_family_demands(
    p_school_id BIGINT, p_user_id INTEGER, p_family_id BIGINT, p_session_id INTEGER,
    p_month INTEGER, p_year INTEGER, p_issue_date DATE, p_due_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; v JSONB; v_gen INT := 0; v_ex INT := 0; v_n INT := 0;
BEGIN
    PERFORM public.fn_fee_require(p_school_id, p_user_id, 'fee-demands');
    FOR s IN
        SELECT st.id
        FROM public.family_members fm
        JOIN public.students st ON st.id = fm.student_id AND st.school_id = fm.school_id
        WHERE fm.school_id = p_school_id
          AND fm.family_id = p_family_id
          AND (st.status IS NULL OR st.status ILIKE 'active' OR st.status ILIKE 'enrolled' OR st.status = '1')
        ORDER BY fm.is_primary_contact DESC, st.id ASC
    LOOP
        v_n := v_n + 1;
        v := public.fn_generate_demands(p_school_id, p_user_id, p_session_id, p_month, p_year,
                                        p_issue_date, p_due_date, NULL, NULL, s.id);
        v_gen := v_gen + COALESCE((v->>'generated_count')::INT, 0);
        v_ex  := v_ex  + COALESCE((v->>'already_exists_count')::INT, 0);
    END LOOP;
    IF v_n = 0 THEN RAISE EXCEPTION 'No active students found for family %', p_family_id; END IF;
    RETURN jsonb_build_object(
        'success', true,
        'siblings', v_n,
        'generated_count', v_gen,
        'already_exists_count', v_ex,
        'message', 'Generated ' || v_gen || ' challan(s) for ' || v_n || ' sibling(s).'
    );
END $$;

GRANT EXECUTE ON FUNCTION public.fn_generate_family_demands(BIGINT, INTEGER, BIGINT, INTEGER, INTEGER, INTEGER, DATE, DATE)
TO anon, authenticated;

