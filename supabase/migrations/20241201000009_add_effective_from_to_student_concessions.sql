-- Add effective_from column to student_fee_concessions table
ALTER TABLE student_fee_concessions 
ADD COLUMN effective_from DATE DEFAULT CURRENT_DATE;
 
-- Add comment for the new column
COMMENT ON COLUMN student_fee_concessions.effective_from IS 'Date from which the concession becomes effective'; 