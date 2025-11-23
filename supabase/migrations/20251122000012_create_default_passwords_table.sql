-- Create default_passwords table to store default passwords for new entities
CREATE TABLE IF NOT EXISTS default_passwords (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_password VARCHAR(255) NOT NULL DEFAULT 'aa',
    staff_password VARCHAR(255) NOT NULL DEFAULT 'aa',
    family_password VARCHAR(255) NOT NULL DEFAULT 'aa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one configuration per school
    UNIQUE(school_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_default_passwords_school_id ON default_passwords(school_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_default_passwords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_default_passwords_updated_at
    BEFORE UPDATE ON default_passwords
    FOR EACH ROW
    EXECUTE FUNCTION update_default_passwords_updated_at();

-- Insert default passwords for existing schools
INSERT INTO default_passwords (school_id, student_password, staff_password, family_password)
SELECT 
    id,
    'aa',
    'aa',
    'aa'
FROM schools
ON CONFLICT (school_id) DO NOTHING;

