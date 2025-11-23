-- Migration: Create landing page widget preferences table
-- This allows Principal to control what widgets are shown to which user roles

-- Create landing_page_widgets table to store widget definitions
CREATE TABLE IF NOT EXISTS landing_page_widgets (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    widget_key VARCHAR(100) NOT NULL,
    widget_name VARCHAR(255) NOT NULL,
    widget_type VARCHAR(50) NOT NULL, -- 'stat', 'chart', 'list', 'link', 'custom'
    widget_config JSONB DEFAULT '{}'::jsonb, -- Widget-specific configuration
    icon_name VARCHAR(100), -- Material-UI icon name
    color VARCHAR(50), -- Widget color theme
    order_index INTEGER DEFAULT 0, -- Display order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, widget_key)
);

-- Create landing_page_role_preferences table to control visibility per role
CREATE TABLE IF NOT EXISTS landing_page_role_preferences (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    widget_id INTEGER NOT NULL REFERENCES landing_page_widgets(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'Principal', 'Admin', 'Teacher', 'Student', 'Parent', 'Accountant', 'Guest'
    is_visible BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0, -- Role-specific display order
    custom_config JSONB DEFAULT '{}'::jsonb, -- Role-specific widget configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, widget_id, role)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_landing_page_widgets_school_id ON landing_page_widgets(school_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_widgets_widget_key ON landing_page_widgets(widget_key);
CREATE INDEX IF NOT EXISTS idx_landing_page_role_preferences_school_id ON landing_page_role_preferences(school_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_role_preferences_widget_id ON landing_page_role_preferences(widget_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_role_preferences_role ON landing_page_role_preferences(role);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_landing_page_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_landing_page_widgets_updated_at
    BEFORE UPDATE ON landing_page_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_widgets_updated_at();

CREATE TRIGGER update_landing_page_role_preferences_updated_at
    BEFORE UPDATE ON landing_page_role_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_widgets_updated_at();

-- Grant permissions
GRANT ALL ON landing_page_widgets TO authenticated;
GRANT ALL ON landing_page_role_preferences TO authenticated;
GRANT USAGE ON SEQUENCE landing_page_widgets_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE landing_page_role_preferences_id_seq TO authenticated;

