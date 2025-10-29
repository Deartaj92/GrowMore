-- Drop the old constraint that prevents multiple subjects per period
ALTER TABLE timetable DROP CONSTRAINT timetable_class_id_period_index_day_of_week_session_id_scho_key;
