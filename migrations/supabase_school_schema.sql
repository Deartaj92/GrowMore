CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Supabase School Management Schema

-- Drop tables in order to avoid foreign key conflicts
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS super_admins CASCADE;
DROP TABLE IF EXISTS school_admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS class_subjects CASCADE;
DROP TABLE IF EXISTS teacher_subjects CASCADE;
DROP TABLE IF EXISTS teacher_class_subjects CASCADE;
DROP TABLE IF EXISTS report_categories CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS report_actions CASCADE;
DROP TABLE IF EXISTS reports_updates CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS fine_payments CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS student_class_history CASCADE;
DROP TABLE IF EXISTS student_status_history CASCADE;
DROP TABLE IF EXISTS institute_profile CASCADE;
DROP TABLE IF EXISTS holiday_classes CASCADE;
DROP TABLE IF EXISTS fines CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create schools table first (parent table for multi-tenancy)
CREATE TABLE schools (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact VARCHAR(100),
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for schools updated_at
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default school
INSERT INTO schools (id, name, address, contact, email, status) 
VALUES (1, 'Default School', 'Default Address', 'Default Contact', 'default@school.com', 'active')
ON CONFLICT (id) DO NOTHING;


-- Users table first since it's referenced by other tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  mobile VARCHAR(20),
  staff_id INTEGER,  -- Will add the foreign key constraint later
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_staff ON users(staff_id);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create base tables with school_id for multi-tenancy
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, school_id)
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, school_id)
);

-- Create staff table before sections
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  mobile VARCHAR(20),
  picture_url TEXT,
  joining_date DATE,
  salary NUMERIC(12,2),
  father_name VARCHAR(255),
  gender VARCHAR(20),
  experience VARCHAR(100),
  national_id VARCHAR(50),
  education VARCHAR(100),
  religion VARCHAR(50),
  blood_group VARCHAR(10),
  email VARCHAR(100),
  dob DATE,
  address TEXT,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for staff updated_at
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Now create sections which depends on staff
CREATE TABLE sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, class_id, session_id, school_id)
);

-- Students table (NO status_reason)
CREATE TABLE students (
    id INTEGER PRIMARY KEY, -- Changed from SERIAL to allow manual ID assignment per school
    name VARCHAR(255) NOT NULL,
    class_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    admission_date DATE NOT NULL,
    discount_in_fee DECIMAL(10,2),
    phone VARCHAR(20),
    picture_url TEXT,
    dob DATE,
    form_b VARCHAR(50),
    gender VARCHAR(20),
    "cast" VARCHAR(50),
    orphan VARCHAR(50),
    osc VARCHAR(50),
    id_mark TEXT,
    blood_group VARCHAR(10),
    previous_school VARCHAR(255),
    previous_id VARCHAR(50),
    religion VARCHAR(50),
    nationality VARCHAR(100),
    family VARCHAR(50),
    disease TEXT,
    additional_note TEXT,
    total_siblings INTEGER,
    address TEXT,
    father_name VARCHAR(255),
    father_national_id VARCHAR(50),
    father_education VARCHAR(100),
    father_mobile VARCHAR(20),
    father_occupation VARCHAR(100),
    father_profession VARCHAR(100),
    father_income DECIMAL(10,2),
    mother_name VARCHAR(255),
    mother_national_id VARCHAR(50),
    mother_education VARCHAR(100),
    mother_mobile VARCHAR(20),
    mother_occupation VARCHAR(100),
    mother_profession VARCHAR(100),
    mother_income DECIMAL(10,2),
    session_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    status_updated_at TIMESTAMP WITH TIME ZONE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX idx_students_class_section ON students(class_id, section_id);
CREATE INDEX idx_students_session ON students(session_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_school ON students(school_id);

-- Add unique constraint for school-specific student IDs
ALTER TABLE students ADD CONSTRAINT students_id_school_unique UNIQUE(id, school_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Student status history table (all status change details here)
CREATE TABLE student_status_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  action VARCHAR(32),
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  old_class_id INTEGER,
  new_class_id INTEGER,
  reason TEXT,
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  new_section_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE
);

CREATE INDEX idx_status_history_student ON student_status_history(student_id);
CREATE INDEX idx_status_history_school ON student_status_history(school_id);
CREATE INDEX idx_status_history_student_school ON student_status_history(student_id, school_id);

-- Table to track student class/section/session history
CREATE TABLE student_class_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date DATE,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  promoted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE
);

-- Table to track daily attendance
CREATE TABLE attendance_records (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('present', 'absent', 'leave', 'late')),
  remarks TEXT,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE,
  UNIQUE (student_id, date, session_id)
);

