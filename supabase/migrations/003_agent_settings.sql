-- Add missing columns to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
ADD COLUMN IF NOT EXISTS suggested_questions JSONB DEFAULT '["What can you help me with?"]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents(created_by);

-- Update RLS policies to include created_by
DROP POLICY IF EXISTS "Users can view agents in their workspaces" ON agents;
CREATE POLICY "Users can view agents in their workspaces" ON agents
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create agents in their workspaces" ON agents;
CREATE POLICY "Users can create agents in their workspaces" ON agents
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update agents in their workspaces" ON agents;
CREATE POLICY "Users can update agents in their workspaces" ON agents
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete agents in their workspaces" ON agents;
CREATE POLICY "Users can delete agents in their workspaces" ON agents
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = auth.uid()
    )
  );