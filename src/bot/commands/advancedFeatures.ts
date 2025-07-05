import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import { ConnectionModel } from '../../models/ConnectionModel';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';
import conversationManager from '../../utils/conversationManager';

/**
 * Advanced search with comprehensive filters
 */
export const advancedSearchFiltersCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = `
🔍 *Advanced Search Filters*

Use this command to search with specific filters:

*Basic Usage:*
/advancedfilters query:JavaScript industry:Technology

*Available Filters:*
• query: Search term
• industry: Industry filter
• skills: Comma-separated skills
• location: Location filter
• experience: Experience level
• availability: Availability status
• company: Company name
• education: Education level
• languages: Comma-separated languages
• certifications: Comma-separated certifications
• remote: true/false for remote work
• sort_by: name, title, created_at, connections, relevance
• sort_order: asc, desc

*Examples:*
/advancedfilters skills:JavaScript,React location:San Francisco
/advancedfilters industry:Technology experience:senior remote:true
/advancedfilters query:developer sort_by:connections sort_order:desc

*Navigation:*
/nextadvanced - Next page
/prevadvanced - Previous page
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track analytics
    analytics.track(userId, 'advanced_search_filters_help_viewed');
  } catch (error) {
    logger.error('Error in advanced search filters command:', error);
    await ctx.reply('Error displaying advanced search help.');
  }
};

/**
 * Handle advanced search with filters
 */
export const handleAdvancedSearchFilters = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const command = message.replace('/advancedfilters', '').trim();

    if (!command) {
      await ctx.reply('Please provide search filters. Use /advancedfilters for help.');
      return;
    }

    // Parse filters from command
    const filters: any = {};
    const options: any = { limit: 5, offset: 0, excludeTelegramId: userId };

    // Parse filter parameters
    const filterRegex = /(\w+):([^,\s]+(?:,[^,\s]+)*)/g;
    let match;

    while ((match = filterRegex.exec(command)) !== null) {
      const [, key, value] = match;
      
      if (key === 'skills' || key === 'languages' || key === 'certifications') {
        filters[key] = value?.split(',').map((v: string) => v.trim()) || [];
      } else if (key === 'remote') {
        filters[key] = value?.toLowerCase() === 'true';
      } else if (key === 'sort_by') {
        options.sort_by = value;
      } else if (key === 'sort_order') {
        options.sort_order = value;
      } else if (value && key) {
        filters[key] = value;
      }
    }

    const results = await UserModel.advancedSearchWithFilters(filters, options);

    if (results.length === 0) {
      await ctx.reply('No results found with the specified filters.');
      return;
    }

    let response = `🔍 *Advanced Search Results*\n\n`;
    
    results.forEach((user, index) => {
      response += `*${index + 1}.* ${user.name}\n`;
      response += `Title: ${user.title}\n`;
      response += `Connections: ${(user as any).connection_count || 0}\n`;
      if ((user as any).relevance_score > 0) {
        response += `Relevance: ${Math.round((user as any).relevance_score * 100)}%\n`;
      }
      response += `\n`;
    });

    response += `*Navigation:*\n`;
    response += `/nextadvanced - Next page\n`;
    response += `/prevadvanced - Previous page\n`;
    response += `/connect @username - Send connection request`;

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track analytics
    analytics.track(userId, 'advanced_search_filters_used', { filters, results_count: results.length });
  } catch (error) {
    logger.error('Error in advanced search filters:', error);
    await ctx.reply('Error performing advanced search.');
  }
};

/**
 * Bulk operations command
 */
export const bulkOperationsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = `
📦 *Bulk Operations*

*Available Operations:*
• /bulkexport - Export your connections' profiles
• /bulkinsights - Get network insights and analytics
• /bulkconnect - Send multiple connection requests

*Examples:*
/bulkexport - Export all your connections
/bulkinsights - View your network analytics
/bulkconnect user1,user2,user3 - Connect with multiple users

