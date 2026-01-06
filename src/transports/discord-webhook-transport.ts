/**
 * Discord Webhook Transport
 * 
 * Custom Winston transport for sending logs to Discord webhooks
 * Implements rate limiting, failover support, and message formatting
 */

import Transport from 'winston-transport';
import axios, { AxiosError } from 'axios';
import type { LogEntry } from '../types';
import { DiscordRateLimiter } from './discord-rate-limiter';
import { truncateString } from '../utils/truncation';

interface DiscordTransportOptions extends Transport.TransportStreamOptions {
  webhookUrls: string[];
  maxRetries?: number;
  retryDelay?: number;
  maxMessageLength?: number;
}

/**
 * Winston transport for Discord webhooks
 * 
 * Features:
 * - Rate limit handling with Retry-After support
 * - Multiple webhook URLs with automatic failover
 * - Message truncation to respect Discord's 2000 character limit
 * - Exponential backoff on failures
 * - Only sends logs where sendDiscordWebhook is true
 */
export class DiscordWebhookTransport extends Transport {
  private webhookUrls: string[];
  private maxRetries: number;
  private retryDelay: number;
  private maxMessageLength: number;
  private rateLimiter: DiscordRateLimiter;

  constructor(opts: DiscordTransportOptions) {
    super(opts);
    
    this.webhookUrls = opts.webhookUrls || [];
    this.maxRetries = opts.maxRetries ?? 3;
    this.retryDelay = opts.retryDelay ?? 1000;
    this.maxMessageLength = opts.maxMessageLength ?? 2000;
    this.rateLimiter = new DiscordRateLimiter();
  }

  /**
   * Winston log method
   * 
   * @param info - Log info object
   * @param callback - Callback to signal completion
   */
  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Only send to Discord if sendDiscordWebhook is true
    if (!info.sendDiscordWebhook) {
      callback();
      return;
    }

    // Send asynchronously without blocking
    this.sendToDiscord(info).catch(err => {
      // Log internal error but don't throw
      this.emit('error', new Error(`Discord transport error: ${err.message}`));
    });

    callback();
  }

  /**
   * Sends log entry to Discord webhooks with failover
   * 
   * @param info - Log entry
   */
  private async sendToDiscord(info: LogEntry): Promise<void> {
    const message = this.formatMessage(info);

    // Try each webhook URL in sequence
    for (const webhookUrl of this.webhookUrls) {
      const success = await this.sendToWebhook(webhookUrl, message);
      if (success) {
        return; // Successfully sent, exit
      }
      // If failed, try next webhook
    }

    // All webhooks failed
    throw new Error('All Discord webhook URLs failed');
  }

  /**
   * Sends message to a specific webhook with retries
   * 
   * @param webhookUrl - Discord webhook URL
   * @param message - Formatted message content
   * @returns true if successful, false otherwise
   */
  private async sendToWebhook(webhookUrl: string, message: string): Promise<boolean> {


    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      // Check rate limit before attempting
      if (this.rateLimiter.isRateLimited(webhookUrl)) {
        const waitTime = this.rateLimiter.getWaitTime(webhookUrl);
        if (waitTime > 0) {
          await this.sleep(waitTime);
        }
      }

      try {
        const response = await axios.post(
          webhookUrl,
          { content: message },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
          }
        );

        // Record successful request
        this.rateLimiter.recordSuccess(webhookUrl, response.headers as Record<string, string>);
        return true;

      } catch (error) {

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;

          // Handle 429 Too Many Requests
          if (axiosError.response?.status === 429) {
            const retryAfter = this.getRetryAfter(axiosError);
            this.rateLimiter.recordRateLimit(webhookUrl, retryAfter);

            // Wait and retry
            await this.sleep(retryAfter * 1000);
            continue;
          }

          // Handle other HTTP errors (4xx, 5xx)
          if (axiosError.response && axiosError.response.status >= 400) {
            // Don't retry on client errors (except 429)
            if (axiosError.response.status < 500) {
              return false;
            }
          }
        }

        // Exponential backoff for other errors
        const backoffDelay = this.retryDelay * Math.pow(2, attempt);
        await this.sleep(backoffDelay);
      }
    }

    // All retries exhausted
    return false;
  }

  /**
   * Extracts Retry-After value from 429 response
   * 
   * @param error - Axios error
   * @returns Retry-After in seconds (defaults to 2)
   */
  private getRetryAfter(error: AxiosError): number {
    const retryAfterHeader = error.response?.headers['retry-after'];
    
    if (retryAfterHeader) {
      const retryAfter = parseFloat(retryAfterHeader);
      if (!isNaN(retryAfter)) {
        return retryAfter;
      }
    }

    // Check response body for retry_after
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      if (data.retry_after && typeof data.retry_after === 'number') {
        return data.retry_after;
      }
    }

    return 2; // Default to 2 seconds
  }

  /**
   * Formats log entry for Discord message
   * 
   * @param info - Log entry
   * @returns Formatted message string
   */
  private formatMessage(info: LogEntry): string {
    const parts: string[] = [];

    // Header: [LEVEL] origin > identifier
    const header = `**[${info.level.toUpperCase()}]** ${info.origin} > ${info.identifier}`;
    parts.push(header);

    // Message
    parts.push(info.message);

    // IDs
    const ids: string[] = [];
    if (info.errorID) {
      ids.push(`errorID: ${info.errorID}`);
    }
    if (info.sessionID) {
      ids.push(`sessionID: ${info.sessionID}`);
    }
    if (ids.length > 0) {
      parts.push(ids.join(' | '));
    }

    // Comment
    if (info.comment) {
      parts.push(`💬 ${info.comment}`);
    }

    // Error details
    if (info.error) {
      const errorParts: string[] = [`🚨 **${info.error.name || 'Error'}**: ${info.error.message}`];
      
      if (info.error.code) {
        errorParts.push(`Code: ${info.error.code}`);
      }

      if (info.error.stack) {
        errorParts.push(`\`\`\`\n${truncateString(info.error.stack, 500)}\n\`\`\``);
      }

      parts.push(errorParts.join('\n'));
    }

    // Join and truncate
    const fullMessage = parts.join('\n\n');
    return truncateString(fullMessage, this.maxMessageLength);
  }

  /**
   * Sleep utility
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
