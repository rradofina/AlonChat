import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Fetch all sources for this agent
    const { data: sources, error } = await supabase
      .from('sources')
      .select('type, size_kb, metadata')
      .eq('agent_id', params.id)

    if (error) {
      console.error('Error fetching stats:', error)
      return NextResponse.json({
        totalSources: 0,
        totalSize: 0,
        maxSize: 400 * 1024 * 1024,
        byType: {
          files: { count: 0, size: 0 },
          text: { count: 0, size: 0 },
          website: { count: 0, pages: 0 },
          qa: { count: 0, size: 0 }
        }
      })
    }

    // Initialize stats with the format expected by SourcesSidebar
    const stats = {
      files: { count: 0, sizeKb: 0 },
      text: { count: 0, sizeKb: 0 },
      website: { count: 0, sizeKb: 0 },
      qa: { count: 0, sizeKb: 0 },
      total: { count: 0, sizeKb: 0 }
    }

    // Aggregate data by type
    sources?.forEach(source => {
      if (source.type === 'file') {
        stats.files.count++
        stats.files.sizeKb += source.size_kb || 0
      } else if (source.type === 'text') {
        stats.text.count++
        stats.text.sizeKb += source.size_kb || 0
      } else if (source.type === 'website') {
        stats.website.count++
        stats.website.sizeKb += source.size_kb || 0
      } else if (source.type === 'qa') {
        stats.qa.count++
        stats.qa.sizeKb += source.size_kb || 0
      }
    })

    // Calculate totals
    stats.total.count = sources?.length || 0
    stats.total.sizeKb =
      stats.files.sizeKb +
      stats.text.sizeKb +
      stats.website.sizeKb +
      stats.qa.sizeKb

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}