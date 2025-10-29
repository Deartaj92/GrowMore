-- Simple migration to add has_sections column to classes table
ALTER TABLE classes ADD COLUMN has_sections BOOLEAN DEFAULT true;

-- Update existing classes that have sections
UPDATE classes 
SET has_sections = true 
WHERE id IN (SELECT DISTINCT class_id FROM sections WHERE class_id IS NOT NULL);
