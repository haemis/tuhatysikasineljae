import { Context } from 'telegraf';
import { ConnectionModel } from '../../models/ConnectionModel';
import logger from '../../utils/logger';

export const connectionsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const connections = await ConnectionModel.getUserConnections(userId, 20, 0);
    if (connections.length === 0) {
      await ctx.reply('You have no connections yet. Use /search to find professionals and /connect to send requests.');
      return;
    }

    let message = '🤝 *Your Connections*\n\n';
    connections.forEach((conn, idx) => {
      const other = conn.requester.telegram_id === userId ? conn.receiver : conn.requester;
      message += `*${idx + 1}.* ${other.name} (@${other.username || other.telegram_id}) — _${other.title}_\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in connections command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 