# AI Provider Extension Guide

## Architecture Overview

AlonChat uses a **model-agnostic provider system** that supports any AI model without hardcoding. The system consists of:

1. **Provider Interface** (`lib/ai/providers/base.ts`) - Defines the contract all providers must follow
2. **Provider Registry** (`lib/ai/provider-registry.ts`) - Manages and loads providers dynamically
3. **AI Service** (`lib/ai/ai-service.ts`) - Orchestrates AI calls through providers
4. **Model Configuration** (Database/Config) - Stores model metadata

## Adding a New AI Provider

### Step 1: Create Provider Implementation

Create a new file in `lib/ai/providers/` implementing the `AIProvider` interface:

```typescript
// lib/ai/providers/your-provider.ts
import { AIProvider, ChatCompletionOptions, ChatCompletionResult } from './base'

export class YourProvider implements AIProvider {
  name = 'your-provider'
  private client: any = null

  async initialize(config: Record<string, any>): Promise<void> {
    // Initialize your SDK client
  }

  isConfigured(): boolean {
    // Check if provider is properly configured
  }

  getRequiredEnvVars(): string[] {
    // Return required environment variables
    return ['YOUR_PROVIDER_API_KEY']
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    // Implement chat completion
  }

  estimateCost(tokens: number, model: string): number {
    // Calculate cost based on provider pricing
  }
}
```

### Step 2: Register Provider

Add your provider to the registry in `lib/ai/provider-registry.ts`:

```typescript
import { YourProvider } from './providers/your-provider'

async initialize(): Promise<void> {
  // ... existing providers
  await this.registerProvider('your-provider', new YourProvider())
}
```

### Step 3: Add Models to Configuration

Models are stored in the database and can be added via:

1. **Database Migration** (Recommended for production):
```sql
INSERT INTO ai_models (name, display_name, provider, model_id, description, is_active)
VALUES
  ('your-model-name', 'Your Model Display', 'your-provider', 'model-id', 'Description', true);
```

2. **Update Fallback Config** (For development):
Edit `lib/api/config.ts` `getFallbackModels()` method.

### Step 4: Add Environment Variables

Add to `.env.local`:
```env
YOUR_PROVIDER_API_KEY=your_actual_api_key
```

## Built-in Providers

### OpenAI
- Models: GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- Env: `OPENAI_API_KEY`

### Google (Gemini)
- Models: Gemini 1.5 Flash, Gemini 1.5 Pro
- Env: `GEMINI_API_KEY`

### Anthropic (Example)
- Models: Claude 3 Opus, Sonnet, Haiku
- Env: `ANTHROPIC_API_KEY`
- See `lib/ai/providers/anthropic.example.ts`

## Adding Custom Models

You can add any model from any provider without changing code:

1. Ensure the provider is registered
2. Add model configuration to database:

```sql
INSERT INTO ai_models (
  name,
  display_name,
  provider,
  model_id,
  context_window,
  max_tokens,
  description,
  is_active
) VALUES (
  'llama-3-70b',
  'Llama 3 70B',
  'together',  -- Provider must be registered
  'meta-llama/Llama-3-70b-chat-hf',
  8192,
  4096,
  'Open source model from Meta',
  true
);
```

## Provider Development Best Practices

1. **Error Handling**: Always throw descriptive errors
2. **Token Counting**: Provide accurate token usage
3. **Cost Calculation**: Keep pricing updated
4. **Streaming Support**: Implement if provider supports it
5. **Rate Limiting**: Handle provider rate limits gracefully
6. **Retries**: Implement exponential backoff for transient errors

## Testing Your Provider

```typescript
// Test your provider
import { aiService } from '@/lib/ai/ai-service'

const result = await aiService.chat('your-model-name', [
  { role: 'user', content: 'Hello!' }
])

console.log(result)
```

## Provider Marketplace (Future)

The architecture supports loading providers as plugins:
- NPM packages following provider interface
- Database-stored provider configurations
- Hot-swappable providers without code changes

This design ensures AlonChat remains truly model-agnostic and can integrate any AI model that becomes available in the future.