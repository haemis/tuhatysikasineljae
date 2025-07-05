import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import logger from '../../utils/logger';

export const profileCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;

    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    // Check if user already has a profile
    const existingProfile = await UserModel.getProfile(userId);

    if (existingProfile) {
      // Show current profile and offer to edit
      const profileMessage = `
📋 *Your Current Profile*

*Name:* ${existingProfile.name}
*Title:* ${existingProfile.title}
*Description:* ${existingProfile.description}
${existingProfile.github_username ? `*GitHub:* @${existingProfile.github_username}` : ''}
${existingProfile.linkedin_url ? `*LinkedIn:* [View Profile](${existingProfile.linkedin_url})` : ''}
${existingProfile.website_url ? `*Website:* [Visit](${existingProfile.website_url})` : ''}
${existingProfile.world_id ? `*World ID:* ${existingProfile.world_id}` : ''}

To edit your profile, use /profile again and I'll guide you through the process.
      `;

      await ctx.reply(profileMessage, { 
        parse_mode: 'Markdown'
      });
    } else {
      // Guide user through profile creation
      const createMessage = `
📝 *Create Your Professional Profile*

Let's create your professional profile! I'll guide you through each field.

*Required Fields:*
• Name (max 50 characters)
• Title (max 100 characters) 
• Description (max 300 characters)

*Optional Fields:*
• GitHub username
• LinkedIn profile URL
• Website URL
• World ID

Please start by sending me your full name:
      `;

      await ctx.reply(createMessage, { 
        parse_mode: 'Markdown'
      });

      // TODO: Implement profile creation flow with conversation handling
      await ctx.reply('Profile creation flow will be implemented in the next phase.');
    }

    logger.info(`Profile command executed for user ${userId} (${username})`);
  } catch (error) {
    logger.error('Error in profile command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
}; 