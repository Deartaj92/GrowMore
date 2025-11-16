-- Create half leaves records table for both students and staff
CREATE TABLE IF NOT EXISTS half_leaves (
  id SERIAL PRIMARY KEY,
  person_type VARCHAR(10) NOT NULL CHECK (person_type IN ('student', 'staff')),
  person_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('first_half', 'second_half')),
  remarks TEXT,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Ensure one half leave per person per date per session
  UNIQUE (person_id, date, session_id, person_type)
);

-- Create trigger for half_leaves updated_at
CREATE TRIGGER update_half_leaves_updated_at
    BEFORE UPDATE ON half_leaves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_half_leaves_person_id ON half_leaves(person_id);
CREATE INDEX idx_half_leaves_date ON half_leaves(date);
CREATE INDEX idx_half_leaves_session_id ON half_leaves(session_id);
CREATE INDEX idx_half_leaves_school_id ON half_leaves(school_id);
CREATE INDEX idx_half_leaves_person_type ON half_leaves(person_type);
CREATE INDEX idx_half_leaves_person_date ON half_leaves(person_id, date);
CREATE INDEX idx_half_leaves_person_school ON half_leaves(person_id, school_id);
CREATE INDEX idx_half_leaves_person_type_school ON half_leaves(person_type, school_id);

-- Disable Row Level Security for now (can be enabled later with proper policies)
ALTER TABLE half_leaves DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON half_leaves TO authenticated;
GRANT USAGE ON SEQUENCE half_leaves_id_seq TO authenticated;

