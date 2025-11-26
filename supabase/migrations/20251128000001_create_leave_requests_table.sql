-- Create leave_requests table for student leave requests from parents/students
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Request details
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('sick', 'personal', 'emergency', 'family_event', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  attachment_url TEXT, -- URL to uploaded document (medical certificate, etc.)
  
  -- Requestor information
  requested_by VARCHAR(20) NOT NULL CHECK (requested_by IN ('student', 'parent')),
  requested_by_id INTEGER, -- student_id or family_id depending on requested_by
  requested_by_name VARCHAR(255), -- Name of the person making the request
  
  -- Status and approval
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CHECK (end_date >= start_date)
);

-- Create trigger for updated_at
CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_leave_requests_student_id ON leave_requests(student_id);
CREATE INDEX idx_leave_requests_school_id ON leave_requests(school_id);
CREATE INDEX idx_leave_requests_session_id ON leave_requests(session_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_requested_by ON leave_requests(requested_by, requested_by_id);
CREATE INDEX idx_leave_requests_created_at ON leave_requests(created_at DESC);

-- Disable Row Level Security for now (can be enabled later with proper policies)
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON leave_requests TO authenticated;
GRANT USAGE ON SEQUENCE leave_requests_id_seq TO authenticated;

