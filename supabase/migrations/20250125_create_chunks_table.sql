-- Create chunks table for storing document content in smaller pieces
-- This enables better scalability and prevents database bloat

CREATE TABLE IF NOT EXISTS source_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position INTEGER NOT NULL, -- Order of chunks in the document
  tokens INTEGER DEFAULT 0, -- Token count for this chunk
  embedding vector(1536), -- For similarity search
  metadata JSONB DEFAULT '{}', -- Additional chunk metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_source_chunks_source_id ON source_chunks(source_id);
CREATE INDEX idx_source_chunks_agent_id ON source_chunks(agent_id);
CREATE INDEX idx_source_chunks_project_id ON source_chunks(project_id);
CREATE INDEX idx_source_chunks_position ON source_chunks(source_id, position);
CREATE INDEX idx_source_chunks_embedding ON source_chunks USING ivfflat (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view chunks in their project" ON source_chunks
  FOR SELECT USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create chunks in their project" ON source_chunks
  FOR INSERT WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update chunks in their project" ON source_chunks
  FOR UPDATE USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete chunks in their project" ON source_chunks
  FOR DELETE USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

-- Add file_url column to sources table if not exists
ALTER TABLE sources ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add processing status columns to sources
ALTER TABLE sources ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;

-- Update sources status enum to include processing states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_processing'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'source_status'
    )
  ) THEN
    -- Add new status values for async processing
    ALTER TYPE source_status ADD VALUE IF NOT EXISTS 'pending_processing';
    ALTER TYPE source_status ADD VALUE IF NOT EXISTS 'processing';
    ALTER TYPE source_status ADD VALUE IF NOT EXISTS 'chunking';
    ALTER TYPE source_status ADD VALUE IF NOT EXISTS 'embedding';
  END IF;
END $$;

-- Create storage bucket for source files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('source-files', 'source-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for source files
CREATE POLICY "Users can upload source files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'source-files' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view their source files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'source-files' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their source files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'source-files' AND
    auth.uid() IS NOT NULL
  );