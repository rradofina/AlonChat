-- Clean up duplicate workspaces keeping only the first one per user
-- This migration removes duplicates created during the redirect loop bug
-- NOTE: This operates on the legacy 'workspaces' table which has been replaced by 'projects'

-- First, identify and keep only the oldest workspace per user
WITH duplicates AS (
  SELECT id, owner_id, created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM workspaces
)
DELETE FROM workspaces
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add a unique constraint to prevent future duplicates (one workspace per user for now)
-- We'll make this more flexible later when we add multi-workspace support
ALTER TABLE workspaces
ADD CONSTRAINT unique_workspace_per_user UNIQUE (owner_id);