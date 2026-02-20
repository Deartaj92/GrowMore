-- Migration: Add WhatsApp Notifications Permission for Attendance
-- This permission controls whether users can send WhatsApp/SMS notifications when marking attendance

-- Insert the permission if it doesn't exist
INSERT INTO permissions (key, name, description, category, path)
VALUES (
  'attendance.send_whatsapp_notifications',
  'Send WhatsApp Notifications',
  'Allow sending WhatsApp and SMS notifications when marking attendance',
  'Attendance',
  '/attendance/mark'
)
ON CONFLICT (key) DO NOTHING;

-- Note: This permission will need to be assigned to roles via role_permissions table
-- and can be overridden per user via user_permissions table through the Role Management interface

