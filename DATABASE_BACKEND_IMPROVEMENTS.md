# Database & Backend Improvements Needed

## Current State Analysis

### ✅ Good Architecture:
- Proper separation: Platform keys in env vars, model catalog in DB
- Good table structure with all needed fields
- Matches industry best practices (like Chatbase)

### 🔴 Critical Issues:

#### 1. Fake Models in Database
**Problem**: ai_models table has "GPT-5" placeholder models
**Solution**: Need migration to:
- Remove fake models
- Add real models (GPT-4o, Claude 3.5, Gemini Pro, etc.)

```sql
-- Example migration needed
DELETE FROM ai_models WHERE provider = 'openai' AND model_id LIKE 'gpt-5%';

INSERT INTO ai_models (name, display_name, provider, model_id, context_window, max_tokens, input_price_per_million, output_price_per_million)
VALUES
  ('gpt-4o', 'GPT-4o', 'openai', 'gpt-4o-2024-11-20', 128000, 16384, 2.50, 10.00),
  ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'gpt-4o-mini', 128000, 16384, 0.15, 0.60),
  ('claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'anthropic', 'claude-3-5-sonnet-20241022', 200000, 8192, 3.00, 15.00),
  ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'google', 'gemini-1.5-pro-latest', 2000000, 8192, 1.25, 5.00);
```

#### 2. Missing Provider Support
**Problem**: Backend only supports OpenAI & Google
**Location**: `lib/ai/server-utils.ts`

**Solution**: Add cases for Anthropic and xAI:
```typescript
case 'anthropic':
  provider = new AnthropicProvider()
  await provider.initialize({})
  break
case 'xai':
  provider = new XAIProvider()
  await provider.initialize({})
  break
```

## Recommended Implementation Order:

### Phase 1: Fix Models (Immediate)
1. Create migration to remove fake models
2. Add real OpenAI and Google models
3. Test with existing providers

### Phase 2: Add Provider Support (When needed)
1. When you add Anthropic API key → implement AnthropicProvider
2. When you add xAI API key → implement XAIProvider
3. Add their models to database

### Phase 3: Admin Improvements (Later)
1. Add model discovery/sync from APIs
2. Add pricing update automation
3. Add model deprecation handling

## Database Schema is Good ✅

The current schema has everything needed:
- `provider` - which API to use
- `model_id` - exact model string for API
- `input_price_per_million` / `output_price_per_million` - billing
- `supports_vision`, `supports_functions` - capabilities
- `is_active` - enable/disable without deleting

## Summary

Your architecture is correct for a SaaS:
- Platform API keys → Environment Variables ✅
- Model Catalog → Database Table ✅
- Admin Panel → Exists ✅

Just need to:
1. Replace fake models with real ones
2. Add provider implementations as you add API keys