*Note:* Bulk operations may take a few moments to complete.
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track analytics
    analytics.track(userId, 'bulk_operations_help_viewed');
  } catch (error) {
    logger.error('Error in bulk operations command:', error);
    await ctx.reply('Error displaying bulk operations help.');
  }
};

/**
 * Bulk export connections
 */
export const bulkExportCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply('📦 Exporting your connections... This may take a moment.');

    // Get user's connections
    const connections = await ConnectionModel.getUserConnections(userId);
    const connectedUserIds = connections.map(conn => 
      (conn as any).requester_id === userId ? (conn as any).receiver_id : (conn as any).requester_id
    );

    if (connectedUserIds.length === 0) {
      await ctx.reply('You have no connections to export.');
      return;
    }

    const exportData = await UserModel.bulkExportProfiles(connectedUserIds);

    let response = `📦 *Connection Export Complete*\n\n`;
    response += `*Export Summary:*\n`;
    response += `• Total Profiles: ${exportData.totalCount}\n`;
    response += `• Export Date: ${new Date(exportData.exportDate).toLocaleDateString()}\n\n`;

    response += `*Top Connections:*\n`;
    exportData.profiles.slice(0, 5).forEach((profile, index) => {
      response += `${index + 1}. ${profile.name} - ${profile.title}\n`;
    });

    if (exportData.profiles.length > 5) {
      response += `\n... and ${exportData.profiles.length - 5} more profiles`;
    }

    response += `\n\n*Data includes:* Name, Title, Description, Social Links, Connection Count`;

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track analytics
    analytics.track(userId, 'bulk_export_completed', { 
      exported_count: exportData.totalCount 
    });
  } catch (error) {
    logger.error('Error in bulk export command:', error);
    await ctx.reply('Error exporting connections.');
  }
};

/**
 * Network insights command
 */
export const networkInsightsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply('📊 Analyzing your network... This may take a moment.');

    const insights = await UserModel.getNetworkInsights(userId);

    let response = `📊 *Network Insights*\n\n`;
    response += `*Overview:*\n`;
    response += `• Total Connections: ${insights.totalConnections}\n\n`;

    if (insights.industryBreakdown.length > 0) {
      response += `*Industry Breakdown:*\n`;
      insights.industryBreakdown.slice(0, 5).forEach(industry => {
        response += `• ${industry.industry}: ${industry.count}\n`;
      });
      response += `\n`;
    }

    if (insights.skillBreakdown.length > 0) {
      response += `*Top Skills in Network:*\n`;
      insights.skillBreakdown.slice(0, 5).forEach(skill => {
        response += `• ${skill.skill}: ${skill.count}\n`;
      });
      response += `\n`;
    }

    if (insights.mutualConnections.length > 0) {
      response += `*Top Mutual Connections:*\n`;
      insights.mutualConnections.slice(0, 3).forEach(connection => {
        response += `• ${connection.name}: ${connection.mutual_count} mutual\n`;
      });
    }

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track analytics
    analytics.track(userId, 'network_insights_viewed', { 
      total_connections: insights.totalConnections 
    });
  } catch (error) {
    logger.error('Error in network insights command:', error);
    await ctx.reply('Error generating network insights.');
  }
};

/**
 * Integration management command
 */
