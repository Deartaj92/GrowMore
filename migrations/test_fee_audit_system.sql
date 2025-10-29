-- =====================================================
-- FEE AUDIT SYSTEM TEST
-- =====================================================
-- Run this after setting up the audit system to test it
-- =====================================================

-- 1. Test the audit system by creating a test fee head
-- (Replace school_id and other values with your actual data)

-- Set current user for audit logging
SELECT set_audit_user_id(1); -- Replace 1 with actual user ID

-- Insert a test fee head (this should trigger audit logging)
INSERT INTO public.fee_heads (
    school_id,
    name,
    description,
    is_recurring,
    default_amount,
    frequency,
    auto_generate
) VALUES (
    2, -- Replace with your school_id
    'Test Fee Head',
    'This is a test fee head for audit logging',
    true,
    1000.00,
    'monthly',
    false
) RETURNING id;

-- 2. Check if audit log was created
SELECT 
    id,
    school_id,
    entity,
    entity_id,
    action,
    old_values,
    new_values,
    changed_by,
    changed_at
FROM public.fee_audit_logs 
WHERE school_id = 2 -- Replace with your school_id
ORDER BY changed_at DESC 
LIMIT 5;

-- 3. Test update audit logging
-- Update the test fee head
UPDATE public.fee_heads 
SET default_amount = 1500.00,
    description = 'Updated test fee head'
WHERE name = 'Test Fee Head' 
AND school_id = 2; -- Replace with your school_id

-- 4. Check audit logs again
SELECT 
    id,
    school_id,
    entity,
    entity_id,
    action,
    old_values,
    new_values,
    changed_by,
    changed_at
FROM public.fee_audit_logs 
WHERE school_id = 2 -- Replace with your school_id
ORDER BY changed_at DESC 
LIMIT 5;

-- 5. Clean up test data (optional)
-- DELETE FROM public.fee_heads WHERE name = 'Test Fee Head' AND school_id = 2;
-- DELETE FROM public.fee_audit_logs WHERE entity = 'fee_head' AND entity_id IN (
--     SELECT id FROM public.fee_heads WHERE name = 'Test Fee Head' AND school_id = 2
-- );

-- Display test results
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FEE AUDIT SYSTEM TEST COMPLETED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Check the results above to verify:';
    RAISE NOTICE '1. Test fee head was created';
    RAISE NOTICE '2. Audit log was created for the insert';
    RAISE NOTICE '3. Test fee head was updated';
    RAISE NOTICE '4. Audit log was created for the update';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'If you see audit logs above, the system is working!';
    RAISE NOTICE '=====================================================';
END $$;

