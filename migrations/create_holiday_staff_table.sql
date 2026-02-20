-- Create holiday_staff table to link holidays with specific staff members
CREATE TABLE IF NOT EXISTS public.holiday_staff (
    id SERIAL PRIMARY KEY,
    holiday_id INTEGER NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (holiday_id, staff_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_holiday_staff_holiday_id ON public.holiday_staff(holiday_id);
CREATE INDEX IF NOT EXISTS idx_holiday_staff_staff_id ON public.holiday_staff(staff_id);

-- Disable Row Level Security for now (can be enabled later with proper policies)
ALTER TABLE public.holiday_staff DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated role
GRANT ALL ON public.holiday_staff TO authenticated;
GRANT USAGE ON SEQUENCE public.holiday_staff_id_seq TO authenticated;