export const integrationsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = `
🔗 *Integration Management*

*Available Integrations:*
• LinkedIn - Verify and sync your LinkedIn profile
• GitHub - Connect your GitHub account
• Calendar - Sync your calendar (coming soon)
• Email - Email integration (coming soon)

*Commands:*
• /verifylinkedin <url> - Verify LinkedIn profile
• /verifygithub <username> - Verify GitHub profile
• /integrations - View integration status
• /syncprofile - Sync all connected profiles

*Examples:*
/verifylinkedin https://linkedin.com/in/username
/verifygithub username
/integrations
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    // Track analytics
    analytics.track(userId, 'integrations_help_viewed');
  } catch (error) {
    logger.error('Error in integrations command:', error);
    await ctx.reply('Error displaying integrations help.');
  }
};

/**
 * Verify LinkedIn profile
 */
export const verifyLinkedInCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const linkedinUrl = message.replace('/verifylinkedin', '').trim();

    if (!linkedinUrl) {
      await ctx.reply('Please provide a LinkedIn URL. Example: /verifylinkedin https://linkedin.com/in/username');
      return;
    }

    await ctx.reply('🔗 Verifying LinkedIn profile...');

    const verification = await UserModel.verifyLinkedInProfile(userId, linkedinUrl);

    if (verification.verified) {
      let response = `✅ *LinkedIn Profile Verified!*\n\n`;
      response += `*Profile Data:*\n`;
      if (verification.profileData) {
        response += `• Name: ${verification.profileData.name}\n`;
        response += `• Headline: ${verification.profileData.headline}\n`;
        response += `• Company: ${verification.profileData.company}\n`;
        response += `• Location: ${verification.profileData.location}\n`;
      }
      response += `\nYour LinkedIn profile has been successfully connected and verified.`;
      
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`❌ LinkedIn verification failed: ${verification.error}`);
    }
    
    // Track analytics
    analytics.track(userId, 'linkedin_verification_attempted', { 
      success: verification.verified 
    });
  } catch (error) {
    logger.error('Error in LinkedIn verification command:', error);
    await ctx.reply('Error verifying LinkedIn profile.');
  }
};

/**
 * Verify GitHub profile
 */
export const verifyGitHubCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const githubUsername = message.replace('/verifygithub', '').trim();

    if (!githubUsername) {
      await ctx.reply('Please provide a GitHub username. Example: /verifygithub username');
      return;
    }

    await ctx.reply('🔗 Verifying GitHub profile...');

    const verification = await UserModel.verifyGitHubProfile(userId, githubUsername);

    if (verification.verified) {
      let response = `✅ *GitHub Profile Verified!*\n\n`;
      response += `*Profile Data:*\n`;
      if (verification.profileData) {
        response += `• Username: ${verification.profileData.username}\n`;
        response += `• Name: ${verification.profileData.name}\n`;
        response += `• Bio: ${verification.profileData.bio}\n`;
        response += `• Public Repos: ${verification.profileData.public_repos}\n`;
        response += `• Followers: ${verification.profileData.followers}\n`;
      }
      response += `\nYour GitHub profile has been successfully connected and verified.`;
      
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`❌ GitHub verification failed: ${verification.error}`);
    }
    
    // Track analytics
    analytics.track(userId, 'github_verification_attempted', { 
      success: verification.verified 
    });
  } catch (error) {
    logger.error('Error in GitHub verification command:', error);
    await ctx.reply('Error verifying GitHub profile.');
  }
};

/**
 * View integration status
 */
export const integrationStatusCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const status = await UserModel.getIntegrationStatus(userId);

    let response = `🔗 *Integration Status*\n\n`;
    
    response += `*LinkedIn:* ${status.linkedin.connected ? '✅ Connected' : '❌ Not Connected'}\n`;
    if (status.linkedin.connected && status.linkedin.lastSync) {
      response += `Last sync: ${new Date(status.linkedin.lastSync).toLocaleDateString()}\n`;
    }
    
    response += `\n*GitHub:* ${status.github.connected ? '✅ Connected' : '❌ Not Connected'}\n`;
    if (status.github.connected && status.github.lastSync) {
      response += `Last sync: ${new Date(status.github.lastSync).toLocaleDateString()}\n`;
    }
    
    response += `\n*Calendar:* ${status.calendar.connected ? '✅ Connected' : '❌ Not Connected'}\n`;
    response += `*Email:* ${status.email.connected ? '✅ Connected' : '❌ Not Connected'}\n`;
    
    response += `\n*Commands:*\n`;
    response += `/verifylinkedin <url> - Connect LinkedIn\n`;
    response += `/verifygithub <username> - Connect GitHub\n`;
    response += `/syncprofile - Sync all profiles`;

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track analytics
    analytics.track(userId, 'integration_status_viewed');
  } catch (error) {
    logger.error('Error in integration status command:', error);
    await ctx.reply('Error retrieving integration status.');
  }
}; 