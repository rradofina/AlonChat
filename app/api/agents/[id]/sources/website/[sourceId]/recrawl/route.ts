import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeWebsiteWithPlaywright } from '@/lib/sources/playwright-scraper'
import { ChunkManager } from '@/lib/services/chunk-manager'
import { sanitizeError, validateCrawlUrl, checkRateLimit } from '@/lib/utils/security'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; sourceId: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id, 5, 60000) // 5 re-crawls per minute
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds` },
        { status: 429 }
      )
    }

    // Get the source to re-crawl
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('id', params.sourceId)
      .eq('agent_id', params.id)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Store existing chunks count for rollback verification
    const { count: existingChunksCount } = await supabase
      .from('source_chunks')
      .select('id', { count: 'exact' })
      .eq('source_id', params.sourceId)

    // Create a backup of the current metadata
    const backupMetadata = { ...source.metadata, backup_timestamp: new Date().toISOString() }

    // Update status to processing but keep existing data until new crawl succeeds
    const { error: updateError } = await supabase
      .from('sources')
      .update({
        status: 'processing',
        metadata: {
          ...source.metadata,
          recrawl_started_at: new Date().toISOString(),
          previous_chunks_count: existingChunksCount,
          backup_metadata: backupMetadata
        }
      })
      .eq('id', params.sourceId)

    if (updateError) {
      throw new Error('Failed to update source status')
    }

    // Don't delete chunks yet - wait for successful crawl
    console.log(`Starting re-crawl for source ${params.sourceId} with ${existingChunksCount} existing chunks`)

    // Re-crawl the website
    const url = source.website_url || source.metadata?.url

    // Validate URL again for security
    const urlValidation = validateCrawlUrl(url)
    if (!urlValidation.valid) {
      // Restore original status
      await supabase
        .from('sources')
        .update({
          status: 'ready',
          metadata: source.metadata
        })
        .eq('id', params.sourceId)

      return NextResponse.json(
        { error: urlValidation.error || 'Invalid URL' },
        { status: 400 }
      )
    }

    const crawlSubpages = source.metadata?.crawl_subpages !== false
    const maxPages = Math.min(source.metadata?.max_pages || 200, 1000) // Cap at 1000
    const fullPageContent = source.metadata?.full_page_content || false

    // Start crawling
    processWebsiteAsync(params.sourceId, params.id, source.project_id, url, crawlSubpages, maxPages, fullPageContent)

    return NextResponse.json({
      success: true,
      message: 'Re-crawl started',
      sourceId: params.sourceId
    })

  } catch (error: any) {
    console.error('Re-crawl error:', error)

    // Try to restore previous state
    const supabase = await createClient()
    await supabase
      .from('sources')
      .update({
        status: 'ready',
        metadata: {
          ...((await supabase.from('sources').select('metadata').eq('id', params.sourceId).single()).data?.metadata || {}),
          recrawl_error: error.message,
          recrawl_failed_at: new Date().toISOString()
        }
      })
      .eq('id', params.sourceId)

    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: 500 }
    )
  }
}

async function processWebsiteAsync(
  sourceId: string,
  agentId: string,
  projectId: string,
  url: string,
  crawlSubpages: boolean,
  maxPages: number,
  fullPageContent: boolean
) {
  const supabase = await createClient()
  let chunksDeleted = false

  try {
    console.log(`Starting re-crawl for ${url} with maxPages=${maxPages}, crawlSubpages=${crawlSubpages}, fullPageContent=${fullPageContent}`)

    // Set for discovered links
    const discoveredLinks = new Set<string>()

    // Progress callback to update database and broadcast real-time updates
    const progressCallback = async (progress: any) => {
      if (progress.discoveredLinks) {
        progress.discoveredLinks.forEach((link: string) => discoveredLinks.add(link))
      }

      await supabase.from('sources').update({
        status: 'processing',
        metadata: {
          url,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          full_page_content: fullPageContent,
          pages_crawled: progress.current, // Track actual crawled pages
          crawl_progress: {
            current: progress.current,
            total: progress.total,
            currentUrl: progress.currentUrl,
            phase: progress.phase,
            queueLength: progress.queueLength
          },
          discovered_links: Array.from(discoveredLinks)
        }
      }).eq('id', sourceId)

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

      console.log(`[Re-crawl Progress] ${sourceId}: ${progress.phase} - ${progress.current}/${progress.total}`)
    }

    // Crawl the website with progress tracking using Playwright
    const results = await scrapeWebsiteWithPlaywright(url, maxPages, crawlSubpages, progressCallback, fullPageContent)
    const validPages = results.filter(page => !page.error && page.content)

    if (validPages.length === 0) {
      // Even if no valid pages, mark as ready with crawled URLs
      const attemptedUrls = results.map(r => r.url)
      await supabase.from('sources').update({
        status: 'ready',
        size_kb: 0,
        chunk_count: 0,
        metadata: {
          url,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          full_page_content: fullPageContent,
          pages_crawled: attemptedUrls.length,
          crawled_pages: attemptedUrls,
          crawl_errors: results.filter(r => r.error).map(r => ({
            url: r.url,
            error: r.error
          })),
          recrawl_completed_at: new Date().toISOString()
        }
      }).eq('id', sourceId)

      console.log(`Re-crawl completed with no valid pages`)
      return
    }

    // Now that crawl succeeded, delete old chunks
    const { error: deleteError } = await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId)

    if (deleteError) {
      console.error('Failed to delete old chunks:', deleteError)
      throw new Error('Failed to clear old content')
    }

    chunksDeleted = true
    console.log('Old chunks deleted, processing new content...')

    // Calculate total size
    let totalSizeKb = 0
    let totalChunks = 0

    // Process each valid page
    for (const page of validPages) {
      const pageContent = `URL: ${page.url}\nTitle: ${page.title}\n\n${page.content}`
      const sizeKb = Math.ceil(Buffer.byteLength(pageContent, 'utf8') / 1024)
      totalSizeKb += sizeKb

      // Create chunks for the page content
      const chunkManager = new ChunkManager(supabase)
      const chunks = await chunkManager.createChunks(
        sourceId,
        pageContent,
        {
          url: page.url,
          title: page.title,
          links: page.links,
          images: page.images
        }
      )

      totalChunks += chunks.length
    }

    // Update source with results
    await supabase.from('sources').update({
      status: 'ready',
      size_kb: totalSizeKb,
      chunk_count: totalChunks,
      metadata: {
        url,
        crawl_subpages: crawlSubpages,
        max_pages: maxPages,
        full_page_content: fullPageContent,
        pages_crawled: validPages.length,
        crawled_pages: validPages.map(p => p.url),
        discovered_links: Array.from(discoveredLinks),
        sub_links: validPages.slice(1).map(p => ({
          url: p.url,
          title: p.title,
          status: 'included',
          crawled: true
        })),
        total_chunks: totalChunks,
        recrawl_completed_at: new Date().toISOString()
      }
    }).eq('id', sourceId)

    console.log(`Re-crawl completed: ${validPages.length} pages, ${totalChunks} chunks`)

  } catch (error: any) {
    console.error(`Re-crawl error:`, error)

    // If we deleted chunks but failed to add new ones, we have a problem
    if (chunksDeleted) {
      console.error('CRITICAL: Chunks were deleted but new crawl failed!')
      // Mark source as requiring attention
      await supabase.from('sources').update({
        status: 'error',
        metadata: {
          ...((await supabase.from('sources').select('metadata').eq('id', sourceId).single()).data?.metadata || {}),
          error_message: 'Re-crawl failed after deleting existing content. Manual intervention required.',
          critical_error: true,
          recrawl_failed_at: new Date().toISOString()
        }
      }).eq('id', sourceId)
    } else {
      // Chunks not deleted yet, so we can safely restore
      await supabase.from('sources').update({
        status: 'ready',
        metadata: {
          ...((await supabase.from('sources').select('metadata').eq('id', sourceId).single()).data?.metadata || {}),
          error_message: error.message || 'Re-crawl failed',
          recrawl_failed_at: new Date().toISOString()
        }
      }).eq('id', sourceId)
    }
  }
}