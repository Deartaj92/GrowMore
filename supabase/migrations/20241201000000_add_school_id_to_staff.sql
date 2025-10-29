-- Add school_id column to staff table
ALTER TABLE staff ADD COLUMN school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;
 
-- Create index for better performance
CREATE INDEX idx_staff_school_id ON staff(school_id); 