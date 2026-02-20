-- Simple version: Make section_id nullable in attendance_records table
ALTER TABLE attendance_records 
ALTER COLUMN section_id DROP NOT NULL;


