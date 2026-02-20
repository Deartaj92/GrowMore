-- Trigger to fan-out announcements to notifications table
CREATE OR REPLACE FUNCTION public.handle_announcement_fanout()
RETURNS TRIGGER AS $$
DECLARE
    target_user RECORD;
BEGIN
    -- If active and starting today or earlier
    IF NEW.is_active = true THEN
        
        -- 1. Fan-out to STUDENTS
        IF NEW.audience_group = 'students' THEN
            FOR target_user IN 
                SELECT id FROM students 
                WHERE school_id = NEW.school_id
                AND (
                    NEW.target_scope = 'all' 
                    OR (NEW.target_scope = 'class' AND class_id = NEW.class_id AND (NEW.section_id IS NULL OR section_id = NEW.section_id))
                    OR (NEW.target_scope = 'single' AND id = NEW.student_id)
                    -- student_ids is a bigint[] array, so just use ANY()
                    OR (NEW.target_scope = 'multi' AND id = ANY(NEW.student_ids))
                )
            LOOP
                INSERT INTO public.notifications (
                    school_id,
                    recipient_id,
                    title,
                    message,
                    notification_type,
                    created_at
                ) VALUES (
                    NEW.school_id,
                    target_user.id,
                    NEW.title,
                    substring(NEW.message, 1, 200), -- Truncate message for notification
                    'announcement',
                    NOW()
                );
            END LOOP;
        END IF;

        -- 2. Fan-out to STAFF
        IF NEW.audience_group = 'staff' THEN
            FOR target_user IN 
                SELECT id FROM staff 
                WHERE school_id = NEW.school_id
                AND (
                    NEW.target_scope = 'all' 
                    OR (NEW.target_scope = 'role' AND role = NEW.staff_role)
                    OR (NEW.target_scope = 'single' AND id = NEW.staff_id)
                    -- staff_ids is a bigint[] array
                    OR (NEW.target_scope = 'multi' AND id = ANY(NEW.staff_ids))
                )
            LOOP
                INSERT INTO public.notifications (
                    school_id,
                    recipient_id,
                    title,
                    message,
                    notification_type,
                    created_at
                ) VALUES (
                    NEW.school_id,
                    target_user.id,
                    NEW.title,
                    substring(NEW.message, 1, 200),
                    'announcement',
                    NOW()
                );
            END LOOP;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_announcement_created ON public.announcements;
CREATE TRIGGER on_announcement_created
    AFTER INSERT ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_announcement_fanout();
