# AI Model Setup Guide

## Quick Setup

To connect AlonChat to AI models, you need to get API keys from the providers:

### 1. Google Gemini (Free)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key
4. Add to `.env.local`:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```

### 2. OpenAI GPT Models

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or login
3. Click "Create new secret key"
4. Copy your API key
5. Add to `.env.local`:
   ```
   OPENAI_API_KEY=your_actual_openai_api_key
   ```

## Supported Models

### Free/Cheap Models:
- **Gemini 1.5 Flash** (Google) - Free tier available
- **GPT-4o Mini** (OpenAI) - $0.15 per 1M input tokens
- **GPT-3.5 Turbo** (OpenAI) - $0.50 per 1M input tokens

### Premium Models:
- **Gemini 1.5 Pro** (Google) - Higher limits, better quality

## Testing Your Setup

1. Restart your development server after adding API keys:
   ```bash
   npm run dev
   ```

2. Create a new agent in the dashboard
3. Select a model (Gemini Flash is default)
4. Go to the Playground and test the chat

## Troubleshooting

- If chat doesn't work, check the browser console for errors
- Ensure API keys are correctly set in `.env.local`
- Gemini requires a valid API key from Google AI Studio
- OpenAI requires credits in your account

## Cost Estimates

- **Gemini Flash**: Free up to 15 RPM, 1M tokens/minute
- **GPT-4o Mini**: ~$0.01 per 1000 messages
- **GPT-3.5 Turbo**: ~$0.05 per 1000 messages