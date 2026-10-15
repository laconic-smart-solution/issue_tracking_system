import { messagingApi } from '@line/bot-sdk';
import { Readable } from 'stream';
import { config } from '../config';

const { MessagingApiClient, MessagingApiBlobClient } = messagingApi;

export class LineService {
  private client: messagingApi.MessagingApiClient | null = null;
  private blobClient: messagingApi.MessagingApiBlobClient | null = null;

  constructor() {
    if (config.line.channelAccessToken) {
      this.client = new MessagingApiClient({
        channelAccessToken: config.line.channelAccessToken,
      });
      this.blobClient = new MessagingApiBlobClient({
        channelAccessToken: config.line.channelAccessToken,
      });
    } else {
      console.warn('[LineService] LINE_CHANNEL_ACCESS_TOKEN is not configured yet. Bot calls will be mocked.');
    }
  }

  /**
   * Reply to a message in the LINE chat using replyToken
   */
  async replyMessage(replyToken: string, text: string) {
    if (!this.client) {
      console.log(`[LineService Mock Reply] ${text}`);
      return;
    }
    try {
      await this.client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text }],
      });
    } catch (error) {
      console.error('[LineService] Error sending reply:', error);
    }
  }

  /**
   * Push message to a LINE Group ID (used when Agent responds from Webapp)
   */
  async pushMessageToGroup(groupId: string, text: string) {
    if (!this.client) {
      console.log(`[LineService Mock Push to ${groupId}] ${text}`);
      return;
    }
    try {
      await this.client.pushMessage({
        to: groupId,
        messages: [{ type: 'text', text }],
      });
    } catch (error) {
      console.error(`[LineService] Error pushing message to group ${groupId}:`, error);
    }
  }

  /**
   * Download image/attachment content stream from LINE
   */
  async getMessageContent(messageId: string): Promise<Readable | null> {
    if (!this.blobClient) {
      console.warn('[LineService] Blob client not configured');
      return null;
    }
    try {
      const response = await this.blobClient.getMessageContent(messageId);
      return response as unknown as Readable;
    } catch (error) {
      console.error(`[LineService] Error downloading content for message ${messageId}:`, error);
      return null;
    }
  }
}

export const lineService = new LineService();