-- Table for class-wise fine settings
CREATE TABLE fines (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    absent_fine DECIMAL(10,2) NOT NULL DEFAULT 0,
    late_fine DECIMAL(10,2) NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (class_id, effective_from, school_id)
);

CREATE TRIGGER update_fines_updated_at
    BEFORE UPDATE ON fines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
-- Holidays table
CREATE TABLE holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES holidays(id) ON DELETE CASCADE,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (start_date <= end_date)
);

CREATE INDEX idx_holidays_dates ON holidays(start_date, end_date);
CREATE INDEX idx_holidays_session ON holidays(session_id);
CREATE INDEX idx_holidays_parent ON holidays(parent_id);
CREATE INDEX idx_holidays_school ON holidays(school_id);

CREATE TRIGGER update_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Holiday classes table for holiday-class-section assignments
CREATE TABLE holiday_classes (
  id SERIAL PRIMARY KEY,
  holiday_id INTEGER REFERENCES holidays(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (holiday_id, class_id, section_id, school_id)
);

-- Create indexes for holiday_classes table
CREATE INDEX idx_holiday_classes_holiday ON holiday_classes(holiday_id);
CREATE INDEX idx_holiday_classes_class ON holiday_classes(class_id);
CREATE INDEX idx_holiday_classes_section ON holiday_classes(section_id);
CREATE INDEX idx_holiday_classes_school ON holiday_classes(school_id);

-- Create trigger for holiday_classes updated_at
CREATE TRIGGER update_holiday_classes_updated_at
    BEFORE UPDATE ON holiday_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Institute profile table
CREATE TABLE institute_profile (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  tagline VARCHAR(255),
  address TEXT,
  phone VARCHAR(100),
  website VARCHAR(255),
  country VARCHAR(100),
  logo_url TEXT,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sch_student ON student_class_history(student_id);
CREATE INDEX idx_sch_class_session ON student_class_history(class_id, session_id);
CREATE INDEX idx_sch_section_session ON student_class_history(section_id, session_id);
CREATE INDEX idx_sch_school ON student_class_history(school_id);
CREATE INDEX idx_sch_student_school ON student_class_history(student_id, school_id);

-- Fine payments table
CREATE TABLE fine_payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    remission DECIMAL(10,2) DEFAULT 0,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    remarks TEXT,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE
);

-- Families table
CREATE TABLE families (
    id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  contact_number VARCHAR(20),
    address TEXT,
  avatar_url TEXT,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Family members table
CREATE TABLE family_members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    is_primary_contact BOOLEAN DEFAULT FALSE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE
);

CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_student ON family_members(student_id);
CREATE INDEX idx_family_members_school ON family_members(school_id);
CREATE INDEX idx_family_members_student_school ON family_members(student_id, school_id);

CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Super admins table (global, no school_id needed)
CREATE TABLE super_admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  mobile VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TRIGGER update_super_admins_updated_at
    BEFORE UPDATE ON super_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();



-- Insert default super admin
INSERT INTO super_admins (username, name, email, password, status)
VALUES ('ali', 'Default Admin', 'admin@school.com', 'aa', 'active')
ON CONFLICT (username) DO NOTHING;



-- School admins table
CREATE TABLE school_admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  mobile VARCHAR(20),
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_school_admins_updated_at
    BEFORE UPDATE ON school_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add staff_id foreign key constraint to users table now that staff table exists
ALTER TABLE users ADD CONSTRAINT users_staff_id_fkey 
FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL;

-- Add school_admin_id column and foreign key constraint after users table is created
ALTER TABLE schools 
  ADD COLUMN school_admin_id BIGINT,
  ADD CONSTRAINT schools_school_admin_id_fkey FOREIGN KEY (school_admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- Subjects table
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    has_practical BOOLEAN DEFAULT FALSE NOT NULL,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(code, school_id)
);

-- Class subjects table
CREATE TABLE class_subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (class_id, subject_id, school_id)
);

CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX idx_subjects_school ON subjects(school_id);
CREATE INDEX idx_class_subjects_school ON class_subjects(school_id);

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_subjects_updated_at
    BEFORE UPDATE ON class_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Teacher subjects table
CREATE TABLE teacher_subjects (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (teacher_id, subject_id, school_id)
);

CREATE INDEX idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_subjects_subject ON teacher_subjects(subject_id);
CREATE INDEX idx_teacher_subjects_school ON teacher_subjects(school_id);

CREATE TRIGGER update_teacher_subjects_updated_at
    BEFORE UPDATE ON teacher_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Teacher class subjects table
CREATE TABLE teacher_class_subjects (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    class_subject_id INTEGER REFERENCES class_subjects(id) ON DELETE CASCADE,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (teacher_id, class_subject_id, school_id)
);

CREATE INDEX idx_teacher_class_subjects_teacher ON teacher_class_subjects(teacher_id);
CREATE INDEX idx_teacher_class_subjects_class_subject ON teacher_class_subjects(class_subject_id);
CREATE INDEX idx_teacher_class_subjects_school ON teacher_class_subjects(school_id);

CREATE TRIGGER update_teacher_class_subjects_updated_at
    BEFORE UPDATE ON teacher_class_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Timetable table
CREATE TABLE timetable (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  period_index INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  break_index INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (class_id, period_index, day_of_week, session_id, school_id, subject_id, teacher_id)
);

CREATE INDEX idx_timetable_class_period ON timetable(class_id, period_index);
CREATE INDEX idx_timetable_session ON timetable(session_id);
CREATE INDEX idx_timetable_subject_teacher ON timetable(subject_id, teacher_id);
CREATE INDEX idx_timetable_school ON timetable(school_id);
CREATE INDEX idx_timetable_break_index ON timetable(break_index);
CREATE INDEX idx_timetable_class_period_day_session ON timetable(class_id, period_index, day_of_week, session_id, school_id);

CREATE TRIGGER update_timetable_updated_at
    BEFORE UPDATE ON timetable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Report categories table
CREATE TABLE report_categories (
    id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('student', 'staff')),
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (name, type, school_id)
);

