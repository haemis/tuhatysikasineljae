import { Context } from 'telegraf';
import conversationManager from '../../utils/conversationManager';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';

export const feedbackCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = message ? message.split(' ') : [];
    const feedbackText = parts.length > 1 ? parts.slice(1).join(' ') : '';

    if (!feedbackText) {
      await ctx.reply(`
📝 *Submit Feedback*

Please provide your feedback or suggestion. You can include:
• Bug reports
• Feature requests
• General feedback
• Suggestions for improvement

Example: /feedback The search function could be improved to show more relevant results.

Or just send your feedback in the next message.
      `, { parse_mode: 'Markdown' });
      
      // Start feedback conversation
      conversationManager.startConversation(userId, 'feedback_input');
    } else {
      // Process immediate feedback
      await processFeedback(ctx, userId, feedbackText);
    }
  } catch (error) {
    logger.error('Error in feedback command:', error);
    await ctx.reply('Sorry, something went wrong. Please try again later.');
  }
};

/**
 * Handle feedback conversation
 */
export const handleFeedbackConversation = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    const message = ctx.message;

    if (!userId || !message || !('text' in message)) {
      return;
    }

    const conversation = conversationManager.getConversation(userId);
    if (!conversation || conversation.step !== 'feedback_input') {
      return;
    }

    const feedbackText = message.text.trim();
    
    if (feedbackText.toLowerCase() === 'cancel') {
      conversationManager.endConversation(userId);
      await ctx.reply('Feedback submission cancelled.');
      return;
    }

    await processFeedback(ctx, userId, feedbackText);
    conversationManager.endConversation(userId);
  } catch (error) {
    logger.error('Error in feedback conversation:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
};

/**
 * Process and store feedback
 */
async function processFeedback(ctx: Context, userId: number, feedbackText: string): Promise<void> {
  try {
    // Store feedback (in a real implementation, this would go to a database)
    const feedback = {
      userId,
      text: feedbackText,
      timestamp: new Date(),
      username: ctx.from?.username || 'Unknown'
    };

    // Log feedback for admin review
    logger.info('User feedback received:', feedback);

    // Track feedback submission
    analytics.track(userId, 'feedback_submitted', { 
      feedback_length: feedbackText.length,
      has_username: !!ctx.from?.username
    });

    await ctx.reply(`
✅ *Thank you for your feedback!*

Your message has been received and will be reviewed by our team. We appreciate you taking the time to help us improve the bot.

If you have more feedback in the future, feel free to use /feedback again.
    `, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error processing feedback:', error);
    await ctx.reply('Error submitting feedback. Please try again later.');
  }
} 