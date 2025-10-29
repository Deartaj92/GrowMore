-- Add is_recurring column to holidays table
ALTER TABLE holidays 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;

-- Update existing records to have is_recurring = false
UPDATE holidays 
SET is_recurring = FALSE 
WHERE is_recurring IS NULL;