-- Reports table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES report_categories(id) ON DELETE CASCADE,
    subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('student', 'staff')),
    student_id INTEGER,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    reported_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE,
    CONSTRAINT subject_type_check CHECK (
        (subject_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
        (subject_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
    )
);

-- Report Actions table
CREATE TABLE report_actions (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    action_taken TEXT NOT NULL,
    taken_by INTEGER REFERENCES users(id),
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports Updates table to track chronological updates
CREATE TABLE reports_updates (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    updated_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    previous_status VARCHAR(20) CHECK (previous_status IN ('pending', 'in_review', 'resolved', 'dismissed')),
    new_status VARCHAR(20) CHECK (new_status IN ('pending', 'in_review', 'resolved', 'dismissed')),
    update_note TEXT NOT NULL,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_reports_category ON reports(category_id);
CREATE INDEX idx_reports_student ON reports(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_reports_staff ON reports(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX idx_reports_reporter ON reports(reported_by);
CREATE INDEX idx_reports_school ON reports(school_id);
CREATE INDEX idx_report_actions_report ON report_actions(report_id);
CREATE INDEX idx_report_actions_school ON report_actions(school_id);
CREATE INDEX idx_reports_updates_report ON reports_updates(report_id);
CREATE INDEX idx_reports_updates_user ON reports_updates(updated_by);
CREATE INDEX idx_reports_updates_status ON reports_updates(new_status);
CREATE INDEX idx_reports_updates_created ON reports_updates(created_at);
CREATE INDEX idx_reports_updates_school ON reports_updates(school_id);
CREATE INDEX idx_report_categories_school ON report_categories(school_id);

-- Add trigger for updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_categories_updated_at
    BEFORE UPDATE ON report_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default report categories for students
INSERT INTO report_categories (name, type, school_id) VALUES
    ('Homework Incomplete', 'student', 1),
    ('Notebook Incomplete', 'student', 1),
    ('Fighting', 'student', 1),
    ('Misbehavior', 'student', 1),
    ('Leaving School Premises', 'student', 1),
    ('Dress Code Violation', 'student', 1),
    ('Unauthorized Device Usage', 'student', 1),
    ('Cheating', 'student', 1),
    ('School Property Damage', 'student', 1),
    ('Other', 'student', 1);

-- Insert default report categories for staff
INSERT INTO report_categories (name, type, school_id) VALUES
    ('Unchecked Note Books', 'staff', 1),
    ('Unchecked Homework', 'staff', 1),
    ('Unchecked Diary', 'staff', 1),
    ('Class Time Management', 'staff', 1),
    ('Poor Checking', 'staff', 1),
    ('Poor Class Management', 'staff', 1),
    ('Unprofessional Conduct', 'staff', 1),
    ('Late to Duty', 'staff', 1),
    ('Use of Mobile Phone', 'staff', 1),
    ('Other', 'staff', 1);

-- Create stored procedure for updating reports
CREATE OR REPLACE FUNCTION update_report(
    p_report_id INTEGER,
    p_new_status VARCHAR,
    p_previous_status VARCHAR,
    p_update_note TEXT,
    p_updated_by INTEGER
) RETURNS void AS $$
BEGIN
    -- Update the report status
    UPDATE reports 
    SET status = p_new_status
    WHERE id = p_report_id;

    -- Insert the update record
    INSERT INTO reports_updates (
        report_id,
        updated_by,
        previous_status,
        new_status,
        update_note
    ) VALUES (
        p_report_id,
        p_updated_by,
        p_previous_status,
        p_new_status,
        p_update_note
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is super admin or principal
CREATE OR REPLACE FUNCTION is_super_admin_or_principal()
RETURNS BOOLEAN AS $$
DECLARE
  _username TEXT;
  _password TEXT;
  _is_super_admin BOOLEAN;
  _is_principal BOOLEAN;
BEGIN
  -- Get the current auth context
  _username := NULLIF(current_setting('request.jwt.claim.username', TRUE), '');
  _password := NULLIF(current_setting('request.jwt.claim.password', TRUE), '');

  -- If no auth context, return false
  IF _username IS NULL OR _password IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if super admin
  SELECT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE username = _username 
    AND password = _password
    AND status = 'active'
  ) INTO _is_super_admin;

  -- Check if principal
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE username = _username 
    AND password = _password
    AND role = 'Principal'
    AND status = 'active'
  ) INTO _is_principal;

  -- For debugging
  RAISE NOTICE 'Auth check: username=%, is_super_admin=%, is_principal=%', _username, _is_super_admin, _is_principal;

  RETURN _is_super_admin OR _is_principal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable RLS on all tables
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE timetable DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies
DROP POLICY IF EXISTS staff_select ON staff;
DROP POLICY IF EXISTS staff_insert ON staff;
DROP POLICY IF EXISTS staff_update ON staff;
DROP POLICY IF EXISTS staff_delete ON staff;
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_delete ON users;
DROP POLICY IF EXISTS subjects_super_admin_principal ON subjects;
DROP POLICY IF EXISTS classes_super_admin_principal ON classes;
DROP POLICY IF EXISTS sections_super_admin_principal ON sections;
DROP POLICY IF EXISTS students_super_admin_principal ON students;
DROP POLICY IF EXISTS attendance_records_super_admin_principal ON attendance_records;
DROP POLICY IF EXISTS reports_super_admin_principal ON reports;
DROP POLICY IF EXISTS holidays_super_admin_principal ON holidays;

-- Grant all permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Function to get the next student ID for a school
CREATE OR REPLACE FUNCTION get_next_student_id(school_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the highest existing student ID for this school
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id
  FROM students 
  WHERE students.school_id = get_next_student_id.school_id;
  
  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Fee Management Tables
-- Fee heads table
CREATE TABLE fee_heads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_amount DECIMAL(10,2) DEFAULT 0,
    frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'one-time')),
    auto_generate BOOLEAN DEFAULT FALSE,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, school_id)
);

-- Fee structures table
CREATE TABLE fee_structures (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    fee_head_id INTEGER REFERENCES fee_heads(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, fee_head_id, session_id, school_id)
);

-- Fee invoices table
CREATE TABLE fee_invoices (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
    due_date DATE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id, school_id) REFERENCES students(id, school_id) ON DELETE CASCADE,
    UNIQUE(student_id, session_id, month, year, school_id)
);

