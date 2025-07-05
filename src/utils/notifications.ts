import { Telegraf } from 'telegraf';
import { UserModel } from '../models/UserModel';
import { ConnectionModel } from '../models/ConnectionModel';
import analytics from './analytics';
import logger from './logger';

interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML';
}

class NotificationService {
  private bot: Telegraf;

  constructor(bot: Telegraf) {
    this.bot = bot;
  }

  /**
   * Send connection request notification
   */
  async sendConnectionRequestNotification(requesterId: number, receiverId: number): Promise<void> {
    try {
      const requester = await UserModel.getProfile(requesterId);
      const receiver = await UserModel.getProfile(receiverId);

      if (!requester || !receiver) {
        logger.warn('Cannot send connection notification: user not found');
        return;
      }

      const message = `
🔗 *New Connection Request*

${requester.name} (@${requester.username || requester.telegram_id}) wants to connect with you.

*${requester.title}*
${requester.description}

To respond, use:
• /accept ${requester.telegram_id} - Accept request
• /decline ${requester.telegram_id} - Decline request
• /view ${requester.username || requester.telegram_id} - View profile
      `;

      await this.bot.telegram.sendMessage(receiverId, message, { parse_mode: 'Markdown' });
      
      analytics.track(requesterId, 'connection_notification_sent', { 
        receiver_id: receiverId,
        receiver_username: receiver.username 
      });
      
      logger.info(`Connection request notification sent to ${receiverId}`);
    } catch (error) {
      logger.error('Error sending connection request notification:', error);
    }
  }

  /**
   * Send connection accepted notification
   */
  async sendConnectionAcceptedNotification(requesterId: number, receiverId: number): Promise<void> {
    try {
      const requester = await UserModel.getProfile(requesterId);
      const receiver = await UserModel.getProfile(receiverId);

      if (!requester || !receiver) {
        logger.warn('Cannot send acceptance notification: user not found');
        return;
      }

      const message = `
✅ *Connection Accepted*

${receiver.name} accepted your connection request!

You can now:
• View their profile: /view ${receiver.username || receiver.telegram_id}
• See your connections: /connections
• Get recommendations: /recommendations
      `;

      await this.bot.telegram.sendMessage(requesterId, message, { parse_mode: 'Markdown' });
      
      analytics.track(receiverId, 'connection_accepted_notification_sent', { 
        requester_id: requesterId,
        requester_username: requester.username 
      });
      
      logger.info(`Connection accepted notification sent to ${requesterId}`);
    } catch (error) {
      logger.error('Error sending connection accepted notification:', error);
    }
  }

  /**
   * Send profile view notification
   */
  async sendProfileViewNotification(viewerId: number, profileOwnerId: number): Promise<void> {
    try {
      const viewer = await UserModel.getProfile(viewerId);
      const profileOwner = await UserModel.getProfile(profileOwnerId);

      if (!viewer || !profileOwner) {
        return;
      }

      // Only send notification if profile owner has notifications enabled
      // This would require adding a notification setting to privacy_settings
      const message = `
👁️ *Profile Viewed*

${viewer.name} viewed your profile.

*${viewer.title}*
${viewer.description}

You can:
• View their profile: /view ${viewer.username || viewer.telegram_id}
• Send connection request: /connect ${viewer.username || viewer.telegram_id}
      `;

      await this.bot.telegram.sendMessage(profileOwnerId, message, { parse_mode: 'Markdown' });
      
      analytics.track(viewerId, 'profile_view_notification_sent', { 
        profile_owner_id: profileOwnerId,
        profile_owner_username: profileOwner.username 
      });
      
      logger.info(`Profile view notification sent to ${profileOwnerId}`);
    } catch (error) {
      logger.error('Error sending profile view notification:', error);
    }
  }

  /**
   * Send weekly digest notification
   */
  async sendWeeklyDigest(userId: number): Promise<void> {
    try {
      const user = await UserModel.getProfile(userId);
      if (!user) return;

      // Get user's activity for the week
      const connections = await ConnectionModel.getUserConnections(userId);
      const pendingRequests = await ConnectionModel.getPendingRequestsCount(userId);
      const profileViews = 0; // This would require tracking profile views

      const message = `
📊 *Weekly Network Digest*

Here's your networking activity this week:

*Connections:*
• Total connections: ${connections.length}
• Pending requests: ${pendingRequests}
• Profile views: ${profileViews}

*Quick Actions:*
• View pending requests: /requests
• See your connections: /connections
• Get recommendations: /recommendations
• Update your profile: /profile

Keep growing your professional network! 🚀
      `;

      await this.bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
      
      analytics.track(userId, 'weekly_digest_sent', { 
        connections_count: connections.length,
        pending_requests: pendingRequests
      });
      
      logger.info(`Weekly digest sent to ${userId}`);
    } catch (error) {
      logger.error('Error sending weekly digest:', error);
    }
  }

  /**
   * Send welcome notification for new users
   */
  async sendWelcomeNotification(userId: number): Promise<void> {
    try {
      const message = `
🎉 *Welcome to the Professional Network!*

You've successfully created your profile. Here's what you can do:

*Get Started:*
• /help - See all available commands
• /myprofile - View your profile
• /search [query] - Find other professionals
• /advancedsearch - Use advanced filters

*Build Your Network:*
• /connect [username] - Send connection requests
• /recommendations - Get personalized suggestions
• /connections - View your network

*Customize:*
• /settings - Manage privacy settings
• /profile - Edit your profile anytime

Happy networking! 🤝
      `;

      await this.bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
      
      analytics.track(userId, 'welcome_notification_sent');
      
      logger.info(`Welcome notification sent to ${userId}`);
    } catch (error) {
      logger.error('Error sending welcome notification:', error);
    }
  }

  /**
   * Send system maintenance notification
   */
  async sendMaintenanceNotification(userIds: number[], maintenanceInfo: string): Promise<void> {
    try {
      const message = `
🔧 *System Maintenance Notice*

${maintenanceInfo}

The bot will be temporarily unavailable during this time. We apologize for any inconvenience.

Thank you for your patience! 🙏
      `;

      for (const userId of userIds) {
        try {
          await this.bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
          logger.info(`Maintenance notification sent to ${userId}`);
        } catch (error) {
          logger.error(`Failed to send maintenance notification to ${userId}:`, error);
        }
      }
      
      analytics.track(0, 'maintenance_notification_sent', { 
        recipients_count: userIds.length 
      });
    } catch (error) {
      logger.error('Error sending maintenance notifications:', error);
    }
  }

  /**
   * Send custom notification to multiple users
   */
  async sendBulkNotification(userIds: number[], template: NotificationTemplate): Promise<void> {
    try {
      const message = `*${template.title}*\n\n${template.message}`;
      const options = template.parseMode ? { parse_mode: template.parseMode } : {};

      let successCount = 0;
      let failureCount = 0;

      for (const userId of userIds) {
        try {
          await this.bot.telegram.sendMessage(userId, message, options);
          successCount++;
          logger.info(`Bulk notification sent to ${userId}`);
        } catch (error) {
          failureCount++;
          logger.error(`Failed to send bulk notification to ${userId}:`, error);
        }
      }
      
      analytics.track(0, 'bulk_notification_sent', { 
        total_recipients: userIds.length,
        success_count: successCount,
        failure_count: failureCount,
        template_type: template.type
      });
      
      logger.info(`Bulk notification completed: ${successCount} sent, ${failureCount} failed`);
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
    }
  }
}

export default NotificationService; 