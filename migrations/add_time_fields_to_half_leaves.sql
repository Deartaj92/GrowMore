-- Add arrival_time and departure_time columns to half_leaves table
ALTER TABLE half_leaves 
ADD COLUMN IF NOT EXISTS arrival_time TIME,
ADD COLUMN IF NOT EXISTS departure_time TIME;

-- Add comments for clarity
COMMENT ON COLUMN half_leaves.arrival_time IS 'Arrival time for first half leave (when person arrives in afternoon after being absent in morning)';
COMMENT ON COLUMN half_leaves.departure_time IS 'Departure time for second half leave (when person leaves at half day after being present in morning)';

