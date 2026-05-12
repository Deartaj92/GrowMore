-- Optional QR token for attendance (same canonical hex format as rfid_uid when generated from QR tools).
-- Nullable: RFID-only users leave qr_uid empty; QR-only users may set qr_uid without rfid_uid.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS qr_uid text;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS qr_uid text;

COMMENT ON COLUMN public.students.qr_uid IS 'QR-encoded attendance token (typically same hex as RFID card UID)';
COMMENT ON COLUMN public.staff.qr_uid IS 'QR-encoded attendance token (typically same hex as RFID card UID)';
