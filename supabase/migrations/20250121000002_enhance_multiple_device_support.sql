-- Enhance multiple device support for push notifications
-- This migration ensures users can receive push notifications on all their registered devices

-- 1. Add device identifier column to track devices better (optional but helpful)
-- This allows us to identify different devices even if they have similar platforms
ALTER TABLE public.device_push_tokens 
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 2. Create index for faster lookups by user_id (for fetching all devices per user)
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_school 
ON public.device_push_tokens(user_id, school_id);

-- 3. Add comment to clarify multiple device support
COMMENT ON TABLE public.device_push_tokens IS 
  'Stores push notification tokens for user devices. Each user can have multiple tokens (one per device). Each token is unique and belongs to only one user at a time. When a notification is sent, it is delivered to ALL registered devices for that user.';

-- 4. Update the upsert function to handle device_id (optional enhancement)
-- The function already supports multiple devices per user since it uses ON CONFLICT (token)
-- This just adds device_id tracking if needed
--
-- IMPORTANT: Device Token Reassignment Behavior
-- When a different user logs into the same device:
-- 1. The device generates the same push token (device-specific)
-- 2. The upsert function detects the conflict (same token, different user)
-- 3. The ON CONFLICT clause updates the record to point to the NEW user
-- 4. The device will now receive push notifications for the NEW user only
-- 5. The previous user will no longer receive notifications on that device
--
-- This ensures that:
-- - Each device token belongs to only ONE user at a time (the currently logged-in user)
-- - Push notifications go to the correct user (the one currently using the device)
-- - No security/privacy issues (previous user doesn't see new user's notifications)
--
-- First, drop all existing versions of the function to avoid ambiguity
DROP FUNCTION IF EXISTS public.upsert_device_token(BIGINT, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_device_token(BIGINT, BIGINT, TEXT, TEXT, TEXT);

-- Now create the new function with device_id parameter
CREATE OR REPLACE FUNCTION public.upsert_device_token(
    p_user_id BIGINT,
    p_school_id BIGINT,
    p_platform TEXT,
    p_token TEXT,
    p_user_type TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.device_push_tokens (
        user_id, 
        school_id, 
        platform, 
        token, 
        user_type, 
        device_id,
        last_seen_at
    )
    VALUES (
        p_user_id, 
        p_school_id, 
        p_platform, 
        p_token, 
        p_user_type, 
        p_device_id,
        NOW()
    )
    ON CONFLICT (token)
    DO UPDATE SET
        user_id      = EXCLUDED.user_id,  -- Update to new user
        school_id    = EXCLUDED.school_id,
        platform     = EXCLUDED.platform,
        user_type    = EXCLUDED.user_type,
        device_id    = COALESCE(EXCLUDED.device_id, device_push_tokens.device_id),
        last_seen_at = NOW();
END;
$$;

-- 5. Create a function to get all device tokens for a user (for verification/debugging)
CREATE OR REPLACE FUNCTION public.get_user_device_tokens(
    p_user_id BIGINT,
    p_school_id BIGINT
)
RETURNS TABLE (
    token TEXT,
    platform TEXT,
    device_id TEXT,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dpt.token,
        dpt.platform,
        dpt.device_id,
        dpt.last_seen_at,
        dpt.created_at
    FROM public.device_push_tokens dpt
    WHERE dpt.user_id = p_user_id
      AND dpt.school_id = p_school_id
    ORDER BY dpt.last_seen_at DESC;
END;
$$;

-- 6. Add comment explaining multiple device support and token reassignment
COMMENT ON FUNCTION public.upsert_device_token IS 
  'Registers or updates a device push token. Supports multiple devices per user - each device gets a unique token. When a notification is sent, it is delivered to ALL registered devices for that user. IMPORTANT: When a different user logs into the same device, the token is automatically reassigned to the new user via ON CONFLICT (token) DO UPDATE. This ensures the device receives notifications for the currently logged-in user only.';

