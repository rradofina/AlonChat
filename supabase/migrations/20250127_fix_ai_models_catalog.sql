-- Fix AI Models Catalog - Remove fake models and add real ones

-- First, remove all fake GPT-5 models
DELETE FROM ai_models WHERE model_id LIKE 'gpt-5%';

-- Add real OpenAI models
INSERT INTO ai_models (
  name, display_name, provider, model_id, description,
  context_window, max_tokens,
  input_price_per_million, output_price_per_million,
  supports_vision, supports_functions, supports_streaming,
  is_active, sort_order
) VALUES
  -- OpenAI Models
  ('gpt-4o', 'GPT-4o', 'openai', 'gpt-4o-2024-11-20',
   'Latest multimodal flagship model with vision, function calling, and JSON mode',
   128000, 16384, 2.50, 10.00, true, true, true, true, 10),

  ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'gpt-4o-mini',
   'Affordable and intelligent small model for fast, lightweight tasks',
   128000, 16384, 0.15, 0.60, true, true, true, true, 20),

  ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'gpt-3.5-turbo-0125',
   'Fast, inexpensive model for simple tasks',
   16385, 4096, 0.50, 1.50, false, true, true, true, 30),

  -- Google Gemini Models
  ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'google', 'gemini-1.5-pro-latest',
   'Advanced reasoning with up to 2M context window',
   2000000, 8192, 1.25, 5.00, true, true, true, true, 40),

  ('gemini-1.5-flash', 'Gemini 1.5 Flash', 'google', 'gemini-1.5-flash-latest',
   'Fast and versatile performance',
   1000000, 8192, 0.075, 0.30, true, true, true, true, 50),

  ('gemini-1.5-flash-8b', 'Gemini Flash 8B', 'google', 'gemini-1.5-flash-8b-latest',
   'High volume and lower intelligence tasks',
   1000000, 8192, 0.0375, 0.15, true, true, true, true, 60)

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  model_id = EXCLUDED.model_id,
  description = EXCLUDED.description,
  context_window = EXCLUDED.context_window,
  max_tokens = EXCLUDED.max_tokens,
  input_price_per_million = EXCLUDED.input_price_per_million,
  output_price_per_million = EXCLUDED.output_price_per_million,
  supports_vision = EXCLUDED.supports_vision,
  supports_functions = EXCLUDED.supports_functions,
  supports_streaming = EXCLUDED.supports_streaming,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Note: Anthropic and xAI models will be added when their providers are implemented
-- Future models to add:
-- - claude-3-5-sonnet-20241022
-- - claude-3-5-haiku-20241022
-- - grok-2
-- - grok-2-mini