-- Add leave_bonus_staff_ids to payroll_settings table
-- Stores an array of staff IDs eligible for the leave bonus
ALTER TABLE public.payroll_settings
ADD COLUMN IF NOT EXISTS leave_bonus_staff_ids jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.payroll_settings.leave_bonus_staff_ids IS 'List of staff IDs eligible for leave bonus allowance';
