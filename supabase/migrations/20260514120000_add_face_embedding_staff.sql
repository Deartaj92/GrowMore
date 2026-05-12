-- Staff face templates for QR attendance (same compact format as students).

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS face_embedding bytea,
  ADD COLUMN IF NOT EXISTS face_embedding_dim smallint DEFAULT 128;

COMMENT ON COLUMN public.staff.face_embedding IS 'Little-endian float32[face_embedding_dim] face descriptor; no raw images stored.';
COMMENT ON COLUMN public.staff.face_embedding_dim IS 'Length of face_embedding vector (default 128 for face-api.js descriptor).';
