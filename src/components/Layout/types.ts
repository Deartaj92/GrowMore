import { ReactNode } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export interface MuteContextType {
  muted: boolean;
  toggleMute: () => void;
}

export interface PageHeaderContextType {
  setPageHeader: (header: string) => void;
}

export interface ProgressContextType {
  startProgress: (indeterminate?: boolean) => void;
  setProgress: (progress: number) => void;
  completeProgress: () => void;
  resetProgress: () => void;
}

export interface MenuItem {
  text: string;
  icon: ReactNode;
  path: string;
  allowedRoles: string[];
  submenu?: MenuItem[];
}

export interface AnnouncementIdentity {
  type: 'student' | 'staff';
  schoolId: number;
  studentId?: number;
  classId?: number;
  sectionId?: number;
  staffId?: number;
  role?: string;
  userId?: number;
}

export interface AnnouncementView {
  id?: number;
  announcement_id?: number;
  viewer_identifier: string;
  viewer_type?: string;
  viewer_role?: string;
  viewer_name?: string;
  student_id?: number;
  staff_id?: number;
  user_id?: number;
  viewer_device_id?: string;
  seen_at?: string;
}

export interface StudentInfo {
  id: number;
  name: string;
  school_id: number;
  class_id?: number | null;
  section_id?: number | null;
}

export interface ParentInfo {
  id: number;
  name: string;
  school_id: number;
  contact_person?: string | null;
  contact_number?: string | null;
  address?: string | null;
  avatar_url?: string | null;
}

export interface InstituteProfile {
  short_name?: string;
  name?: string;
  logo_url?: string;
  tagline?: string;
}

export interface StudentSearchSuggestion {
  id: number;
  name: string;
  father_name?: string;
  class_id: number;
  section_id: number;
  picture_url?: string;
  roll_number?: string | null;
  class_name?: string;
  section_name?: string;
}

