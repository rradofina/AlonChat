import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin
      .storage
      .listBuckets()

    if (listError) {
      return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 })
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'agent-sources')

    if (!bucketExists) {
      // Create the bucket
      const { data, error: createError } = await supabaseAdmin
        .storage
        .createBucket('agent-sources', {
          public: true,
          allowedMimeTypes: [
            'application/pdf',
            'text/plain',
            'text/csv',
            'text/html',
            'text/markdown',
            'application/json',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
          ],
          fileSizeLimit: 31457280 // 30MB
        })

      if (createError) {
        return NextResponse.json({
          error: 'Failed to create bucket',
          details: createError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Bucket created successfully',
        bucket: data
      })
    }

    return NextResponse.json({
      message: 'Bucket already exists',
      bucket: buckets.find(b => b.name === 'agent-sources')
    })

  } catch (error) {
    console.error('Storage setup error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}