-- Update announcement fanout to include families/parents
-- This allows announcements to be sent to parents just like students and staff

CREATE OR REPLACE FUNCTION public.handle_announcement_fanout()
RETURNS TRIGGER AS $$
DECLARE
    target_user RECORD;
    target_family RECORD;
    linked_student_ids INTEGER[];
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
            
            -- Also fan-out to PARENTS of these students
            -- Find all families that have linked students matching the criteria
            FOR target_family IN
                SELECT DISTINCT fm.family_id
                FROM family_members fm
                INNER JOIN students s ON s.id = fm.student_id
                WHERE s.school_id = NEW.school_id
                AND (
                    NEW.target_scope = 'all' 
                    OR (NEW.target_scope = 'class' AND s.class_id = NEW.class_id AND (NEW.section_id IS NULL OR s.section_id = NEW.section_id))
                    OR (NEW.target_scope = 'single' AND s.id = NEW.student_id)
                    OR (NEW.target_scope = 'multi' AND s.id = ANY(NEW.student_ids))
                )
            LOOP
                INSERT INTO public.notifications (
                    school_id,
                    family_recipient_id,
                    title,
                    message,
                    notification_type,
                    created_at
                ) VALUES (
                    NEW.school_id,
                    target_family.family_id,
                    NEW.title,
                    substring(NEW.message, 1, 200),
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

