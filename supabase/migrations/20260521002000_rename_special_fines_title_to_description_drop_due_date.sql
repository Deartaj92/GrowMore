-- Migration: Rename special_fines.title to description and remove due_date

ALTER TABLE public.special_fines
  RENAME COLUMN title TO description;

ALTER TABLE public.special_fines
  DROP COLUMN IF EXISTS due_date;
