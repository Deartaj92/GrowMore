-- Test Records Schema with Session Support
-- This script creates the test_records and test_results tables with session_id support

-- Drop existing tables if they exist
DROP TABLE IF EXISTS test_results CASCADE;
DROP TABLE IF EXISTS test_records CASCADE;

-- Create test_records table
CREATE TABLE test_records (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('Quiz', 'Test', 'Assignment', 'Practice')),
    subject_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    section_id INTEGER,
    session_id INTEGER NOT NULL,
    test_date DATE NOT NULL,
    max_marks INTEGER NOT NULL DEFAULT 100,
    passing_marks INTEGER NOT NULL DEFAULT 40,
    school_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_test_records_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_records_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_records_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_records_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_records_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_records_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT chk_test_records_max_marks CHECK (max_marks > 0),
    CONSTRAINT chk_test_records_passing_marks CHECK (passing_marks >= 0 AND passing_marks <= max_marks)
);

-- Create test_results table
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    obtained_marks INTEGER NOT NULL DEFAULT 0,
    max_marks INTEGER NOT NULL DEFAULT 100,
    remarks TEXT,
    school_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_test_results_test FOREIGN KEY (test_id) REFERENCES test_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_results_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_results_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_results_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT chk_test_results_obtained_marks CHECK (obtained_marks >= 0),
    CONSTRAINT chk_test_results_max_marks CHECK (max_marks > 0),
    CONSTRAINT chk_test_results_obtained_vs_max CHECK (obtained_marks <= max_marks),
    
    -- Unique constraint to prevent duplicate results for same test and student
    CONSTRAINT uk_test_results_test_student UNIQUE (test_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX idx_test_records_school ON test_records(school_id);
CREATE INDEX idx_test_records_class ON test_records(class_id);
CREATE INDEX idx_test_records_section ON test_records(section_id);
CREATE INDEX idx_test_records_subject ON test_records(subject_id);
CREATE INDEX idx_test_records_session ON test_records(session_id);
CREATE INDEX idx_test_records_date ON test_records(test_date);
CREATE INDEX idx_test_records_created_by ON test_records(created_by);

CREATE INDEX idx_test_results_test ON test_results(test_id);
CREATE INDEX idx_test_results_student ON test_results(student_id);
CREATE INDEX idx_test_results_session ON test_results(session_id);
CREATE INDEX idx_test_results_school ON test_results(school_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_test_records_updated_at 
    BEFORE UPDATE ON test_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_results_updated_at 
    BEFORE UPDATE ON test_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE test_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for test_records
CREATE POLICY "Users can view test_records for their school" ON test_records
    FOR SELECT USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert test_records for their school" ON test_records
    FOR INSERT WITH CHECK (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update test_records for their school" ON test_records
    FOR UPDATE USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete test_records for their school" ON test_records
    FOR DELETE USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

-- Create RLS policies for test_results
CREATE POLICY "Users can view test_results for their school" ON test_results
    FOR SELECT USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert test_results for their school" ON test_results
    FOR INSERT WITH CHECK (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update test_results for their school" ON test_results
    FOR UPDATE USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete test_results for their school" ON test_results
    FOR DELETE USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));

-- Grant necessary permissions
GRANT ALL ON test_records TO authenticated;
GRANT ALL ON test_results TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE test_records_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE test_results_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE test_records IS 'Stores test/quiz/assignment records with session support';
COMMENT ON TABLE test_results IS 'Stores individual student results for tests with session support';

COMMENT ON COLUMN test_records.session_id IS 'References the academic session when this test was conducted';
COMMENT ON COLUMN test_results.session_id IS 'References the academic session when this result was recorded';
COMMENT ON COLUMN test_records.test_type IS 'Type of test: Quiz, Test, Assignment, or Practice';
COMMENT ON COLUMN test_results.obtained_marks IS 'Marks obtained by student (0 for absent)';
COMMENT ON COLUMN test_results.remarks IS 'Additional remarks (e.g., "Absent" for absent students)';