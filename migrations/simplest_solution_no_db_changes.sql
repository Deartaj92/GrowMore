-- SIMPLEST SOLUTION: No database schema changes needed!
-- Just use a different approach for generating IDs

-- The issue: You have a global primary key on 'id' column
-- Each school needs sequential IDs starting from 1

-- Solution: Use school_id as a prefix for the ID
-- This creates unique global IDs while giving each school its own sequence

-- Example:
-- School 1 (school_id = 1):
--   Student 1: id = 1001 (1 * 1000 + 1)
--   Student 2: id = 1002 (1 * 1000 + 2)
--   Student 3: id = 1003 (1 * 1000 + 3)

-- School 2 (school_id = 2):
--   Student 1: id = 2001 (2 * 1000 + 1)
--   Student 2: id = 2002 (2 * 1000 + 2)
--   Student 3: id = 2003 (2 * 1000 + 3)

-- School 10 (school_id = 10):
--   Student 1: id = 10001 (10 * 1000 + 1)
--   Student 2: id = 10002 (10 * 1000 + 2)

-- This approach:
-- ✅ No database schema changes
-- ✅ All existing code continues to work
-- ✅ Each school has sequential numbers (1, 2, 3...)
-- ✅ Global IDs are unique
-- ✅ You can easily extract the school-specific number: id % 1000
-- ✅ You can easily extract the school: id / 1000

-- Implementation is just in the JavaScript code:
-- function generateStudentId(schoolId, studentNumber) {
--   return schoolId * 1000 + studentNumber;
-- }
--
-- function getStudentNumber(id) {
--   return id % 1000;
-- }
--
-- function getSchoolFromId(id) {
--   return Math.floor(id / 1000);
-- }

-- No SQL changes needed! Just update the ID generation logic in your app.


