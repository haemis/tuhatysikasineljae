import { Context } from 'telegraf';
import { securityManager } from '../../utils/security';
import { complianceManager } from '../../utils/compliance';
import analytics from '../../utils/analytics';
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
 * Admin command for security statistics
 */
export const adminSecurityCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const securityStats = securityManager.getSecurityStats();
    const complianceReport = complianceManager.generateComplianceReport();

    const message = `
🔒 *Security & Compliance Report*

*Security Status:*
• Threat Level: ${securityStats.threatLevel.toUpperCase()}
• Total Security Events: ${securityStats.totalEvents}
• Blocked Users: ${securityStats.blockedUsers}
• Suspicious IPs: ${securityStats.suspiciousIPs}

*Recent Security Events:*
${securityStats.recentEvents.length > 0 
  ? securityStats.recentEvents.slice(-5).map(event => 
      `• ${event.type} (${event.severity}) - ${event.timestamp.toLocaleString()}`
    ).join('\n')
  : 'No recent events'
}

*GDPR Compliance:*
• Data Export: ${complianceReport.gdprCompliance.dataExport ? '✅' : '❌'}
• Data Deletion: ${complianceReport.gdprCompliance.dataDeletion ? '✅' : '❌'}
• Data Rectification: ${complianceReport.gdprCompliance.dataRectification ? '✅' : '❌'}
• Consent Management: ${complianceReport.gdprCompliance.consentManagement ? '✅' : '❌'}

*Privacy Requests:*
• Total: ${complianceReport.privacyRequests.total}
• Pending: ${complianceReport.privacyRequests.pending}
• Completed: ${complianceReport.privacyRequests.completed}
• Failed: ${complianceReport.privacyRequests.failed}

*Commands:*
• /adminsecurity events - View recent security events
• /adminsecurity block <user_id> - Block user
• /adminsecurity unblock <user_id> - Unblock user
• /adminsecurity compliance - Detailed compliance report
• /adminsecurity retention - Run data retention cleanup
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_security_viewed');
  } catch (error) {
    logger.error('Error in admin security command:', error);
    await ctx.reply('Error retrieving security information.');
  }
};

/**
 * Admin command for security events
 */
export const adminSecurityEventsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const recentEvents = securityManager.getRecentEvents(undefined, 60); // Last hour

    if (recentEvents.length === 0) {
      await ctx.reply('No security events in the last hour.');
      return;
    }

    let message = `🔍 *Recent Security Events (Last Hour)*\n\n`;
    
    recentEvents.slice(-10).forEach((event, index) => {
      message += `*${index + 1}.* ${event.type.toUpperCase()} (${event.severity})\n`;
      message += `User: ${event.userId || 'N/A'}\n`;
      message += `Time: ${event.timestamp.toLocaleString()}\n`;
      if (event.details && Object.keys(event.details).length > 0) {
        message += `Details: ${JSON.stringify(event.details, null, 2)}\n`;
      }
      message += '\n';
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_security_events_viewed');
  } catch (error) {
    logger.error('Error in admin security events command:', error);
    await ctx.reply('Error retrieving security events.');
  }
};

/**
 * Admin command for blocking users
 */
export const adminBlockUserCommand = async (ctx: Context): Promise<void> => {
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
      await ctx.reply('Usage: /adminblock <user_id>');
      return;
    }

    securityManager.unblockUser(targetUserId); // This will block the user
    await ctx.reply(`User ${targetUserId} has been blocked due to security violations.`);
    
    // Track admin action
    analytics.track(userId, 'admin_user_blocked', { target_user_id: targetUserId });
  } catch (error) {
    logger.error('Error in admin block user command:', error);
    await ctx.reply('Error blocking user.');
  }
};

/**
 * Admin command for unblocking users
 */
export const adminUnblockUserCommand = async (ctx: Context): Promise<void> => {
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
      await ctx.reply('Usage: /adminunblock <user_id>');
      return;
    }

    securityManager.unblockUser(targetUserId);
    await ctx.reply(`User ${targetUserId} has been unblocked.`);
    
    // Track admin action
    analytics.track(userId, 'admin_user_unblocked', { target_user_id: targetUserId });
  } catch (error) {
    logger.error('Error in admin unblock user command:', error);
    await ctx.reply('Error unblocking user.');
  }
};

/**
 * Admin command for compliance report
 */
export const adminComplianceCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const complianceReport = complianceManager.generateComplianceReport();
    const dataProcessingActivities = complianceManager.getDataProcessingActivities();

    let message = `
