-- Temporarily disable push notifications edge function trigger
-- This migration drops the trigger that calls the push-notifier edge function
-- To re-enable, run: supabase/migrations/20250121000001_enable_push_notifications_trigger.sql

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;

-- Add comment for reference
COMMENT ON FUNCTION public.trigger_push_notification() IS 
  'TEMPORARILY DISABLED: Edge function trigger for push notifications. To re-enable, run the enable_push_notifications_trigger migration.';

