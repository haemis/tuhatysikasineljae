import { Context } from 'telegraf';
import { ConnectionModel } from '../../models/ConnectionModel';
import logger from '../../utils/logger';

export const requestsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const requests = await ConnectionModel.getPendingRequests(userId, 10, 0);
    if (requests.length === 0) {
      await ctx.reply('You have no pending connection requests.');
      return;
    }

    let message = '📥 *Incoming Connection Requests*\n\n';
    requests.forEach((req, idx) => {
      message += `*${idx + 1}.* ${req.requester.name} (@${req.requester.username || req.requester.telegram_id}) — _${req.requester.title}_\n`;
    });
    message += '\nTo accept a request, use /accept <user_id>. To decline, use /decline <user_id>.';

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in requests command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 