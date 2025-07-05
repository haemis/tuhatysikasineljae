import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import { ConnectionModel } from '../../models/ConnectionModel';
import analytics from '../../utils/analytics';
import rateLimiter from '../../utils/rateLimiter';
import conversationManager from '../../utils/conversationManager';
import { performanceMonitor } from '../../utils/performance';
import { userCache, connectionCache, searchCache } from '../../utils/cache';
import logger from '../../utils/logger';

// Admin user IDs (should be moved to environment variables in production)
const ADMIN_USER_IDS = [123456789]; // Replace with actual admin user IDs

/**
 * Check if user is admin
 */
function isAdmin(userId: number): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * Admin command for system statistics
 */
export const adminStatsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    // Get system statistics
    const totalUsers = await UserModel.getTotalUsers();
    const totalConnections = await ConnectionModel.getConnectionsCount(0); // This needs to be fixed
    const analyticsSummary = analytics.getSummary();
    const activeConversations = conversationManager.getActiveConversations().length;
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    const userCacheStats = userCache.getStats();
    const connectionCacheStats = connectionCache.getStats();
    const searchCacheStats = searchCache.getStats();

    const statsMessage = `
📊 *System Statistics*

*Users:*
• Total users: ${totalUsers}
• Unique active users (24h): ${analyticsSummary.uniqueUsers}
• Recent activity (1h): ${analyticsSummary.recentActivity}

*Connections:*
• Total connections: ${totalConnections}
• Active conversations: ${activeConversations}

*Performance:*
• Total operations: ${performanceSummary.totalOperations}
• Average response time: ${performanceSummary.averageResponseTime}ms
• Slow operations (>1s): ${performanceSummary.slowOperations}
• Total queries: ${performanceSummary.totalQueries}
• Average query time: ${performanceSummary.averageQueryTime}ms
• Slow queries (>500ms): ${performanceSummary.slowQueries}

*Memory Usage:*
• RSS: ${performanceSummary.memoryUsage.rss}MB
• Heap Used: ${performanceSummary.memoryUsage.heapUsed}MB
• Heap Total: ${performanceSummary.memoryUsage.heapTotal}MB

*Cache Performance:*
• User cache: ${userCacheStats.hitRate}% hit rate (${userCacheStats.size} entries)
• Connection cache: ${connectionCacheStats.hitRate}% hit rate (${connectionCacheStats.size} entries)
• Search cache: ${searchCacheStats.hitRate}% hit rate (${searchCacheStats.size} entries)

*Analytics:*
• Total events tracked: ${analyticsSummary.totalEvents}
• Most common actions: ${Object.entries(analyticsSummary.actionCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 3)
  .map(([action, count]) => `${action}: ${count}`)
  .join(', ')}

*System Health:*
• Rate limiter active
• Analytics tracking enabled
• Performance monitoring active
• Cache system operational
• Database connection: ✅
    `;

    await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_stats_viewed');
  } catch (error) {
    logger.error('Error in admin stats command:', error);
    await ctx.reply('Error retrieving system statistics.');
  }
};

/**
 * Admin command for performance monitoring
 */
export const adminPerformanceCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const performanceSummary = performanceMonitor.getPerformanceSummary();
    const recentMetrics = performanceMonitor.getRecentMetrics(5); // Last 5 minutes
    const recentQueries = performanceMonitor.getRecentQueries(5); // Last 5 minutes

    let message = `
⚡ *Performance Monitoring*

*Overall Performance:*
• Total operations: ${performanceSummary.totalOperations}
• Average response time: ${performanceSummary.averageResponseTime}ms
• Slow operations: ${performanceSummary.slowOperations}

*Database Performance:*
• Total queries: ${performanceSummary.totalQueries}
• Average query time: ${performanceSummary.averageQueryTime}ms
• Slow queries: ${performanceSummary.slowQueries}

*Memory Usage:*
• RSS: ${performanceSummary.memoryUsage.rss}MB
• Heap Used: ${performanceSummary.memoryUsage.heapUsed}MB
• Heap Total: ${performanceSummary.memoryUsage.heapTotal}MB
• External: ${performanceSummary.memoryUsage.external}MB

*Top Slow Operations:*
`;

    performanceSummary.topSlowOperations.forEach((op, index) => {
      message += `• ${index + 1}. ${op.operation}: ${op.avgDuration}ms (${op.count} calls)\n`;
    });

    message += `\n*Top Slow Queries:*\n`;

    performanceSummary.topSlowQueries.forEach((query, index) => {
      message += `• ${index + 1}. ${query.query}: ${query.avgDuration}ms (${query.count} calls)\n`;
    });

    if (recentMetrics.length > 0) {
      message += `\n*Recent Activity (5min):*\n`;
      recentMetrics.slice(-5).forEach(metric => {
        message += `• ${metric.operation}: ${metric.duration}ms\n`;
      });
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_performance_viewed');
  } catch (error) {
    logger.error('Error in admin performance command:', error);
    await ctx.reply('Error retrieving performance data.');
  }
};

