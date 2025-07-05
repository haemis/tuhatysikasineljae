import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import conversationManager from '../../utils/conversationManager';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';

// Industry categories
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing',
  'Sales', 'Design', 'Engineering', 'Consulting', 'Non-profit',
  'Government', 'Retail', 'Manufacturing', 'Media', 'Real Estate'
];

// Common skills
const SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS',
  'Machine Learning', 'Data Analysis', 'Project Management',
  'UI/UX Design', 'Digital Marketing', 'Sales', 'Leadership',
  'Communication', 'Problem Solving', 'Agile', 'DevOps'
];

// Search filters interface
interface SearchFilters {
  industry?: string;
  skills?: string[];
  location?: string;
  experience?: 'entry' | 'mid' | 'senior' | 'executive';
  availability?: 'full-time' | 'part-time' | 'contract' | 'freelance';
}

// In-memory search state for pagination
const advancedSearchState: Record<number, { 
  filters: SearchFilters; 
  page: number; 
  results: any[] 
}> = {};

const PAGE_SIZE = 5;

export const advancedSearchCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const query = parts.length > 1 ? parts.slice(1).join(' ') : '';

    if (!query) {
      await showAdvancedSearchMenu(ctx, userId);
      return;
    }

    // Parse query for filters
    const filters = parseSearchQuery(query);
    
    // Perform search
    const results = await UserModel.advancedSearch(filters, {
      limit: PAGE_SIZE,
      offset: 0,
      excludeTelegramId: userId
    });

    if (results.length === 0) {
      await ctx.reply('No profiles found matching your criteria. Try adjusting your filters.');
      return;
    }

    // Save state for pagination
    advancedSearchState[userId] = { filters, page: 0, results };

    await sendAdvancedSearchResults(ctx, userId, 0);
    
    // Track search analytics
    analytics.track(userId, 'advanced_search_performed', { 
      filters,
      results_count: results.length 
    });
  } catch (error) {
    logger.error('Error in advanced search command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
};

/**
 * Show advanced search menu
 */
async function showAdvancedSearchMenu(ctx: Context, userId: number): Promise<void> {
  const menuMessage = `
🔍 *Advanced Search*

Use filters to find professionals by:
• Industry
• Skills
• Location
• Experience level
• Availability

*Available Industries:*
${INDUSTRIES.slice(0, 10).join(', ')}

*Common Skills:*
${SKILLS.slice(0, 10).join(', ')}

*Examples:*
• /advancedsearch industry:Technology skills:JavaScript,React
• /advancedsearch location:San Francisco experience:senior
• /advancedsearch skills:Python,Machine Learning availability:contract

*Or start with basic search:*
/advancedsearch [your query]
  `;

  await ctx.reply(menuMessage, { parse_mode: 'Markdown' });
  conversationManager.startConversation(userId, 'advanced_search_setup');
}

/**
 * Parse search query for filters
 */
function parseSearchQuery(query: string): SearchFilters {
  const filters: SearchFilters = {};
  
  // Parse industry filter
  const industryMatch = query.match(/industry:(\w+)/i);
  if (industryMatch && industryMatch[1]) {
    filters.industry = industryMatch[1];
  }
  
  // Parse skills filter
  const skillsMatch = query.match(/skills:([^,\s]+(?:,[^,\s]+)*)/i);
  if (skillsMatch && skillsMatch[1]) {
    filters.skills = skillsMatch[1].split(',').map(s => s.trim());
  }
  
  // Parse location filter
  const locationMatch = query.match(/location:([^,\s]+(?:\s+[^,\s]+)*)/i);
  if (locationMatch && locationMatch[1]) {
    filters.location = locationMatch[1];
  }
  
  // Parse experience filter
  const experienceMatch = query.match(/experience:(entry|mid|senior|executive)/i);
  if (experienceMatch && experienceMatch[1]) {
    filters.experience = experienceMatch[1] as any;
  }
  
  // Parse availability filter
  const availabilityMatch = query.match(/availability:(full-time|part-time|contract|freelance)/i);
  if (availabilityMatch && availabilityMatch[1]) {
    filters.availability = availabilityMatch[1] as any;
  }
  
  return filters;
}

/**
 * Handle advanced search conversation
 */
export const handleAdvancedSearchConversation = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    const message = ctx.message;

    if (!userId || !message || !('text' in message)) {
      return;
    }

    const conversation = conversationManager.getConversation(userId);
    if (!conversation || conversation.step !== 'advanced_search_setup') {
      return;
    }

    const input = message.text.toLowerCase().trim();
    
    if (input === 'cancel') {
      conversationManager.endConversation(userId);
      await ctx.reply('Advanced search cancelled.');
      return;
    }

    // Parse the input as a search query
    const filters = parseSearchQuery(input);
    
    // Perform search
    const results = await UserModel.advancedSearch(filters, {
      limit: PAGE_SIZE,
      offset: 0,
      excludeTelegramId: userId
    });

    if (results.length === 0) {
      await ctx.reply('No profiles found. Try different filters or use /advancedsearch for help.');
      conversationManager.endConversation(userId);
      return;
    }

    // Save state and show results
    advancedSearchState[userId] = { filters, page: 0, results };
    await sendAdvancedSearchResults(ctx, userId, 0);
    conversationManager.endConversation(userId);
    
    // Track search analytics
    analytics.track(userId, 'advanced_search_conversation', { 
      filters,
      results_count: results.length 
    });
  } catch (error) {
    logger.error('Error in advanced search conversation:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
};

/**
 * Send paginated advanced search results
 */
async function sendAdvancedSearchResults(ctx: Context, userId: number, page: number): Promise<void> {
  const state = advancedSearchState[userId];
  if (!state) return;
  
  const { filters } = state;
  const offset = page * PAGE_SIZE;
  const results = await UserModel.advancedSearch(filters, {
    limit: PAGE_SIZE,
    offset,
    excludeTelegramId: userId
  });

  if (results.length === 0 && page > 0) {
    await ctx.reply('No more results.');
    return;
  }

  // Format results with filters
  let message = `🔍 *Advanced Search Results* (Page ${page + 1})\n\n`;
  
  // Show active filters
  const activeFilters = [];
  if (filters.industry) activeFilters.push(`Industry: ${filters.industry}`);
  if (filters.skills?.length) activeFilters.push(`Skills: ${filters.skills.join(', ')}`);
  if (filters.location) activeFilters.push(`Location: ${filters.location}`);
  if (filters.experience) activeFilters.push(`Experience: ${filters.experience}`);
  if (filters.availability) activeFilters.push(`Availability: ${filters.availability}`);
  
  if (activeFilters.length > 0) {
    message += `*Active Filters:* ${activeFilters.join(' | ')}\n\n`;
  }

  results.forEach((profile, idx) => {
    message += `*${offset + idx + 1}.* ${profile.name} — _${profile.title}_\n`;
    message += `${profile.description}\n`;
    
    // Show relevant skills if they match filters
    if (filters.skills?.length && profile.description) {
      const matchingSkills = filters.skills.filter(skill => 
        profile.description.toLowerCase().includes(skill.toLowerCase())
      );
      if (matchingSkills.length > 0) {
        message += `🎯 Skills: ${matchingSkills.join(', ')}\n`;
      }
    }
    
    if (profile.github_username && profile.privacy_settings.show_github) {
      message += `GitHub: @${profile.github_username}\n`;
    }
    if (profile.linkedin_url && profile.privacy_settings.show_linkedin) {
      message += `[LinkedIn](${profile.linkedin_url})\n`;
    }
    message += '\n';
  });
  
  message += 'Use /next to see more results, /prev to go back, or /advancedsearch to start a new search.';

  // Save current page
  if (advancedSearchState[userId]) {
    advancedSearchState[userId].page = page;
    advancedSearchState[userId].results = results;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

// Command handlers for pagination
export const nextAdvancedSearchPageCommand = async (ctx: Context): Promise<void> => {
  const userId = ctx.from?.id;
  if (!userId || !advancedSearchState[userId]) {
    await ctx.reply('No active advanced search. Use /advancedsearch to start.');
    return;
  }
  const nextPage = advancedSearchState[userId].page + 1;
  await sendAdvancedSearchResults(ctx, userId, nextPage);
  
  analytics.track(userId, 'advanced_search_next_page', { 
    page: nextPage, 
    filters: advancedSearchState[userId].filters 
  });
};

export const prevAdvancedSearchPageCommand = async (ctx: Context): Promise<void> => {
  const userId = ctx.from?.id;
  if (!userId || !advancedSearchState[userId]) {
    await ctx.reply('No active advanced search. Use /advancedsearch to start.');
    return;
  }
  const prevPage = Math.max(0, advancedSearchState[userId].page - 1);
  await sendAdvancedSearchResults(ctx, userId, prevPage);
  
  analytics.track(userId, 'advanced_search_prev_page', { 
    page: prevPage, 
    filters: advancedSearchState[userId].filters 
  });
}; 