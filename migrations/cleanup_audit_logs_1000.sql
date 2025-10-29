-- =====================================================
-- CLEANUP OLD AUDIT LOGS - KEEP ONLY LAST 1000
-- =====================================================
-- This script keeps only the 1000 most recent audit logs
-- and deletes all older records
-- =====================================================

-- 1. First, let's see how many logs we currently have
SELECT 
    'Before Cleanup' as status,
    COUNT(*) as total_logs
FROM public.fee_audit_logs;

-- 2. Show the oldest and newest timestamps
SELECT 
    'Timestamp Range' as info,
    MIN(changed_at) as oldest_log,
    MAX(changed_at) as newest_log
FROM public.fee_audit_logs;

-- 3. Find the cutoff timestamp (1000th most recent log)
WITH ranked_logs AS (
    SELECT 
        id,
        changed_at,
        ROW_NUMBER() OVER (ORDER BY changed_at DESC) as rn
    FROM public.fee_audit_logs
)
SELECT 
    'Cutoff Point' as info,
    changed_at as cutoff_timestamp,
    'All logs older than this will be deleted' as note
FROM ranked_logs 
WHERE rn = 1000;

-- 4. Count how many logs will be deleted
WITH ranked_logs AS (
    SELECT 
        id,
        changed_at,
        ROW_NUMBER() OVER (ORDER BY changed_at DESC) as rn
    FROM public.fee_audit_logs
),
cutoff AS (
    SELECT changed_at as cutoff_timestamp
    FROM ranked_logs 
    WHERE rn = 1000
)
SELECT 
    'Logs to Delete' as status,
    COUNT(*) as count
FROM public.fee_audit_logs fal, cutoff c
WHERE fal.changed_at < c.cutoff_timestamp;

-- 5. Perform the cleanup - Delete logs older than the 1000th most recent
WITH ranked_logs AS (
    SELECT 
        id,
        changed_at,
        ROW_NUMBER() OVER (ORDER BY changed_at DESC) as rn
    FROM public.fee_audit_logs
),
cutoff AS (
    SELECT changed_at as cutoff_timestamp
    FROM ranked_logs 
    WHERE rn = 1000
)
DELETE FROM public.fee_audit_logs 
WHERE id IN (
    SELECT fal.id
    FROM public.fee_audit_logs fal, cutoff c
    WHERE fal.changed_at < c.cutoff_timestamp
);

-- 6. Verify the cleanup
SELECT 
    'After Cleanup' as status,
    COUNT(*) as remaining_logs
FROM public.fee_audit_logs;

-- 7. Show the date range of remaining logs
SELECT 
    'Remaining Logs Range' as info,
    MIN(changed_at) as oldest_remaining,
    MAX(changed_at) as newest_remaining
FROM public.fee_audit_logs;

-- 8. Show breakdown of remaining logs by entity
SELECT 
    'Remaining by Entity' as info,
    entity,
    COUNT(*) as count
FROM public.fee_audit_logs
GROUP BY entity
ORDER BY count DESC;

-- 9. Show breakdown of remaining logs by user
SELECT 
    'Remaining by User' as info,
    COALESCE(u.name, 'System') as user_name,
    COUNT(*) as count
FROM public.fee_audit_logs fal
LEFT JOIN public.users u ON fal.changed_by = u.id
GROUP BY fal.changed_by, u.name
ORDER BY count DESC;

-- 10. Reset the sequence to avoid ID gaps
SELECT setval('fee_audit_logs_id_seq', (SELECT MAX(id) FROM public.fee_audit_logs));

-- Display completion message
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM public.fee_audit_logs;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'AUDIT LOGS CLEANUP COMPLETED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Result: % audit logs remaining (last 1000 records)', remaining_count;
    RAISE NOTICE 'Older logs have been permanently deleted';
    RAISE NOTICE 'Sequence has been reset to avoid ID gaps';
    RAISE NOTICE '=====================================================';
END $$;

