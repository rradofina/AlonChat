# Database-Driven AI System

## Overview

AlonChat's AI system is **100% database-driven** with zero hardcoding. Everything is configurable through the database:

- **Providers** - Stored in `ai_providers` table
- **Models** - Stored in `ai_models` table
- **Credentials** - Stored in `ai_provider_credentials` table
- **Custom APIs** - Configurable without code changes

## Architecture

```
Database Tables
    ↓
Provider Loader (runtime)
    ↓
Provider Registry
    ↓
AI Service
    ↓
Your Application
```

## Database Schema

### `ai_providers` Table
Stores provider configurations:
```sql
- name: 'openai', 'google', 'custom-llm'
- provider_class: Which class to load
- api_base_url: API endpoint
- required_env_vars: What env vars needed
- features: What the provider supports
- pricing: Cost information
```

### `ai_models` Table
Stores model configurations:
```sql
- name: 'gpt-4o-mini'
- provider_id: Links to provider
- model_id: Provider's model identifier
- context_window: Token limits
- max_tokens: Generation limits
```

### `ai_provider_credentials` Table
Stores per-project API keys (encrypted):
```sql
- project_id: Which project
- provider_id: Which provider
- credentials: Encrypted API keys/config
```

## Adding New Providers

### Method 1: Database Only (Custom APIs)
For any OpenAI-compatible API:

```sql
INSERT INTO ai_providers (
  name,
  display_name,
  provider_class,
  api_base_url,
  required_env_vars
) VALUES (
  'local-llm',
  'Local LLM Server',
  'CustomProvider',
  'http://localhost:8080/v1',
  '["LOCAL_LLM_API_KEY"]'::jsonb
);
```

### Method 2: With Code (Non-standard APIs)
1. Create provider class in `lib/ai/providers/`
2. Add to database:
```sql
INSERT INTO ai_providers (
  name,
  display_name,
  provider_class,
  is_builtin
) VALUES (
  'cohere',
  'Cohere',
  'CohereProvider',
  true
);
```

## How It Works

1. **On Startup**: Provider loader queries database
2. **Dynamic Loading**: Loads provider classes based on `provider_class`
3. **Runtime Configuration**: Everything configured from database
4. **No Hardcoding**: Provider registry has zero hardcoded providers

## Adding Models

Simply insert into database:

```sql
INSERT INTO ai_models (
  name,
  display_name,
  provider_id,
  model_id,
  is_active
) VALUES (
  'mixtral-8x7b',
  'Mixtral 8x7B',
  (SELECT id FROM ai_providers WHERE name = 'together'),
  'mistralai/Mixtral-8x7B-Instruct-v0.1',
  true
);
```

## Custom Provider Example

The `CustomProvider` class handles any OpenAI-compatible API:

```javascript
// No code needed! Just database config:
{
  api_base_url: "https://api.together.xyz/v1",
  auth_header_name: "Authorization",
  auth_header_prefix: "Bearer",
  request_template: { /* optional custom format */ }
}
```

## Benefits

1. **No Deployments**: Add providers without code changes
2. **Multi-tenancy**: Different API keys per project
3. **A/B Testing**: Easy model switching
4. **Cost Control**: Pricing stored in database
5. **Future Proof**: Any new AI provider works instantly

## Migration

Run migration to set up tables:
```bash
supabase db push
```

This creates all necessary tables and seeds built-in providers.

## Security

- API keys stored encrypted in `ai_provider_credentials`
- Row-level security on credential access
- Environment variables as fallback
- No keys in code

This architecture ensures AlonChat can work with ANY AI provider, current or future, without touching code!