import logger from './logger';

interface AnalyticsEvent {
  userId: number;
  action: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events in memory

  /**
   * Track a user action
   */
  public track(userId: number, action: string, metadata?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      userId,
      action,
      timestamp: new Date(),
      ...(metadata && { metadata })
    };

    this.events.push(event);

    // Keep only the last MAX_EVENTS
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    logger.info(`Analytics: User ${userId} performed action ${action}`, metadata);
  }

  /**
   * Get events for a specific user
   */
  public getUserEvents(userId: number, limit: number = 50): AnalyticsEvent[] {
    return this.events
      .filter(event => event.userId === userId)
      .slice(-limit);
  }

  /**
   * Get events for a specific action
   */
  public getActionEvents(action: string, limit: number = 50): AnalyticsEvent[] {
    return this.events
      .filter(event => event.action === action)
      .slice(-limit);
  }

  /**
   * Get recent events
   */
  public getRecentEvents(limit: number = 100): AnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get event count by action
   */
  public getActionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const event of this.events) {
      counts[event.action] = (counts[event.action] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Get unique user count
   */
  public getUniqueUserCount(): number {
    const uniqueUsers = new Set(this.events.map(event => event.userId));
    return uniqueUsers.size;
  }

  /**
   * Get events in time range
   */
  public getEventsInRange(startTime: Date, endTime: Date): AnalyticsEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Clear old events (older than specified hours)
   */
  public clearOldEvents(hours: number): void {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
  }

  /**
   * Get summary statistics
   */
  public getSummary(): {
    totalEvents: number;
    uniqueUsers: number;
    actionCounts: Record<string, number>;
    recentActivity: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return {
      totalEvents: this.events.length,
      uniqueUsers: this.getUniqueUserCount(),
      actionCounts: this.getActionCounts(),
      recentActivity: this.getEventsInRange(oneHourAgo, now).length
    };
  }
}

export default new Analytics(); 