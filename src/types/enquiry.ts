// Enquiry Management System TypeScript Interfaces

export interface EnquiryType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EnquiryStatus {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdmissionDetails {
  student_name?: string;
  student_age?: number;
  student_dob?: string;
  current_class?: string;
  current_school?: string;
  preferred_class?: string;
  preferred_section?: string;
  academic_year?: string;
  transport_required?: boolean;
  hostel_required?: boolean;
  special_requirements?: string;
  previous_academic_records?: string;
  parent_occupation?: string;
  family_income?: string;
  emergency_contact?: string;
  reference_source?: string;
}

export interface JobDetails {
  position_applied?: string;
  department?: string;
  experience_years?: number;
  current_position?: string;
  current_salary?: string;
  expected_salary?: string;
  availability_date?: string;
  qualifications?: string;
  certifications?: string;
  languages_spoken?: string;
  computer_skills?: string;
  teaching_subjects?: string[];
  previous_schools?: string;
  references?: string;
  cv_attached?: boolean;
  interview_preferred_date?: string;
  interview_preferred_time?: string;
}

export interface Enquiry {
  id: number;
  school_id: number;
  enquiry_type_id: number;
  status_id: number;
  
  // Contact Information
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  
  // Enquiry Details
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Type-specific details
  admission_details?: AdmissionDetails;
  job_details?: JobDetails;
  
  // Assignment and tracking
  assigned_to?: number;
  source: string;
  
  // Dates
  enquiry_date: string;
  first_contact_date?: string;
  last_contact_date?: string;
  follow_up_date?: string;
  resolved_date?: string;
  
  // Notes
  internal_notes?: string;
  resolution_notes?: string;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  
  // Related data
  enquiry_type?: EnquiryType;
  status?: EnquiryStatus;
  assigned_user?: {
    id: number;
    name: string;
    email: string;
  };
  follow_ups?: EnquiryFollowUp[];
  attachments?: EnquiryAttachment[];
}

export interface EnquiryFollowUp {
  id: number;
  enquiry_id: number;
  school_id: number;
  
  // Follow-up details
  follow_up_type: 'call' | 'email' | 'meeting' | 'sms' | 'whatsapp' | 'visit';
  subject?: string;
  message?: string;
  follow_up_date: string;
  completed_date?: string;
  
  // Status
  status: 'pending' | 'completed' | 'cancelled' | 'rescheduled';
  
  // Assignment
  assigned_to?: number;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  
  // Related data
  assigned_user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface EnquiryAttachment {
  id: number;
  enquiry_id: number;
  school_id: number;
  
  // File details
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  mime_type?: string;
  
  // Description
  description?: string;
  
  // Metadata
  uploaded_at?: string;
  uploaded_by?: number;
  
  // Related data
  uploaded_user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface EnquiryFormData {
  enquiry_type_id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  admission_details?: Partial<AdmissionDetails>;
  job_details?: Partial<JobDetails>;
}

export interface EnquiryFilters {
  enquiry_type_id?: number;
  status_id?: number;
  assigned_to?: number;
  priority?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface EnquiryStats {
  total_enquiries: number;
  new_enquiries: number;
  in_progress_enquiries: number;
  resolved_enquiries: number;
  pending_follow_ups: number;
  overdue_follow_ups: number;
  enquiries_by_type: Array<{
    type_name: string;
    count: number;
  }>;
  enquiries_by_status: Array<{
    status_name: string;
    count: number;
    color: string;
  }>;
  enquiries_by_priority: Array<{
    priority: string;
    count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    count: number;
  }>;
}

export interface EnquiryDashboardData {
  stats: EnquiryStats;
  recent_enquiries: Enquiry[];
  pending_follow_ups: EnquiryFollowUp[];
  overdue_follow_ups: EnquiryFollowUp[];
  top_enquiry_sources: Array<{
    source: string;
    count: number;
  }>;
}
