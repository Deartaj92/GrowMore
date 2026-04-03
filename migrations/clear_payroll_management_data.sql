-- =====================================================
-- CLEAR PAYROLL MANAGEMENT DATA
-- =====================================================
-- This script clears payroll-management data for ALL schools.
--
-- It deletes from payroll-specific tables and also removes
-- payroll-created expense rows/attachments that were generated when
-- payroll payments were processed.
--
-- IMPORTANT:
-- 1. This is destructive and cannot be undone.
-- 2. It intentionally does NOT touch shared staff, attendance,
--    half_leaves, sessions, or non-payroll finance data.
-- 3. It does NOT reset sequences, because this app is multi-tenant.
-- =====================================================

BEGIN;

DO $$
DECLARE
    payroll_expense_ids integer[];
    payroll_category_ids integer[];
    deleted_count integer;
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Starting payroll cleanup for ALL schools';
    RAISE NOTICE '=============================================';

    -- Identify payroll-created expense rows.
    -- Payroll payments create expenses with:
    -- - title like "Payroll: ..."
    -- - description containing "Payroll Payment ID: ..."
    SELECT COALESCE(array_agg(e.id), ARRAY[]::integer[])
    INTO payroll_expense_ids
    FROM public.expenses e
    WHERE (
          e.title ILIKE 'Payroll:%'
          OR e.description ILIKE '%Payroll Payment ID:%'
      );

    SELECT COALESCE(array_agg(ec.id), ARRAY[]::integer[])
    INTO payroll_category_ids
    FROM public.expense_categories ec
    WHERE (
          lower(ec.name) IN ('payroll', 'salary', 'salaries')
          OR ec.description = 'Employee salary and payroll payments'
      );

    -- Remove payroll expense attachments first.
    DELETE FROM public.expense_attachments
    WHERE expense_id = ANY(payroll_expense_ids);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted expense_attachments: %', deleted_count;

    -- Remove payroll-generated expenses only.
    DELETE FROM public.expenses
    WHERE id = ANY(payroll_expense_ids);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll-linked expenses: %', deleted_count;

    -- Payroll child/detail tables first.
    DELETE FROM public.payroll_generation_items;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_generation_items: %', deleted_count;

    DELETE FROM public.payroll_payments;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_payments: %', deleted_count;

    DELETE FROM public.payroll_adjustments;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_adjustments: %', deleted_count;

    DELETE FROM public.payroll_advances;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_advances: %', deleted_count;

    DELETE FROM public.employee_payroll_plans;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted employee_payroll_plans: %', deleted_count;

    DELETE FROM public.payroll_plan_items;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_plan_items: %', deleted_count;

    DELETE FROM public.payroll_generations;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_generations: %', deleted_count;

    DELETE FROM public.payroll_plans;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_plans: %', deleted_count;

    DELETE FROM public.payroll_settings;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_settings: %', deleted_count;

    DELETE FROM public.payroll_audit_logs;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted payroll_audit_logs: %', deleted_count;

    -- Remove orphan payroll categories only if they are now unused.
    DELETE FROM public.expense_categories ec
    WHERE ec.id = ANY(payroll_category_ids)
      AND NOT EXISTS (
          SELECT 1
          FROM public.expenses e
          WHERE e.category_id = ec.id
      );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted unused payroll expense categories: %', deleted_count;

    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Payroll cleanup completed for ALL schools';
    RAISE NOTICE 'Shared staff/attendance/finance data was left intact.';
    RAISE NOTICE '=============================================';
END $$;

COMMIT;

-- Optional verification
SELECT 'payroll_settings' AS table_name, COUNT(*) AS remaining_count
FROM public.payroll_settings
UNION ALL
SELECT 'payroll_plans', COUNT(*) FROM public.payroll_plans
UNION ALL
SELECT 'payroll_plan_items', COUNT(*) FROM public.payroll_plan_items
UNION ALL
SELECT 'employee_payroll_plans', COUNT(*) FROM public.employee_payroll_plans
UNION ALL
SELECT 'payroll_generations', COUNT(*) FROM public.payroll_generations
UNION ALL
SELECT 'payroll_generation_items', COUNT(*) FROM public.payroll_generation_items
UNION ALL
SELECT 'payroll_payments', COUNT(*) FROM public.payroll_payments
UNION ALL
SELECT 'payroll_advances', COUNT(*) FROM public.payroll_advances
UNION ALL
SELECT 'payroll_adjustments', COUNT(*) FROM public.payroll_adjustments
UNION ALL
SELECT 'payroll_audit_logs', COUNT(*) FROM public.payroll_audit_logs
UNION ALL
SELECT 'payroll_expenses', COUNT(*)
FROM public.expenses
WHERE (
      title ILIKE 'Payroll:%'
      OR description ILIKE '%Payroll Payment ID:%'
  )
ORDER BY table_name;
