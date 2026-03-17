-- Migration to add timetable timing settings
CREATE TABLE IF NOT EXISTS timetable_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id TEXT NOT NULL, -- Using TEXT to match your other tables if they use it, but check school_id type
    period_index INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (school_id, period_index)
);

CREATE TABLE IF NOT EXISTS timetable_settings (
    school_id TEXT PRIMARY KEY,
    break_after_period_index INTEGER DEFAULT 4,
    break_start_time TEXT DEFAULT '11:00',
    break_end_time TEXT DEFAULT '11:15',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: Ensure uuid-ossp extension is enabled if using uuid_generate_v4
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
