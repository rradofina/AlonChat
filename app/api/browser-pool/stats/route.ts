import { NextResponse } from 'next/server'
import { BrowserPool } from '@/lib/crawler/browser-pool'

export async function GET() {
  try {
    const pool = BrowserPool.getInstance()
    const stats = pool.getStats()

    return NextResponse.json({
      success: true,
      stats,
      message: `Browser pool: ${stats.browsers}/${stats.maxBrowsers} browsers, ${stats.contexts} active contexts`
    })
  } catch (error: any) {
    console.error('Browser pool stats error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}