-- Create storage bucket for agent sources (files, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-sources',
  'agent-sources',
  true, -- Public for serving images in chat
  31457280, -- 30MB limit
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/html',
    'text/markdown',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for storage bucket
CREATE POLICY "Users can upload agent source files"
ON storage.objects
FOR INSERT
USING (
  bucket_id = 'agent-sources' AND
  EXISTS (
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    WHERE 
      w.owner_id = auth.uid() AND
      (storage.foldername(name))[2] = a.id::text
  )
);

CREATE POLICY "Users can update their agent source files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'agent-sources' AND
  EXISTS (
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    WHERE 
      w.owner_id = auth.uid() AND
      (storage.foldername(name))[2] = a.id::text
  )
);

CREATE POLICY "Users can delete their agent source files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'agent-sources' AND
  EXISTS (
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    WHERE 
      w.owner_id = auth.uid() AND
      (storage.foldername(name))[2] = a.id::text
  )
);

-- Public read access for agent source files (needed for chat widget)
CREATE POLICY "Public can read agent source files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'agent-sources');

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_sources_agent_id_type 
ON agent_sources(agent_id, type);

CREATE INDEX IF NOT EXISTS idx_agent_sources_status 
ON agent_sources(status);

CREATE INDEX IF NOT EXISTS idx_agent_sources_created_at 
ON agent_sources(created_at DESC);