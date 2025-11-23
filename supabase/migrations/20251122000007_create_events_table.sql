-- Migration: Create events table for school events management
-- This allows Principal to create and manage events visible to different user roles

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    event_type VARCHAR(50) NOT NULL DEFAULT 'academic' CHECK (event_type IN ('academic', 'sports', 'cultural', 'holiday', 'meeting', 'other')),
    is_all_day BOOLEAN DEFAULT false,
    visible_to TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of roles that can see this event
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_school_id ON events(school_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();

-- Grant permissions
GRANT ALL ON events TO authenticated;
GRANT USAGE ON SEQUENCE events_id_seq TO authenticated;

