-- Migration: Add country column to institute_profile table
-- Date: 2024-12-01

-- Add country column to institute_profile table
ALTER TABLE institute_profile 
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Add short_name column to institute_profile table
ALTER TABLE institute_profile 
ADD COLUMN IF NOT EXISTS short_name VARCHAR(100);

-- Add tagline column if it doesn't exist
ALTER TABLE institute_profile 
ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);

-- Rename contact column to phone if it exists and phone doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institute_profile' AND column_name = 'contact') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institute_profile' AND column_name = 'phone') THEN
        ALTER TABLE institute_profile RENAME COLUMN contact TO phone;
    END IF;
END $$;

-- Rename email column to website if it exists and website doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institute_profile' AND column_name = 'email') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institute_profile' AND column_name = 'website') THEN
        ALTER TABLE institute_profile RENAME COLUMN email TO website;
    END IF;
END $$;

-- Update existing records to have a default country if they don't have one
UPDATE institute_profile 
SET country = 'Pakistan' 
WHERE country IS NULL;

-- Generate short names from existing full names if short_name is empty
UPDATE institute_profile 
SET short_name = LEFT(name, 20) 
WHERE short_name IS NULL AND name IS NOT NULL; 