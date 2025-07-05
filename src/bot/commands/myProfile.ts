import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import logger from '../../utils/logger';

export const myProfileCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const profile = await UserModel.getProfile(userId);
    if (!profile) {
      await ctx.reply('You do not have a profile yet. Use /profile to create one.');
      return;
    }

    let message = `👤 *Your Profile*\n\n*Name:* ${profile.name}\n*Title:* ${profile.title}\n*Description:* ${profile.description}\n`;
    if (profile.github_username) {
      message += `GitHub: @${profile.github_username}\n`;
    }
    if (profile.linkedin_url) {
      message += `[LinkedIn](${profile.linkedin_url})\n`;
    }
    if (profile.website_url) {
      message += `[Website](${profile.website_url})\n`;
    }
    if (profile.world_id) {
      message += `World ID: ${profile.world_id}\n`;
    }
    message += `\nTo edit your profile, use /profile.`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in myProfile command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 