-- Create table for individual teacher score deduction settings
-- This allows per-teacher control over which deductions apply to their score

CREATE TABLE IF NOT EXISTS teacher_score_deduction_settings (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Deduction type flags (boolean)
    enable_attendance_deduction BOOLEAN NOT NULL DEFAULT true,
    enable_diary_deduction BOOLEAN NOT NULL DEFAULT false,
    enable_test_deduction BOOLEAN NOT NULL DEFAULT false,
    -- Future deduction types can be added here
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one setting per teacher per school
    UNIQUE(school_id, teacher_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_score_deduction_school_id ON teacher_score_deduction_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_score_deduction_teacher_id ON teacher_score_deduction_settings(teacher_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_score_deduction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_score_deduction_updated_at
    BEFORE UPDATE ON teacher_score_deduction_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_teacher_score_deduction_updated_at();

-- Add comments for documentation
COMMENT ON TABLE teacher_score_deduction_settings IS 'Stores individual teacher score deduction settings. Allows per-teacher control over which deductions apply to their score calculation.';
COMMENT ON COLUMN teacher_score_deduction_settings.enable_attendance_deduction IS 'Enable/disable attendance-based score deductions (absent, leave, late, half leave)';
COMMENT ON COLUMN teacher_score_deduction_settings.enable_diary_deduction IS 'Enable/disable homework diary assignment-based score deductions';
COMMENT ON COLUMN teacher_score_deduction_settings.enable_test_deduction IS 'Enable/disable test-based score deductions (for future implementation)';

