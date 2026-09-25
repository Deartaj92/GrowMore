-- Migration: 20260918000000_create_timetable_schema.sql
-- Description: Ensures full schema support for multi-day timetable management, room allocation, period spans, time slots, and break settings.

-- 1. Create or Update timetable table
CREATE TABLE IF NOT EXISTS public.timetable (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL,
    session_id BIGINT NOT NULL,
    class_id BIGINT NOT NULL,
    period_index INT NOT NULL,
    subject_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    day_of_week INT NOT NULL DEFAULT 1,
    room TEXT,
    section_id BIGINT,
    span INT DEFAULT 1,
    break_index INT DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if timetable table already existed with missing columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable' AND column_name = 'day_of_week') THEN
        ALTER TABLE public.timetable ADD COLUMN day_of_week INT NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable' AND column_name = 'room') THEN
        ALTER TABLE public.timetable ADD COLUMN room TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable' AND column_name = 'section_id') THEN
        ALTER TABLE public.timetable ADD COLUMN section_id BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable' AND column_name = 'span') THEN
        ALTER TABLE public.timetable ADD COLUMN span INT DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable' AND column_name = 'break_index') THEN
        ALTER TABLE public.timetable ADD COLUMN break_index INT DEFAULT 4;
    END IF;
END $$;

-- 2. Create timetable_periods table for custom time slot configurations
CREATE TABLE IF NOT EXISTS public.timetable_periods (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL,
    period_index INT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT timetable_periods_school_period_unique UNIQUE (school_id, period_index)
);

-- 3. Create timetable_settings table for break time configuration
CREATE TABLE IF NOT EXISTS public.timetable_settings (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL UNIQUE,
    break_after_period_index INT NOT NULL DEFAULT 4,
    break_start_time TEXT NOT NULL DEFAULT '11:00',
    break_end_time TEXT NOT NULL DEFAULT '11:15',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) and permissive access policies
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users on timetable" ON public.timetable;
CREATE POLICY "Allow all for authenticated users on timetable" ON public.timetable FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users on timetable_periods" ON public.timetable_periods;
CREATE POLICY "Allow all for authenticated users on timetable_periods" ON public.timetable_periods FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users on timetable_settings" ON public.timetable_settings;
CREATE POLICY "Allow all for authenticated users on timetable_settings" ON public.timetable_settings FOR ALL USING (true) WITH CHECK (true);

-- 5. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_timetable_school_session ON public.timetable(school_id, session_id);
CREATE INDEX IF NOT EXISTS idx_timetable_school_session_day ON public.timetable(school_id, session_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON public.timetable(school_id, teacher_id);
