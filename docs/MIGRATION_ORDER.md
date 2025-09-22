# Database Migration Order

Run these migrations in your Supabase SQL Editor in this exact order:

## 1. First run: `20250122_create_dynamic_config_tables.sql`
This creates the `ai_models` table and other configuration tables.

## 2. Then run: `006_ai_providers.sql`
This creates the `ai_providers` table and links it to `ai_models`.

## Why this order?
- `006_ai_providers.sql` adds columns to the `ai_models` table
- The `ai_models` table must exist first (created in `20250122_create_dynamic_config_tables.sql`)

## To execute:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and run `20250122_create_dynamic_config_tables.sql` first
4. After successful completion, run `006_ai_providers.sql`

## Verification:
After running both migrations, you should have:
- `ai_models` table with provider configuration
- `ai_providers` table with dynamic provider support
- Built-in providers (OpenAI, Google, Anthropic, Custom) ready to use