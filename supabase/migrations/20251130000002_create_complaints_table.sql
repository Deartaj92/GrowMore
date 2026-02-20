-- Create complaints table for user complaints (students, parents, staff)
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Submitter information
  submitted_by VARCHAR(20) NOT NULL CHECK (submitted_by IN ('student', 'parent', 'staff')),
  submitted_by_id INTEGER, -- student_id, family_id, or staff_id depending on submitted_by
  submitted_by_name VARCHAR(255) NOT NULL,
  
  -- Complaint details
  subject VARCHAR(255) NOT NULL,
  complaint_text TEXT NOT NULL,
  
  -- Status and resolution
  status VARCHAR(20) NOT NULL DEFAULT 'in_review' CHECK (status IN ('in_review', 'reviewed')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_complaints_school_id ON complaints(school_id);
CREATE INDEX idx_complaints_submitted_by ON complaints(submitted_by, submitted_by_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);

-- Disable Row Level Security for now (can be enabled later with proper policies)
ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON complaints TO authenticated;
GRANT USAGE ON SEQUENCE complaints_id_seq TO authenticated;

