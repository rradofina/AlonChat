import { startWebsiteWorker } from './website-processor'

let initialized = false

export function initializeQueues() {
  if (initialized) return

  // Start website crawl worker
  console.log('Initializing queue workers...')
  startWebsiteWorker()

  initialized = true
  console.log('Queue workers initialized')
}

// Initialize queues when module is imported
// Only in development mode for now
if (process.env.NODE_ENV === 'development') {
  initializeQueues()
}