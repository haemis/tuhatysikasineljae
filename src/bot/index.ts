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
import { settingsCommand } from './commands/settings';

// Validate configuration
validateConfig();

// Create bot instance
const bot = new Telegraf(botConfig.token);

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
});

// Middleware for conversation handling
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  
  if (userId && conversationManager.hasActiveConversation(userId)) {
    // Handle conversation flow
    await handleProfileConversation(ctx);
    return; // Don't continue to command handlers
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

// Cleanup expired conversations every 5 minutes
setInterval(() => {
  conversationManager.cleanupExpiredConversations();
}, 5 * 60 * 1000);

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