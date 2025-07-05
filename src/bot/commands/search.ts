import { Context } from 'telegraf';
import logger from '../../utils/logger';

export const searchCommand = async (ctx: Context): Promise<void> => {
  try {
    await ctx.reply('Search command will be implemented in the next phase.');
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    logger.info(`Search command executed for user ${userId} (${username})`);
  } catch (error) {
    logger.error('Error in search command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 