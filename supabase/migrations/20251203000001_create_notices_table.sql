-- Migration: Create notices table for school notices management
-- This allows Principal to create and manage notices visible to different user roles

-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    notice_type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (notice_type IN ('info', 'warning', 'urgent', 'success')),
    visible_to TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of roles that can see this notice
    is_active BOOLEAN DEFAULT true, -- Allow disabling notices without deleting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notices_school_id ON notices(school_id);
CREATE INDEX IF NOT EXISTS idx_notices_notice_type ON notices(notice_type);
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON notices(is_active);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notices_updated_at
    BEFORE UPDATE ON notices
    FOR EACH ROW
    EXECUTE FUNCTION update_notices_updated_at();

-- Grant permissions
GRANT ALL ON notices TO authenticated;
GRANT USAGE ON SEQUENCE notices_id_seq TO authenticated;

