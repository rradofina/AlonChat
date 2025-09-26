# Redis Setup for AlonChat

## Production & Development: Redis Cloud (Recommended)

### Free Plan (Development)
1. Sign up at: https://redis.com/try-free/
2. Create a free database (30MB, perfect for development)
3. Get your connection string from the dashboard
4. Add to `.env.local`:
```
REDIS_URL=redis://default:password@your-redis-cloud-url:port
```

### $5 Plan (Production)
- Same setup, just upgrade in dashboard
- 250MB storage, better performance
- No code changes needed - just update REDIS_URL

## Local Development (Optional)

If you prefer local Redis for development:

### Windows: Memurai
1. Download from: https://www.memurai.com/get-memurai
2. Install (Developer Edition is free)
3. Leave REDIS_URL empty in `.env.local` (defaults to localhost:6379)

### Mac/Linux
```bash
# Mac
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo service redis-server start
```

## Environment Configuration

```env
# For Redis Cloud (Development or Production)
REDIS_URL=redis://default:password@redis-cloud-url:port

# For Local Redis (leave empty or omit)
# REDIS_URL=
```

## How It Works

The queue system automatically:
- Connects to Redis Cloud if REDIS_URL is provided
- Falls back to localhost:6379 if no URL specified
- Handles TLS/SSL for cloud connections
- Works identically in development and production

## Vercel Deployment

Add the same REDIS_URL to your Vercel environment variables - that's it!

## Current Queue Configuration

- **Concurrency**: 2 simultaneous crawls
- **Retries**: 3 attempts with exponential backoff
- **Queue name**: website-crawl
- **Worker**: Processes jobs asynchronously

## IMPORTANT: Redis Eviction Policy Configuration

**The Redis eviction policy MUST be set to `noeviction`** to prevent data loss.

### Redis Cloud
The eviction policy is configured in the Redis Cloud dashboard:
1. Go to your database configuration
2. Find the "Eviction Policy" setting
3. Set it to **"noeviction"**
4. Save the configuration

### Local Redis (Memurai/Redis)
Set the eviction policy in your redis.conf:
```
maxmemory-policy noeviction
```

Or via CLI:
```bash
redis-cli CONFIG SET maxmemory-policy noeviction
```

### Why This Matters
- BullMQ requires `noeviction` policy to work correctly
- Other policies like `volatile-lru` can cause job data loss
- You'll see warnings in the console if this isn't configured correctly