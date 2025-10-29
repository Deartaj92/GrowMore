-- Add expires_on column to student_fee_concessions table
ALTER TABLE student_fee_concessions
ADD COLUMN expires_on DATE DEFAULT NULL;

-- Add comment for the new column
COMMENT ON COLUMN student_fee_concessions.expires_on IS 'Date on which the concession expires and is no longer valid';

