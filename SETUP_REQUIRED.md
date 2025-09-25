# Setup Required for File Processing

## IMPORTANT: Add Service Role Key

For file processing to work, you need to add your Supabase service role key to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### How to get your service role key:

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Find "Service role key" under Project API keys
4. Copy the key (starts with `eyJ...`)
5. Add it to your `.env.local` file

### Why this is needed:

- Background file processing runs outside of user context
- It needs to bypass Row Level Security (RLS) to access files
- The service role key provides full database access for server operations

### Security note:

- NEVER expose this key in client-side code
- Keep it only in server-side environment variables
- This key bypasses all security rules, so handle with care

## Alternative (if you can't add service role key):

The files will be uploaded but won't be processed automatically. You would need to manually trigger processing or modify the architecture to process files synchronously (which would be slower).