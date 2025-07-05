import { Context } from 'telegraf';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';

export const helpCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const helpMessage = `
🤖 *Telegram Business Card Bot - Help*

*Profile Management:*
• /start - Welcome message and bot introduction
• /profile - Create or edit your professional profile
• /myprofile - View your own profile
• /settings - Manage privacy settings

*Search & Discovery:*
• /search [query] - Basic search for professionals
• /advancedsearch - Advanced search with filters
  - Use filters: industry, skills, location, experience, availability
  - Example: /advancedsearch industry:Technology skills:JavaScript,React
• /recommendations - Get personalized connection suggestions

*Networking:*
• /connect @username - Send connection request
• /requests - View pending connection requests
• /accept @username - Accept connection request
• /decline @username - Decline connection request
• /connections - View your connections
• /view @username - View someone's profile

*Navigation:*
• /next - Next page of search results
• /prev - Previous page of search results
• /nextadvanced - Next page of advanced search
• /prevadvanced - Previous page of advanced search

*Feedback & Support:*
• /feedback [message] - Submit feedback or suggestions
• /help - Show this help message

*Admin Commands (Admin Only):*
• /adminstats - View system statistics
• /adminuser <user_id> - View user details
• /adminmaintenance - Run system maintenance
• /adminratelimit <user_id> - Reset user rate limits

*Advanced Search Filters:*
• industry: [Technology, Healthcare, Finance, etc.]
• skills: [JavaScript, Python, React, etc.]
• location: [City, Country]
• experience: [entry, mid, senior, executive]
• availability: [full-time, part-time, contract, freelance]

*Examples:*
• /advancedsearch industry:Technology skills:JavaScript,React
• /advancedsearch location:San Francisco experience:senior
• /advancedsearch skills:Python,Machine Learning availability:contract

For more information, visit our documentation or contact support.
    `;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    
    // Track help command usage
    analytics.track(userId, 'help_viewed');
  } catch (error) {
    logger.error('Error in help command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 