/**
 * Client-side Model Service
 * Fetches model information through API endpoints only
 */
export class ModelServiceClient {
  private static instance: ModelServiceClient

  static getInstance(): ModelServiceClient {
    if (!ModelServiceClient.instance) {
      ModelServiceClient.instance = new ModelServiceClient()
    }
    return ModelServiceClient.instance
  }

  /**
   * Get active models from API
   */
  async getActiveModels(): Promise<any[]> {
    try {
      const response = await fetch('/api/models/active')
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.error('Failed to fetch active models:', error)
      return []
    }
  }

  /**
   * Get default model from API
   */
  async getDefaultModel(): Promise<string | null> {
    try {
      const response = await fetch('/api/models/default')
      if (!response.ok) throw new Error('Failed to fetch default model')
      const data = await response.json()
      return data.model || null
    } catch (error) {
      console.error('Failed to fetch default model:', error)
      return null
    }
  }
}

export const modelServiceClient = ModelServiceClient.getInstance()