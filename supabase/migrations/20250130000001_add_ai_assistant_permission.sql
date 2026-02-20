-- Migration: Add AI Assistant permission
-- This allows administrators to control who can use the AI assistant feature

-- Add AI Assistant permission
INSERT INTO permissions (key, name, description, category, path) 
VALUES (
  'ai-assistant', 
  'AI Assistant', 
  'Access to AI-powered assistant for app guidance and help', 
  'Settings', 
  NULL
) ON CONFLICT (key) DO NOTHING;

