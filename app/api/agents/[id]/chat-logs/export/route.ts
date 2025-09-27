import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: agentId } = await params
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'
    const conversationId = searchParams.get('conversationId')

    // Fetch conversation data
    let query = supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at,
          confidence_score,
          metadata
        ),
        agents!inner (
          name,
          description
        )
      `)

    if (conversationId) {
      query = query.eq('id', conversationId)
    } else {
      query = query.eq('agent_id', agentId)
    }

    const { data: conversations, error } = await query

    if (error) throw error

    // Format data based on export type
    let exportData: any
    let contentType: string
    let filename: string

    const timestamp = new Date().toISOString().split('T')[0]

    switch (format) {
      case 'csv':
        exportData = convertToCSV(conversations)
        contentType = 'text/csv'
        filename = `chat-logs-${timestamp}.csv`
        break

      case 'pdf':
        // For PDF, we'll return the data and handle PDF generation on the client
        exportData = {
          conversations: conversations,
          generatedAt: new Date().toISOString(),
          agentName: conversations?.[0]?.agents?.name || 'Unknown Agent'
        }
        contentType = 'application/json'
        filename = `chat-logs-${timestamp}.pdf`
        break

      case 'json':
      default:
        exportData = JSON.stringify(conversations, null, 2)
        contentType = 'application/json'
        filename = `chat-logs-${timestamp}.json`
        break
    }

    // Return response with appropriate headers
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Error exporting chat logs:', error)
    return NextResponse.json(
      { error: 'Failed to export chat logs' },
      { status: 500 }
    )
  }
}

function convertToCSV(conversations: any[]): string {
  const rows: string[] = []

  // Add header
  rows.push('Conversation ID,Session ID,Source,Started At,Agent,Role,Message,Confidence Score,Created At')

  // Add data rows
  conversations?.forEach(conv => {
    const agentName = conv.agents?.name || 'Unknown'

    conv.messages?.forEach((msg: any) => {
      const row = [
        conv.id,
        conv.session_id,
        conv.source || 'unknown',
        conv.started_at,
        agentName,
        msg.role,
        `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes in content
        msg.confidence_score || '',
        msg.created_at
      ]
      rows.push(row.join(','))
    })
  })

  return rows.join('\n')
}