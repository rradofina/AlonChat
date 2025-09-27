import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueWebsiteCrawl, getJobStatus } from '@/lib/queue/website-processor'
import { scrapeWebsite, CrawlProgress } from '@/lib/sources/website-scraper'
import { ChunkManager } from '@/lib/services/chunk-manager'
import {
  sanitizeError,
  validateCrawlUrl,
  checkRateLimit,
  logSecurityEvent
} from '@/lib/utils/security'

export interface ExtendedCrawlProgress extends CrawlProgress {
  discoveredLinks: string[]
  startTime?: number
  averageTimePerPage?: number
  queueLength?: number
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { url, crawlSubpages, maxPages, fullPageContent } = await request.json()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id, 10, 60000) // 10 requests per minute
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        type: 'rate_limit',
        userId: user.id,
        details: { endpoint: 'website-crawl' }
      })
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds` },
        { status: 429 }
      )
    }

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate and sanitize URL
    const urlValidation = validateCrawlUrl(url)
    if (!urlValidation.valid) {
      await logSecurityEvent({
        type: urlValidation.error?.includes('Private') || urlValidation.error?.includes('Local') ? 'ssrf_attempt' : 'invalid_url',
        userId: user.id,
        details: { url, error: urlValidation.error }
      })
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid URL' },
        { status: 400 }
      )
    }

    const validatedUrl = urlValidation.normalizedUrl!

    // Validate maxPages
    const safeMaxPages = Math.min(Math.max(1, maxPages || 10), 1000) // Cap at 1000 pages

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
        name: validatedUrl,
        website_url: validatedUrl,
        size_kb: 0, // Will be updated as pages are crawled
        status: 'pending',
        is_trained: false, // Explicitly set to false - websites are not trained until training is run
        chunk_count: 0,
        metadata: {
          url: validatedUrl,
          crawl_subpages: crawlSubpages || false,
          max_pages: safeMaxPages,
          pages_crawled: 0,
          crawled_pages: [],
          discovered_links: [],
          crawl_errors: [],
          crawl_progress: null,
          full_page_content: fullPageContent || false
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
      url: validatedUrl,
      crawlSubpages: crawlSubpages || false,
      maxPages: safeMaxPages
    })

    // If queue is available, update status to queued
    if (jobId) {
      console.log(`Website queued with job ID: ${jobId}`)

      await supabase
        .from('sources')
        .update({
          status: 'queued',
          metadata: {
            ...source.metadata,
            job_id: jobId
          }
        })
        .eq('id', source.id)
    } else {
      // If queue is not available, process directly (fallback)
      console.log('Queue not available, processing website directly')

      // Update status to processing
      await supabase
        .from('sources')
        .update({ status: 'processing' })
        .eq('id', source.id)

      // Process in background (fire and forget)
      processWebsiteDirectly(source.id, params.id, agent.project_id, validatedUrl, crawlSubpages || false, safeMaxPages, fullPageContent || false).catch(error => {
        console.error('Background processing failed:', error)
      })
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
      { error: sanitizeError(error) },
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
      .neq('status', 'removed') // Don't show soft-deleted websites
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching websites:', error)
      return NextResponse.json({ sources: [] })
    }

    // Format for frontend with progress information from database
    const formattedSources = sources.map(source => {
      // Get progress from metadata instead of memory
      const progress = source.metadata?.crawl_progress || null

      return {
        id: source.id,
        agent_id: source.agent_id,
        type: 'website',
        name: source.name,
        url: source.website_url,
        status: source.status,
        pages_crawled: source.metadata?.pages_crawled || 0,
        max_pages: source.metadata?.max_pages || 10,
        crawl_subpages: source.metadata?.crawl_subpages || false,
        chunk_count: source.chunk_count || 0,
        is_trained: source.is_trained || false,
        created_at: source.created_at,
        metadata: source.metadata,
        progress: progress,
        discovered_links: source.metadata?.discovered_links || []
      }
    })

    return NextResponse.json({ sources: formattedSources })

  } catch (error) {
    console.error('Get websites error:', error)
    return NextResponse.json(
      { error: sanitizeError(error) },
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
  maxPages: number,
  fullPageContent: boolean = false
) {
  const supabase = await createClient()
  let isTimedOut = false
  let crawlAbortController: AbortController | null = null

  // Progressive timeout strategy
  const INITIAL_TIMEOUT = 30000 // 30 seconds per page
  const MAX_TOTAL_TIME = 5 * 60 * 1000 // 5 minutes max
  const startTime = Date.now()

  // Set a maximum timeout
  const crawlTimeout = setTimeout(async () => {
    isTimedOut = true
    console.error(`Crawl timeout for ${sourceId} after ${MAX_TOTAL_TIME / 1000} seconds`)

    // Abort any ongoing operations
    if (crawlAbortController) {
      crawlAbortController.abort()
    }

    // Update status with timeout error
    await supabase
      .from('sources')
      .update({
        status: 'error',
        metadata: {
          url,
          error_message: 'Crawl timeout - operation took too long',
          crawl_progress: null,
          timeout_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    // Send timeout notification via channel
    await supabase.channel(`crawl-${sourceId}`).send({
      type: 'broadcast',
      event: 'crawl_progress',
      payload: {
        sourceId,
        status: 'failed',
        phase: 'timeout',
        error: 'Operation timed out'
      }
    })
  }, MAX_TOTAL_TIME)

  // Normalize URL by adding https:// if no protocol is specified
  let normalizedUrl = url
  if (!url.match(/^https?:\/\//i)) {
    normalizedUrl = 'https://' + url
    console.log(`Normalized URL from ${url} to ${normalizedUrl}`)
  }

  try {
    // Check if already timed out before starting
    if (isTimedOut) {
      clearTimeout(crawlTimeout)
      return
    }

    console.log(`Starting direct crawl for ${normalizedUrl}`)
    console.log(`Settings: maxPages=${maxPages}, crawlSubpages=${crawlSubpages}`)

    const startTime = Date.now()
    let pagesProcessed = 0
    const discoveredLinks = new Set<string>()

    // Broadcast crawl started
    await supabase.channel(`crawl-${sourceId}`).send({
      type: 'broadcast',
      event: 'crawl_progress',
      payload: {
        sourceId,
        status: 'started',
        phase: 'discovering',
        current: 0,
        total: 0,
        progress: 0
      }
    })

    // Progress callback to store in database and broadcast real-time updates
    const progressCallback = async (progress: ExtendedCrawlProgress) => {
      // Check if timed out
      if (isTimedOut) {
        throw new Error('Operation timed out')
      }

      pagesProcessed++
      const elapsedTime = Date.now() - startTime
      const averageTimePerPage = elapsedTime / pagesProcessed

      // Dynamic timeout adjustment based on performance
      if (averageTimePerPage > INITIAL_TIMEOUT) {
        console.warn(`Slow crawl detected: ${averageTimePerPage}ms per page`)
      }

      // Add discovered links from progress
      if (progress.discoveredLinks) {
        progress.discoveredLinks.forEach(link => discoveredLinks.add(link))
      }

      // Update progress in database
      const progressData = {
        ...progress,
        discoveredLinks: Array.from(discoveredLinks),
        startTime,
        averageTimePerPage
      }

      const { error: updateError } = await supabase
        .from('sources')
        .update({
          metadata: {
            url: normalizedUrl,
            crawl_subpages: crawlSubpages,
            max_pages: maxPages,
            pages_crawled: progress.current, // Always use current, not 0!
            crawled_pages: [],
            discovered_links: Array.from(discoveredLinks),
            crawl_errors: [],
            crawl_progress: progressData,
            full_page_content: false
          }
        })
        .eq('id', sourceId)

      if (updateError) {
        console.error(`Failed to update progress for ${sourceId}:`, updateError)
      }

      // Broadcast real-time progress update
      const broadcastData = {
        sourceId,
        status: 'progress',
        phase: progress.phase,
        current: progress.current,
        total: progress.total,
        currentUrl: progress.currentUrl,
        discoveredLinks: Array.from(discoveredLinks),
        pagesProcessed: progress.current,
        progress: Math.round((progress.current / Math.max(progress.total || 1, 1)) * 100),
        queueLength: progress.queueLength
      }

      // Send broadcast event for real-time updates
      await supabase.channel(`crawl-${sourceId}`).send({
        type: 'broadcast',
        event: 'crawl_progress',
        payload: broadcastData
      })

      console.log(`Progress [${sourceId}]: ${progress.phase} - ${progress.current}/${progress.total} - ${progress.currentUrl}`)
      console.log(`Discovered ${discoveredLinks.size} links, broadcasted update`)
    }

    // Crawl website with progress tracking
    const crawlResults = await scrapeWebsite(normalizedUrl, maxPages, crawlSubpages, progressCallback as any, fullPageContent)
    console.log(`Crawl results: ${crawlResults.length} pages`)
    crawlResults.forEach(r => {
      console.log(`- ${r.url}: ${r.error ? `ERROR: ${r.error}` : `${r.content?.length || 0} chars`}`)
    })

    // Update pages crawled count with crawled pages list
    const crawledPages = crawlResults.filter(r => !r.error).map(r => r.url)
    const crawlErrors = crawlResults.filter(r => r.error).map(r => ({
      url: r.url,
      error: r.error
    }))

    // Process and chunk content
    const validPages = crawlResults.filter(r => !r.error && r.content)

    // Even if no valid pages, update the source with the attempted crawl
    if (validPages.length === 0) {
      console.log('No valid pages found, marking as ready with attempted URLs')

      // For individual link mode, still show the main URL as "crawled"
      // This allows users to see and click through to the website details
      const attemptedUrls = crawlSubpages ? [] : [normalizedUrl]

      await supabase
        .from('sources')
        .update({
          status: 'ready',
          size_kb: 0,
          chunk_count: 0,
          metadata: {
            url: normalizedUrl,
            crawl_subpages: crawlSubpages,
            max_pages: maxPages,
            pages_crawled: attemptedUrls.length,
            crawled_pages: attemptedUrls, // Store main URL for individual mode
            discovered_links: [],
            crawl_errors: crawlErrors,
            crawl_progress: null,
            total_chunks: 0,
            full_page_content: false,
            crawl_completed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceId)

      return // Exit early but don't throw error
    }

    console.log(`Processing ${validPages.length} pages`)

    // Process each page separately to maintain page boundaries
    let totalChunks = 0
    let totalSize = 0

    for (const page of validPages) {
      // Store chunks for each page with page-specific metadata
      const chunkCount = await ChunkManager.storeChunks({
        sourceId,
        agentId,
        projectId,
        content: page.content || '',
        metadata: {
          type: 'website',
          page_url: page.url,
          page_title: page.title || page.url,
          root_url: normalizedUrl,
          crawl_timestamp: new Date().toISOString(),
          // Add link depth if available
          depth: page.url === url ? 0 : page.url.split('/').length - url.split('/').length
        },
        chunkSize: 4000, // Larger chunks for websites
        chunkOverlap: 400, // Maintain overlap for context
        supabaseClient: supabase
      })

      totalChunks += chunkCount
      totalSize += (page.content || '').length
      console.log(`Chunked page ${page.url}: ${chunkCount} chunks`)
    }

    // Calculate size in KB
    const sizeKb = Math.ceil(totalSize / 1024)

    // Update source status to ready with all metadata
    await supabase
      .from('sources')
      .update({
        status: 'ready',
        size_kb: sizeKb,
        chunk_count: totalChunks,
        metadata: {
          url: normalizedUrl,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          pages_crawled: validPages.length,
          crawled_pages: validPages.map(p => p.url),
          discovered_links: Array.from(discoveredLinks),
          crawl_errors: crawlErrors,
          crawl_progress: null,
          total_chunks: totalChunks,
          full_page_content: false,
          crawl_completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    // Broadcast crawl completed successfully
    await supabase.channel(`crawl-${sourceId}`).send({
      type: 'broadcast',
      event: 'crawl_progress',
      payload: {
        sourceId,
        status: 'completed',
        phase: 'completed',
        pagesProcessed: validPages.length,
        progress: 100
      }
    })

    console.log(`Successfully processed ${validPages.length} pages, ${totalChunks} chunks`)

    // Clear the timeout since we completed successfully
    clearTimeout(crawlTimeout)
    isTimedOut = false

  } catch (error: any) {
    console.error(`Error processing website:`, error)

    // Update source status to error
    const { error: updateError } = await supabase
      .from('sources')
      .update({
        status: 'error',
        size_kb: 0,
        chunk_count: 0,
        metadata: {
          url: normalizedUrl,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          pages_crawled: 0,
          crawled_pages: [],
          discovered_links: [],
          crawl_errors: [{ url: normalizedUrl, error: error.message || 'Failed to crawl' }],
          crawl_progress: null,
          error_message: error.message || 'Failed to crawl website',
          full_page_content: false,
          crawl_completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    if (updateError) {
      console.error(`Failed to update error status for ${sourceId}:`, updateError)
    }

    // Broadcast crawl failed
    await supabase.channel(`crawl-${sourceId}`).send({
      type: 'broadcast',
      event: 'crawl_progress',
      payload: {
        sourceId,
        status: 'failed',
        phase: 'failed',
        error: error.message || 'Failed to crawl website'
      }
    })

    // Clear the timeout
    clearTimeout(crawlTimeout)
    isTimedOut = false
  } finally {
    // Ensure cleanup always happens
    if (crawlTimeout) {
      clearTimeout(crawlTimeout)
    }
    if (crawlAbortController) {
      crawlAbortController.abort()
    }
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

        // Check if source is trained - if so, we should be careful about re-crawling
        if (source.is_trained) {
          console.warn(`Re-crawling trained website source ${sourceId} - training will need to be re-run`)
        }

        // Delete existing chunks from source_chunks table
        const { error: chunkDeleteError } = await supabase
          .from('source_chunks')
          .delete()
          .eq('source_id', sourceId)

        if (chunkDeleteError) {
          console.error('Error deleting existing chunks:', chunkDeleteError)
        }

        // Reset source status
        await supabase
          .from('sources')
          .update({
            status: 'pending',
            size_kb: 0,
            chunk_count: 0,
            is_trained: false, // Reset training status since content is being replaced
            metadata: {
              ...source.metadata,
              pages_crawled: 0,
              crawled_pages: [],
              discovered_links: [],
              crawl_errors: [],
              crawl_progress: null,
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
            source.metadata?.max_pages || 10,
            source.metadata?.full_page_content || false
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
          .select('metadata, chunk_count')
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

        // Delete chunks from this URL
        const { data: deletedChunks } = await supabase
          .from('source_chunks')
          .delete()
          .eq('source_id', sourceId)
          .eq('metadata->page_url', linkUrl)
          .select('id')

        const deletedCount = deletedChunks?.length || 0

        // Update source metadata and chunk count
        const { error: updateError } = await supabase
          .from('sources')
          .update({
            chunk_count: Math.max(0, (source.chunk_count || 0) - deletedCount),
            metadata: {
              ...source.metadata,
              crawled_pages: updatedPages,
              pages_crawled: updatedPages.length,
              excluded_links: [
                ...(source.metadata?.excluded_links || []),
                linkUrl
              ],
              total_chunks: Math.max(0, (source.metadata?.total_chunks || 0) - deletedCount)
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

    // Get sources to check if they're trained
    const { data: sources, error: fetchError } = await supabase
      .from('sources')
      .select('id, is_trained')
      .in('id', sourceIds)
      .eq('agent_id', params.id)

    if (fetchError) {
      console.error('Error fetching sources:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch sources' },
        { status: 500 }
      )
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: 'No sources found' },
        { status: 404 }
      )
    }

    // Separate trained and untrained sources
    const trainedIds = sources.filter(s => s.is_trained).map(s => s.id)
    const untrainedIds = sources.filter(s => !s.is_trained).map(s => s.id)

    // Soft delete trained sources (mark as 'removed')
    if (trainedIds.length > 0) {
      const { error: softDeleteError } = await supabase
        .from('sources')
        .update({
          status: 'removed',
          updated_at: new Date().toISOString()
        })
        .in('id', trainedIds)
        .eq('agent_id', params.id)

      if (softDeleteError) {
        console.error('Soft delete error:', softDeleteError)
        return NextResponse.json(
          { error: 'Failed to remove trained websites' },
          { status: 500 }
        )
      }
      console.log(`Soft deleted ${trainedIds.length} trained website sources`)
    }

    // Hard delete untrained sources
    if (untrainedIds.length > 0) {
      // First delete any associated chunks to avoid foreign key constraint issues
      const { error: chunkDeleteError } = await supabase
        .from('source_chunks')
        .delete()
        .in('source_id', untrainedIds)

      if (chunkDeleteError) {
        console.error('Error deleting chunks:', chunkDeleteError)
        // Continue anyway - chunks might not exist
      }

      const { error: hardDeleteError } = await supabase
        .from('sources')
        .delete()
        .in('id', untrainedIds)
        .eq('agent_id', params.id)

      if (hardDeleteError) {
        console.error('Hard delete error:', hardDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete untrained websites' },
          { status: 500 }
        )
      }
      console.log(`Hard deleted ${untrainedIds.length} untrained website sources`)
    }

    // Update agent's source count
    const { data: stats } = await supabase
      .from('sources')
      .select('type, size_kb')
      .eq('agent_id', params.id)
      .neq('status', 'removed')

    if (stats) {
      const totalSources = stats.length
      const totalSizeKb = stats.reduce((sum, s) => sum + s.size_kb, 0)

      await supabase
        .from('agents')
        .update({
          total_sources: totalSources,
          total_size_kb: totalSizeKb
        })
        .eq('id', params.id)
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