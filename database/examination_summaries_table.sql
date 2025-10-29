-- Create examination_summaries table to store student examination summaries
CREATE TABLE IF NOT EXISTS examination_summaries (
    id SERIAL PRIMARY KEY,
    examination_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    section_id INTEGER,
    school_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    
    -- Marks and performance
    obtained_marks DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_marks DECIMAL(10,2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    grade VARCHAR(10),
    
    -- Position and ranking
    position INTEGER NOT NULL DEFAULT 0,
    rank_in_class INTEGER NOT NULL DEFAULT 0,
    rank_in_section INTEGER NOT NULL DEFAULT 0,
    total_strength INTEGER NOT NULL DEFAULT 0,
    
    -- Status and metadata
    status VARCHAR(20) NOT NULL DEFAULT 'pass', -- 'pass', 'fail', 'absent'
    remarks TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_examination_summaries_examination 
        FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE CASCADE,
    CONSTRAINT fk_examination_summaries_student 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_examination_summaries_class 
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_examination_summaries_section 
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_examination_summaries_school 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_examination_summaries_session 
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate entries
    CONSTRAINT unique_examination_student 
        UNIQUE (examination_id, student_id, school_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_examination_summaries_examination_id ON examination_summaries(examination_id);
CREATE INDEX IF NOT EXISTS idx_examination_summaries_student_id ON examination_summaries(student_id);
CREATE INDEX IF NOT EXISTS idx_examination_summaries_class_id ON examination_summaries(class_id);
CREATE INDEX IF NOT EXISTS idx_examination_summaries_section_id ON examination_summaries(section_id);
CREATE INDEX IF NOT EXISTS idx_examination_summaries_school_id ON examination_summaries(school_id);
CREATE INDEX IF NOT EXISTS idx_examination_summaries_session_id ON examination_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_examination_summaries_position ON examination_summaries(position);
CREATE INDEX IF NOT EXISTS idx_examination_summaries_status ON examination_summaries(status);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_examination_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER trigger_update_examination_summaries_updated_at
    BEFORE UPDATE ON examination_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_examination_summaries_updated_at();

-- Add comments for documentation
COMMENT ON TABLE examination_summaries IS 'Stores examination summaries for each student including marks, positions, and performance metrics';
COMMENT ON COLUMN examination_summaries.examination_id IS 'Reference to the examination';
COMMENT ON COLUMN examination_summaries.student_id IS 'Reference to the student';
COMMENT ON COLUMN examination_summaries.class_id IS 'Class in which the examination was taken';
COMMENT ON COLUMN examination_summaries.section_id IS 'Section in which the examination was taken (nullable for non-sectioned classes)';
COMMENT ON COLUMN examination_summaries.obtained_marks IS 'Total marks obtained by the student';
COMMENT ON COLUMN examination_summaries.total_marks IS 'Total marks available in the examination';
COMMENT ON COLUMN examination_summaries.percentage IS 'Percentage of marks obtained';
COMMENT ON COLUMN examination_summaries.grade IS 'Grade assigned based on percentage';
COMMENT ON COLUMN examination_summaries.position IS 'Overall position in the examination';
COMMENT ON COLUMN examination_summaries.rank_in_class IS 'Rank within the class';
COMMENT ON COLUMN examination_summaries.rank_in_section IS 'Rank within the section';
COMMENT ON COLUMN examination_summaries.total_strength IS 'Total number of students who appeared in the examination';
COMMENT ON COLUMN examination_summaries.status IS 'Pass/Fail/Absent status';
COMMENT ON COLUMN examination_summaries.remarks IS 'Additional remarks or comments';

