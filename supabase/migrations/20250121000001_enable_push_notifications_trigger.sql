-- Enable push notifications for all notification types
-- This migration creates a database trigger that automatically calls the push-notifier
-- edge function whenever a notification is inserted into the notifications table
--
-- NOTE: This requires pg_net extension to be enabled in your Supabase project.
-- You can enable it via: Supabase Dashboard > Database > Extensions > pg_net
--
-- Also, you need to set the Supabase URL and Service Role Key as database settings:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project-ref.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- 1. Enable pg_net extension for HTTP requests (if not already enabled)
-- Note: This may require superuser privileges. If it fails, enable it via Supabase Dashboard
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  -- Extension might not be available or already enabled
  RAISE NOTICE 'pg_net extension may need to be enabled via Supabase Dashboard';
END $$;

-- 2. Create function to call push-notifier edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  function_url TEXT;
  service_role_key TEXT;
  payload JSONB;
  http_response_id BIGINT;
BEGIN
  -- Get Supabase URL from database settings or environment
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    -- Try to get from Supabase's built-in settings
    BEGIN
      supabase_url := current_setting('app.supabase_url', true);
    EXCEPTION WHEN OTHERS THEN
      -- If still not found, log warning and return (won't break the insert)
      RAISE WARNING 'Supabase URL not configured. Push notifications will not be sent.';
      RETURN NEW;
    END;
  END;

  -- Get service role key
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      service_role_key := current_setting('app.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Service role key not configured. Push notifications will not be sent.';
      RETURN NEW;
    END;
  END;

  -- Construct the edge function URL
  function_url := supabase_url || '/functions/v1/push-notifier';

  -- Build the payload matching the push-notifier function's expected format
  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'recipient_id', NEW.recipient_id,
      'family_recipient_id', NEW.family_recipient_id,
      'school_id', NEW.school_id,
      'title', NEW.title,
      'message', NEW.message,
      'notification_type', NEW.notification_type,
      'created_at', NEW.created_at
    )
  );

  -- Send push notification for both recipient_id and family_recipient_id notifications
  -- For recipient_id: send directly to that user
  -- For family_recipient_id: the push-notifier will need to handle finding family members
  IF NEW.recipient_id IS NOT NULL OR NEW.family_recipient_id IS NOT NULL THEN
    -- Make async HTTP request to push-notifier function
    -- Using pg_net.http_post for async non-blocking requests
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )::text,
      body := payload::text
    ) INTO http_response_id;
    
    -- Log for debugging (optional)
    -- RAISE NOTICE 'Push notification request sent for notification ID: %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the notification insert if push notification fails
  RAISE WARNING 'Failed to send push notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger to call push-notifier on notification insert
-- TEMPORARILY DISABLED: Edge function trigger
-- DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;
-- CREATE TRIGGER trigger_send_push_notification
--   AFTER INSERT ON public.notifications
--   FOR EACH ROW
--   EXECUTE FUNCTION public.trigger_push_notification();

-- Disable the trigger if it exists
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;

-- 4. Add comment for documentation
COMMENT ON FUNCTION public.trigger_push_notification() IS 
  'Automatically sends push notifications via the push-notifier edge function when a notification is inserted. Works for all notification types: activities, announcements, reports, leaves, complaints, suggestions, etc. Requires pg_net extension and Supabase URL/service role key to be configured.';

-- 5. Instructions for setup (commented out - for reference)
/*
-- To configure the Supabase URL and Service Role Key, run these commands:
-- Replace 'your-project-ref' with your actual Supabase project reference
-- Replace 'your-service-role-key' with your actual service role key from Supabase Dashboard

ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project-ref.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

-- Alternatively, you can set these via Supabase Dashboard > Database > Settings > Database Settings
*/

