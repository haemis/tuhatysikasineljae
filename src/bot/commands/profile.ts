import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import conversationManager from '../../utils/conversationManager';
import { validators, sanitizeInput, formatUrl, formatGithubUsername } from '../../utils/validators';
import logger from '../../utils/logger';

export const profileCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;

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

Would you like to edit your profile? Send "yes" to start editing or "no" to cancel.
      `;

      await ctx.reply(profileMessage, { 
        parse_mode: 'Markdown'
      });

      // Start edit conversation
      conversationManager.startConversation(userId, 'edit_confirm', { existingProfile });
    } else {
      // Start profile creation flow
      await startProfileCreation(ctx, userId, username);
    }

    logger.info(`Profile command executed for user ${userId} (${username})`);
  } catch (error) {
    logger.error('Error in profile command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
};

/**
 * Start profile creation conversation
 */
async function startProfileCreation(ctx: Context, userId: number, username?: string): Promise<void> {
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

  // Start conversation
  conversationManager.startConversation(userId, 'name', { username });
}

/**
 * Handle profile creation conversation
 */
export const handleProfileConversation = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    const message = ctx.message;

    if (!userId || !message || !('text' in message)) {
      return;
    }

    const conversation = conversationManager.getConversation(userId);
    if (!conversation) {
      return; // No active conversation
    }

    const { step, data } = conversation;

    switch (step) {
      case 'edit_confirm':
        await handleEditConfirm(ctx, userId, message.text, data);
        break;
      case 'name':
        await handleNameInput(ctx, userId, message.text, data);
        break;
      case 'title':
        await handleTitleInput(ctx, userId, message.text, data);
        break;
      case 'description':
        await handleDescriptionInput(ctx, userId, message.text, data);
        break;
      case 'github':
        await handleGithubInput(ctx, userId, message.text, data);
        break;
      case 'linkedin':
        await handleLinkedinInput(ctx, userId, message.text, data);
        break;
      case 'website':
        await handleWebsiteInput(ctx, userId, message.text, data);
        break;
      case 'world_id':
        await handleWorldIdInput(ctx, userId, message.text, data);
        break;
      case 'confirm':
        await handleProfileConfirm(ctx, userId, message.text, data);
        break;
      default:
        conversationManager.endConversation(userId);
        await ctx.reply('Conversation ended. Use /profile to start again.');
    }
  } catch (error) {
    logger.error('Error in profile conversation:', error);
    await ctx.reply('Sorry, something went wrong. Please try again with /profile.');
  }
};

/**
 * Handle edit confirmation
 */
async function handleEditConfirm(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  const response = message.toLowerCase().trim();
  
  if (response === 'yes' || response === 'y') {
    await ctx.reply('Great! Let\'s update your profile. Please send me your full name:');
    conversationManager.updateConversation(userId, 'name', { 
      ...data, 
      isEditing: true,
      existingProfile: data.existingProfile 
    });
  } else if (response === 'no' || response === 'n') {
    conversationManager.endConversation(userId);
    await ctx.reply('Profile editing cancelled.');
  } else {
    await ctx.reply('Please send "yes" to edit your profile or "no" to cancel.');
  }
}

/**
 * Handle name input
 */
async function handleNameInput(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  const validation = validators.name(message);
  
  if (!validation.isValid) {
    await ctx.reply(`❌ ${validation.error}\n\nPlease try again:`);
    return;
  }

  const sanitizedName = sanitizeInput(message);
  conversationManager.updateConversation(userId, 'title', { 
    ...data, 
    name: sanitizedName 
  });

  await ctx.reply('Great! Now please send me your professional title (e.g., "Senior Software Engineer", "Product Manager"):');
}

/**
 * Handle title input
 */
async function handleTitleInput(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  const validation = validators.title(message);
  
  if (!validation.isValid) {
    await ctx.reply(`❌ ${validation.error}\n\nPlease try again:`);
    return;
  }

  const sanitizedTitle = sanitizeInput(message);
  conversationManager.updateConversation(userId, 'description', { 
    ...data, 
    title: sanitizedTitle 
  });

  await ctx.reply('Excellent! Now please send me a brief description of your professional background and expertise (max 300 characters):');
}

/**
 * Handle description input
 */
async function handleDescriptionInput(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  const validation = validators.description(message);
  
  if (!validation.isValid) {
    await ctx.reply(`❌ ${validation.error}\n\nPlease try again:`);
    return;
  }

  const sanitizedDescription = sanitizeInput(message);
  conversationManager.updateConversation(userId, 'github', { 
    ...data, 
    description: sanitizedDescription 
  });

  await ctx.reply('Perfect! Now for the optional fields. Please send me your GitHub username (or send "skip" to skip this field):');
}

/**
 * Handle GitHub username input
 */
async function handleGithubInput(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  if (message.toLowerCase().trim() === 'skip') {
    conversationManager.updateConversation(userId, 'linkedin', { ...data, github_username: '' });
    await ctx.reply('GitHub username skipped. Please send me your LinkedIn profile URL (or send "skip" to skip this field):');
    return;
  }

  const validation = validators.githubUsername(message);
  
  if (!validation.isValid) {
    await ctx.reply(`❌ ${validation.error}\n\nPlease try again or send "skip" to skip this field:`);
    return;
  }

  const formattedGithub = formatGithubUsername(message);
  conversationManager.updateConversation(userId, 'linkedin', { 
    ...data, 
    github_username: formattedGithub 
  });

  await ctx.reply('Great! Please send me your LinkedIn profile URL (or send "skip" to skip this field):');
}

/**
 * Handle LinkedIn URL input
 */
async function handleLinkedinInput(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  if (message.toLowerCase().trim() === 'skip') {
    conversationManager.updateConversation(userId, 'website', { ...data, linkedin_url: '' });
    await ctx.reply('LinkedIn URL skipped. Please send me your website URL (or send "skip" to skip this field):');
    return;
  }

  const validation = validators.linkedinUrl(message);
  
  if (!validation.isValid) {
    await ctx.reply(`❌ ${validation.error}\n\nPlease try again or send "skip" to skip this field:`);
    return;
  }

  const formattedLinkedin = formatUrl(message);
  conversationManager.updateConversation(userId, 'website', { 
    ...data, 
    linkedin_url: formattedLinkedin 
  });

  await ctx.reply('Excellent! Please send me your website URL (or send "skip" to skip this field):');
}

/**
 * Handle website URL input
 */
async function handleWebsiteInput(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  if (message.toLowerCase().trim() === 'skip') {
    conversationManager.updateConversation(userId, 'world_id', { ...data, website_url: '' });
    await ctx.reply('Website URL skipped. Please send me your World ID (or send "skip" to skip this field):');
    return;
  }

  const validation = validators.websiteUrl(message);
  
  if (!validation.isValid) {
    await ctx.reply(`❌ ${validation.error}\n\nPlease try again or send "skip" to skip this field:`);
    return;
  }

  const formattedWebsite = formatUrl(message);
  conversationManager.updateConversation(userId, 'world_id', { 
    ...data, 
    website_url: formattedWebsite 
  });

  await ctx.reply('Great! Please send me your World ID (or send "skip" to skip this field):');
}

/**
 * Handle World ID input
 */
async function handleWorldIdInput(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  if (message.toLowerCase().trim() === 'skip') {
    conversationManager.updateConversation(userId, 'confirm', { ...data, world_id: '' });
  } else {
    const validation = validators.worldId(message);
    
    if (!validation.isValid) {
      await ctx.reply(`❌ ${validation.error}\n\nPlease try again or send "skip" to skip this field:`);
      return;
    }

    conversationManager.updateConversation(userId, 'confirm', { 
      ...data, 
      world_id: message.trim() 
    });
  }

  await showProfileConfirmation(ctx, userId, data);
}

/**
 * Show profile confirmation
 */
async function showProfileConfirmation(ctx: Context, _userId: number, data: any): Promise<void> {
  const profileData = {
    name: data.name,
    title: data.title,
    description: data.description,
    github_username: data.github_username || '',
    linkedin_url: data.linkedin_url || '',
    website_url: data.website_url || '',
    world_id: data.world_id || ''
  };

  const confirmationMessage = `
