import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueWebsiteCrawl, getJobStatus } from '@/lib/queue/website-processor'
import { scrapeWebsite } from '@/lib/sources/website-scraper'
import { chunkWebsiteContent } from '@/lib/sources/chunker'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { url, crawlSubpages, maxPages } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Get the agent to ensure it exists and get project_id
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('project_id')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Insert website source into database
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        agent_id: params.id,
        project_id: agent.project_id,
        type: 'website',
        name: url,
        website_url: url,
        size_kb: 0, // Will be updated as pages are crawled
        status: 'pending',
        metadata: {
          url,
          crawl_subpages: crawlSubpages || false,
          max_pages: maxPages || 10,
          pages_crawled: 0
        }
      })
      .select()
      .single()

    if (sourceError) {
      console.error('Error creating website source:', sourceError)
      return NextResponse.json(
        { error: 'Failed to create website source' },
        { status: 500 }
      )
    }

    // Try to queue the crawl job
    const jobId = await queueWebsiteCrawl({
      sourceId: source.id,
      agentId: params.id,
      projectId: agent.project_id,
      url,
      crawlSubpages: crawlSubpages || false,
      maxPages: maxPages || 10
    })

    // If queue is not available, process directly (fallback)
    if (!jobId) {
      console.log('Queue not available, processing website directly')

      // Update status to processing
      await supabase
        .from('sources')
        .update({ status: 'processing' })
        .eq('id', source.id)

      // Process in background (fire and forget)
      processWebsiteDirectly(source.id, params.id, agent.project_id, url, crawlSubpages || false, maxPages || 10)
    }

    // Format for frontend
    const formattedSource = {
      id: source.id,
      agent_id: source.agent_id,
      type: 'website',
      name: source.name,
      url: source.website_url,
      status: source.status,
      pages_crawled: source.metadata?.pages_crawled || 0,
      max_pages: source.metadata?.max_pages || 10,
      crawl_subpages: source.metadata?.crawl_subpages || false,
      created_at: source.created_at,
      metadata: source.metadata
    }

    return NextResponse.json({
      success: true,
      source: formattedSource,
      message: 'Website crawling started'
    })

  } catch (error) {
    console.error('Website crawl error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Fetch website sources from database
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('agent_id', params.id)
      .eq('type', 'website')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching websites:', error)
      return NextResponse.json({ sources: [] })
    }

    // Format for frontend
    const formattedSources = sources.map(source => ({
      id: source.id,
      agent_id: source.agent_id,
      type: 'website',
      name: source.name,
      url: source.website_url,
      status: source.status,
      pages_crawled: source.metadata?.pages_crawled || 0,
      max_pages: source.metadata?.max_pages || 10,
      crawl_subpages: source.metadata?.crawl_subpages || false,
      created_at: source.created_at,
      metadata: source.metadata
    }))

    return NextResponse.json({ sources: formattedSources })

  } catch (error) {
    console.error('Get websites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fallback direct processing when queue is not available
async function processWebsiteDirectly(
  sourceId: string,
  agentId: string,
  projectId: string,
  url: string,
  crawlSubpages: boolean,
  maxPages: number
) {
  const supabase = await createClient()

  try {
    console.log(`Starting direct crawl for ${url}`)

    // Crawl website
    const crawlResults = await scrapeWebsite(url, maxPages, crawlSubpages)

    // Update pages crawled count with crawled pages list
    const crawledPages = crawlResults.filter(r => !r.error).map(r => r.url)
    await supabase
      .from('sources')
      .update({
        metadata: {
          url,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          pages_crawled: crawlResults.length,
          crawled_pages: crawledPages,
          crawl_errors: crawlResults.filter(r => r.error).map(r => ({
            url: r.url,
            error: r.error
          }))
        }
      })
      .eq('id', sourceId)

    // Process and chunk content
    const validPages = crawlResults.filter(r => !r.error && r.content)
    if (validPages.length === 0) {
      throw new Error('No valid pages found to process')
    }

    console.log(`Processing ${validPages.length} pages`)
    const chunks = await chunkWebsiteContent(validPages)

    // Calculate total size
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)

    // Insert chunks into database
    const { error: insertError } = await supabase
      .from('documents')
      .insert(
        chunks.map((chunk, index) => ({
          source_id: sourceId,
          agent_id: agentId,
          project_id: projectId,
          content: chunk.content,
          embedding: chunk.embedding || null,
          metadata: chunk.metadata,
          chunk_index: index
        }))
      )

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`)
    }

    // Update source status to ready
    await supabase
      .from('sources')
      .update({
        status: 'ready',
        size_kb: Math.ceil(totalSize / 1024),
        metadata: {
          url,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          pages_crawled: validPages.length,
          crawled_pages: validPages.map(p => p.url),
          total_chunks: chunks.length,
          crawl_completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    console.log(`Successfully processed ${validPages.length} pages, ${chunks.length} chunks`)

  } catch (error: any) {
    console.error(`Error processing website:`, error)

    // Update source status to error
    await supabase
      .from('sources')
      .update({
        status: 'error',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { action, sourceId, ...data } = body

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID required' },
        { status: 400 }
      )
    }

    // Handle different actions
    switch (action) {
      case 'edit': {
        const { name, url, crawlSubpages, maxPages } = data

        // Update source
        const { data: source, error } = await supabase
          .from('sources')
          .update({
            name: name || url,
            website_url: url,
            metadata: {
              url,
              crawl_subpages: crawlSubpages || false,
              max_pages: maxPages || 10,
              pages_crawled: 0,
              updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', sourceId)
          .eq('agent_id', params.id)
          .select()
          .single()

        if (error) {
          console.error('Edit error:', error)
          return NextResponse.json(
            { error: 'Failed to update website' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          source,
          message: 'Website updated successfully'
        })
      }

      case 're-crawl': {
        // Get source details
        const { data: source, error: fetchError } = await supabase
          .from('sources')
          .select('*')
          .eq('id', sourceId)
          .eq('agent_id', params.id)
          .single()

        if (fetchError || !source) {
          return NextResponse.json(
            { error: 'Source not found' },
            { status: 404 }
          )
        }

        // Delete existing documents
        await supabase
          .from('documents')
          .delete()
          .eq('source_id', sourceId)

        // Reset source status
        await supabase
          .from('sources')
          .update({
            status: 'pending',
            size_kb: 0,
            metadata: {
              ...source.metadata,
              pages_crawled: 0,
              crawled_pages: [],
              crawl_errors: [],
              total_chunks: 0,
              crawl_completed_at: null
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', sourceId)

        // Get agent for project_id
        const { data: agent } = await supabase
          .from('agents')
          .select('project_id')
          .eq('id', params.id)
          .single()

        // Queue new crawl
        const jobId = await queueWebsiteCrawl({
          sourceId,
          agentId: params.id,
          projectId: agent?.project_id || '',
          url: source.website_url,
          crawlSubpages: source.metadata?.crawl_subpages || false,
          maxPages: source.metadata?.max_pages || 10
        })

        // Fallback to direct processing if queue unavailable
        if (!jobId) {
          processWebsiteDirectly(
            sourceId,
            params.id,
            agent?.project_id || '',
            source.website_url,
            source.metadata?.crawl_subpages || false,
            source.metadata?.max_pages || 10
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Re-crawl initiated'
        })
      }

      case 'exclude-link': {
        const { linkUrl } = data

        if (!linkUrl) {
          return NextResponse.json(
            { error: 'Link URL required' },
            { status: 400 }
          )
        }

        // Get current source
        const { data: source, error: fetchError } = await supabase
          .from('sources')
          .select('metadata')
          .eq('id', sourceId)
          .eq('agent_id', params.id)
          .single()

        if (fetchError || !source) {
          return NextResponse.json(
            { error: 'Source not found' },
            { status: 404 }
          )
        }

        // Remove link from crawled pages
        const crawledPages = source.metadata?.crawled_pages || []
        const updatedPages = crawledPages.filter((url: string) => url !== linkUrl)

        // Delete documents from this URL
        await supabase
          .from('documents')
          .delete()
          .eq('source_id', sourceId)
          .eq('metadata->page_url', linkUrl)

        // Update source metadata
        const { error: updateError } = await supabase
          .from('sources')
          .update({
            metadata: {
              ...source.metadata,
              crawled_pages: updatedPages,
              pages_crawled: updatedPages.length,
              excluded_links: [
                ...(source.metadata?.excluded_links || []),
                linkUrl
              ]
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', sourceId)

        if (updateError) {
          console.error('Exclude link error:', updateError)
          return NextResponse.json(
            { error: 'Failed to exclude link' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Link excluded successfully'
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { sourceIds } = await request.json()

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: 'Source IDs required' },
        { status: 400 }
      )
    }

    // Delete from database
    const { error } = await supabase
      .from('sources')
      .delete()
      .in('id', sourceIds)
      .eq('agent_id', params.id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete websites' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${sourceIds.length} website(s)`
    })

  } catch (error) {
    console.error('Delete websites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}