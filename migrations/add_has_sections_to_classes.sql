-- Add has_sections column to classes table
-- This migration adds a boolean column to track whether a class has sections

-- Add the has_sections column with default value true
ALTER TABLE classes 
ADD COLUMN has_sections BOOLEAN DEFAULT true;

-- Add a comment to document the column purpose
COMMENT ON COLUMN classes.has_sections IS 'Indicates whether this class has sections (A, B, C, etc.)';

-- Update existing classes to have has_sections = true if they already have sections
UPDATE classes 
SET has_sections = true 
WHERE id IN (
    SELECT DISTINCT class_id 
    FROM sections 
    WHERE class_id IS NOT NULL
);

-- Verify the changes
SELECT 
    id, 
    name, 
    has_sections,
    (SELECT COUNT(*) FROM sections WHERE class_id = classes.id) as section_count
FROM classes 
ORDER BY name;
