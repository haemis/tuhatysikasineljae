import { Context } from 'telegraf';
import { UserModel } from '../../models/UserModel';
import conversationManager from '../../utils/conversationManager';
import logger from '../../utils/logger';

export const settingsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const profile = await UserModel.getProfile(userId);
    if (!profile) {
      await ctx.reply('You need to create a profile first. Use /profile to get started.');
      return;
    }

    const settingsMessage = `
⚙️ *Privacy Settings*

Current settings:
• Profile visible: ${profile.privacy_settings.profile_visible ? '✅' : '❌'}
• Show GitHub: ${profile.privacy_settings.show_github ? '✅' : '❌'}
• Show LinkedIn: ${profile.privacy_settings.show_linkedin ? '✅' : '❌'}
• Show Website: ${profile.privacy_settings.show_website ? '✅' : '❌'}
• Show World ID: ${profile.privacy_settings.show_world_id ? '✅' : '❌'}
• Allow search: ${profile.privacy_settings.allow_search ? '✅' : '❌'}
• Allow connections: ${profile.privacy_settings.allow_connections ? '✅' : '❌'}

To change a setting, type the setting name followed by on/off.
Examples:
• "profile_visible on" - Make profile visible
• "allow_connections off" - Disable connection requests
• "show_github off" - Hide GitHub username

Type "done" when finished.
    `;

    await ctx.reply(settingsMessage, { parse_mode: 'Markdown' });
    conversationManager.startConversation(userId, 'settings', { profile });
  } catch (error) {
    logger.error('Error in settings command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
};

/**
 * Handle settings conversation
 */
export const handleSettingsConversation = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    const message = ctx.message;

    if (!userId || !message || !('text' in message)) {
      return;
    }

    const conversation = conversationManager.getConversation(userId);
    if (!conversation || conversation.step !== 'settings') {
      return;
    }

    const input = message.text.toLowerCase().trim();
    
    if (input === 'done') {
      conversationManager.endConversation(userId);
      await ctx.reply('Settings updated successfully!');
      return;
    }

    const parts = input.split(' ');
    if (parts.length !== 2) {
      await ctx.reply('Please use format: "setting_name on/off" (e.g., "profile_visible on")');
      return;
    }

    const [setting, value] = parts;
    const isEnabled = value === 'on';
    
    const validSettings = [
      'profile_visible', 'show_github', 'show_linkedin', 
      'show_website', 'show_world_id', 'allow_search', 'allow_connections'
    ] as const;

    if (!validSettings.includes(setting as any)) {
      await ctx.reply(`Invalid setting. Valid settings: ${validSettings.join(', ')}`);
      return;
    }

    // Update the setting
    const update: Record<string, boolean> = {};
    update[setting as string] = isEnabled;
    const updatedProfile = await UserModel.updatePrivacySettings(userId, update);
    
    if (updatedProfile) {
      await ctx.reply(`✅ ${setting} ${isEnabled ? 'enabled' : 'disabled'}.`);
      
      // Update conversation data
      conversation.data['profile'] = updatedProfile;
      conversationManager.updateConversation(userId, 'settings', conversation.data);
    } else {
      await ctx.reply('❌ Failed to update setting. Please try again.');
    }
  } catch (error) {
    logger.error('Error in settings conversation:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}; 