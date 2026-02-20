-- Create suggestions table for user suggestions (students, parents, staff)
CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Submitter information
  submitted_by VARCHAR(20) NOT NULL CHECK (submitted_by IN ('student', 'parent', 'staff')),
  submitted_by_id INTEGER, -- student_id, family_id, or staff_id depending on submitted_by
  submitted_by_name VARCHAR(255) NOT NULL,
  
  -- Suggestion details
  subject VARCHAR(255) NOT NULL,
  suggestion_text TEXT NOT NULL,
  
  -- Status and review
  status VARCHAR(20) NOT NULL DEFAULT 'in_review' CHECK (status IN ('in_review', 'reviewed')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_suggestions_updated_at
    BEFORE UPDATE ON suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_suggestions_school_id ON suggestions(school_id);
CREATE INDEX idx_suggestions_submitted_by ON suggestions(submitted_by, submitted_by_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_created_at ON suggestions(created_at DESC);
CREATE INDEX idx_suggestions_assigned_to ON suggestions(assigned_to);

-- Disable Row Level Security for now (can be enabled later with proper policies)
ALTER TABLE suggestions DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON suggestions TO authenticated;
GRANT USAGE ON SEQUENCE suggestions_id_seq TO authenticated;


