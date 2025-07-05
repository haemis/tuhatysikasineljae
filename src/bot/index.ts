import { Telegraf } from 'telegraf';
import { botConfig, validateConfig } from '../config';
import logger from '../utils/logger';
import conversationManager from '../utils/conversationManager';
import { startCommand } from './commands/start';
import { helpCommand } from './commands/help';
import { profileCommand, handleProfileConversation } from './commands/profile';
import { myProfileCommand } from './commands/myProfile';
import { searchCommand, nextSearchPageCommand, prevSearchPageCommand } from './commands/search';
import { connectCommand } from './commands/connect';
import { requestsCommand } from './commands/requests';
import { acceptCommand } from './commands/accept';
import { declineCommand } from './commands/decline';
import { connectionsCommand } from './commands/connections';
import { viewCommand } from './commands/view';
import { settingsCommand, handleSettingsConversation } from './commands/settings';
import rateLimiter from '../utils/rateLimiter';
import { adminStatsCommand, adminUserCommand, adminMaintenanceCommand, adminRateLimitCommand, adminPerformanceCommand, adminCacheCommand } from './commands/admin';
import { feedbackCommand, handleFeedbackConversation } from './commands/feedback';
import { advancedSearchCommand, handleAdvancedSearchConversation, nextAdvancedSearchPageCommand, prevAdvancedSearchPageCommand } from './commands/advancedSearch';
import { recommendationsCommand } from './commands/recommendations';
import NotificationService from '../utils/notifications';
import { userCache, connectionCache, searchCache } from '../utils/cache';
import { performanceMonitor } from '../utils/performance';
import { adminSecurityCommand, adminSecurityEventsCommand, adminBlockUserCommand, adminUnblockUserCommand, adminComplianceCommand, adminRetentionCommand, adminPrivacyRequestsCommand } from './commands/adminSecurity';

// Validate configuration
validateConfig();

// Create bot instance
const bot = new Telegraf(botConfig.token);

// Initialize notification service
const notificationService = new NotificationService(bot);

// Middleware for logging
bot.use(async (ctx, next) => {
  const start = Date.now();
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  let message = 'No text';
  if (ctx.message && 'text' in ctx.message) {
    message = ctx.message.text;
  }

  logger.info(`Incoming message from ${username} (${userId}): ${message}`);
  
  await next();
  
  const ms = Date.now() - start;
  logger.info(`Response time: ${ms}ms`);
  
  // Track performance
  performanceMonitor.trackOperation('bot.message_processed', ms, { userId, username });
});

// Middleware for rate limiting
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  
  if (userId && rateLimiter.isRateLimited(userId)) {
    const timeUntilReset = rateLimiter.getTimeUntilReset(userId);
    const seconds = Math.ceil(timeUntilReset / 1000);
    await ctx.reply(`⚠️ Rate limit exceeded. Please wait ${seconds} seconds before making more requests.`);
    return;
  }
  
  await next();
});

// Middleware for conversation handling
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  
  if (userId && conversationManager.hasActiveConversation(userId)) {
    const conversation = conversationManager.getConversation(userId);
    
    if (conversation?.step === 'settings') {
      // Handle settings conversation
      await handleSettingsConversation(ctx);
      return; // Don't continue to command handlers
    } else if (conversation?.step === 'feedback_input') {
      // Handle feedback conversation
      await handleFeedbackConversation(ctx);
      return; // Don't continue to command handlers
    } else if (conversation?.step === 'advanced_search_setup') {
      // Handle advanced search conversation
      await handleAdvancedSearchConversation(ctx);
      return; // Don't continue to command handlers
    } else if (conversation?.step.startsWith('name') || conversation?.step.startsWith('title') || 
               conversation?.step.startsWith('description') || conversation?.step.startsWith('github') ||
               conversation?.step.startsWith('linkedin') || conversation?.step.startsWith('website') ||
               conversation?.step.startsWith('world_id') || conversation?.step.startsWith('confirm') ||
               conversation?.step === 'edit_confirm') {
      // Handle profile conversation
      await handleProfileConversation(ctx);
      return; // Don't continue to command handlers
    }
  }
  
  await next();
});

// Error handling
bot.catch((err, ctx) => {
  logger.error(`Bot error for ${ctx.updateType}:`, err);
  
  // Send user-friendly error message
  ctx.reply('Sorry, something went wrong. Please try again later.').catch((replyError) => {
    logger.error('Error sending error message:', replyError);
  });
});

// Register commands
bot.start(startCommand);
bot.help(helpCommand);
bot.command('profile', profileCommand);
bot.command('myprofile', myProfileCommand);
bot.command('search', searchCommand);
bot.command('next', nextSearchPageCommand);
bot.command('prev', prevSearchPageCommand);
bot.command('connect', connectCommand);
bot.command('requests', requestsCommand);
bot.command('accept', acceptCommand);
bot.command('decline', declineCommand);
bot.command('connections', connectionsCommand);
bot.command('view', viewCommand);
bot.command('settings', settingsCommand);
bot.command('adminstats', adminStatsCommand);
bot.command('adminuser', adminUserCommand);
bot.command('adminmaintenance', adminMaintenanceCommand);
bot.command('adminratelimit', adminRateLimitCommand);
bot.command('adminperformance', adminPerformanceCommand);
bot.command('admincache', adminCacheCommand);
bot.command('feedback', feedbackCommand);
bot.command('advancedsearch', advancedSearchCommand);
bot.command('nextadvanced', nextAdvancedSearchPageCommand);
bot.command('prevadvanced', prevAdvancedSearchPageCommand);
bot.command('recommendations', recommendationsCommand);
bot.command('adminsecurity', adminSecurityCommand);
bot.command('adminsecurityevents', adminSecurityEventsCommand);
bot.command('adminblockuser', adminBlockUserCommand);
bot.command('adminunblockuser', adminUnblockUserCommand);
bot.command('admincompliance', adminComplianceCommand);
bot.command('adminretention', adminRetentionCommand);
bot.command('adminprivacyrequests', adminPrivacyRequestsCommand);

// Handle unknown commands
bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  
  if (message.startsWith('/')) {
    await ctx.reply(
      'Unknown command. Use /help to see available commands.',
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      'Please use commands to interact with the bot. Type /help to see available commands.',
      { parse_mode: 'Markdown' }
    );
  }
});

// Cleanup expired conversations and rate limits every 5 minutes
setInterval(() => {
  conversationManager.cleanupExpiredConversations();
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

// Cache cleanup every 10 minutes
setInterval(() => {
  userCache.cleanup();
  connectionCache.cleanup();
  searchCache.cleanup();
}, 10 * 60 * 1000);

// Performance metrics cleanup every hour
setInterval(() => {
  performanceMonitor.clearOldMetrics(24);
}, 60 * 60 * 1000);

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  bot.stop('SIGTERM');
});

export default bot; 