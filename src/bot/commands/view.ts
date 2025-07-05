import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import { ConnectionModel } from '../../models/ConnectionModel';
import logger from '../../utils/logger';

export const viewCommand = async (ctx: Context): Promise<void> => {
  try {
    const requesterId = ctx.from?.id;
    if (!requesterId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const target = parts.length > 1 ? parts[1]?.trim() || '' : '';
    if (!target) {
      await ctx.reply('Please specify the username or user ID to view. Example: /view johndoe or /view 123456789');
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
      await ctx.reply('User not found.');
      return;
    }
    if (!targetProfile.privacy_settings.profile_visible) {
      await ctx.reply('This user has chosen to keep their profile private.');
      return;
    }

    // Show profile fields respecting privacy
    let messageOut = `👤 *${targetProfile.name}*\n_${targetProfile.title}_\n${targetProfile.description}\n`;
    if (targetProfile.github_username && targetProfile.privacy_settings.show_github) {
      messageOut += `GitHub: @${targetProfile.github_username}\n`;
    }
    if (targetProfile.linkedin_url && targetProfile.privacy_settings.show_linkedin) {
      messageOut += `[LinkedIn](${targetProfile.linkedin_url})\n`;
    }
    if (targetProfile.website_url && targetProfile.privacy_settings.show_website) {
      messageOut += `[Website](${targetProfile.website_url})\n`;
    }
    if (targetProfile.world_id && targetProfile.privacy_settings.show_world_id) {
      messageOut += `World ID: ${targetProfile.world_id}\n`;
    }

    // Show mutual connections if not viewing self
    if (targetProfile.telegram_id !== requesterId) {
      const mutual = await ConnectionModel.getMutualConnections(requesterId, targetProfile.telegram_id);
      if (mutual.length > 0) {
        messageOut += `\n🤝 Mutual connections: ${mutual.length}`;
      }
    }

    await ctx.reply(messageOut, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in view command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 