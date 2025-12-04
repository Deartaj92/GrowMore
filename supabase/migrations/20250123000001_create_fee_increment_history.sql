-- Migration: Create fee_increment_history table
-- This table tracks all fee increment operations for audit and reversal purposes

CREATE TABLE IF NOT EXISTS public.fee_increment_history (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    
    -- Increment details
    increment_type VARCHAR(20) NOT NULL CHECK (increment_type IN ('percentage', 'fixed')),
    increment_value NUMERIC(10,2) NOT NULL,
    
    -- Target type (what was incremented)
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('fee_plans', 'fee_structures', 'both')),
    
    -- Filter options (stored as JSONB for flexibility)
    filter_options JSONB DEFAULT '{}',
    -- Example: {"studentIds": [1,2,3], "classIds": [4,5], "feeHeadIds": [1,2], "preserveDiscountAmount": true}
    
    -- Results
    items_updated INTEGER NOT NULL DEFAULT 0,
    affected_students INTEGER DEFAULT 0, -- Only for fee_plans
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed', 'edited')),
    
    -- Original values snapshot (for reversal)
    -- Stores the state before increment was applied
    snapshot_before JSONB,
    -- Example for fee_plans: [{"fee_plan_item_id": 1, "actual_fee": 1000, "discount_amount": 100, ...}, ...]
    -- Example for fee_structures: [{"fee_structure_id": 1, "amount": 500}, ...]
    
    -- Metadata
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- For edited increments, track the parent
    parent_increment_id INTEGER REFERENCES public.fee_increment_history(id) ON DELETE SET NULL,
    
    -- Notes/remarks
    remarks TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fee_increment_history_school_id ON public.fee_increment_history(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_increment_history_session_id ON public.fee_increment_history(session_id);
CREATE INDEX IF NOT EXISTS idx_fee_increment_history_status ON public.fee_increment_history(status);
CREATE INDEX IF NOT EXISTS idx_fee_increment_history_created_at ON public.fee_increment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_increment_history_parent ON public.fee_increment_history(parent_increment_id);

-- Add comment
COMMENT ON TABLE public.fee_increment_history IS 'Tracks all fee increment operations for audit, editing, and reversal purposes';

