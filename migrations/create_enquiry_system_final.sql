-- Final Enquiry System Setup - Handles existing policies
-- This script safely creates all enquiry tables and handles existing policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all access to enquiry_types" ON public.enquiry_types;
DROP POLICY IF EXISTS "Allow all access to enquiry_statuses" ON public.enquiry_statuses;
DROP POLICY IF EXISTS "Allow all access to enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Allow all access to enquiry_follow_ups" ON public.enquiry_follow_ups;
DROP POLICY IF EXISTS "Allow all access to enquiry_attachments" ON public.enquiry_attachments;

-- Create enquiry_types table (global)
CREATE TABLE IF NOT EXISTS public.enquiry_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create enquiry_statuses table (global)
CREATE TABLE IF NOT EXISTS public.enquiry_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create enquiries table (school-specific)
CREATE TABLE IF NOT EXISTS public.enquiries (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    enquiry_type_id INTEGER NOT NULL,
    status_id INTEGER NOT NULL,
    
    -- Contact Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Enquiry Details
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Type-specific details (JSON for flexibility)
    admission_details JSONB,
    job_details JSONB,
    
    -- Assignment and tracking
    assigned_to INTEGER,
    source VARCHAR(50) DEFAULT 'website',
    
    -- Dates
    enquiry_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    first_contact_date TIMESTAMP WITH TIME ZONE,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    resolved_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    internal_notes TEXT,
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by INTEGER
);

-- Create enquiry_follow_ups table (school-specific)
CREATE TABLE IF NOT EXISTS public.enquiry_follow_ups (
    id SERIAL PRIMARY KEY,
    enquiry_id INTEGER NOT NULL,
    school_id BIGINT NOT NULL,
    
    -- Follow-up details
    follow_up_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
    
    -- Assignment
    assigned_to INTEGER,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by INTEGER
);

-- Create enquiry_attachments table (school-specific)
CREATE TABLE IF NOT EXISTS public.enquiry_attachments (
    id SERIAL PRIMARY KEY,
    enquiry_id INTEGER NOT NULL,
    school_id BIGINT NOT NULL,
    
    -- File details
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    
    -- Description
    description TEXT,
    
    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    uploaded_by INTEGER
);

-- Insert basic enquiry types
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

-- Insert basic enquiry statuses
INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'New', 'Newly received inquiry', '#3b82f6', 1
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'New');

INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'In Progress', 'Inquiry is being processed', '#f59e0b', 2
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'In Progress');

INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'Contacted', 'Initial contact has been made', '#8b5cf6', 3
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'Contacted');

INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'Follow Up Required', 'Follow-up action needed', '#ef4444', 4
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'Follow Up Required');

INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'Approved', 'Inquiry approved/accepted', '#22c55e', 5
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'Approved');

INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'Rejected', 'Inquiry rejected/declined', '#6b7280', 6
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'Rejected');

INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'On Hold', 'Inquiry temporarily on hold', '#f97316', 7
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'On Hold');

INSERT INTO public.enquiry_statuses (name, description, color, sort_order) 
SELECT 'Resolved', 'Inquiry successfully resolved', '#059669', 8
WHERE NOT EXISTS (SELECT 1 FROM public.enquiry_statuses WHERE name = 'Resolved');

-- Enable Row Level Security
ALTER TABLE public.enquiry_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_attachments ENABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "Allow all access to enquiry_types" ON public.enquiry_types FOR ALL USING (true);
CREATE POLICY "Allow all access to enquiry_statuses" ON public.enquiry_statuses FOR ALL USING (true);
CREATE POLICY "Allow all access to enquiries" ON public.enquiries FOR ALL USING (true);
CREATE POLICY "Allow all access to enquiry_follow_ups" ON public.enquiry_follow_ups FOR ALL USING (true);
CREATE POLICY "Allow all access to enquiry_attachments" ON public.enquiry_attachments FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.enquiry_types TO authenticated;
GRANT ALL ON public.enquiry_statuses TO authenticated;
GRANT ALL ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiry_follow_ups TO authenticated;
GRANT ALL ON public.enquiry_attachments TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE public.enquiry_types_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.enquiry_statuses_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.enquiries_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.enquiry_follow_ups_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.enquiry_attachments_id_seq TO authenticated;
