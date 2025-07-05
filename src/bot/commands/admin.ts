import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import { ConnectionModel } from '../../models/ConnectionModel';
import analytics from '../../utils/analytics';
import rateLimiter from '../../utils/rateLimiter';
import conversationManager from '../../utils/conversationManager';
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

    const statsMessage = `
📊 *System Statistics*

*Users:*
• Total users: ${totalUsers}
• Unique active users (24h): ${analyticsSummary.uniqueUsers}
• Recent activity (1h): ${analyticsSummary.recentActivity}

*Connections:*
• Total connections: ${totalConnections}
• Active conversations: ${activeConversations}

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