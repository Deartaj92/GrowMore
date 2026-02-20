-- Migration: Set random 5-digit passwords for users with 'aa' password
-- Date: 2025-02-08
-- Description: Updates all students, families, and staff users who have 'aa' as their password
--              to have a random 5-digit password (10000-99999). Passwords that are not 'aa' are not changed.

-- Function to generate a random 5-digit number (10000 to 99999)
CREATE OR REPLACE FUNCTION generate_random_5digit_password()
RETURNS VARCHAR(5) AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Update students with password 'aa' to random 5-digit password
UPDATE students
SET password = generate_random_5digit_password()
WHERE password = 'aa';

-- Update families with password 'aa' to random 5-digit password
UPDATE families
SET password = generate_random_5digit_password()
WHERE password = 'aa';

-- Update users (staff) with password 'aa' to random 5-digit password
UPDATE users
SET password = generate_random_5digit_password()
WHERE password = 'aa';

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS generate_random_5digit_password();

