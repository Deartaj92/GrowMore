-- Migration: Create fee_challans and fee_challans_items tables
-- These tables are specifically for challans generated through the challan generation page

-- ==========================================
-- 1. FEE_CHALLANS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.fee_challans (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    month VARCHAR(20), -- Can be 'one-time' for one-time fees or month number (1-12)
    year INTEGER,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE (student_id, session_id, month, year, school_id),
    FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE
);

-- ==========================================
-- 2. FEE_CHALLANS_ITEMS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.fee_challans_items (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    challan_id INTEGER NOT NULL REFERENCES public.fee_challans(id) ON DELETE CASCADE,
    fee_head_id INTEGER NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    fine NUMERIC(10,2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 3. CREATE INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_fee_challans_school_id ON public.fee_challans(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_challans_student_id ON public.fee_challans(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_challans_session_id ON public.fee_challans(session_id);
CREATE INDEX IF NOT EXISTS idx_fee_challans_student_session ON public.fee_challans(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_fee_challans_month_year ON public.fee_challans(month, year);
CREATE INDEX IF NOT EXISTS idx_fee_challans_status ON public.fee_challans(status);
CREATE INDEX IF NOT EXISTS idx_fee_challans_created_at ON public.fee_challans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_challans_items_school_id ON public.fee_challans_items(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_challans_items_challan_id ON public.fee_challans_items(challan_id);
CREATE INDEX IF NOT EXISTS idx_fee_challans_items_fee_head_id ON public.fee_challans_items(fee_head_id);

-- ==========================================
-- 4. COMMENTS
-- ==========================================

COMMENT ON TABLE public.fee_challans IS 'Fee challans generated for students. Each challan represents a fee demand notice for a specific period.';
COMMENT ON TABLE public.fee_challans_items IS 'Line items for each challan, representing individual fee heads and their amounts.';

COMMENT ON COLUMN public.fee_challans.month IS 'Month number (1-12) for monthly fees, or "one-time" for one-time fees';
COMMENT ON COLUMN public.fee_challans.status IS 'Payment status: unpaid, partial, paid, or cancelled';

