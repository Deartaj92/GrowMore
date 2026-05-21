-- Migration: Create special_fines table for student-only one-time fines

CREATE TABLE IF NOT EXISTS public.special_fines (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  due_date DATE,
  remarks TEXT,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'paid', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_special_fines_student_school ON public.special_fines(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_special_fines_school ON public.special_fines(school_id);

CREATE TRIGGER update_special_fines_updated_at
  BEFORE UPDATE ON public.special_fines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
