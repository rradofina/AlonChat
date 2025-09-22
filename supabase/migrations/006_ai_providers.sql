-- AI Providers Configuration
-- NOTE: This migration requires 20250122_create_dynamic_config_tables.sql to be run first
-- as it references the ai_models table

CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'openai', 'google', 'anthropic'
  display_name VARCHAR(100) NOT NULL,
  provider_class VARCHAR(100) NOT NULL, -- e.g., 'OpenAIProvider', 'GoogleProvider'
  npm_package VARCHAR(200), -- Optional npm package to install
  api_base_url TEXT,
  auth_header_name VARCHAR(50) DEFAULT 'Authorization',
  auth_header_prefix VARCHAR(20) DEFAULT 'Bearer',
  required_env_vars JSONB DEFAULT '[]'::jsonb, -- Array of required env var names
  config_schema JSONB, -- JSON schema for provider-specific config
  features JSONB DEFAULT '{}'::jsonb, -- { streaming: true, vision: false, etc }
  pricing JSONB DEFAULT '{}'::jsonb, -- Pricing info per model
  is_active BOOLEAN DEFAULT true,
  is_builtin BOOLEAN DEFAULT false, -- True for providers we ship with
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider credentials (per project/workspace)
CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES ai_providers(id) ON DELETE CASCADE,
  credentials JSONB NOT NULL, -- Encrypted credentials
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, provider_id)
);

-- Update ai_models to reference providers (only if columns don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_models' AND column_name = 'provider_id') THEN
    ALTER TABLE ai_models ADD COLUMN provider_id UUID REFERENCES ai_providers(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_models' AND column_name = 'api_endpoint') THEN
    ALTER TABLE ai_models ADD COLUMN api_endpoint TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_models' AND column_name = 'request_template') THEN
    ALTER TABLE ai_models ADD COLUMN request_template JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ai_models' AND column_name = 'response_parser') THEN
    ALTER TABLE ai_models ADD COLUMN response_parser TEXT;
  END IF;
END $$;

-- Insert built-in providers
INSERT INTO ai_providers (name, display_name, provider_class, required_env_vars, features, is_builtin)
VALUES
  (
    'openai',
    'OpenAI',
    'OpenAIProvider',
    '["OPENAI_API_KEY"]'::jsonb,
    '{"streaming": true, "functions": true, "vision": true}'::jsonb,
    true
  ),
  (
    'google',
    'Google AI',
    'GoogleProvider',
    '["GEMINI_API_KEY"]'::jsonb,
    '{"streaming": true, "functions": false, "vision": true}'::jsonb,
    true
  ),
  (
    'anthropic',
    'Anthropic',
    'AnthropicProvider',
    '["ANTHROPIC_API_KEY"]'::jsonb,
    '{"streaming": true, "functions": false, "vision": false}'::jsonb,
    true
  ),
  (
    'custom',
    'Custom API',
    'CustomProvider',
    '[]'::jsonb,
    '{"streaming": false, "functions": false, "vision": false}'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Update existing models to link with providers
UPDATE ai_models
SET provider_id = ai_providers.id
FROM ai_providers
WHERE ai_models.provider = ai_providers.name
AND ai_models.provider_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_provider_credentials_project ON ai_provider_credentials(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider_id);