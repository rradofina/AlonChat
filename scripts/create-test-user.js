const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseServiceKey || supabaseServiceKey === 'your_service_key_here') {
  console.error('Please set SUPABASE_SERVICE_KEY in your .env.local file')
  console.error('You can find it in your Supabase project settings under API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  // Create user with the email you provided
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'mond118@yahoo.com',
    password: '*TALTkD6cCK5R-U',
    email_confirm: true
  })

  if (error) {
    console.error('Error creating user:', error.message)
    return
  }

  console.log('Test user created successfully!')
  console.log('Email:', 'mond118@yahoo.com')
  console.log('Password:', '*TALTkD6cCK5R-U')
  console.log('User ID:', data.user.id)
}

createTestUser()