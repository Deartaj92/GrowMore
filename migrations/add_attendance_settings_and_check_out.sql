-- Add check_out_time to track the exit time of scanned persons
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;
ALTER TABLE staff_attendance_records ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;

-- Create attendance settings table to store start and end times for lateness tracking
CREATE TABLE IF NOT EXISTS attendance_settings (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_start_time TIME DEFAULT '08:00:00',
    staff_start_time TIME DEFAULT '08:00:00',
    staff_end_time TIME DEFAULT '14:00:00',
    grace_period_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(school_id)
);

-- Seed initial settings for existing schools if possible, or handle in application logic
