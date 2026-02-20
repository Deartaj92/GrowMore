-- Check if enquiry tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'enquiry%'
ORDER BY table_name;

-- Check if enquiry_types table exists and has data
SELECT COUNT(*) as enquiry_types_count FROM public.enquiry_types;

-- Check what school_ids exist in enquiry_types
SELECT DISTINCT school_id FROM public.enquiry_types;

-- Check if the table is accessible
SELECT * FROM public.enquiry_types LIMIT 5;
