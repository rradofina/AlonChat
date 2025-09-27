-- Add links metadata column to sources table for structured link storage
-- This enables proper link handling in a production SaaS environment

-- Add links column to store extracted and validated links
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]';

-- Add index for better query performance when filtering by links
CREATE INDEX IF NOT EXISTS idx_sources_links ON sources USING gin(links);

-- Comment for documentation
COMMENT ON COLUMN sources.links IS 'Structured storage for extracted links from content. Format: [{id, text, url, position, verified, last_checked}]';