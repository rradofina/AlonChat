import { NextResponse } from 'next/server'
import { configService } from '@/lib/api/config'

export async function GET() {
  try {
    const models = await configService.getAIModels()
    return NextResponse.json(models)
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}