import { NextResponse } from 'next/server'
import { getProviderManager } from '@/lib/ai/provider-manager'

export async function GET() {
  try {
    const manager = getProviderManager()
    const healthStatus = await manager.getHealthStatus()

    return NextResponse.json({
      providers: healthStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Provider status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check provider status' },
      { status: 500 }
    )
  }
}