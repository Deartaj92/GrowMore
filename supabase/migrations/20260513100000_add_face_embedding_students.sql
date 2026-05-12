-- Compact face template for on-device / server-side matching (float32 vector).
-- 128 dimensions × 4 bytes = 512 bytes per student → ~0.5 MB raw for 1,000 students (well under typical 15–20 MB budget with indexes + overhead).

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS face_embedding bytea,
  ADD COLUMN IF NOT EXISTS face_embedding_dim smallint DEFAULT 128;

COMMENT ON COLUMN public.students.face_embedding IS 'Little-endian float32[face_embedding_dim] face descriptor; no raw images stored.';
COMMENT ON COLUMN public.students.face_embedding_dim IS 'Length of face_embedding vector (default 128 for face-api.js descriptor).';
