import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import logger from '../../utils/logger';

// In-memory search state for pagination (per user)
const searchState: Record<number, { query: string; page: number; results: any[] }> = {};
const PAGE_SIZE = 5;

export const searchCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    // If the user provides a query with the command, use it
    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message.split(' ');
    const query = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';

    if (!query) {
      await ctx.reply('Please provide a search query. Example: /search designer or /search John Doe');
      return;
    }

    // Fetch first page of results
    const results = await UserModel.searchProfiles(query, {
      limit: PAGE_SIZE,
      offset: 0,
      excludeTelegramId: userId
    });

    if (results.length === 0) {
      await ctx.reply('No profiles found matching your search. Try a different query.');
      return;
    }

    // Save state for pagination
    searchState[userId] = { query, page: 0, results };

    await sendSearchResults(ctx, userId, 0);
  } catch (error) {
    logger.error('Error in search command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
};

// Helper to send paginated results
async function sendSearchResults(ctx: Context, userId: number, page: number) {
  const state = searchState[userId];
  if (!state) return;
  const { query } = state;
  const offset = page * PAGE_SIZE;
  const results = await UserModel.searchProfiles(query, {
    limit: PAGE_SIZE,
    offset,
    excludeTelegramId: userId
  });

  if (results.length === 0 && page > 0) {
    await ctx.reply('No more results.');
    return;
  }

  // Format results
  let message = `🔎 *Search Results* (Page ${page + 1})\n\n`;
  results.forEach((profile, idx) => {
    message += `*${offset + idx + 1}.* ${profile.name} — _${profile.title}_\n`;
    message += `${profile.description}\n`;
    if (profile.github_username && profile.privacy_settings.show_github) {
      message += `GitHub: @${profile.github_username}\n`;
    }
    if (profile.linkedin_url && profile.privacy_settings.show_linkedin) {
      message += `[LinkedIn](${profile.linkedin_url})\n`;
    }
    if (profile.website_url && profile.privacy_settings.show_website) {
      message += `[Website](${profile.website_url})\n`;
    }
    if (profile.world_id && profile.privacy_settings.show_world_id) {
      message += `World ID: ${profile.world_id}\n`;
    }
    message += '\n';
  });
  message += 'Use /next to see more results, /prev to go back, or /search <query> to start a new search.';

  // Save current page
  if (searchState[userId]) {
    searchState[userId].page = page;
    searchState[userId].results = results;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

// Command handlers for pagination
export const nextSearchPageCommand = async (ctx: Context): Promise<void> => {
  const userId = ctx.from?.id;
  if (!userId || !searchState[userId]) {
    await ctx.reply('No active search. Use /search <query> to start.');
    return;
  }
  const nextPage = searchState[userId].page + 1;
  await sendSearchResults(ctx, userId, nextPage);
};

export const prevSearchPageCommand = async (ctx: Context): Promise<void> => {
  const userId = ctx.from?.id;
  if (!userId || !searchState[userId]) {
    await ctx.reply('No active search. Use /search <query> to start.');
    return;
  }
  const prevPage = Math.max(0, searchState[userId].page - 1);
  await sendSearchResults(ctx, userId, prevPage);
}; 