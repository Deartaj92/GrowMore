-- ==========================================
-- OPTIMIZED RPC FUNCTION FOR FEE SUMMARY
-- This replaces fetching all invoices/payments for sum calculation
-- ==========================================

CREATE OR REPLACE FUNCTION get_fee_invoices_sum(
  p_school_id BIGINT,
  p_session_id INTEGER DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sum NUMERIC;
BEGIN
  IF p_session_id IS NOT NULL THEN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_sum
    FROM fee_invoices
    WHERE school_id = p_school_id
      AND session_id = p_session_id;
  ELSE
    SELECT COALESCE(SUM(total_amount), 0) INTO v_sum
    FROM fee_invoices
    WHERE school_id = p_school_id;
  END IF;
  
  RETURN v_sum;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_fee_invoices_sum(BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fee_invoices_sum(BIGINT, INTEGER) TO anon;






































































