ALTER TABLE public.staff_attendance_records
ADD COLUMN IF NOT EXISTS paid_leave boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_records_paid_leave
ON public.staff_attendance_records (school_id, staff_id, date, paid_leave);
