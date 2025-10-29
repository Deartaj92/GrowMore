-- Create examination_configurations table
CREATE TABLE IF NOT EXISTS examination_configurations (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_configurations JSONB NOT NULL DEFAULT '[]',
    dmc_configuration JSONB NOT NULL DEFAULT '{}',
    dmc_color_configuration JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one configuration per school
    UNIQUE(school_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_examination_configurations_school_id ON examination_configurations(school_id);
CREATE INDEX IF NOT EXISTS idx_examination_configurations_created_at ON examination_configurations(created_at);

-- Note: RLS (Row Level Security) is not used in this application
-- Authentication and authorization are handled at the application level
-- through the AuthContext and user session management

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_examination_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_examination_configurations_updated_at
    BEFORE UPDATE ON examination_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_examination_configurations_updated_at();

-- Insert default configuration for school ID 1 (if it doesn't exist)
INSERT INTO examination_configurations (school_id, grade_configurations, dmc_configuration, dmc_color_configuration)
VALUES (
    1,
    '[
        {"grade": "A+", "min_percentage": 90, "max_percentage": 100, "description": "Excellent", "color": "#059669"},
        {"grade": "A", "min_percentage": 80, "max_percentage": 89, "description": "Very Good", "color": "#d97706"},
        {"grade": "B+", "min_percentage": 70, "max_percentage": 79, "description": "Good", "color": "#dc2626"},
        {"grade": "B", "min_percentage": 60, "max_percentage": 69, "description": "Satisfactory", "color": "#991b1b"},
        {"grade": "C", "min_percentage": 50, "max_percentage": 59, "description": "Average", "color": "#7c2d12"},
        {"grade": "D", "min_percentage": 40, "max_percentage": 49, "description": "Below Average", "color": "#581c1c"},
        {"grade": "F", "min_percentage": 0, "max_percentage": 39, "description": "Fail", "color": "#dc2626"}
    ]',
    '{
        "include_student_photo": true,
        "include_teacher_signature": true,
        "include_principal_signature": true,
        "include_school_logo": true,
        "include_attendance_percentage": true,
        "include_remarks": true,
        "include_grade": true,
        "include_school_motto": true,
        "attendance_threshold": 75,
        "default_remarks": "Good performance",
        "include_parent_signature": false,
        "include_guardian_details": false,
        "include_medical_certificate": false,
        "include_conduct_certificate": false,
        "include_achievement_certificate": false,
        "watermark_text": "OFFICIAL DOCUMENT",
        "footer_text": "This is to certify that the above information is true and correct",
        "header_text": "DETAILED MARKS CERTIFICATE",
        "certificate_template": "standard",
        "print_quality": "normal",
        "auto_generate_serial": true,
        "include_qr_code": false,
        "include_barcode": false
    }',
    '{
        "header_gradient_start": "#667eea",
        "header_gradient_end": "#f093fb",
        "header_text_color": "#ffffff",
        "header_text_shadow": "#6b7280",
        "logo_background": "#ffffff",
        "logo_border": "#ffffff",
        "title_background": "#d8b4fe",
        "title_text_color": "#ffffff",
        "title_border": "#d8b4fe",
        "bar_gradient_start": "#93c5fd",
        "bar_gradient_end": "#86efac",
        "details_background": "#ffffff",
        "details_border": "#e2e8f0",
        "details_text_color": "#1e293b",
        "details_label_color": "#6b7280",
        "table_header_background": "#d8b4fe",
        "table_header_text": "#ffffff",
        "table_border": "#e2e8f0",
        "table_alternate_row": "#f3e8ff",
        "table_text_color": "#1e293b",
        "summary_background": "#f3e8ff",
        "summary_border": "#e5e7eb",
        "summary_text_color": "#1e293b",
        "summary_label_color": "#6b7280",
        "excellent_color": "#059669",
        "good_color": "#d97706",
        "average_color": "#dc2626",
        "poor_color": "#991b1b",
        "absent_color": "#dc2626",
        "fail_color": "#dc2626",
        "footer_gradient_start": "#667eea",
        "footer_gradient_end": "#f093fb",
        "signature_line_color": "#dc2626",
        "signature_text_color": "#6b7280"
    }'
)
ON CONFLICT (school_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE examination_configurations IS 'Stores examination configuration settings for each school';
COMMENT ON COLUMN examination_configurations.grade_configurations IS 'JSON array of grade configurations with percentage ranges';
COMMENT ON COLUMN examination_configurations.dmc_configuration IS 'JSON object containing DMC (Detailed Marks Certificate) settings';
COMMENT ON COLUMN examination_configurations.dmc_color_configuration IS 'JSON object containing color settings for DMC generation';