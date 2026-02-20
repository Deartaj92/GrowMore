-- =====================================================
-- CHECK AUDIT LOGS COUNT AND LIMITS
-- =====================================================
-- This script shows how many audit logs exist and current limits
-- =====================================================

-- 1. Total count of audit logs
SELECT 
    'Total Audit Logs' as metric,
    COUNT(*) as count
FROM public.fee_audit_logs;

-- 2. Count by entity type
SELECT 
    'Logs by Entity' as metric,
    entity,
    COUNT(*) as count
FROM public.fee_audit_logs
GROUP BY entity
ORDER BY count DESC;

-- 3. Count by action type
SELECT 
    'Logs by Action' as metric,
    action,
    COUNT(*) as count
FROM public.fee_audit_logs
GROUP BY action
ORDER BY count DESC;

-- 4. Count by user
SELECT 
    'Logs by User' as metric,
    COALESCE(u.name, 'System') as user_name,
    COUNT(*) as count
FROM public.fee_audit_logs fal
LEFT JOIN public.users u ON fal.changed_by = u.id
GROUP BY fal.changed_by, u.name
ORDER BY count DESC;

-- 5. Recent logs (last 10)
SELECT 
    'Recent Logs' as metric,
    CONCAT(
        'ID: ', id,
        ', Entity: ', entity,
        ', Action: ', action,
        ', User: ', COALESCE(changed_by::text, 'NULL'),
        ', Time: ', changed_at
    ) as details
FROM public.fee_audit_logs
ORDER BY changed_at DESC
LIMIT 10;

-- 6. Current component limit
SELECT 
    'Component Limit' as metric,
    '50 logs per page (no pagination)' as details;

-- 7. Database storage info
SELECT 
    'Storage Info' as metric,
    pg_size_pretty(pg_total_relation_size('public.fee_audit_logs')) as table_size;