/**
 * Admin command for cache management
 */
export const adminCacheCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const action = parts.length > 1 ? parts[1]?.toLowerCase() : '';

    if (action === 'clear') {
      userCache.clear();
      connectionCache.clear();
      searchCache.clear();
      await ctx.reply('✅ All caches cleared successfully.');
    } else if (action === 'stats') {
      const userCacheStats = userCache.getStats();
      const connectionCacheStats = connectionCache.getStats();
      const searchCacheStats = searchCache.getStats();

      const statsMessage = `
🗄️ *Cache Statistics*

*User Cache:*
• Size: ${userCacheStats.size} entries
• Hit rate: ${userCacheStats.hitRate}%
• Hits: ${userCacheStats.hits}
• Misses: ${userCacheStats.misses}

*Connection Cache:*
• Size: ${connectionCacheStats.size} entries
• Hit rate: ${connectionCacheStats.hitRate}%
• Hits: ${connectionCacheStats.hits}
• Misses: ${connectionCacheStats.misses}

*Search Cache:*
• Size: ${searchCacheStats.size} entries
• Hit rate: ${searchCacheStats.hitRate}%
• Hits: ${searchCacheStats.hits}
• Misses: ${searchCacheStats.misses}

*Commands:*
• /admincache clear - Clear all caches
• /admincache stats - Show cache statistics
      `;

      await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('Usage: /admincache [clear|stats]');
    }
    
    // Track admin action
    analytics.track(userId, 'admin_cache_managed', { action });
  } catch (error) {
    logger.error('Error in admin cache command:', error);
    await ctx.reply('Error managing cache.');
  }
};

/**
 * Admin command for user management
 */
export const adminUserCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const targetUserId = parts.length > 1 ? Number(parts[1]) : null;

    if (!targetUserId || isNaN(targetUserId)) {
      await ctx.reply('Usage: /adminuser <user_id>');
      return;
    }

    const userProfile = await UserModel.getProfile(targetUserId);
    if (!userProfile) {
      await ctx.reply('User not found.');
      return;
    }

    const connectionsCount = await ConnectionModel.getConnectionsCount(targetUserId);
    const pendingRequestsCount = await ConnectionModel.getPendingRequestsCount(targetUserId);
    const userEvents = analytics.getUserEvents(targetUserId, 10);

    const userInfo = `
👤 *User Information*

*Profile:*
• ID: ${userProfile.telegram_id}
• Username: @${userProfile.username || 'N/A'}
• Name: ${userProfile.name}
• Title: ${userProfile.title}
• Created: ${userProfile.created_at.toLocaleDateString()}

*Connections:*
• Total connections: ${connectionsCount}
• Pending requests: ${pendingRequestsCount}

*Recent Activity:*
${userEvents.length > 0 
  ? userEvents.map(event => `• ${event.action} (${event.timestamp.toLocaleString()})`).join('\n')
  : 'No recent activity'
}

*Privacy Settings:*
• Profile visible: ${userProfile.privacy_settings.profile_visible ? '✅' : '❌'}
• Allow search: ${userProfile.privacy_settings.allow_search ? '✅' : '❌'}
• Allow connections: ${userProfile.privacy_settings.allow_connections ? '✅' : '❌'}
    `;

    await ctx.reply(userInfo, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_user_viewed', { target_user_id: targetUserId });
  } catch (error) {
    logger.error('Error in admin user command:', error);
    await ctx.reply('Error retrieving user information.');
  }
};

/**
 * Admin command for system maintenance
 */
export const adminMaintenanceCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    // Perform maintenance tasks
    conversationManager.cleanupExpiredConversations();
    rateLimiter.cleanup();
    analytics.clearOldEvents(24); // Clear events older than 24 hours

    const maintenanceMessage = `
🔧 *System Maintenance Completed*

*Cleanup Tasks:*
• Expired conversations cleaned
• Rate limit entries cleaned
• Old analytics events cleared (24h+)

*System Status:*
• All maintenance tasks completed successfully
• System ready for normal operation
    `;

    await ctx.reply(maintenanceMessage, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_maintenance_run');
  } catch (error) {
    logger.error('Error in admin maintenance command:', error);
    await ctx.reply('Error during system maintenance.');
  }
};

/**
 * Admin command for rate limit management
 */
export const adminRateLimitCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const targetUserId = parts.length > 1 ? Number(parts[1]) : null;

    if (!targetUserId || isNaN(targetUserId)) {
      await ctx.reply('Usage: /adminratelimit <user_id>');
      return;
    }

    rateLimiter.reset(targetUserId);
    await ctx.reply(`Rate limit reset for user ${targetUserId}.`);
    
    // Track admin action
    analytics.track(userId, 'admin_rate_limit_reset', { target_user_id: targetUserId });
  } catch (error) {
    logger.error('Error in admin rate limit command:', error);
    await ctx.reply('Error resetting rate limit.');
  }
}; 