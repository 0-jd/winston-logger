/**
 * Discord Rate Limiter
 * 
 * Manages rate limiting for Discord webhook requests
 * Tracks rate limit state per webhook URL and enforces Discord API limits
 */

interface RateLimitState {
  /** Remaining requests in current window */
  remaining: number;
  
  /** Timestamp when rate limit resets (milliseconds) */
  resetAt: number;
  
  /** Whether we're currently in a rate-limited state */
  isLimited: boolean;
  
  /** Retry-After value from last 429 response (seconds) */
  retryAfter: number;
}

/**
 * Rate limiter for Discord webhooks
 * 
 * Enforces Discord's rate limits:
 * - ~30 requests per minute per webhook (~1 per 2 seconds)
 * - Respects Retry-After header on 429 responses
 */
export class DiscordRateLimiter {
  private state: Map<string, RateLimitState> = new Map();
  private readonly defaultLimit = 30; // requests per minute

  /**
   * Checks if a webhook URL is currently rate-limited
   * 
   * @param webhookUrl - Discord webhook URL
   * @returns true if rate-limited, false otherwise
   */
  isRateLimited(webhookUrl: string): boolean {
    const state = this.state.get(webhookUrl);
    
    if (!state) {
      return false;
    }

    const now = Date.now();

    // Check if rate limit has expired
    if (state.isLimited && now >= state.resetAt) {
      state.isLimited = false;
      state.remaining = this.defaultLimit;
    }

    return state.isLimited || state.remaining <= 0;
  }

  /**
   * Calculates how long to wait before next request (in milliseconds)
   * 
   * @param webhookUrl - Discord webhook URL
   * @returns Wait time in milliseconds (0 if can send immediately)
   */
  getWaitTime(webhookUrl: string): number {
    const state = this.state.get(webhookUrl);
    
    if (!state) {
      return 0;
    }

    const now = Date.now();

    if (state.isLimited) {
      const waitTime = state.resetAt - now;
      return Math.max(0, waitTime);
    }

    if (state.remaining <= 0) {
      const waitTime = state.resetAt - now;
      return Math.max(0, waitTime);
    }

    return 0;
  }

  /**
   * Records a successful request
   * Updates rate limit state based on response headers
   * 
   * @param webhookUrl - Discord webhook URL
   * @param headers - Response headers object
   */
  recordSuccess(webhookUrl: string, headers: Record<string, string>): void {
    const now = Date.now();
    
    const remaining = headers['x-ratelimit-remaining']
      ? parseInt(headers['x-ratelimit-remaining'], 10)
      : this.defaultLimit - 1;

    const resetAfter = headers['x-ratelimit-reset-after']
      ? parseFloat(headers['x-ratelimit-reset-after'])
      : 2; // Default to 2 seconds

    const resetAt = now + (resetAfter * 1000);

    this.state.set(webhookUrl, {
      remaining,
      resetAt,
      isLimited: false,
      retryAfter: 0,
    });
  }

  /**
   * Records a rate limit error (429 response)
   * 
   * @param webhookUrl - Discord webhook URL
   * @param retryAfter - Retry-After value from response (seconds)
   */
  recordRateLimit(webhookUrl: string, retryAfter: number): void {
    const now = Date.now();
    const resetAt = now + (retryAfter * 1000);

    this.state.set(webhookUrl, {
      remaining: 0,
      resetAt,
      isLimited: true,
      retryAfter,
    });
  }

  /**
   * Resets rate limit state for a webhook URL
   * 
   * @param webhookUrl - Discord webhook URL
   */
  reset(webhookUrl: string): void {
    this.state.delete(webhookUrl);
  }

  /**
   * Clears all rate limit state
   */
  resetAll(): void {
    this.state.clear();
  }
}
