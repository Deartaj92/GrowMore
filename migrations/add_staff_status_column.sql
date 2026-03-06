-- Add status column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
