-- Add avatar_url column to families table
ALTER TABLE families ADD COLUMN avatar_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN families.avatar_url IS 'URL to the family avatar image'; 