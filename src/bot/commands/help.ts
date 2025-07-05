import { Context } from 'telegraf';
import logger from '../../utils/logger';

export const helpCommand = async (ctx: Context): Promise<void> => {
  try {
    const helpMessage = `
🤖 *Virtual Business Card Bot - Help Guide*

*📋 Profile Management:*
• /profile - Create or edit your professional profile
• /myprofile - View your own profile  
• /settings - Manage privacy settings

*🔍 Discovery & Search:*
• /search [query] - Search for professionals
• /next - Next page of search results
• /prev - Previous page of search results

*🤝 Networking:*
• /connect [username|user_id] - Send connection request
• /requests - View pending connection requests
• /accept [user_id] - Accept a connection request
• /decline [user_id] - Decline a connection request
• /connections - View your accepted connections
• /view [username|user_id] - View someone's profile

*📖 Examples:*
• /search "software engineer"
• /search "product manager"
• /connect john_doe
• /connect 123456789
• /view jane_smith
• /accept 123456789
• /decline 123456789

*⚙️ Privacy Settings:*
• profile_visible on/off - Show/hide your profile
• allow_search on/off - Allow others to find you
• allow_connections on/off - Accept connection requests
• show_github on/off - Show/hide GitHub username
• show_linkedin on/off - Show/hide LinkedIn URL
• show_website on/off - Show/hide website URL
• show_world_id on/off - Show/hide World ID

*💡 Tips:*
• Use quotes for multi-word searches: /search "machine learning"
• You can have up to 10 pending connection requests
• Search results show 5 profiles per page
• Use /next and /prev to navigate search results
• Privacy settings control what others can see about you

*🆘 Need Help?*
If you encounter issues, try:
1. Check your profile exists (/myprofile)
2. Verify privacy settings (/settings)
3. Contact the bot administrator

*📊 Your Stats:*
Use /myprofile to see your profile and /connections to see your network.
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