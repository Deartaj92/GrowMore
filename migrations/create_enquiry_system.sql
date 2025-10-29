-- Enquiry Management System Database Schema
-- This script creates tables for handling admission and job vacancy inquiries

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.enquiry_follow_ups CASCADE;
DROP TABLE IF EXISTS public.enquiry_attachments CASCADE;
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.enquiry_types CASCADE;
DROP TABLE IF EXISTS public.enquiry_statuses CASCADE;

-- Enquiry Types (Admission, Job Vacancy, etc.)
CREATE TABLE public.enquiry_types (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (name, school_id)
);

-- Enquiry Statuses (New, In Progress, Contacted, Approved, Rejected, etc.)
CREATE TABLE public.enquiry_statuses (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280', -- Hex color for UI
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (name, school_id)
);

-- Main Enquiries Table
CREATE TABLE public.enquiries (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    enquiry_type_id INTEGER NOT NULL REFERENCES public.enquiry_types(id) ON DELETE CASCADE,
    status_id INTEGER NOT NULL REFERENCES public.enquiry_statuses(id) ON DELETE CASCADE,
    
    -- Contact Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Enquiry Details
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Admission-specific fields (JSON for flexibility)
    admission_details JSONB,
    
    -- Job vacancy-specific fields (JSON for flexibility)
    job_details JSONB,
    
    -- Assignment and tracking
    assigned_to INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    source VARCHAR(50) DEFAULT 'website', -- website, phone, walk-in, referral, etc.
    
    -- Dates
    enquiry_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    first_contact_date TIMESTAMP WITH TIME ZONE,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    resolved_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes and internal comments
    internal_notes TEXT,
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL
);

-- Enquiry Follow-ups Table
CREATE TABLE public.enquiry_follow_ups (
    id SERIAL PRIMARY KEY,
    enquiry_id INTEGER NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Follow-up details
    follow_up_type VARCHAR(50) NOT NULL, -- call, email, meeting, sms, etc.
    subject VARCHAR(255),
    message TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
    
    -- Assignment
    assigned_to INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL
);

-- Enquiry Attachments Table
CREATE TABLE public.enquiry_attachments (
    id SERIAL PRIMARY KEY,
    enquiry_id INTEGER NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
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
    uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enquiries_school_id ON public.enquiries(school_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_type_id ON public.enquiries(enquiry_type_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status_id ON public.enquiries(status_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_to ON public.enquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_enquiries_enquiry_date ON public.enquiries(enquiry_date);
CREATE INDEX IF NOT EXISTS idx_enquiries_follow_up_date ON public.enquiries(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_enquiries_priority ON public.enquiries(priority);

CREATE INDEX IF NOT EXISTS idx_enquiry_follow_ups_enquiry_id ON public.enquiry_follow_ups(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_follow_ups_school_id ON public.enquiry_follow_ups(school_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_follow_ups_follow_up_date ON public.enquiry_follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_enquiry_follow_ups_status ON public.enquiry_follow_ups(status);

CREATE INDEX IF NOT EXISTS idx_enquiry_attachments_enquiry_id ON public.enquiry_attachments(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_attachments_school_id ON public.enquiry_attachments(school_id);

-- Insert default enquiry types
INSERT INTO public.enquiry_types (school_id, name, description) VALUES
(1, 'Admission Inquiry', 'Inquiries from parents seeking admission for their children'),
(1, 'Job Vacancy', 'Inquiries from teachers and staff seeking employment opportunities'),
(1, 'General Inquiry', 'General inquiries about school services, facilities, or information'),
(1, 'Fee Inquiry', 'Inquiries related to fee structure, payment methods, or financial assistance');

-- Insert default enquiry statuses
INSERT INTO public.enquiry_statuses (school_id, name, description, color, sort_order) VALUES
(1, 'New', 'Newly received inquiry', '#3b82f6', 1),
(1, 'In Progress', 'Inquiry is being processed', '#f59e0b', 2),
(1, 'Contacted', 'Initial contact has been made', '#8b5cf6', 3),
(1, 'Follow Up Required', 'Follow-up action needed', '#ef4444', 4),
(1, 'Approved', 'Inquiry approved/accepted', '#22c55e', 5),
(1, 'Rejected', 'Inquiry rejected/declined', '#6b7280', 6),
(1, 'On Hold', 'Inquiry temporarily on hold', '#f97316', 7),
(1, 'Resolved', 'Inquiry successfully resolved', '#059669', 8);

-- Enable Row Level Security
ALTER TABLE public.enquiry_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

CREATE POLICY "Users can update follow-ups for their school" ON public.enquiry_follow_ups
    FOR UPDATE USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can view attachments for their school" ON public.enquiry_attachments
    FOR SELECT USING (school_id = current_setting('app.current_school_id')::bigint);

CREATE POLICY "Users can insert attachments for their school" ON public.enquiry_attachments
    FOR INSERT WITH CHECK (school_id = current_setting('app.current_school_id')::bigint);

-- Grant necessary permissions
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
