import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/admin/cleanup
 * Clean up old sources without chunks (development only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, agentId } = await request.json()

    if (action === 'identify') {
      // Just identify sources that would be deleted
      let query = supabase
        .from('sources')
        .select('id, agent_id, name, type, status, chunk_count, created_at')
        .or('chunk_count.is.null,chunk_count.eq.0')
        .order('created_at', { ascending: false })

      if (agentId) {
        query = query.eq('agent_id', agentId)
      }

      const { data: sources, error } = await query

      if (error) {
        throw error
      }

      return NextResponse.json({
        action: 'identify',
        count: sources?.length || 0,
        sources: sources || []
      })
    }

    if (action === 'delete') {
      // Delete sources without chunks
      let deleteQuery = supabase
        .from('sources')
        .delete()
        .or('chunk_count.is.null,chunk_count.eq.0')
        .select('id')

      if (agentId) {
        deleteQuery = deleteQuery.eq('agent_id', agentId)
      }

      const { data: deleted, error } = await deleteQuery

      if (error) {
        throw error
      }

      return NextResponse.json({
        action: 'delete',
        count: deleted?.length || 0,
        deleted: deleted || []
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "identify" or "delete"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to perform cleanup' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cleanup
 * Get cleanup statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get statistics
    const { data: stats, error } = await supabase.rpc('get_source_stats', {
      user_id_param: user.id
    }).single()

    if (error) {
      // If RPC doesn't exist, use direct query
      const { data: sources, error: queryError } = await supabase
        .from('sources')
        .select('chunk_count')

      if (queryError) {
        throw queryError
      }

      const withChunks = sources?.filter(s => s.chunk_count && s.chunk_count > 0).length || 0
      const withoutChunks = sources?.filter(s => !s.chunk_count || s.chunk_count === 0).length || 0

      return NextResponse.json({
        total: sources?.length || 0,
        withChunks,
        withoutChunks,
        cleanupNeeded: withoutChunks > 0
      })
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Cleanup stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get cleanup stats' },
      { status: 500 }
    )
  }
}