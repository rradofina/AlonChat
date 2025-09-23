import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  try {
    console.log('Creating test user...')

    // Create test user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@alonchat.com',
      password: 'Test123456!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    })

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already') || authError.code === 'email_exists') {
        console.log('Test user already exists, updating password...')

        // Get user by email
        const { data: users } = await supabase.auth.admin.listUsers()
        const testUser = users?.users?.find(u => u.email === 'test@alonchat.com')

        if (testUser) {
          // Update password
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            testUser.id,
            { password: 'Test123456!' }
          )

          if (updateError) {
            console.error('Error updating password:', updateError)
          } else {
            console.log('Password updated successfully')
          }

          // Use existing user ID for further operations
          await createTestData(testUser.id)
          return
        }
      } else {
        throw authError
      }
    }

    if (!authData?.user) {
      throw new Error('Failed to create user')
    }

    console.log('Test user created:', authData.user.email)

    // Create test data
    await createTestData(authData.user.id)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

async function createTestData(userId: string) {
  try {
    // Check if project already exists
    const { data: existingProject } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .single()

    let projectId: string

    if (existingProject) {
      console.log('Test project already exists')
      projectId = existingProject.id
    } else {
      // Create a test project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'Test Project',
          url_slug: `test-project-${Date.now()}`,
          owner_id: userId
        })
        .select()
        .single()

      if (projectError) throw projectError
      console.log('Test project created')
      projectId = project.id
    }

    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('*')
      .eq('project_id', projectId)
      .eq('name', 'Test Agent')
      .single()

    let agentId: string

    if (existingAgent) {
      console.log('Test agent already exists')
      agentId = existingAgent.id
    } else {
      // Create a test agent
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .insert({
          name: 'Test Agent',
          project_id: projectId,
          description: 'Agent for automated testing',
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          max_tokens: 500,
          system_prompt: 'You are a helpful AI assistant for testing purposes.',
          welcome_message: 'Hello! I am a test agent. How can I help you?',
          status: 'ready'
        })
        .select()
        .single()

      if (agentError) throw agentError
      console.log('Test agent created')
      agentId = agent.id
    }

    // Add Google API key for testing (if not exists)
    const { data: existingCreds } = await supabase
      .from('ai_provider_credentials')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (!existingCreds) {
      // Get Google provider ID
      const { data: googleProvider } = await supabase
        .from('ai_providers')
        .select('id')
        .eq('name', 'google')
        .single()

      if (googleProvider) {
        const { error: credError } = await supabase
          .from('ai_provider_credentials')
          .insert({
            project_id: projectId,
            provider_id: googleProvider.id,
            credentials: {
              GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || 'test-api-key'
            },
            is_active: true
          })

        if (credError && !credError.message.includes('duplicate')) {
          console.error('Error adding credentials:', credError)
        } else {
          console.log('Test API credentials added')
        }
      }
    }

    console.log('\n✅ Test setup complete!')
    console.log('------------------------')
    console.log('Email: test@alonchat.com')
    console.log('Password: Test123456!')
    console.log('Project ID:', projectId)
    console.log('Agent ID:', agentId)
    console.log('------------------------')
    console.log('\nYou can now run the tests with these credentials.')

    process.exit(0)
  } catch (error) {
    console.error('Error creating test data:', error)
    process.exit(1)
  }
}

// Run the script
createTestUser()