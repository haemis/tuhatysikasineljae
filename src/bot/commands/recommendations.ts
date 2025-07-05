import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import { ConnectionModel } from '../../models/ConnectionModel';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';

interface Recommendation {
  user: any;
  score: number;
  reason: string;
}

const RECOMMENDATION_LIMIT = 5;

export const recommendationsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    // Get user profile
    const userProfile = await UserModel.getProfile(userId);
    if (!userProfile) {
      await ctx.reply('You need to create a profile first. Use /profile to get started.');
      return;
    }

    // Get recommendations
    const recommendations = await generateRecommendations(userId, userProfile);
    
    if (recommendations.length === 0) {
      await ctx.reply('No recommendations available at the moment. Try expanding your network or updating your profile.');
      return;
    }

    // Format and send recommendations
    await sendRecommendations(ctx, recommendations);
    
    // Track analytics
    analytics.track(userId, 'recommendations_viewed', { 
      count: recommendations.length,
      has_profile: true
    });
  } catch (error) {
    logger.error('Error in recommendations command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
};

/**
 * Generate personalized recommendations
 */
async function generateRecommendations(userId: number, userProfile: any): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  
  try {
    // Get user's current connections
    const connections = await ConnectionModel.getUserConnections(userId);
    const connectedUserIds = connections.map((c: any) => c.requester.telegram_id === userId ? c.receiver.telegram_id : c.requester.telegram_id);
    
    // Get all users excluding self and current connections
    const allUsers = await UserModel.searchProfiles('', {
      limit: 100,
      excludeTelegramId: userId
    });
    
    // Filter out already connected users
    const potentialConnections = allUsers.filter(user => 
      !connectedUserIds.includes(user.telegram_id) &&
      user.privacy_settings.allow_connections &&
      user.privacy_settings.profile_visible
    );

    // Score each potential connection
    for (const user of potentialConnections) {
      const score = calculateRecommendationScore(userProfile, user, connections);
      
      if (score > 0) {
        recommendations.push({
          user,
          score,
          reason: generateRecommendationReason(userProfile, user, score)
        });
      }
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, RECOMMENDATION_LIMIT);
      
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    return [];
  }
}

/**
 * Calculate recommendation score based on various factors
 */
