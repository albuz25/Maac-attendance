-- Add start_time and end_time columns to batches table
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Update existing batches with default times based on timing field
-- This is a best-effort migration for existing data
UPDATE batches 
SET start_time = '10:00:00', end_time = '11:30:00'
WHERE start_time IS NULL;

-- Make the columns NOT NULL after setting defaults
ALTER TABLE batches
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN batches.start_time IS 'Start time of the batch class';
COMMENT ON COLUMN batches.end_time IS 'End time of the batch class';

