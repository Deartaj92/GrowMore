-- Re-enable push notifications edge function trigger
-- This migration restores the trigger that calls the push-notifier edge function
-- This reverses the changes made in: supabase/migrations/20250122000000_temporarily_disable_push_notifications_trigger.sql

-- Re-create the trigger
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.push_notification_token IS NOT NULL)
  EXECUTE FUNCTION public.trigger_push_notification();

-- Update comment to indicate it's re-enabled
COMMENT ON FUNCTION public.trigger_push_notification() IS 
  'Edge function trigger for push notifications. Calls the push-notifier edge function when a notification is created with a push_notification_token.';

