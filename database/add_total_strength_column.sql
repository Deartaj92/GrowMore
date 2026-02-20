-- Migration script to add total_strength column to examination_summaries table
-- Run this script to add the total_strength column to existing examination_summaries table

-- Add the total_strength column
ALTER TABLE examination_summaries 
ADD COLUMN IF NOT EXISTS total_strength INTEGER NOT NULL DEFAULT 0;

-- Add comment for the new column
COMMENT ON COLUMN examination_summaries.total_strength IS 'Total number of students who appeared in the examination';

-- Create index for better performance on total_strength queries
CREATE INDEX IF NOT EXISTS idx_examination_summaries_total_strength ON examination_summaries(total_strength);

-- Update existing records to have the correct total_strength value
-- This will be calculated based on the number of students in each examination
UPDATE examination_summaries 
SET total_strength = (
    SELECT COUNT(*) 
    FROM examination_summaries es2 
    WHERE es2.examination_id = examination_summaries.examination_id 
    AND es2.class_id = examination_summaries.class_id 
    AND (es2.section_id = examination_summaries.section_id OR (es2.section_id IS NULL AND examination_summaries.section_id IS NULL))
    AND es2.school_id = examination_summaries.school_id
    AND es2.session_id = examination_summaries.session_id
);
