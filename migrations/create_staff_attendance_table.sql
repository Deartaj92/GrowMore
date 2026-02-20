-- Create staff attendance records table
CREATE TABLE staff_attendance_records (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('present', 'absent', 'leave', 'late', 'half_day')),
  remarks TEXT,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (staff_id, date, session_id)
);

-- Create trigger for staff attendance updated_at
CREATE TRIGGER update_staff_attendance_records_updated_at
    BEFORE UPDATE ON staff_attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_staff_attendance_records_staff_id ON staff_attendance_records(staff_id);
CREATE INDEX idx_staff_attendance_records_date ON staff_attendance_records(date);
CREATE INDEX idx_staff_attendance_records_session_id ON staff_attendance_records(session_id);
CREATE INDEX idx_staff_attendance_records_school_id ON staff_attendance_records(school_id);
CREATE INDEX idx_staff_attendance_records_staff_date ON staff_attendance_records(staff_id, date);
CREATE INDEX idx_staff_attendance_records_staff_school ON staff_attendance_records(staff_id, school_id);

-- Disable Row Level Security for now (can be enabled later with proper policies)
ALTER TABLE staff_attendance_records DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON staff_attendance_records TO authenticated;
GRANT USAGE ON SEQUENCE staff_attendance_records_id_seq TO authenticated;
