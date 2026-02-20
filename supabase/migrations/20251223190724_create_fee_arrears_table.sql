-- Migration: Create fee_arrears table
-- This table allows adding other payments/arrears to students without generating challans
-- These arrears work similar to challans so they integrate properly with payments and history

-- ==========================================
-- FEE_ARREARS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.fee_arrears (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    fee_head_id INTEGER NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

-- ==========================================
-- CREATE INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_fee_arrears_school_id ON public.fee_arrears(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_arrears_student_id ON public.fee_arrears(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_arrears_session_id ON public.fee_arrears(session_id);
CREATE INDEX IF NOT EXISTS idx_fee_arrears_student_session ON public.fee_arrears(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_fee_arrears_status ON public.fee_arrears(status);
CREATE INDEX IF NOT EXISTS idx_fee_arrears_due_date ON public.fee_arrears(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_arrears_created_at ON public.fee_arrears(created_at DESC);

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE public.fee_arrears IS 'Other payments/arrears added to students without generating challans. These work similar to challans for payment integration.';
COMMENT ON COLUMN public.fee_arrears.status IS 'Payment status: unpaid, partial, paid, or cancelled';
COMMENT ON COLUMN public.fee_arrears.amount IS 'Total amount for this arrear item';

