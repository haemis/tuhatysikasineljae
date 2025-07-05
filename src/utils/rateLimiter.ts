import logger from './logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<number, RateLimitEntry> = new Map();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute
  private readonly MAX_REQUESTS = 20; // 20 requests per minute

  /**
   * Check if user is rate limited
   */
  public isRateLimited(userId: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(userId);

    if (!entry) {
      // First request
      this.limits.set(userId, {
        count: 1,
        resetTime: now + this.WINDOW_MS
      });
      return false;
    }

    // Check if window has reset
    if (now > entry.resetTime) {
      this.limits.set(userId, {
        count: 1,
        resetTime: now + this.WINDOW_MS
      });
      return false;
    }

    // Increment count
    entry.count++;
    
    if (entry.count > this.MAX_REQUESTS) {
      logger.warn(`Rate limit exceeded for user ${userId}: ${entry.count} requests`);
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests for user
   */
  public getRemainingRequests(userId: number): number {
    const entry = this.limits.get(userId);
    if (!entry) {
      return this.MAX_REQUESTS;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      return this.MAX_REQUESTS;
    }

    return Math.max(0, this.MAX_REQUESTS - entry.count);
  }

  /**
   * Get time until reset for user
   */
  public getTimeUntilReset(userId: number): number {
    const entry = this.limits.get(userId);
    if (!entry) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, entry.resetTime - now);
  }

  /**
   * Clean up expired entries
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(userId);
      }
    }
  }

  /**
   * Reset rate limit for user (for testing or admin purposes)
   */
  public reset(userId: number): void {
    this.limits.delete(userId);
  }
}

export default new RateLimiter(); 