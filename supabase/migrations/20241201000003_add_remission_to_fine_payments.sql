-- Add remission column to fine_payments table
ALTER TABLE fine_payments ADD COLUMN IF NOT EXISTS remission DECIMAL(10,2) DEFAULT 0; 