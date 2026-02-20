-- Minimal Enquiry Table Creation
-- This creates just the essential table to stop the 400 error

-- Create the enquiry_types table
CREATE TABLE IF NOT EXISTS public.enquiry_types (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert basic data for school_id = 2 (since the error shows school_id=2)
INSERT INTO public.enquiry_types (school_id, name, description) VALUES
(2, 'Admission Inquiry', 'Inquiries from parents seeking admission for their children'),
(2, 'Job Vacancy', 'Inquiries from teachers and staff seeking employment opportunities'),
(2, 'General Inquiry', 'General inquiries about school services, facilities, or information'),
(2, 'Fee Inquiry', 'Inquiries related to fee structure, payment methods, or financial assistance')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.enquiry_types ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows access
CREATE POLICY "Allow all access to enquiry_types" ON public.enquiry_types
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.enquiry_types TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.enquiry_types_id_seq TO authenticated;
