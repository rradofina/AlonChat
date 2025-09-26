import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { provider, modelId } = await request.json()

    switch (provider) {
      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'OpenAI API key not configured',
            provider: 'openai',
            modelId
          })
        }

        // If testing specific model, make minimal completion
        if (modelId) {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Say "test"' }],
              max_tokens: 5,
              temperature: 0
            })
          })

          if (!response.ok) {
            const error = await response.text()
            return NextResponse.json({
              success: false,
              error: `Model ${modelId} test failed: ${response.status}`,
              details: error,
              provider: 'openai',
              modelId
            })
          }

          return NextResponse.json({
            success: true,
            message: `Model ${modelId} working correctly`,
            provider: 'openai',
            modelId
          })
        }

        // Otherwise test general connection
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })

        if (!response.ok) {
          const error = await response.text()
          return NextResponse.json({
            success: false,
            error: `OpenAI API error: ${response.status}`,
            details: error,
            provider: 'openai'
          })
        }

        return NextResponse.json({
          success: true,
          message: 'OpenAI connection successful',
          provider: 'openai'
        })
      }

      case 'google': {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'Google Gemini API key not configured',
            provider: 'google',
            modelId
          })
        }

        // If testing specific model, make minimal completion
        if (modelId) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say test' }] }],
                generationConfig: {
                  maxOutputTokens: 5,
                  temperature: 0
                }
              })
            }
          )

          if (!response.ok) {
            const error = await response.text()
            return NextResponse.json({
              success: false,
              error: `Model ${modelId} test failed: ${response.status}`,
              details: error,
              provider: 'google',
              modelId
            })
          }

          return NextResponse.json({
            success: true,
            message: `Model ${modelId} working correctly`,
            provider: 'google',
            modelId
          })
        }

        // Otherwise test general connection
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        )

        if (!response.ok) {
          const error = await response.text()
          return NextResponse.json({
            success: false,
            error: `Google API error: ${response.status}`,
            details: error,
            provider: 'google'
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Google Gemini connection successful',
          provider: 'google'
        })
      }

      case 'anthropic': {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'Anthropic API key not configured',
            provider: 'anthropic'
          })
        }

        // Test Anthropic connection with minimal completion (1-2 tokens max)
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307', // Cheapest model
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1 // Minimum tokens
          })
        })

        if (!response.ok) {
          const error = await response.text()
          return NextResponse.json({
            success: false,
            error: `Anthropic API error: ${response.status}`,
            details: error,
            provider: 'anthropic'
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Anthropic connection successful',
          provider: 'anthropic'
        })
      }

      case 'xai': {
        const apiKey = process.env.XAI_API_KEY
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'xAI API key not configured',
            provider: 'xai',
            modelId
          })
        }

        // If testing specific model, make minimal completion
        if (modelId) {
          const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Say "test"' }],
              max_tokens: 5,
              temperature: 0,
              stream: false
            })
          })

          if (!response.ok) {
            const error = await response.text()
            return NextResponse.json({
              success: false,
              error: `Model ${modelId} test failed: ${response.status}`,
              details: error,
              provider: 'xai',
              modelId
            })
          }

          return NextResponse.json({
            success: true,
            message: `Model ${modelId} working correctly`,
            provider: 'xai',
            modelId
          })
        }

        // Otherwise test general connection
        const response = await fetch('https://api.x.ai/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })

        if (!response.ok) {
          const error = await response.text()
          return NextResponse.json({
            success: false,
            error: `xAI API error: ${response.status}`,
            details: error,
            provider: 'xai'
          })
        }

        return NextResponse.json({
          success: true,
          message: 'xAI connection successful',
          provider: 'xai'
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown provider: ${provider}`
        })
    }
  } catch (error: any) {
    console.error('Connection test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Connection test failed'
    })
  }
}