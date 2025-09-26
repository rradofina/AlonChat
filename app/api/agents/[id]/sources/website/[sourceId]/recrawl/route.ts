import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeWebsiteWithPlaywright } from '@/lib/sources/playwright-scraper'
import { ChunkManager } from '@/lib/services/chunk-manager'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; sourceId: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

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

    // Update status to processing
    await supabase
      .from('sources')
      .update({
        status: 'processing',
        metadata: {
          ...source.metadata,
          recrawl_started_at: new Date().toISOString(),
          discovered_links: []  // Clear discovered links for fresh crawl
        }
      })
      .eq('id', params.sourceId)

    // Delete existing chunks
    await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', params.sourceId)

    // Re-crawl the website
    const url = source.website_url || source.metadata?.url
    const crawlSubpages = source.metadata?.crawl_subpages !== false  // Default to true for re-crawl
    const maxPages = source.metadata?.max_pages || 200  // Use default of 200 for re-crawl
    const fullPageContent = source.metadata?.full_page_content || false // Use full page mode if enabled

    // Start crawling
    processWebsiteAsync(params.sourceId, params.id, source.project_id, url, crawlSubpages, maxPages, fullPageContent)

    return NextResponse.json({
      success: true,
      message: 'Re-crawl started',
      sourceId: params.sourceId
    })

  } catch (error: any) {
    console.error('Re-crawl error:', error)
    return NextResponse.json(
      { error: error.message || 'Re-crawl failed' },
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

  try {
    console.log(`Starting re-crawl for ${url} with maxPages=${maxPages}, crawlSubpages=${crawlSubpages}, fullPageContent=${fullPageContent}`)

    // Set for discovered links
    const discoveredLinks = new Set<string>()

    // Progress callback to update database
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
          crawl_progress: {
            current: progress.current,
            total: progress.total,
            currentUrl: progress.currentUrl,
            phase: progress.phase
          },
          discovered_links: Array.from(discoveredLinks)
        }
      }).eq('id', sourceId)
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