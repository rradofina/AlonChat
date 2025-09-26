-- Drop BYOK (Bring Your Own Key) functionality
-- We're using platform API keys only (stored in environment variables)

-- Drop the credentials table
DROP TABLE IF EXISTS ai_provider_credentials CASCADE;

-- Drop related indexes if they exist
DROP INDEX IF EXISTS idx_ai_provider_credentials_project;

-- Add comment explaining the architecture
COMMENT ON TABLE ai_providers IS 'AI providers available in the platform. API keys are stored in environment variables, not in the database.';