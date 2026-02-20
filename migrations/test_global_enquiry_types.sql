-- Test script to verify global enquiry types work
-- This creates the minimal global setup

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.enquiry_types CASCADE;

-- Create global enquiry_types table (no school_id)
CREATE TABLE public.enquiry_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert global enquiry types
INSERT INTO public.enquiry_types (name, description) 
SELECT 'Admission Inquiry', 'Inquiries from parents seeking admission for their children'
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_types WHERE name = 'Admission Inquiry');

INSERT INTO public.enquiry_types (name, description) 
SELECT 'Job Vacancy', 'Inquiries from teachers and staff seeking employment opportunities'
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_types WHERE name = 'Job Vacancy');

INSERT INTO public.enquiry_types (name, description) 
SELECT 'General Inquiry', 'General inquiries about school services, facilities, or information'
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_types WHERE name = 'General Inquiry');

INSERT INTO public.enquiry_types (name, description) 
SELECT 'Fee Inquiry', 'Inquiries related to fee structure, payment methods, or financial assistance'
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_types WHERE name = 'Fee Inquiry');

-- Enable Row Level Security
ALTER TABLE public.enquiry_types ENABLE ROW LEVEL SECURITY;

-- Create simple policy that allows all authenticated users to view
CREATE POLICY "All authenticated users can view enquiry types" ON public.enquiry_types
    FOR SELECT USING (is_active = true);

-- Grant permissions
GRANT ALL ON public.enquiry_types TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.enquiry_types_id_seq TO authenticated;

-- Test the table
SELECT * FROM public.enquiry_types;
