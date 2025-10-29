-- Add frequency and auto_generate fields to fee_heads table
ALTER TABLE public.fee_heads 
ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'one-time')),
ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN DEFAULT FALSE;

-- Update existing records to have default values
UPDATE public.fee_heads 
SET frequency = 'monthly' WHERE frequency IS NULL;

UPDATE public.fee_heads 
SET auto_generate = FALSE WHERE auto_generate IS NULL; 