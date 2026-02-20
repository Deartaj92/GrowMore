-- Migration: Add user-specific permission overrides
-- This allows individual users to have different permissions than their role

-- Create user_permissions table for user-specific permission overrides
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = granted, FALSE = explicitly denied
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);

-- Add comment explaining the permission system
COMMENT ON TABLE user_permissions IS 'User-specific permission overrides. If a user has a permission here, it overrides their role permissions. granted=true means permission is granted, granted=false means explicitly denied.';

