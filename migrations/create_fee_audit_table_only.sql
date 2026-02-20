-- =====================================================
-- CREATE FEE AUDIT TABLE ONLY
-- =====================================================
-- This script creates just the fee_audit_logs table
-- without any triggers or complex features
-- =====================================================

-- Create the fee_audit_logs table
CREATE TABLE IF NOT EXISTS public.fee_audit_logs (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_school_id ON public.fee_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_changed_at ON public.fee_audit_logs(changed_at DESC);

-- Enable Row Level Security
ALTER TABLE public.fee_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy
CREATE POLICY "Allow all access to fee_audit_logs" ON public.fee_audit_logs
    FOR ALL USING (true);

-- Insert a test record to verify the table works
INSERT INTO public.fee_audit_logs (school_id, entity, entity_id, action, old_values, new_values, changed_by)
VALUES (2, 'test', 1, 'create', NULL, '{"test": "data"}', 1);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEE AUDIT TABLE CREATED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- fee_audit_logs table';
    RAISE NOTICE '- Basic indexes';
    RAISE NOTICE '- RLS policy';
    RAISE NOTICE '- Test record inserted';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'The fee audit logs page should now work!';
    RAISE NOTICE '=====================================================';
END $$;

