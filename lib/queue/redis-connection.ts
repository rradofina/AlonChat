import IORedis from 'ioredis'

// Singleton Redis connections for queue system
let sharedConnection: IORedis | null = null
let sharedBclientConnection: IORedis | null = null

// Connection configuration
const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const isRedisCloud = redisUrl.includes('redis-cloud.com') || redisUrl.includes('redislabs.com')

  if (isRedisCloud) {
    console.log('Using Redis Cloud configuration')
  }

  return {
    url: redisUrl,
    isCloud: isRedisCloud
  }
}

// Get shared connection for Queue operations
export function getSharedConnection(): IORedis | null {
  if (sharedConnection && sharedConnection.status === 'ready') {
    return sharedConnection
  }

  try {
    const { url } = getRedisConfig()

    sharedConnection = new IORedis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries')
          return null
        }
        const delay = Math.min(times * 500, 2000)
        return delay
      }
    })

    sharedConnection.on('connect', () => {
      console.log('✅ Shared Redis connection established')
    })

    sharedConnection.on('error', (error) => {
      console.error('Shared Redis connection error:', error.message)
      if (error.message.includes('max number of clients')) {
        console.error('⚠️ Redis connection limit reached. Consider upgrading your plan.')
      }
    })

    sharedConnection.on('close', () => {
      console.log('Shared Redis connection closed')
      sharedConnection = null
    })

    return sharedConnection
  } catch (error) {
    console.error('Failed to create shared Redis connection:', error)
    return null
  }
}

// Get shared connection for Worker operations (requires different settings)
export function getWorkerConnection(): IORedis | null {
  if (sharedBclientConnection && sharedBclientConnection.status === 'ready') {
    return sharedBclientConnection
  }

  try {
    const { url } = getRedisConfig()

    sharedBclientConnection = new IORedis(url, {
      maxRetriesPerRequest: null, // Required for workers
      enableReadyCheck: true,
      lazyConnect: false
    })

    sharedBclientConnection.on('connect', () => {
      console.log('✅ Worker Redis connection established')
    })

    sharedBclientConnection.on('error', (error) => {
      console.error('Worker Redis connection error:', error.message)
      if (error.message.includes('max number of clients')) {
        console.error('⚠️ Redis connection limit reached. Consider upgrading your plan.')
      }
    })

    sharedBclientConnection.on('close', () => {
      console.log('Worker Redis connection closed')
      sharedBclientConnection = null
    })

    return sharedBclientConnection
  } catch (error) {
    console.error('Failed to create worker Redis connection:', error)
    return null
  }
}

// Cleanup connections on process exit
process.on('SIGINT', () => {
  if (sharedConnection) {
    sharedConnection.disconnect()
  }
  if (sharedBclientConnection) {
    sharedBclientConnection.disconnect()
  }
  process.exit(0)
})