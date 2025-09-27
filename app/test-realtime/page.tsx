'use client'

import { useEffect, useState } from 'react'
import { useWebsiteCrawl } from '@/features/website-sources/hooks/useWebsiteCrawl'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export default function TestRealtimePage() {
  const {
    isConnected,
    crawlProgress,
    connect,
    disconnect
  } = useWebsiteCrawl({
    autoConnect: true,
    onProgress: (progress) => {
      console.log('[TEST] Progress:', progress)
    },
    onComplete: (sourceId) => {
      console.log('[TEST] Completed:', sourceId)
    },
    onError: (error, sourceId) => {
      console.error('[TEST] Error:', error, sourceId)
    }
  })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Real-time Infrastructure Test</h1>

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Connected to real-time updates' : 'Disconnected'}</span>
          </div>
          <div className="mt-2 space-x-2">
            <Button onClick={connect} size="sm" disabled={isConnected}>
              Connect
            </Button>
            <Button onClick={disconnect} size="sm" disabled={!isConnected}>
              Disconnect
            </Button>
          </div>
        </div>

        {/* Active Crawls */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Active Crawls</h2>
          {crawlProgress.length === 0 ? (
            <p className="text-gray-500">No active crawls. Start a crawl from the website sources page to see real-time progress here.</p>
          ) : (
            <div className="space-y-4">
              {crawlProgress.map((progress) => (
                <div key={progress.sourceId} className="bg-white p-4 rounded border">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Source: {progress.sourceId.slice(0, 8)}...</span>
                    <span className="text-sm text-gray-600">{progress.phase}</span>
                  </div>
                  <Progress value={progress.progress} className="mb-2" />
                  <div className="text-sm text-gray-600">
                    <div>Pages: {progress.pagesProcessed} / {progress.totalPages || '?'}</div>
                    {progress.currentUrl && (
                      <div className="truncate">Current: {progress.currentUrl}</div>
                    )}
                    {progress.error && (
                      <div className="text-red-600">Error: {progress.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Event Emission */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Event Emission</h2>
          <p className="text-sm text-gray-600 mb-2">
            Send a test event to verify the EventBus is working
          </p>
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/api/events', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'crawl:progress',
                    data: {
                      jobId: 'test-job-' + Date.now(),
                      sourceId: 'test-source-' + Date.now(),
                      projectId: 'test-project',
                      phase: 'processing',
                      progress: Math.floor(Math.random() * 100),
                      pagesProcessed: Math.floor(Math.random() * 50),
                      totalPages: 100,
                      currentUrl: 'https://test.example.com/page-' + Math.floor(Math.random() * 100),
                      timestamp: Date.now()
                    }
                  })
                })
                const result = await response.json()
                console.log('[TEST] Event emitted:', result)
              } catch (error) {
                console.error('[TEST] Failed to emit event:', error)
              }
            }}
          >
            Emit Test Event
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">How to Test</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Check that the connection status shows "Connected"</li>
            <li>Open the browser console (F12)</li>
            <li>Click "Emit Test Event" - you should see the event in console</li>
            <li>Go to any agent's website sources page and start a crawl</li>
            <li>Return here to see the real-time progress updates</li>
            <li>Or stay here and click "Emit Test Event" to simulate progress</li>
          </ol>
        </div>
      </div>
    </div>
  )
}