📋 *Profile Summary*

*Name:* ${profileData.name}
*Title:* ${profileData.title}
*Description:* ${profileData.description}
${profileData.github_username ? `*GitHub:* @${profileData.github_username}` : ''}
${profileData.linkedin_url ? `*LinkedIn:* [View Profile](${profileData.linkedin_url})` : ''}
${profileData.website_url ? `*Website:* [Visit](${profileData.website_url})` : ''}
${profileData.world_id ? `*World ID:* ${profileData.world_id}` : ''}

Please review your profile above. Send "yes" to save it or "no" to start over.
  `;

  await ctx.reply(confirmationMessage, { 
    parse_mode: 'Markdown'
  });
}

/**
 * Handle profile confirmation
 */
async function handleProfileConfirm(ctx: Context, userId: number, message: string, data: any): Promise<void> {
  const response = message.toLowerCase().trim();
  
  if (response === 'yes' || response === 'y') {
    try {
      const profileData = {
        telegram_id: userId,
        username: data.username,
        name: data.name,
        title: data.title,
        description: data.description,
        github_username: data.github_username || undefined,
        linkedin_url: data.linkedin_url || undefined,
        website_url: data.website_url || undefined,
        world_id: data.world_id || undefined
      };

      if (data.isEditing && data.existingProfile) {
        // Update existing profile
        const updatedProfile = await UserModel.updateProfile(userId, profileData);
        if (updatedProfile) {
          await ctx.reply('✅ Your profile has been updated successfully!');
        } else {
          await ctx.reply('❌ Failed to update profile. Please try again.');
        }
      } else {
        // Create new profile
        await UserModel.createProfile(profileData);
        await ctx.reply('✅ Your profile has been created successfully! You can now use /search to find other professionals and /connect to send connection requests.');
      }

      conversationManager.endConversation(userId);
    } catch (error) {
      logger.error('Error saving profile:', error);
      await ctx.reply('❌ Failed to save profile. Please try again with /profile.');
      conversationManager.endConversation(userId);
    }
  } else if (response === 'no' || response === 'n') {
    // Start over
    conversationManager.endConversation(userId);
    await ctx.reply('Profile creation cancelled. Use /profile to start again.');
  } else {
    await ctx.reply('Please send "yes" to save your profile or "no" to start over.');
  }
} 