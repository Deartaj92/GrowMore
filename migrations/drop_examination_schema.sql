-- Drop Examination Schema and All Contents
-- This script removes the examination schema and all its objects

-- Drop the examination schema and all its contents
DROP SCHEMA IF EXISTS examination CASCADE;

-- Note: The CASCADE option will automatically drop all objects within the schema
-- including tables, functions, triggers, indexes, and other dependencies

-- Verify the schema has been dropped
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'examination';
