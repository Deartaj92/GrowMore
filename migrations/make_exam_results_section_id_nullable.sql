-- Make section_id nullable in exam_results table
-- This allows exam results to be saved for classes without sections

ALTER TABLE exam_results
ALTER COLUMN section_id DROP NOT NULL;

