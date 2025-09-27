import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/auth/facebook/callback`

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get('agent_id')

  // Check if Facebook App ID is configured
  if (!FACEBOOK_APP_ID || FACEBOOK_APP_ID === 'your_facebook_app_id') {
    // Return an HTML page with setup instructions
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Facebook App Setup Required</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 { color: #1877f2; }
            code {
              background: #f0f0f0;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 14px;
            }
            .steps {
              background: #f8f9fa;
              border-left: 4px solid #1877f2;
              padding: 15px;
              margin: 20px 0;
            }
            ol { line-height: 1.8; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Facebook App Not Configured</h1>
            <p class="error">You need to set up a Facebook App to use this integration.</p>

            <div class="steps">
              <h3>Quick Setup:</h3>
              <ol>
                <li>Go to <a href="https://developers.facebook.com/apps" target="_blank">developers.facebook.com</a></li>
                <li>Create a new app (choose "Business" type)</li>
                <li>Copy your App ID and App Secret</li>
                <li>Add to your <code>.env.local</code> file:
                  <pre>NEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret</pre>
                </li>
                <li>Restart your development server</li>
              </ol>
            </div>

            <p>For detailed instructions, see <code>docs/FACEBOOK_SETUP.md</code></p>

            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #1877f2; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Close Window
            </button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID required' }, { status: 400 })
  }

  // Facebook OAuth URL with required permissions
  const permissions = [
    'pages_show_list',           // List pages user manages
    'pages_messaging',            // Send/receive messages
    'pages_manage_metadata',      // Manage page settings
    'pages_read_engagement',      // Read page insights
    'business_management',        // Access business manager
    'instagram_basic',            // Basic Instagram profile info
    'instagram_manage_messages',  // Send/receive Instagram DMs
    'instagram_manage_comments',  // Manage Instagram comments
    'instagram_content_publish'   // Publish to Instagram
  ].join(',')

  const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${agentId}` +
    `&scope=${permissions}` +
    `&response_type=code`

  return NextResponse.redirect(oauthUrl)
}

// Handle OAuth callback
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { code, agentId } = body

  if (!code || !agentId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}` +
      `&client_secret=${FACEBOOK_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&code=${code}`
    )

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error.message)
    }

    // Get user's pages with Instagram accounts
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?` +
      `access_token=${tokenData.access_token}` +
      `&fields=id,name,picture,access_token,category,fan_count,instagram_business_account`
    )

    const pagesData = await pagesResponse.json()

    // Get Instagram Business Account details for each page
    const pagesWithInstagram = await Promise.all(
      (pagesData.data || []).map(async (page: any) => {
        let instagramAccount = null

        if (page.instagram_business_account) {
          try {
            const igResponse = await fetch(
              `https://graph.facebook.com/v18.0/${page.instagram_business_account.id}?` +
              `access_token=${page.access_token}` +
              `&fields=id,username,name,profile_picture_url,followers_count,media_count`
            )
            instagramAccount = await igResponse.json()
          } catch (error) {
            console.error('Failed to fetch Instagram account:', error)
          }
        }

        return {
          ...page,
          instagram_account: instagramAccount
        }
      })
    )

    // Get business accounts if available
    const businessResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?` +
      `access_token=${tokenData.access_token}` +
      `&fields=id,name,created_time`
    )

    const businessData = await businessResponse.json()

    return NextResponse.json({
      success: true,
      pages: pagesWithInstagram,
      businesses: businessData.data || [],
      user_access_token: tokenData.access_token
    })

  } catch (error: any) {
    console.error('Facebook OAuth error:', error)
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    )
  }
}