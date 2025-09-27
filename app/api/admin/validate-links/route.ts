import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyUrlAccessibility, type ExtractedLink } from '@/lib/utils/link-extractor'

// This endpoint validates all links in the system
// Should be called periodically (e.g., via cron job) to ensure links are still valid

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get all sources with links
    const { data: sources, error } = await supabase
      .from('sources')
      .select('id, agent_id, links')
      .not('links', 'is', null)
      .not('links', 'eq', '[]')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json({ message: 'No sources with links to validate' })
    }

    let totalLinks = 0
    let validatedLinks = 0
    let invalidLinks = 0
    const results: any[] = []

    // Process each source
    for (const source of sources) {
      const links = source.links as ExtractedLink[]
      if (!Array.isArray(links)) continue

      const updatedLinks: ExtractedLink[] = []

      for (const link of links) {
        totalLinks++

        // Skip if recently checked (within last 24 hours)
        if (link.lastChecked) {
          const lastCheckedDate = new Date(link.lastChecked)
          const hoursSinceCheck = (Date.now() - lastCheckedDate.getTime()) / (1000 * 60 * 60)

          if (hoursSinceCheck < 24) {
            updatedLinks.push(link)
            if (link.verified) validatedLinks++
            else invalidLinks++
            continue
          }
        }

        // Verify the link
        const isValid = await verifyUrlAccessibility(link.url)

        const updatedLink: ExtractedLink = {
          ...link,
          verified: isValid,
          lastChecked: new Date().toISOString()
        }

        updatedLinks.push(updatedLink)

        if (isValid) {
          validatedLinks++
        } else {
          invalidLinks++

          // Log invalid links for monitoring
          console.warn(`Invalid link found in source ${source.id}:`, link.url)
        }
      }

      // Update the source with validated links
      const { error: updateError } = await supabase
        .from('sources')
        .update({ links: updatedLinks })
        .eq('id', source.id)

      if (updateError) {
        console.error(`Failed to update source ${source.id}:`, updateError)
      } else {
        results.push({
          sourceId: source.id,
          agentId: source.agent_id,
          totalLinks: links.length,
          validLinks: updatedLinks.filter(l => l.verified).length,
          invalidLinks: updatedLinks.filter(l => !l.verified).length
        })
      }
    }

    // Optional: Send notification if many invalid links are found
    const invalidRate = totalLinks > 0 ? (invalidLinks / totalLinks) * 100 : 0
    if (invalidRate > 10) {
      // In production, you might send an email or Slack notification here
      console.warn(`High invalid link rate detected: ${invalidRate.toFixed(2)}%`)
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalLinks,
        validatedLinks,
        invalidLinks,
        invalidRate: `${invalidRate.toFixed(2)}%`
      },
      results
    })

  } catch (error) {
    console.error('Link validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check validation status
export async function GET() {
  try {
    const supabase = createServiceClient()

    // Get summary of link statuses
    const { data: sources, error } = await supabase
      .from('sources')
      .select('links')
      .not('links', 'is', null)
      .not('links', 'eq', '[]')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
    }

    let totalLinks = 0
    let verifiedLinks = 0
    let unverifiedLinks = 0
    let recentlyChecked = 0

    sources?.forEach(source => {
      const links = source.links as ExtractedLink[]
      if (!Array.isArray(links)) return

      links.forEach(link => {
        totalLinks++

        if (link.verified) {
          verifiedLinks++
        } else {
          unverifiedLinks++
        }

        if (link.lastChecked) {
          const hoursSinceCheck = (Date.now() - new Date(link.lastChecked).getTime()) / (1000 * 60 * 60)
          if (hoursSinceCheck < 24) {
            recentlyChecked++
          }
        }
      })
    })

    return NextResponse.json({
      totalLinks,
      verifiedLinks,
      unverifiedLinks,
      recentlyChecked,
      needsValidation: totalLinks - recentlyChecked
    })

  } catch (error) {
    console.error('Link status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}