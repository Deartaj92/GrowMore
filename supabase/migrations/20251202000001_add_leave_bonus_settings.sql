-- Add leave bonus settings to payroll_settings table
ALTER TABLE public.payroll_settings
ADD COLUMN IF NOT EXISTS allow_leave_bonus BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS leave_bonus_days INTEGER DEFAULT 1 CHECK (leave_bonus_days IN (1, 2));

-- Add comment
COMMENT ON COLUMN public.payroll_settings.allow_leave_bonus IS 'Enable leave bonus for employees with no absentees';
COMMENT ON COLUMN public.payroll_settings.leave_bonus_days IS 'Number of bonus leave days (1 or 2) to add when employee has no absentees';

