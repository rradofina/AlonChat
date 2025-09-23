import { NextResponse } from 'next/server'
import { configService } from '@/lib/api/config'

export async function GET() {
  try {
    const presets = await configService.getPromptPresets()
    return NextResponse.json(presets)
  } catch (error) {
    console.error('Error fetching presets:', error)
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 })
  }
}