-- Fee invoice items table
CREATE TABLE fee_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES fee_invoices(id) ON DELETE CASCADE,
    fee_head_id INTEGER REFERENCES fee_heads(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fee payments table
CREATE TABLE fee_payments (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL,
    invoice_id INTEGER NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    reference_no VARCHAR(100),
    received_by INTEGER,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discount_amount NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(10,2) NOT NULL
);

-- Fee payment items table
CREATE TABLE fee_payment_items (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES fee_payments(id) ON DELETE CASCADE,
    fee_item_id INTEGER REFERENCES fee_invoice_items(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fee management tables
CREATE INDEX idx_fee_heads_school ON fee_heads(school_id);
CREATE INDEX idx_fee_structures_class ON fee_structures(class_id);
CREATE INDEX idx_fee_structures_fee_head ON fee_structures(fee_head_id);
CREATE INDEX idx_fee_structures_session ON fee_structures(session_id);
CREATE INDEX idx_fee_structures_school ON fee_structures(school_id);
CREATE INDEX idx_fee_invoices_student ON fee_invoices(student_id);
CREATE INDEX idx_fee_invoices_session ON fee_invoices(session_id);
CREATE INDEX idx_fee_invoices_school ON fee_invoices(school_id);
CREATE INDEX idx_fee_invoice_items_invoice ON fee_invoice_items(invoice_id);
CREATE INDEX idx_fee_invoice_items_fee_head ON fee_invoice_items(fee_head_id);
CREATE INDEX idx_fee_invoice_items_school ON fee_invoice_items(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_id ON fee_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON fee_payments(school_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_discount ON fee_payments(discount_amount) WHERE discount_amount > 0;
CREATE INDEX IF NOT EXISTS idx_fee_payments_net_amount ON fee_payments(net_amount);
CREATE INDEX idx_fee_payment_items_payment ON fee_payment_items(payment_id);
CREATE INDEX idx_fee_payment_items_fee_item ON fee_payment_items(fee_item_id);
CREATE INDEX idx_fee_payment_items_school ON fee_payment_items(school_id);

-- Create triggers for updated_at
CREATE TRIGGER update_fee_heads_updated_at
    BEFORE UPDATE ON fee_heads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at
    BEFORE UPDATE ON fee_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_invoices_updated_at
    BEFORE UPDATE ON fee_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_invoice_items_updated_at
    BEFORE UPDATE ON fee_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at
    BEFORE UPDATE ON fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_payment_items_updated_at
    BEFORE UPDATE ON fee_payment_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_next_student_id(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_student_id(BIGINT) TO anon;

CREATE INDEX idx_attendance_records_student_school ON attendance_records(student_id, school_id);
CREATE INDEX idx_fine_payments_student_school ON fine_payments(student_id, school_id);
CREATE INDEX idx_reports_student_school ON reports(student_id, school_id);

 