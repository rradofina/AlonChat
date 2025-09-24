-- Add project_id to agents table
-- This ensures agents are linked to projects instead of workspaces

-- First, add project_id column if it doesn't exist
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add foreign key constraint to projects table
ALTER TABLE agents
ADD CONSTRAINT agents_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- For existing agents, create a default project for each workspace if needed
INSERT INTO projects (id, name, user_id, created_at, updated_at)
SELECT
    gen_random_uuid(),
    w.name || ' Project',
    w.owner_id,
    NOW(),
    NOW()
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM projects p WHERE p.user_id = w.owner_id
)
ON CONFLICT DO NOTHING;

-- Update agents with project_id based on workspace owner
UPDATE agents a
SET project_id = (
    SELECT p.id
    FROM projects p
    JOIN workspaces w ON w.owner_id = p.user_id
    WHERE w.id = a.workspace_id
    LIMIT 1
)
WHERE a.project_id IS NULL;

-- Make project_id NOT NULL after data migration
ALTER TABLE agents
ALTER COLUMN project_id SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_project_id
ON agents(project_id);

-- Update RLS policies to use project_id
DROP POLICY IF EXISTS "Users can view their agents" ON agents;
DROP POLICY IF EXISTS "Users can create agents" ON agents;
DROP POLICY IF EXISTS "Users can update their agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their agents" ON agents;

-- Create new RLS policies using project_id
CREATE POLICY "Users can view their agents" ON agents
FOR SELECT USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create agents" ON agents
FOR INSERT WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their agents" ON agents
FOR UPDATE USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their agents" ON agents
FOR DELETE USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);