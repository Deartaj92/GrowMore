-- Migration: Update Fee Structure Frequency Management
-- This migration ensures the database schema supports the new frequency management system
-- where frequency is managed at the fee_structure level (per class) rather than at the fee_head level

-- Ensure months and first_time columns exist in fee_structures (they should already exist from previous migration)
-- This is a safety check in case the previous migration wasn't applied
ALTER TABLE public.fee_structures 
ADD COLUMN IF NOT EXISTS months INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS first_time BOOLEAN DEFAULT FALSE;

-- Add/update comments for clarity
COMMENT ON COLUMN public.fee_structures.months IS 'Array of month numbers (1-12) when this fee should be collected for this specific class. Empty array means all months or depends on first_time flag.';
COMMENT ON COLUMN public.fee_structures.first_time IS 'Whether this fee should be collected only on first time enrollment for this class. When true, months array is typically empty.';

-- Add comment to fee_heads.frequency to indicate it's legacy/deprecated
COMMENT ON COLUMN public.fee_heads.frequency IS 'Legacy field: Frequency is now managed at the fee_structure level (per class) using months and first_time fields. This field is kept for backward compatibility but is not actively used in the UI.';

-- Ensure the GIN index exists for efficient querying of months array
CREATE INDEX IF NOT EXISTS idx_fee_structures_months ON public.fee_structures USING GIN (months);

-- Create a function to validate months array (for use in triggers or application logic)
CREATE OR REPLACE FUNCTION validate_fee_structure_months(months_array INTEGER[])
RETURNS BOOLEAN AS $$
BEGIN
    -- Return true if array is empty or NULL
    IF months_array IS NULL OR array_length(months_array, 1) IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if all values are between 1 and 12
    RETURN (SELECT bool_and(m >= 1 AND m <= 12) FROM unnest(months_array) AS m);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for the function
COMMENT ON FUNCTION validate_fee_structure_months(INTEGER[]) IS 
'Validates that all month numbers in the array are between 1 and 12. Returns true for empty or NULL arrays.';

