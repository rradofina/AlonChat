import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function addSampleChatLogs() {
  const agentId = 'dbda8d87-8276-45b0-9862-a1fd6c8ad785' // Replace with your agent ID

  // Add Messenger conversation
  const messengerConv = {
    session_id: `messenger_${Date.now()}`,
    agent_id: agentId,
    source: 'messenger',
    metadata: {
      sender_id: 'user123',
      sender_name: 'John Doe'
    },
    started_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  }

  const { data: conv1, error: error1 } = await supabase
    .from('conversations')
    .insert(messengerConv)
    .select()
    .single()

  if (!error1 && conv1) {
    await supabase.from('messages').insert([
      {
        conversation_id: conv1.id,
        role: 'user',
        content: 'Hi, what are your business hours?',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        metadata: { source: 'messenger' }
      },
      {
        conversation_id: conv1.id,
        role: 'assistant',
        content: 'Hello! Our business hours are Monday to Friday, 9 AM to 6 PM, and Saturday 10 AM to 4 PM. We\'re closed on Sundays. How can I help you today?',
        confidence_score: 0.92,
        created_at: new Date(Date.now() - 3590000).toISOString(),
        metadata: { source: 'messenger' }
      },
      {
        conversation_id: conv1.id,
        role: 'user',
        content: 'Do you offer delivery services?',
        created_at: new Date(Date.now() - 3580000).toISOString(),
        metadata: { source: 'messenger' }
      },
      {
        conversation_id: conv1.id,
        role: 'assistant',
        content: 'Yes, we offer delivery services! We provide free delivery for orders over $50 within a 10-mile radius. For orders under $50 or outside the 10-mile radius, a delivery fee of $5-15 applies depending on distance. Would you like to place an order?',
        confidence_score: 0.88,
        created_at: new Date(Date.now() - 3570000).toISOString(),
        metadata: { source: 'messenger' }
      }
    ])
    console.log('✅ Added Messenger conversation')
  }

  // Add WhatsApp conversation
  const whatsappConv = {
    session_id: `whatsapp_${Date.now()}`,
    agent_id: agentId,
    source: 'whatsapp',
    metadata: {
      phone_number: '+1234567890',
      sender_name: 'Jane Smith'
    },
    started_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  }

  const { data: conv2, error: error2 } = await supabase
    .from('conversations')
    .insert(whatsappConv)
    .select()
    .single()

  if (!error2 && conv2) {
    await supabase.from('messages').insert([
      {
        conversation_id: conv2.id,
        role: 'user',
        content: 'Hello, I need help with my recent order',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        metadata: { source: 'whatsapp' }
      },
      {
        conversation_id: conv2.id,
        role: 'assistant',
        content: 'Hello! I\'d be happy to help you with your recent order. Could you please provide your order number or the email address used for the purchase?',
        confidence_score: 0.95,
        created_at: new Date(Date.now() - 7190000).toISOString(),
        metadata: { source: 'whatsapp' }
      },
      {
        conversation_id: conv2.id,
        role: 'user',
        content: 'Order #12345',
        created_at: new Date(Date.now() - 7180000).toISOString(),
        metadata: { source: 'whatsapp' }
      },
      {
        conversation_id: conv2.id,
        role: 'assistant',
        content: 'Thank you! I can see your order #12345 placed yesterday. It\'s currently being prepared for shipping and should arrive within 2-3 business days. You\'ll receive a tracking number via email once it ships. Is there anything specific about this order you\'d like to know?',
        confidence_score: 0.91,
        created_at: new Date(Date.now() - 7170000).toISOString(),
        metadata: { source: 'whatsapp' }
      }
    ])
    console.log('✅ Added WhatsApp conversation')
  }

  // Add API conversation
  const apiConv = {
    session_id: `api_${Date.now()}`,
    agent_id: agentId,
    source: 'api',
    metadata: {
      api_key: 'sk-xxxx',
      endpoint: '/v1/chat'
    },
    started_at: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  }

  const { data: conv3, error: error3 } = await supabase
    .from('conversations')
    .insert(apiConv)
    .select()
    .single()

  if (!error3 && conv3) {
    await supabase.from('messages').insert([
      {
        conversation_id: conv3.id,
        role: 'user',
        content: 'What are the pricing tiers available?',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        metadata: { source: 'api' }
      },
      {
        conversation_id: conv3.id,
        role: 'assistant',
        content: 'We offer three pricing tiers:\n\n1. **Basic Plan** - $29/month\n   - Up to 1,000 conversations\n   - 5 GB storage\n   - Email support\n\n2. **Professional Plan** - $99/month\n   - Up to 10,000 conversations\n   - 50 GB storage\n   - Priority support\n   - Advanced analytics\n\n3. **Enterprise Plan** - Custom pricing\n   - Unlimited conversations\n   - Unlimited storage\n   - Dedicated support\n   - Custom integrations\n\nWhich plan would best suit your needs?',
        confidence_score: 0.97,
        created_at: new Date(Date.now() - 1790000).toISOString(),
        metadata: { source: 'api' }
      }
    ])
    console.log('✅ Added API conversation')
  }

  // Add Widget/Iframe conversation
  const widgetConv = {
    session_id: `widget_${Date.now()}`,
    agent_id: agentId,
    source: 'website',
    metadata: {
      page_url: 'https://example.com/products',
      visitor_id: 'visitor_456'
    },
    started_at: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
  }

  const { data: conv4, error: error4 } = await supabase
    .from('conversations')
    .insert(widgetConv)
    .select()
    .single()

  if (!error4 && conv4) {
    await supabase.from('messages').insert([
      {
        conversation_id: conv4.id,
        role: 'user',
        content: 'Is this product available in blue?',
        created_at: new Date(Date.now() - 600000).toISOString(),
        metadata: { source: 'website' }
      },
      {
        conversation_id: conv4.id,
        role: 'assistant',
        content: 'Yes! This product is available in blue, along with red, black, and white color options. The blue variant is currently in stock and ready to ship. Would you like me to help you add it to your cart?',
        confidence_score: 0.89,
        created_at: new Date(Date.now() - 590000).toISOString(),
        metadata: { source: 'website' }
      }
    ])
    console.log('✅ Added Widget/Iframe conversation')
  }

  console.log('✨ All sample conversations added successfully!')
  console.log('Go to Chat Logs to see all sources integrated in one place')
  process.exit(0)
}

addSampleChatLogs().catch((error) => {
  console.error('Error adding sample chat logs:', error)
  process.exit(1)
})