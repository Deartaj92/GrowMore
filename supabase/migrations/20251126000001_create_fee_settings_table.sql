-- Create fee_settings table for storing fee-related settings per school
-- This table uses a JSON column to store settings flexibly for current and future needs

CREATE TABLE IF NOT EXISTS fee_settings (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Create index on school_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fee_settings_school_id ON fee_settings(school_id);

-- Create index on settings JSONB for efficient queries
CREATE INDEX IF NOT EXISTS idx_fee_settings_settings ON fee_settings USING GIN (settings);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fee_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_fee_settings_updated_at
  BEFORE UPDATE ON fee_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_fee_settings_updated_at();

-- Add comment to table
COMMENT ON TABLE fee_settings IS 'Stores fee-related settings for each school. Settings are stored as JSONB for flexibility.';

-- Add comment to columns
COMMENT ON COLUMN fee_settings.school_id IS 'Foreign key reference to schools table';
COMMENT ON COLUMN fee_settings.settings IS 'JSONB object containing all fee settings. Current settings: fee_default_print_type (invoice|thermal)';

-- Example of how to use:
-- Insert: INSERT INTO fee_settings (school_id, settings) VALUES (1, '{"fee_default_print_type": "invoice"}'::jsonb);
-- Update: UPDATE fee_settings SET settings = settings || '{"fee_default_print_type": "thermal"}'::jsonb WHERE school_id = 1;
-- Query: SELECT settings->>'fee_default_print_type' FROM fee_settings WHERE school_id = 1;

