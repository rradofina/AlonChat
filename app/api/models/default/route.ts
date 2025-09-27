import { NextResponse } from 'next/server'
import { modelService } from '@/lib/services/model-service'

export async function GET() {
  try {
    // Use server-side model service
    const defaultModel = await modelService.getDefaultModel(true)

    return NextResponse.json({ model: defaultModel })
  } catch (error) {
    console.error('Failed to fetch default model:', error)
    return NextResponse.json({ error: 'Failed to fetch default model' }, { status: 500 })
  }
}