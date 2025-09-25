-- Add training status fields to sources and agents tables

-- Add fields to sources table
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS is_trained BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add last_trained_at to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS last_trained_at TIMESTAMP WITH TIME ZONE;

-- Update existing 'ready' status sources to be trained
UPDATE sources
SET is_trained = true
WHERE status = 'ready';

-- Add index for soft-deleted items
CREATE INDEX IF NOT EXISTS idx_sources_deleted_at ON sources(deleted_at);

-- Add index for training status
CREATE INDEX IF NOT EXISTS idx_sources_is_trained ON sources(is_trained);