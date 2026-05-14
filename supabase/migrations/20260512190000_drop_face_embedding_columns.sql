-- Remove face-recognition enrollment columns (feature removed from app).
ALTER TABLE public.students
  DROP COLUMN IF EXISTS face_embedding,
  DROP COLUMN IF EXISTS face_embedding_dim;

ALTER TABLE public.staff
  DROP COLUMN IF EXISTS face_embedding,
  DROP COLUMN IF EXISTS face_embedding_dim;
