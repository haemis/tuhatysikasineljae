import bot from './bot';
import db from './database/connection';
import logger from './utils/logger';
import { validateConfig } from './config';

async function startBot(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated successfully');

    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    logger.info('Database connection established');

    // Start the bot
    await bot.launch();
    logger.info('Telegram bot started successfully');

    // Log bot info
    const botInfo = await bot.telegram.getMe();
    logger.info(`Bot @${botInfo.username} is running`);

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.once('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await bot.stop('SIGINT');
  await db.close();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await bot.stop('SIGTERM');
  await db.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
startBot().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
}); 