-- Add months and first_time fields to fee_structures table
-- months: JSONB array of month numbers (1-12) when fees should be collected
-- first_time: BOOLEAN to indicate if this fee should be collected on first time enrollment

ALTER TABLE public.fee_structures 
ADD COLUMN IF NOT EXISTS months INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS first_time BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.fee_structures.months IS 'Array of month numbers (1-12) when this fee should be collected';
COMMENT ON COLUMN public.fee_structures.first_time IS 'Whether this fee should be collected on first time enrollment';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_fee_structures_months ON public.fee_structures USING GIN (months);