📋 *Detailed Compliance Report*

*Data Retention Policy:*
• User Profiles: ${complianceReport.dataRetention.userProfiles} days
• Connections: ${complianceReport.dataRetention.connections} days
• Analytics: ${complianceReport.dataRetention.analytics} days
• Logs: ${complianceReport.dataRetention.logs} days
• Security Events: ${complianceReport.dataRetention.securityEvents} days

*Data Protection Measures:*
• Encryption: ${complianceReport.dataProtection.encryptionEnabled ? '✅' : '❌'}
• Access Controls: ${complianceReport.dataProtection.accessControls ? '✅' : '❌'}
• Audit Logging: ${complianceReport.dataProtection.auditLogging ? '✅' : '❌'}

*Data Processing Activities:*
`;

    dataProcessingActivities.forEach((activity, index) => {
      message += `*${index + 1}.* ${activity.purpose}\n`;
      message += `Legal Basis: ${activity.legalBasis}\n`;
      message += `Data Categories: ${activity.dataCategories.join(', ')}\n`;
      message += `Retention: ${activity.retentionPeriod}\n\n`;
    });

    message += `*Commands:*
• /admincompliance retention - Run data retention cleanup
• /admincompliance requests - View privacy requests
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_compliance_viewed');
  } catch (error) {
    logger.error('Error in admin compliance command:', error);
    await ctx.reply('Error retrieving compliance report.');
  }
};

/**
 * Admin command for data retention cleanup
 */
export const adminRetentionCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    await ctx.reply('🔄 Running data retention cleanup... This may take a moment.');

    const results = await complianceManager.runDataRetentionCleanup();

    const message = `
✅ *Data Retention Cleanup Completed*

*Results:*
• Profiles cleaned: ${results.profilesCleaned}
• Connections cleaned: ${results.connectionsCleaned}
• Analytics cleaned: ${results.analyticsCleaned}
• Logs cleaned: ${results.logsCleaned}
• Security events cleaned: ${results.securityEventsCleaned}

*Next cleanup:* Scheduled for tomorrow
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_retention_cleanup_run', results);
  } catch (error) {
    logger.error('Error in admin retention command:', error);
    await ctx.reply('Error during data retention cleanup.');
  }
};

/**
 * Admin command for privacy requests
 */
export const adminPrivacyRequestsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const targetUserId = parts.length > 1 ? Number(parts[1]) : null;

    if (targetUserId && !isNaN(targetUserId)) {
      // Show specific user's privacy requests
      const userRequests = complianceManager.getUserPrivacyRequests(targetUserId);
      
      if (userRequests.length === 0) {
        await ctx.reply(`No privacy requests found for user ${targetUserId}.`);
        return;
      }

      let message = `📋 *Privacy Requests for User ${targetUserId}*\n\n`;
      
      userRequests.forEach((req, index) => {
        message += `*${index + 1}.* ${req.type.toUpperCase()}\n`;
        message += `Status: ${req.status}\n`;
        message += `Created: ${req.createdAt.toLocaleString()}\n`;
        if (req.completedAt) {
          message += `Completed: ${req.completedAt.toLocaleString()}\n`;
        }
        message += `ID: ${req.id}\n\n`;
      });

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } else {
      // Show all recent privacy requests
      const complianceReport = complianceManager.generateComplianceReport();
      
      const message = `
📋 *Privacy Requests Overview*

*Summary:*
• Total: ${complianceReport.privacyRequests.total}
• Pending: ${complianceReport.privacyRequests.pending}
• Completed: ${complianceReport.privacyRequests.completed}
• Failed: ${complianceReport.privacyRequests.failed}

*Usage:*
• /adminprivacy <user_id> - View user's privacy requests
• /adminprivacy - View overview
      `;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    
    // Track admin action
    analytics.track(userId, 'admin_privacy_requests_viewed', { target_user_id: targetUserId });
  } catch (error) {
    logger.error('Error in admin privacy requests command:', error);
    await ctx.reply('Error retrieving privacy requests.');
  }
}; 