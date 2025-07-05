import { Context } from 'telegraf';
import logger from '../../utils/logger';

export const helpCommand = async (ctx: Context): Promise<void> => {
  try {
    const helpMessage = `
📚 *Business Card Bot - Help*

*Profile Management:*
• /profile - Create or edit your professional profile
• /myprofile - View your own profile
• /settings - Manage your privacy settings

*Networking:*
• /search [query] - Search for professionals
• /connect @username - Send connection request
• /requests - View pending connection requests
• /accept @username - Accept a connection request
• /decline @username - Decline a connection request
• /connections - View your connections
• /view @username - View someone's profile

*Examples:*
• /search developer
• /connect @john_doe
• /view @jane_smith

*Tips:*
• Use @username to mention specific users
• Search works with names, titles, and descriptions
• You can have up to 10 pending connection requests
• Your profile is visible to other users unless you change privacy settings

Need more help? Contact the bot administrator.
    `;

    await ctx.reply(helpMessage, { 
      parse_mode: 'Markdown'
    });

    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    logger.info(`Help command executed for user ${userId} (${username})`);
  } catch (error) {
    logger.error('Error in help command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 