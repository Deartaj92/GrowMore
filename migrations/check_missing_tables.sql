-- Check what enquiry tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'enquiry%'
ORDER BY table_name;

-- Check if enquiries table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'enquiries'
) as enquiries_table_exists;

-- Check if enquiry_statuses table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'enquiry_statuses'
) as enquiry_statuses_table_exists;
