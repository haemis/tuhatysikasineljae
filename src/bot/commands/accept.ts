import { Context } from 'telegraf';
import { ConnectionModel } from '../../models/ConnectionModel';
import logger from '../../utils/logger';

export const acceptCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const requesterId = parts.length > 1 ? Number(parts[1].trim()) : NaN;
    if (!requesterId || isNaN(requesterId)) {
      await ctx.reply('Please specify the user ID to accept. Example: /accept 123456789');
      return;
    }

    const result = await ConnectionModel.acceptConnection(requesterId, userId);
    if (result) {
      await ctx.reply('Connection request accepted! You are now connected.');
    } else {
      await ctx.reply('No pending request found from that user, or it was already handled.');
    }
  } catch (error) {
    logger.error('Error in accept command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 