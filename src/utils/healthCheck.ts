import db from '../database/connection';
import { UserModel } from '../models/UserModel';
import analytics from './analytics';
import rateLimiter from './rateLimiter';
import conversationManager from './conversationManager';
import logger from './logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: boolean;
    analytics: boolean;
    rateLimiter: boolean;
    conversationManager: boolean;
  };
  metrics: {
    totalUsers: number;
    activeConversations: number;
    recentEvents: number;
    uptime: number;
  };
  errors?: string[];
}

class HealthChecker {
  private startTime: Date = new Date();

  /**
   * Perform comprehensive health check
   */
  public async checkHealth(): Promise<HealthStatus> {
    const errors: string[] = [];
    const checks = {
      database: false,
      analytics: false,
      rateLimiter: false,
      conversationManager: false
    };

    // Check database connectivity
    try {
      await db.query('SELECT 1');
      checks.database = true;
    } catch (error) {
      errors.push(`Database connection failed: ${error}`);
    }

    // Check analytics system
    try {
      analytics.getSummary();
      checks.analytics = true;
    } catch (error) {
      errors.push(`Analytics system failed: ${error}`);
    }

    // Check rate limiter
    try {
      rateLimiter.getRemainingRequests(1);
      checks.rateLimiter = true;
    } catch (error) {
      errors.push(`Rate limiter failed: ${error}`);
    }

    // Check conversation manager
    try {
      conversationManager.getActiveConversations();
      checks.conversationManager = true;
    } catch (error) {
      errors.push(`Conversation manager failed: ${error}`);
    }

    // Get metrics
    let totalUsers = 0;
    try {
      totalUsers = await UserModel.getTotalUsers();
    } catch (error) {
      errors.push(`Failed to get user count: ${error}`);
    }

    const activeConversations = conversationManager.getActiveConversations().length;
    const recentEvents = analytics.getRecentEvents(100).length;
    const uptime = Date.now() - this.startTime.getTime();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errors.length > 0) {
      status = errors.some(error => error.includes('Database')) ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      checks,
      metrics: {
        totalUsers,
        activeConversations,
        recentEvents,
        uptime
      },
      ...(errors.length > 0 && { errors })
    };
  }

  /**
   * Get system uptime
   */
  public getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get formatted uptime string
   */
  public getFormattedUptime(): string {
    const uptime = this.getUptime();
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Log health status
   */
  public async logHealthStatus(): Promise<void> {
    const health = await this.checkHealth();
    
    if (health.status === 'healthy') {
      logger.info('Health check passed', {
        uptime: this.getFormattedUptime(),
        users: health.metrics.totalUsers,
        conversations: health.metrics.activeConversations
      });
    } else {
      logger.warn('Health check failed', {
        status: health.status,
        errors: health.errors,
        uptime: this.getFormattedUptime()
      });
    }
  }
}

export default new HealthChecker(); 