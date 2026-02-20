-- Homework Diary Schema
-- Table to store daily homework assignments for classes

CREATE TABLE IF NOT EXISTS homework_diary (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE, -- Nullable for non-sectioned classes
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL, -- Nullable for general homework
  homework_date DATE NOT NULL,
  homework_text TEXT NOT NULL,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Ensure unique homework per class/section/subject/date combination
  UNIQUE (class_id, section_id, subject_id, homework_date, school_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_homework_diary_class ON homework_diary(class_id);
CREATE INDEX idx_homework_diary_section ON homework_diary(section_id);
CREATE INDEX idx_homework_diary_session ON homework_diary(session_id);
CREATE INDEX idx_homework_diary_subject ON homework_diary(subject_id);
CREATE INDEX idx_homework_diary_date ON homework_diary(homework_date);
CREATE INDEX idx_homework_diary_school ON homework_diary(school_id);
CREATE INDEX idx_homework_diary_class_section_date ON homework_diary(class_id, section_id, homework_date);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_homework_diary_updated_at
    BEFORE UPDATE ON homework_diary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

