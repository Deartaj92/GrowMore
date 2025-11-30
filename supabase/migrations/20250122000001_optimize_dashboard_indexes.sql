-- ==========================================
-- CRITICAL PERFORMANCE INDEXES FOR DASHBOARD
-- These indexes optimize the most common query patterns in Dashboard.tsx
-- ==========================================

-- ATTENDANCE RECORDS - Most queried table in Dashboard
-- Index for date + session + school queries (used in fetchAttendanceForDate, fetchAttendanceTrend)
CREATE INDEX IF NOT EXISTS idx_attendance_records_date_session_school 
  ON attendance_records(date, session_id, school_id);

-- Index for student attendance queries with status filter
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date_status 
  ON attendance_records(student_id, date, status, school_id);

-- Index for class-based attendance queries (used in fetchClassAttendance)
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_date_session 
  ON attendance_records(class_id, date, session_id, school_id) 
  WHERE class_id IS NOT NULL;

-- Index for absent/leave status queries (used in fetchAbsentees)
CREATE INDEX IF NOT EXISTS idx_attendance_records_status_date_session 
  ON attendance_records(status, date, session_id, school_id) 
  WHERE status IN ('absent', 'leave');

-- Index for date range queries with session filter
-- Note: Partial index with date filter removed (CURRENT_DATE not IMMUTABLE)
-- This index will still be used efficiently for date range queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_date_range_session 
  ON attendance_records(school_id, session_id, date DESC);

-- STUDENTS - Frequently queried for lookups
-- Index for active students by school (most common filter)
CREATE INDEX IF NOT EXISTS idx_students_school_status_active 
  ON students(school_id, status) 
  WHERE status = 'active';

-- Index for student lookups with class and section
CREATE INDEX IF NOT EXISTS idx_students_school_class_section 
  ON students(school_id, class_id, section_id, status);

-- Index for students by session (used in fetchAll)
CREATE INDEX IF NOT EXISTS idx_students_school_session 
  ON students(school_id, session_id, status);

-- STUDENT_CLASS_HISTORY - Used to get current class assignments
-- Composite index for session-based lookups (used heavily in fetchAll)
CREATE INDEX IF NOT EXISTS idx_student_class_history_session_school_status 
  ON student_class_history(session_id, school_id, status, new_class_id)
  WHERE status = 'active';

-- Index for student lookup in history
CREATE INDEX IF NOT EXISTS idx_student_class_history_student_session 
  ON student_class_history(student_id, session_id, school_id);

-- FEE INVOICES - Used in fee collection queries
-- Index for session-based invoice queries
CREATE INDEX IF NOT EXISTS idx_fee_invoices_session_school 
  ON fee_invoices(session_id, school_id, status)
  WHERE session_id IS NOT NULL;

-- Index for date range invoice queries
CREATE INDEX IF NOT EXISTS idx_fee_invoices_month_year_school 
  ON fee_invoices(school_id, year, month, status);

-- Index for invoice status filtering (unpaid, partial, overdue)
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status_school_date 
  ON fee_invoices(status, school_id, invoice_date DESC)
  WHERE status IN ('unpaid', 'partial', 'overdue');

-- FEE PAYMENTS - Used in collection queries
-- Index for date-based payment queries (used in fetchCollectionChartsData)
CREATE INDEX IF NOT EXISTS idx_fee_payments_date_school 
  ON fee_payments(payment_date, school_id);

-- Index for invoice-based payment lookups
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice_school 
  ON fee_payments(invoice_id, school_id, payment_date DESC);

-- FINE PAYMENTS - Used in fine collection
-- Index for date-based fine queries (used in fetchFineDetails)
CREATE INDEX IF NOT EXISTS idx_fine_payments_created_school 
  ON fine_payments(school_id, created_at DESC);

-- Index for date range fine queries
-- FIXED: Removed DATE() function (not IMMUTABLE) - use created_at directly
CREATE INDEX IF NOT EXISTS idx_fine_payments_date_range 
  ON fine_payments(school_id, created_at, student_id);

-- SESSIONS - Used in almost every query
-- Index already exists (is_active, school_id) but ensure it's optimal
CREATE INDEX IF NOT EXISTS idx_sessions_active_school 
  ON sessions(is_active, school_id)
  WHERE is_active = true;

-- STUDENT_STATUS_HISTORY - Used in admissions withdrawals
-- Index for withdrawal queries
CREATE INDEX IF NOT EXISTS idx_student_status_history_withdraw 
  ON student_status_history(school_id, action, created_at DESC)
  WHERE action = 'withdraw' OR new_status = 'withdrawn';

-- ENQUIRIES - Used in admissions tab
-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_enquiries_created_school 
  ON enquiries(school_id, created_at DESC);

-- FAMILIES - Used in admissions tab
-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_families_created_school 
  ON families(school_id, created_at DESC);

-- STUDENT_FEE_PLANS - Used in admissions tab
-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_student_fee_plans_session_school 
  ON student_fee_plans(session_id, school_id, created_at DESC);

-- FEE_INVOICE_ITEMS - Used in fee collection details
-- Index for invoice-based discount queries
CREATE INDEX IF NOT EXISTS idx_fee_invoice_items_invoice_school 
  ON fee_invoice_items(invoice_id, school_id, discount)
  WHERE discount > 0;

-- HALF_LEAVES - Used in attendance calculations
-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_half_leaves_date_session_school 
  ON half_leaves(date, session_id, school_id, person_type);

-- HOLIDAYS - Used in attendance trend calculations
-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_holidays_date_range_school 
  ON holidays(school_id, start_date, end_date);

-- ==========================================
-- ANALYZE TABLES after index creation for query planner optimization
-- ==========================================
ANALYZE attendance_records;
ANALYZE students;
ANALYZE student_class_history;
ANALYZE fee_invoices;
ANALYZE fee_payments;
ANALYZE fine_payments;
ANALYZE sessions;
ANALYZE student_status_history;
ANALYZE enquiries;
ANALYZE families;
ANALYZE student_fee_plans;
ANALYZE fee_invoice_items;
ANALYZE half_leaves;
ANALYZE holidays;

