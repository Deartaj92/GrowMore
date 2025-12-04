-- ==========================================
-- OPTIMIZED RPC FUNCTIONS FOR FEE COLLECTION
-- These replace fetching all rows for aggregation
-- ==========================================

-- Get fee payments sum by date range (for charts)
CREATE OR REPLACE FUNCTION get_fee_payments_sum_by_date(
  p_school_id BIGINT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sum NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_sum
  FROM fee_payments
  WHERE school_id = p_school_id
    AND payment_date >= p_start_date
    AND payment_date <= p_end_date;
  
  RETURN v_sum;
END;
$$;

-- Get fee payments grouped by day for current month
CREATE OR REPLACE FUNCTION get_fee_payments_by_day(
  p_school_id BIGINT,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(day INTEGER, amount NUMERIC)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DAY FROM payment_date)::INTEGER as day,
    COALESCE(SUM(amount), 0) as amount
  FROM fee_payments
  WHERE school_id = p_school_id
    AND EXTRACT(YEAR FROM payment_date) = p_year
    AND EXTRACT(MONTH FROM payment_date) = p_month
  GROUP BY EXTRACT(DAY FROM payment_date)
  ORDER BY day;
END;
$$;

-- Get fee payments grouped by month for last 12 months
CREATE OR REPLACE FUNCTION get_fee_payments_by_month(
  p_school_id BIGINT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(month_label TEXT, amount NUMERIC)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(payment_date, 'Mon YYYY') as month_label,
    COALESCE(SUM(amount), 0) as amount
  FROM fee_payments
  WHERE school_id = p_school_id
    AND payment_date >= p_start_date
    AND payment_date <= p_end_date
  GROUP BY TO_CHAR(payment_date, 'Mon YYYY')
  ORDER BY MIN(payment_date);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_fee_payments_sum_by_date(BIGINT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fee_payments_sum_by_date(BIGINT, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_fee_payments_by_day(BIGINT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fee_payments_by_day(BIGINT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_fee_payments_by_month(BIGINT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fee_payments_by_month(BIGINT, DATE, DATE) TO anon;


















