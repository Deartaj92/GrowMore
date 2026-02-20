-- Add short_name column to subjects table
-- This migration adds a short_name field for subjects to be used in master sheets

-- Add the short_name column
ALTER TABLE subjects 
ADD COLUMN short_name VARCHAR(10) NOT NULL DEFAULT '';

-- Update existing subjects with default short names based on their names
UPDATE subjects 
SET short_name = CASE 
    WHEN LOWER(name) LIKE '%english%' THEN 'ENG'
    WHEN LOWER(name) LIKE '%urdu%' THEN 'URD'
    WHEN LOWER(name) LIKE '%math%' THEN 'MATH'
    WHEN LOWER(name) LIKE '%science%' THEN 'SCI'
    WHEN LOWER(name) LIKE '%social%' THEN 'SS'
    WHEN LOWER(name) LIKE '%islam%' THEN 'ISL'
    WHEN LOWER(name) LIKE '%hifz%' THEN 'HIFZ'
    WHEN LOWER(name) LIKE '%naz%' THEN 'NAZ'
    ELSE UPPER(SUBSTRING(name, 1, 3))
END;

-- Handle duplicate short names by adding a suffix
WITH duplicates AS (
    SELECT id, school_id, short_name, 
           ROW_NUMBER() OVER (PARTITION BY school_id, short_name ORDER BY id) as rn
    FROM subjects
)
UPDATE subjects 
SET short_name = subjects.short_name || '_' || duplicates.rn
FROM duplicates 
WHERE subjects.id = duplicates.id 
AND duplicates.rn > 1;

-- Add a unique constraint to ensure short names are unique within each school
ALTER TABLE subjects 
ADD CONSTRAINT unique_short_name_per_school 
UNIQUE (school_id, short_name);

-- Add an index for better performance
CREATE INDEX idx_subjects_short_name ON subjects(school_id, short_name);
