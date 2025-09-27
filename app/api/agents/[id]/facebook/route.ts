import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for saving Facebook integration
const FacebookIntegrationSchema = z.object({
  pageId: z.string(),
  pageName: z.string(),
  pageAccessToken: z.string(),
  pagePictureUrl: z.string().optional(),
  category: z.string().optional(),
  fanCount: z.number().optional(),
  userAccessToken: z.string().optional()
})

// GET /api/agents/[id]/facebook - Get existing Facebook integration
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const agentId = params.id

  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check agent ownership
    const { data: agent } = await supabase
      .from('agents')
      .select('*, projects!inner(owner_id)')
      .eq('id', agentId)
      .single()

    if (!agent || agent.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get Facebook integration
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({ connected: false })
    }

    // Check if token is still valid
    const tokenExpired = integration.token_expires_at &&
      new Date(integration.token_expires_at) < new Date()

    return NextResponse.json({
      connected: true,
      integration: {
        pageId: integration.page_id,
        pageName: integration.page_name,
        pagePictureUrl: integration.page_picture_url,
        category: integration.category,
        fanCount: integration.fan_count,
        tokenValid: !tokenExpired,
        webhookVerified: integration.webhook_verified
      }
    })

  } catch (error) {
    console.error('Get Facebook integration error:', error)
    return NextResponse.json(
      { error: 'Failed to get Facebook integration' },
      { status: 500 }
    )
  }
}

// POST /api/agents/[id]/facebook - Save Facebook integration
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const agentId = params.id

  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = FacebookIntegrationSchema.parse(body)

    // Check agent ownership
    const { data: agent } = await supabase
      .from('agents')
      .select('*, projects!inner(owner_id)')
      .eq('id', agentId)
      .single()

    if (!agent || agent.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Exchange short-lived token for long-lived token (60 days)
    let longLivedToken = validatedData.pageAccessToken
    let tokenExpiresAt = null

    if (validatedData.userAccessToken) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&` +
          `client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&` +
          `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
          `fb_exchange_token=${validatedData.userAccessToken}`
        )

        const data = await response.json()
        if (data.access_token) {
          longLivedToken = data.access_token
          // Token expires in 60 days
          tokenExpiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000))
        }
      } catch (error) {
        console.error('Failed to exchange token:', error)
        // Continue with short-lived token if exchange fails
      }
    }

    // Upsert Facebook integration
    const { data: integration, error } = await supabase
      .from('facebook_integrations')
      .upsert({
        agent_id: agentId,
        page_id: validatedData.pageId,
        page_name: validatedData.pageName,
        page_access_token: longLivedToken,
        page_picture_url: validatedData.pagePictureUrl,
        category: validatedData.category,
        fan_count: validatedData.fanCount,
        user_access_token: validatedData.userAccessToken,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'agent_id,page_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      integration: {
        pageId: integration.page_id,
        pageName: integration.page_name,
        tokenValid: true
      }
    })

  } catch (error) {
    console.error('Save Facebook integration error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to save Facebook integration' },
      { status: 500 }
    )
  }
}

// DELETE /api/agents/[id]/facebook - Disconnect Facebook integration
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const agentId = params.id

  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check agent ownership
    const { data: agent } = await supabase
      .from('agents')
      .select('*, projects!inner(owner_id)')
      .eq('id', agentId)
      .single()

    if (!agent || agent.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Soft delete - just mark as inactive
    const { error } = await supabase
      .from('facebook_integrations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', agentId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete Facebook integration error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Facebook integration' },
      { status: 500 }
    )
  }
}