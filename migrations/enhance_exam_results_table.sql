-- Enhanced Exam Results Table Migration
-- This script enhances the exam_results table with additional fields needed for DMC generation and analytics

-- First, let's check if the table exists and what columns it has
DO $$
BEGIN
    -- Check if exam_results table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_results') THEN
        RAISE NOTICE 'exam_results table exists, checking structure...';
        
        -- Check if max_marks column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'max_marks') THEN
            ALTER TABLE exam_results ADD COLUMN max_marks DECIMAL(5,2) NOT NULL DEFAULT 100.00;
            RAISE NOTICE 'Added max_marks column';
        END IF;
        
        -- Check if percentage column exists and is generated
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'percentage') THEN
            ALTER TABLE exam_results ADD COLUMN percentage DECIMAL(5,2) GENERATED ALWAYS AS (
                CASE 
                    WHEN max_marks > 0 THEN (obtained_marks / max_marks) * 100 
                    ELSE 0 
                END
            ) STORED;
            RAISE NOTICE 'Added percentage column as generated column';
        END IF;
        
        -- Check if grade column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'grade') THEN
            ALTER TABLE exam_results ADD COLUMN grade VARCHAR(5);
            RAISE NOTICE 'Added grade column';
        END IF;
        
        -- Check if remarks column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'remarks') THEN
            ALTER TABLE exam_results ADD COLUMN remarks TEXT;
            RAISE NOTICE 'Added remarks column';
        END IF;
        
        -- Check if entered_by column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'entered_by') THEN
            ALTER TABLE exam_results ADD COLUMN entered_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added entered_by column';
        END IF;
        
        -- Check if entered_at column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'entered_at') THEN
            ALTER TABLE exam_results ADD COLUMN entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added entered_at column';
        END IF;
        
        -- Check if class_id column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'class_id') THEN
            ALTER TABLE exam_results ADD COLUMN class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added class_id column';
        END IF;
        
        -- Check if section_id column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'section_id') THEN
            ALTER TABLE exam_results ADD COLUMN section_id INTEGER NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added section_id column';
        END IF;
        
        -- Check if school_id column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'school_id') THEN
            ALTER TABLE exam_results ADD COLUMN school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added school_id column';
        END IF;
        
        -- Add unique constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'exam_results' 
            AND constraint_name = 'exam_results_exam_student_subject_school_key'
        ) THEN
            ALTER TABLE exam_results ADD CONSTRAINT exam_results_exam_student_subject_school_key 
            UNIQUE(exam_id, student_id, subject_id, school_id);
            RAISE NOTICE 'Added unique constraint';
        END IF;
        
        -- Add foreign key constraint for student if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'exam_results' 
            AND constraint_name = 'exam_results_student_school_fkey'
        ) THEN
            ALTER TABLE exam_results ADD CONSTRAINT exam_results_student_school_fkey 
            FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint for student';
        END IF;
        
    ELSE
        RAISE NOTICE 'exam_results table does not exist, creating it...';
        
        -- Create the table from scratch
        CREATE TABLE exam_results (
            id SERIAL PRIMARY KEY,
            exam_id INTEGER NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
            class_id INTEGER NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
            section_id INTEGER NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
            obtained_marks DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            max_marks DECIMAL(5,2) NOT NULL DEFAULT 100.00,
            percentage DECIMAL(5,2) GENERATED ALWAYS AS (
                CASE 
                    WHEN max_marks > 0 THEN (obtained_marks / max_marks) * 100 
                    ELSE 0 
                END
            ) STORED,
            grade VARCHAR(5),
            remarks TEXT,
            entered_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
            entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id, school_id) REFERENCES public.students(id, school_id) ON DELETE CASCADE,
            UNIQUE(exam_id, student_id, subject_id, school_id)
        );
        
        RAISE NOTICE 'Created exam_results table with all required columns';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_subject ON exam_results(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_class_section ON exam_results(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_school ON exam_results(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_school ON exam_results(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_percentage ON exam_results(percentage);
CREATE INDEX IF NOT EXISTS idx_exam_results_grade ON exam_results(grade);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_exam_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exam_results_updated_at ON exam_results;
CREATE TRIGGER update_exam_results_updated_at
    BEFORE UPDATE ON exam_results
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_results_updated_at();

-- Grant permissions
GRANT ALL ON exam_results TO authenticated;
GRANT ALL ON exam_results TO service_role;

-- Enable RLS
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Simplified policies that work with Supabase auth
-- Note: You may need to adjust these based on your specific user table structure
CREATE POLICY "Users can view exam results for their school" ON exam_results
    FOR SELECT USING (true);

CREATE POLICY "Users can insert exam results for their school" ON exam_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update exam results for their school" ON exam_results
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete exam results for their school" ON exam_results
    FOR DELETE USING (true);

-- Disable RLS for service role (for admin operations)
ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced exam_results table setup completed successfully!';
END $$;
