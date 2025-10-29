-- =====================================================
-- TEST AUDIT SYSTEM
-- =====================================================
-- This script tests if the audit system is working properly
-- =====================================================

-- 1. Check if functions exist
SELECT 
    'Functions Check' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_audit_user_id') THEN '✅ set_audit_user_id exists'
        ELSE '❌ set_audit_user_id missing'
    END as result
UNION ALL
SELECT 
    'Functions Check',
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_audit_user_id') THEN '✅ get_current_audit_user_id exists'
        ELSE '❌ get_current_audit_user_id missing'
    END
UNION ALL
SELECT 
    'Functions Check',
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_fee_audit_log') THEN '✅ create_fee_audit_log exists'
        ELSE '❌ create_fee_audit_log missing'
    END;

-- 2. Check if triggers exist
SELECT 
    'Triggers Check' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_fee_heads') THEN '✅ audit_fee_heads trigger exists'
        ELSE '❌ audit_fee_heads trigger missing'
    END as result
UNION ALL
SELECT 
    'Triggers Check',
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_fee_structures') THEN '✅ audit_fee_structures trigger exists'
        ELSE '❌ audit_fee_structures trigger missing'
    END;

-- 3. Test user context setting
SELECT 
    'User Context Test' as test_type,
    CASE 
        WHEN get_current_audit_user_id() IS NULL THEN '✅ No user context set (expected)'
        ELSE '⚠️ User context already set: ' || get_current_audit_user_id()::text
    END as result;

-- 4. Test setting user context
SELECT set_audit_user_id(1) as test_set_user;

-- 5. Verify user context was set
SELECT 
    'User Context Verification' as test_type,
    CASE 
        WHEN get_current_audit_user_id() = 1 THEN '✅ User context set correctly'
        ELSE '❌ User context not set properly'
    END as result;

-- 6. Show recent audit logs
SELECT 
    'Recent Audit Logs' as test_type,
    CONCAT(
        'Entity: ', entity, 
        ', Action: ', action, 
        ', User ID: ', COALESCE(changed_by::text, 'NULL'),
        ', Time: ', changed_at
    ) as result
FROM public.fee_audit_logs 
ORDER BY changed_at DESC 
LIMIT 5;

-- 7. Show users table for reference
SELECT 
    'Users Reference' as test_type,
    CONCAT('ID: ', id, ', Name: ', name, ', Username: ', username) as result
FROM public.users 
ORDER BY id 
LIMIT 5;

