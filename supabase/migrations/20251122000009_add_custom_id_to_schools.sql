-- Add custom_id column to schools table for sequential ID generation
-- This allows schools to have sequential IDs starting from 001, 002, etc.
-- Existing schools will have NULL custom_id to preserve current data

ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS custom_id VARCHAR(10) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schools_custom_id ON public.schools(custom_id);

-- Function to get the next sequential custom_id
CREATE OR REPLACE FUNCTION get_next_school_custom_id()
RETURNS VARCHAR(10) AS $$
DECLARE
  next_id INTEGER;
  formatted_id VARCHAR(10);
  padding_length INTEGER;
BEGIN
  -- Get the maximum custom_id number (convert to integer, ignoring NULLs)
  SELECT COALESCE(MAX(CAST(custom_id AS INTEGER)), 0) + 1
  INTO next_id
  FROM public.schools
  WHERE custom_id IS NOT NULL AND custom_id ~ '^[0-9]+$';
  
  -- Determine padding length based on the number
  -- Use 3 digits for 1-999, 4 digits for 1000-9999, 5 digits for 10000+, etc.
  IF next_id <= 999 THEN
    padding_length := 3;
  ELSIF next_id <= 9999 THEN
    padding_length := 4;
  ELSE
    padding_length := LENGTH(next_id::TEXT);
  END IF;
  
  -- Format with appropriate leading zeros
  formatted_id := LPAD(next_id::TEXT, padding_length, '0');
  
  RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

