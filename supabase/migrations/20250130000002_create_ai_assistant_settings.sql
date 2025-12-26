-- Migration: Create AI Assistant settings table
-- Stores AI API key (Groq API) and access control settings per school
-- Note: Field name kept as gemini_api_key for backward compatibility, but now used for Groq API key

-- Create ai_assistant_settings table
CREATE TABLE IF NOT EXISTS ai_assistant_settings (
    id SERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    gemini_api_key TEXT, -- Stores Groq API key (field name kept for backward compatibility)
    enabled BOOLEAN DEFAULT FALSE, -- Master switch to enable/disable AI assistant
    allowed_role_ids INTEGER[], -- Array of role IDs that can use AI assistant (NULL = all roles)
    allowed_user_ids INTEGER[], -- Array of user IDs that can use AI assistant (NULL = all users)
    max_requests_per_day INTEGER DEFAULT 50, -- Rate limiting per school
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one settings record per school
    UNIQUE(school_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_assistant_settings_school_id ON ai_assistant_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_settings_enabled ON ai_assistant_settings(enabled);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_ai_assistant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_ai_assistant_settings_updated_at
    BEFORE UPDATE ON ai_assistant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_assistant_settings_updated_at();

-- Add comment explaining the settings
COMMENT ON TABLE ai_assistant_settings IS 'Stores AI Assistant (Groq API) configuration and access controls per school. API key should be stored securely. Groq offers free tier with no billing required.';

