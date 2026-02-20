-- Migration: Remove arrears column from fee_plan_items table
-- This removes the arrears column as it's no longer used in the fee plans feature

-- Drop the arrears column from fee_plan_items table
ALTER TABLE public.fee_plan_items 
DROP COLUMN IF EXISTS arrears;

-- Update the comment on the table to reflect the removal
COMMENT ON TABLE public.fee_plan_items IS 'Individual fee items within a fee plan with discounts, etc.';

