-- Simple Enquiry System Setup
-- Run this script to create the basic enquiry tables

-- Create enquiry_types table
CREATE TABLE IF NOT EXISTS public.enquiry_types (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create enquiry_statuses table
CREATE TABLE IF NOT EXISTS public.enquiry_statuses (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create enquiries table
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

-- Create enquiry_follow_ups table
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

-- Create enquiry_attachments table
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

-- Insert default enquiry types
INSERT INTO public.enquiry_types (school_id, name, description) VALUES
(1, 'Admission Inquiry', 'Inquiries from parents seeking admission for their children'),
(1, 'Job Vacancy', 'Inquiries from teachers and staff seeking employment opportunities'),
(1, 'General Inquiry', 'General inquiries about school services, facilities, or information'),
(1, 'Fee Inquiry', 'Inquiries related to fee structure, payment methods, or financial assistance')
ON CONFLICT DO NOTHING;

-- Insert default enquiry statuses
INSERT INTO public.enquiry_statuses (school_id, name, description, color, sort_order) VALUES
(1, 'New', 'Newly received inquiry', '#3b82f6', 1),
(1, 'In Progress', 'Inquiry is being processed', '#f59e0b', 2),
(1, 'Contacted', 'Initial contact has been made', '#8b5cf6', 3),
(1, 'Follow Up Required', 'Follow-up action needed', '#ef4444', 4),
(1, 'Approved', 'Inquiry approved/accepted', '#22c55e', 5),
(1, 'Rejected', 'Inquiry rejected/declined', '#6b7280', 6),
(1, 'On Hold', 'Inquiry temporarily on hold', '#f97316', 7),
(1, 'Resolved', 'Inquiry successfully resolved', '#059669', 8)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.enquiry_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_attachments ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view enquiry types for their school" ON public.enquiry_types
    FOR SELECT USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can view enquiry statuses for their school" ON public.enquiry_statuses
    FOR SELECT USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can view enquiries for their school" ON public.enquiries
    FOR SELECT USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can insert enquiries for their school" ON public.enquiries
    FOR INSERT WITH CHECK (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can update enquiries for their school" ON public.enquiries
    FOR UPDATE USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can view follow-ups for their school" ON public.enquiry_follow_ups
    FOR SELECT USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can insert follow-ups for their school" ON public.enquiry_follow_ups
    FOR INSERT WITH CHECK (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can view attachments for their school" ON public.enquiry_attachments
    FOR SELECT USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can insert attachments for their school" ON public.enquiry_attachments
    FOR INSERT WITH CHECK (school_id = current_setting('app.current_school_id')::bigint);

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