function calculateRecommendationScore(userProfile: any, potentialConnection: any, userConnections: any[]): number {
  let score = 0;
  
  // Industry similarity (30% weight)
  const industryScore = calculateIndustrySimilarity(userProfile, potentialConnection);
  score += industryScore * 0.3;
  
  // Skills overlap (25% weight)
  const skillsScore = calculateSkillsOverlap(userProfile, potentialConnection);
  score += skillsScore * 0.25;
  
  // Connection network (20% weight)
  const networkScore = calculateNetworkScore(potentialConnection, userConnections);
  score += networkScore * 0.2;
  
  // Activity level (15% weight)
  const activityScore = calculateActivityScore(potentialConnection);
  score += activityScore * 0.15;
  
  // Profile completeness (10% weight)
  const completenessScore = calculateProfileCompleteness(potentialConnection);
  score += completenessScore * 0.1;
  
  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate industry similarity
 */
function calculateIndustrySimilarity(userProfile: any, potentialConnection: any): number {
  const userText = `${userProfile.title} ${userProfile.description}`.toLowerCase();
  const connectionText = `${potentialConnection.title} ${potentialConnection.description}`.toLowerCase();
  
  const industries = ['technology', 'healthcare', 'finance', 'education', 'marketing', 'sales', 'design', 'engineering'];
  
  for (const industry of industries) {
    if (userText.includes(industry) && connectionText.includes(industry)) {
      return 1.0;
    }
  }
  
  return 0.0;
}

/**
 * Calculate skills overlap
 */
function calculateSkillsOverlap(userProfile: any, potentialConnection: any): number {
  const userText = `${userProfile.title} ${userProfile.description}`.toLowerCase();
  const connectionText = `${potentialConnection.title} ${potentialConnection.description}`.toLowerCase();
  
  const skills = ['javascript', 'python', 'react', 'node.js', 'sql', 'aws', 'machine learning', 'data analysis', 'project management', 'ui/ux', 'marketing', 'sales', 'leadership'];
  
  let commonSkills = 0;
  for (const skill of skills) {
    if (userText.includes(skill) && connectionText.includes(skill)) {
      commonSkills++;
    }
  }
  
  return Math.min(commonSkills / 3, 1.0); // Normalize to 0-1
}

/**
 * Calculate network score based on mutual connections
 */
function calculateNetworkScore(potentialConnection: any, userConnections: any[]): number {
  // This would require additional database queries to get the potential connection's connections
  // For now, return a base score
  return 0.5;
}

/**
 * Calculate activity score based on profile recency
 */
function calculateActivityScore(potentialConnection: any): number {
  const daysSinceUpdate = (Date.now() - new Date(potentialConnection.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate <= 7) return 1.0;
  if (daysSinceUpdate <= 30) return 0.8;
  if (daysSinceUpdate <= 90) return 0.6;
  return 0.3;
}

/**
 * Calculate profile completeness score
 */
function calculateProfileCompleteness(potentialConnection: any): number {
  let completeness = 0;
  
  if (potentialConnection.github_username) completeness += 0.2;
  if (potentialConnection.linkedin_url) completeness += 0.2;
  if (potentialConnection.website_url) completeness += 0.2;
  if (potentialConnection.world_id) completeness += 0.1;
  if (potentialConnection.description && potentialConnection.description.length > 50) completeness += 0.3;
  
  return Math.min(completeness, 1.0);
}

/**
 * Generate recommendation reason
 */
function generateRecommendationReason(userProfile: any, potentialConnection: any, score: number): string {
  const reasons: string[] = [];
  
  // Industry match
  const userText = `${userProfile.title} ${userProfile.description}`.toLowerCase();
  const connectionText = `${potentialConnection.title} ${potentialConnection.description}`.toLowerCase();
  
  const industries = ['technology', 'healthcare', 'finance', 'education', 'marketing', 'sales', 'design', 'engineering'];
  for (const industry of industries) {
    if (userText.includes(industry) && connectionText.includes(industry)) {
      reasons.push(`Same industry (${industry})`);
      break;
    }
  }
  
  // Skills match
  const skills = ['javascript', 'python', 'react', 'node.js', 'sql', 'aws', 'machine learning', 'data analysis'];
  const commonSkills = skills.filter(skill => 
    userText.includes(skill) && connectionText.includes(skill)
  );
  
  if (commonSkills.length > 0) {
    reasons.push(`Shared skills: ${commonSkills.slice(0, 2).join(', ')}`);
  }
  
  // Profile completeness
  if (potentialConnection.github_username || potentialConnection.linkedin_url) {
    reasons.push('Complete profile');
  }
  
  // High score
  if (score > 0.7) {
    reasons.push('Excellent match');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'Good networking opportunity';
}

/**
 * Send formatted recommendations
 */
async function sendRecommendations(ctx: Context, recommendations: Recommendation[]): Promise<void> {
  let message = `🎯 *Personalized Recommendations*\n\n`;
  message += `Based on your profile and network, here are ${recommendations.length} professionals you might want to connect with:\n\n`;
  
  recommendations.forEach((rec, index) => {
    const user = rec.user;
    message += `*${index + 1}.* ${user.name} — _${user.title}_\n`;
    message += `${user.description}\n`;
    message += `⭐ Match: ${Math.round(rec.score * 100)}% (${rec.reason})\n`;
    
    if (user.github_username && user.privacy_settings.show_github) {
      message += `GitHub: @${user.github_username}\n`;
    }
    if (user.linkedin_url && user.privacy_settings.show_linkedin) {
      message += `[LinkedIn](${user.linkedin_url})\n`;
    }
    message += `\n`;
  });
  
  message += `Use /connect [username] to send a connection request to any of these professionals.`;
  
  await ctx.reply(message, { parse_mode: 'Markdown' });
} 