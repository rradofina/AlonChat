-- Add project_id to sources table and migrate from workspace_id
-- This migration ensures sources table uses project_id for consistency

-- First, add project_id column if it doesn't exist
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add foreign key constraint to projects table
ALTER TABLE sources
ADD CONSTRAINT sources_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Migrate data: populate project_id from agents table
UPDATE sources s
SET project_id = a.project_id
FROM agents a
WHERE s.agent_id = a.id
AND s.project_id IS NULL;

-- Make project_id NOT NULL after data migration
ALTER TABLE sources
ALTER COLUMN project_id SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sources_project_id
ON sources(project_id);

-- Drop workspace_id column if it exists (cleanup)
ALTER TABLE sources
DROP COLUMN IF EXISTS workspace_id CASCADE;

-- Update RLS policies to use project_id
DROP POLICY IF EXISTS "Users can view their sources" ON sources;
DROP POLICY IF EXISTS "Users can create sources" ON sources;
DROP POLICY IF EXISTS "Users can update their sources" ON sources;
DROP POLICY IF EXISTS "Users can delete their sources" ON sources;

-- Create new RLS policies using project_id
CREATE POLICY "Users can view their sources" ON sources
FOR SELECT USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create sources" ON sources
FOR INSERT WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their sources" ON sources
FOR UPDATE USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their sources" ON sources
FOR DELETE USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);