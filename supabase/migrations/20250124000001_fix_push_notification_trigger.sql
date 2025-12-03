-- Fix push notification trigger to fire for all notifications
-- The previous trigger had an incorrect condition that prevented it from firing
-- This migration removes the condition so push notifications are sent for all notification types

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;

-- Re-create the trigger WITHOUT the push_notification_token condition
-- The trigger should fire for ALL notifications, and the edge function will look up device tokens
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.recipient_id IS NOT NULL OR NEW.family_recipient_id IS NOT NULL)
  EXECUTE FUNCTION public.trigger_push_notification();

-- Update comment to reflect the correct behavior
COMMENT ON FUNCTION public.trigger_push_notification() IS 
  'Edge function trigger for push notifications. Automatically sends push notifications via the push-notifier edge function when a notification is inserted with a recipient_id or family_recipient_id. Works for all notification types including leave requests, complaints, suggestions, announcements, reports, etc.';

