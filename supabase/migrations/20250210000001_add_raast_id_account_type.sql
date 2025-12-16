-- Add Raast ID as a system account type
-- This adds a new system account type for Raast ID payments

-- Insert Raast ID account type if it doesn't exist
INSERT INTO public.account_types (school_id, name, display_name, icon_name, is_system_type, is_active)
SELECT 1, 'raast_id', 'Raast ID', 'AccountBalance', true, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.account_types 
    WHERE name = 'raast_id' AND school_id = 1
);

-- Also insert for all existing schools
DO $$
DECLARE
    school_record RECORD;
BEGIN
    FOR school_record IN SELECT id FROM public.schools WHERE id != 1
    LOOP
        INSERT INTO public.account_types (school_id, name, display_name, icon_name, is_system_type, is_active)
        SELECT school_record.id, 'raast_id', 'Raast ID', 'AccountBalance', true, true
        WHERE NOT EXISTS (
            SELECT 1 FROM public.account_types 
            WHERE name = 'raast_id' AND school_id = school_record.id
        );
    END LOOP;
END $$;
