# Code Cleanup TODO

## Debug Logging to Remove

### 1. Frontend (`app/dashboard/agents/[id]/sources/qa/page.tsx`)
- Remove console.log statements added for debugging:
  - Line 89: Files selected log
  - Line 112: Valid files log
  - Line 117: Total selected images log
  - Lines 206-212: handleAddQA debug logs
  - Lines 218-224: Upload process logs
  - Line 233: Sending Q&A data log

### 2. Storage (`lib/supabase/storage.ts`)
- Remove console.log statements:
  - Lines 20-25: Uploading image details
  - Line 41: Upload successful log
  - Line 48: Generated public URL log

### 3. API Route (`app/api/agents/[id]/sources/qa/route.ts`)
- Remove console.log statements:
  - Lines 13-20: POST Q&A received log
  - Lines 57-62: Preparing to insert log
  - Lines 88-91: Successfully created log
  - Lines 223-229: PUT Q&A received log
  - Lines 261-267: Updating Q&A metadata log

## Configuration to Document

### Storage Bucket Setup
- Bucket Name: `agent-sources`
- Public: true
- RLS: Enabled with policies for authenticated users

### Required RLS Policies
```sql
-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'agent-sources')
WITH CHECK (bucket_id = 'agent-sources');

-- Public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'agent-sources');
```

## Architecture Summary

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend  │────▶│  Storage API │────▶│   Supabase   │
│  (Next.js)  │     │  (storage.ts)│     │   Storage    │
└─────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       │                                         ▼
       ▼                                  ┌──────────────┐
┌─────────────┐                          │   Public     │
│   API Route │                          │   URLs       │
│   (qa/route)│◀─────────────────────────└──────────────┘
└─────────────┘
       │
       ▼
┌─────────────┐
│   Database  │
│  (sources)  │
└─────────────┘
```

## Key Learnings

1. **Always use authenticated client for storage operations**
2. **RLS policies are critical for Supabase Storage**
3. **Client-side Supabase client inherits browser session**
4. **Server-side needs explicit auth handling**

---
*Generated: 2025-09-24*