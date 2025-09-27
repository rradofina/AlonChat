import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for saving Instagram integration
const InstagramIntegrationSchema = z.object({
  accountId: z.string(),
  username: z.string(),
  name: z.string().optional(),
  profilePicUrl: z.string().optional(),
  followersCount: z.number().optional(),
  pageId: z.string(), // Connected Facebook Page ID
  pageAccessToken: z.string(),
  userAccessToken: z.string().optional()
})

// GET /api/agents/[id]/instagram - Get existing Instagram integration
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

    // Get Instagram integration
    const { data: integration } = await supabase
      .from('instagram_integrations')
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
        accountId: integration.instagram_account_id,
        username: integration.instagram_username,
        name: integration.instagram_name,
        profilePicUrl: integration.instagram_profile_pic,
        followersCount: integration.instagram_followers_count,
        tokenValid: !tokenExpired,
        webhookVerified: integration.webhook_verified
      }
    })

  } catch (error) {
    console.error('Get Instagram integration error:', error)
    return NextResponse.json(
      { error: 'Failed to get Instagram integration' },
      { status: 500 }
    )
  }
}

// POST /api/agents/[id]/instagram - Save Instagram integration
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
    const validatedData = InstagramIntegrationSchema.parse(body)

    // Check agent ownership
    const { data: agent } = await supabase
      .from('agents')
      .select('*, projects!inner(owner_id)')
      .eq('id', agentId)
      .single()

    if (!agent || agent.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Exchange for long-lived token (same as Facebook)
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
      }
    }

    // Upsert Instagram integration
    const { data: integration, error } = await supabase
      .from('instagram_integrations')
      .upsert({
        agent_id: agentId,
        instagram_account_id: validatedData.accountId,
        instagram_username: validatedData.username,
        instagram_name: validatedData.name,
        instagram_profile_pic: validatedData.profilePicUrl,
        instagram_followers_count: validatedData.followersCount,
        facebook_page_id: validatedData.pageId,
        access_token: longLivedToken,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'agent_id,instagram_account_id'
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
        accountId: integration.instagram_account_id,
        username: integration.instagram_username,
        tokenValid: true
      }
    })

  } catch (error) {
    console.error('Save Instagram integration error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to save Instagram integration' },
      { status: 500 }
    )
  }
}

// DELETE /api/agents/[id]/instagram - Disconnect Instagram integration
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
      .from('instagram_integrations')
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
    console.error('Delete Instagram integration error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Instagram integration' },
      { status: 500 }
    )
  }
}