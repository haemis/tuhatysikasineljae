import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import { ConnectionModel } from '../../models/ConnectionModel';
import logger from '../../utils/logger';
import analytics from '../../utils/analytics';

export const connectCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const target = parts.length > 1 ? parts[1].trim() : '';

    if (!target) {
      await ctx.reply('Please specify the username or user ID to connect with. Example: /connect johndoe or /connect 123456789');
      return;
    }

    // Find target user by username or ID
    let targetProfile = null;
    if (/^\d+$/.test(target)) {
      targetProfile = await UserModel.getProfile(Number(target));
    } else {
      targetProfile = await UserModel.getByUsername(target.replace(/^@/, ''));
    }

    if (!targetProfile) {
      await ctx.reply('User not found. Please check the username or user ID and try again.');
      return;
    }
    if (targetProfile.telegram_id === userId) {
      await ctx.reply('You cannot connect with yourself.');
      return;
    }

    // Attempt to create connection request
    try {
      await ConnectionModel.createConnectionRequest(userId, targetProfile.telegram_id);
      await ctx.reply(`Connection request sent to ${targetProfile.name} (@${targetProfile.username || targetProfile.telegram_id}).`);
      
      // Track connection request analytics
      analytics.track(userId, 'connection_request_sent', { 
        target_user_id: targetProfile.telegram_id,
        target_username: targetProfile.username 
      });
    } catch (err: any) {
      await ctx.reply(`Could not send connection request: ${err.message}`);
      
      // Track failed connection request
      analytics.track(userId, 'connection_request_failed', { 
        target_user_id: targetProfile.telegram_id,
        error: err.message 
      });
    }
  } catch (error) {
    logger.error('Error in connect command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 