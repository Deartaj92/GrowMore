ALTER TABLE public.payroll_settings
ADD COLUMN IF NOT EXISTS round_up_amounts boolean NOT NULL DEFAULT false;
