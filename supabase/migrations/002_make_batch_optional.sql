-- Make batch_id optional for students
-- This allows adding students without assigning them to a batch

ALTER TABLE students
ALTER COLUMN batch_id DROP NOT NULL;

-- Update the RLS policy for students to handle null batch_id
-- (Existing policies should work since they don't require batch_id)

-- Optional: Add a comment for documentation
COMMENT ON COLUMN students.batch_id IS 'Optional batch assignment. NULL means student is not assigned to any batch yet.';

