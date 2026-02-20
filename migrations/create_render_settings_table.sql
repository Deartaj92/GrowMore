-- Create render_settings table to control visibility of menu items
-- This table uses JSONB for flexible, schema-free configuration
-- New cards/tabs can be added without altering the database schema

CREATE TABLE IF NOT EXISTS render_settings (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Use JSONB to store settings as key-value pairs
    -- Structure: { "teacher": { "mark_attendance": true, "reports": true, ... }, "student": { "profile_tab": true, ... } }
    -- This allows adding new cards/tabs without schema changes
    settings JSONB NOT NULL DEFAULT '{"teacher": {}, "student": {}}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one configuration per school
    UNIQUE(school_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_render_settings_school_id ON render_settings(school_id);
-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_render_settings_settings_gin ON render_settings USING GIN (settings);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_render_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_render_settings_updated_at
    BEFORE UPDATE ON render_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_render_settings_updated_at();

-- Insert default settings for existing schools (all enabled by default)
-- Default structure includes all current cards/tabs
INSERT INTO render_settings (school_id, settings)
SELECT 
    id,
    jsonb_build_object(
        'teacher',
        jsonb_build_object(
            'mark_attendance', true,
            'attendance_reports', true,
            'reports', true,
            'test_marks_entry', true,
            'test_records', true,
            'my_timetable', true,
            'assign_diary', true,
            'examination_marks_entry', true
        ),
        'student',
        jsonb_build_object(
            'profile_tab', true,
            'reports_tab', true,
            'examinations_tab', true,
            'test_records_tab', true,
            'attendance_tab', true,
            'fines_tab', true
        )
    )
FROM schools
ON CONFLICT (school_id) DO UPDATE 
SET settings = COALESCE(
    render_settings.settings || EXCLUDED.settings,
    EXCLUDED.settings
);

-- Add comments for documentation
COMMENT ON TABLE render_settings IS 'Stores render settings for controlling visibility of menu items for teachers and students. Uses JSONB for flexible, schema-free configuration.';
COMMENT ON COLUMN render_settings.settings IS 'JSONB object containing visibility settings. Structure: {"teacher": {"card_key": true/false}, "student": {"tab_key": true/false}}. New cards/tabs can be added without schema changes.';
