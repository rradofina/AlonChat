interface MessengerTextMessage {
  text: string
}

interface MessengerImageAttachment {
  type: 'image'
  payload: {
    url?: string
    attachment_id?: string
    is_reusable?: boolean
  }
}

interface MessengerMessage {
  messaging_type?: 'RESPONSE' | 'UPDATE'
  recipient: {
    id: string
  }
  message: {
    text?: string
    attachment?: MessengerImageAttachment
  }
}

export class MessengerService {
  private pageAccessToken: string
  private apiVersion: string = 'v18.0'
  private graphApiUrl: string

  constructor(pageAccessToken: string) {
    this.pageAccessToken = pageAccessToken
    this.graphApiUrl = `https://graph.facebook.com/${this.apiVersion}`
  }

  /**
   * Send a text message to a recipient
   */
  async sendTextMessage(recipientId: string, text: string): Promise<any> {
    const message: MessengerMessage = {
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text }
    }

    return this.sendMessage(message)
  }

  /**
   * Send an image attachment via URL
   */
  async sendImageAttachment(
    recipientId: string,
    imageUrl: string,
    isReusable: boolean = true
  ): Promise<any> {
    const message: MessengerMessage = {
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: {
            url: imageUrl,
            is_reusable: isReusable
          }
        }
      }
    }

    return this.sendMessage(message)
  }

  /**
   * Send an image using a saved attachment ID
   */
  async sendImageByAttachmentId(
    recipientId: string,
    attachmentId: string
  ): Promise<any> {
    const message: MessengerMessage = {
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: {
            attachment_id: attachmentId
          }
        }
      }
    }

    return this.sendMessage(message)
  }

  /**
   * Send multiple images to a recipient
   */
  async sendMultipleImages(
    recipientId: string,
    imageUrls: string[]
  ): Promise<void> {
    for (const imageUrl of imageUrls) {
      await this.sendImageAttachment(recipientId, imageUrl)
      // Small delay between messages to avoid rate limiting
      await this.delay(500)
    }
  }

  /**
   * Mark a message as seen
   */
  async markSeen(recipientId: string): Promise<any> {
    return this.sendSenderAction(recipientId, 'mark_seen')
  }

  /**
   * Show typing indicator
   */
  async showTyping(recipientId: string): Promise<any> {
    return this.sendSenderAction(recipientId, 'typing_on')
  }

  /**
   * Hide typing indicator
   */
  async hideTyping(recipientId: string): Promise<any> {
    return this.sendSenderAction(recipientId, 'typing_off')
  }

  /**
   * Core method to send messages via Facebook Graph API
   */
  private async sendMessage(message: MessengerMessage): Promise<any> {
    const url = `${this.graphApiUrl}/me/messages`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          access_token: this.pageAccessToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Messenger API error: ${JSON.stringify(data)}`)
      }

      return data
    } catch (error) {
      console.error('Error sending message via Messenger:', error)
      throw error
    }
  }

  /**
   * Send sender actions (typing, seen, etc.)
   */
  private async sendSenderAction(
    recipientId: string,
    action: 'mark_seen' | 'typing_on' | 'typing_off'
  ): Promise<any> {
    const url = `${this.graphApiUrl}/me/messages`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: action,
          access_token: this.pageAccessToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Messenger API error: ${JSON.stringify(data)}`)
      }

      return data
    } catch (error) {
      console.error('Error sending sender action:', error)
      throw error
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    signature: string,
    payload: string,
    appSecret: string
  ): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex')

    return `sha256=${expectedSignature}` === signature
  }

  /**
   * Helper function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}