-- Migration: Remove session_id from fee_plans and fee_structures
-- This makes fee plans and structures session-independent, sustaining across sessions

-- ==========================================
-- 1. FEE_PLANS TABLE
-- ==========================================

-- Drop indexes that include session_id
DROP INDEX IF EXISTS idx_fee_plans_session_student;
DROP INDEX IF EXISTS idx_fee_plans_school_session;

-- Drop unique constraint that includes session_id
ALTER TABLE public.fee_plans 
DROP CONSTRAINT IF EXISTS fee_plans_student_session_unique;

-- Create new unique constraint without session_id
ALTER TABLE public.fee_plans 
ADD CONSTRAINT fee_plans_student_unique UNIQUE (school_id, student_id);

-- Drop foreign key constraint on session_id
ALTER TABLE public.fee_plans 
DROP CONSTRAINT IF EXISTS fee_plans_session_id_fkey;

-- Remove session_id column
ALTER TABLE public.fee_plans 
DROP COLUMN IF EXISTS session_id;

-- ==========================================
-- 2. FEE_STRUCTURES TABLE
-- ==========================================

-- First, handle duplicates by keeping the most recent one for each class/fee_head combination
-- For non-sectioned classes (section_id IS NULL)
DELETE FROM public.fee_structures fs1
WHERE fs1.section_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.fee_structures fs2
  WHERE fs2.class_id = fs1.class_id
    AND fs2.fee_head_id = fs1.fee_head_id
    AND fs2.school_id = fs1.school_id
    AND fs2.section_id IS NULL
    AND fs2.id > fs1.id
);

-- For sectioned classes (section_id IS NOT NULL)
DELETE FROM public.fee_structures fs1
WHERE fs1.section_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM public.fee_structures fs2
  WHERE fs2.class_id = fs1.class_id
    AND fs2.section_id = fs1.section_id
    AND fs2.fee_head_id = fs1.fee_head_id
    AND fs2.school_id = fs1.school_id
    AND fs2.section_id IS NOT NULL
    AND fs2.id > fs1.id
);

-- Drop indexes that include session_id
DROP INDEX IF EXISTS idx_fee_structures_class_session;
DROP INDEX IF EXISTS idx_fee_structures_school_class_session;

-- Drop unique constraint that includes session_id
ALTER TABLE public.fee_structures 
DROP CONSTRAINT IF EXISTS fee_structures_class_section_session_fee_head_unique;
ALTER TABLE public.fee_structures 
DROP CONSTRAINT IF EXISTS fee_structures_unique;

-- Create new unique constraint without session_id
-- For sectioned classes: class_id, section_id, fee_head_id, school_id
-- For non-sectioned classes: class_id, fee_head_id, school_id (section_id is NULL)
-- We'll use a partial unique index for this
CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_unique_sectioned 
ON public.fee_structures (class_id, section_id, fee_head_id, school_id) 
WHERE section_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_unique_non_sectioned 
ON public.fee_structures (class_id, fee_head_id, school_id) 
WHERE section_id IS NULL;

-- Drop foreign key constraint on session_id
ALTER TABLE public.fee_structures 
DROP CONSTRAINT IF EXISTS fee_structures_session_id_fkey;

-- Remove session_id column
ALTER TABLE public.fee_structures 
DROP COLUMN IF EXISTS session_id;

-- ==========================================
-- 3. CREATE NEW INDEXES
-- ==========================================

-- Indexes for fee_plans
CREATE INDEX IF NOT EXISTS idx_fee_plans_school_student 
ON public.fee_plans(school_id, student_id);

CREATE INDEX IF NOT EXISTS idx_fee_plans_school_created 
ON public.fee_plans(school_id, created_at DESC);

-- Indexes for fee_structures
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_class 
ON public.fee_structures(school_id, class_id);

CREATE INDEX IF NOT EXISTS idx_fee_structures_school_fee_head 
ON public.fee_structures(school_id, fee_head_id);

-- ==========================================
-- 4. COMMENTS
-- ==========================================

COMMENT ON TABLE public.fee_plans IS 'Student fee plans that sustain across all sessions. Each student can have one fee plan per school.';
COMMENT ON TABLE public.fee_structures IS 'Fee structures per class/section that sustain across all sessions. Defines fee amounts for classes.';

