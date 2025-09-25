-- Fix is_trained defaults - all sources should be untrained by default
-- Only sources that have been explicitly included in training should be marked as trained

-- Reset all sources to untrained by default
-- This is safe because training hasn't been implemented yet
UPDATE sources
SET is_trained = false
WHERE is_trained = true;

-- Add comment to clarify the field's purpose
COMMENT ON COLUMN sources.is_trained IS 'Indicates if this source has been included in the agent training. Set to true only after successful training completion.';