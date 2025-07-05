"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommand = void 0;
const UserModel_1 = require("../../models/UserModel");
const logger_1 = __importDefault(require("../../utils/logger"));
const startCommand = async (ctx) => {
    try {
        const userId = ctx.from?.id;
        const username = ctx.from?.username;
        const firstName = ctx.from?.first_name;
        if (!userId) {
            await ctx.reply('Error: Could not identify user.');
            return;
        }
        const existingProfile = await UserModel_1.UserModel.getProfile(userId);
        const welcomeMessage = `
🎉 *Welcome to Business Card Bot!*

Hi ${firstName || 'there'}! I'm your professional networking assistant on Telegram.

${existingProfile
            ? '✅ You already have a profile set up!'
            : '📝 You don\'t have a profile yet. Let\'s create one!'}

*What you can do:*
• 📋 Create and manage your professional profile
• 🔍 Search for other professionals
• 🤝 Send and manage connection requests
• 👥 View your professional network
• ⚙️ Control your privacy settings

*Quick Start:*
${existingProfile
            ? '• Use /myprofile to view your profile\n• Use /search to find professionals\n• Use /help for all commands'
            : '• Use /profile to create your profile\n• Use /help to see all available commands'}

Ready to start networking? Use /help to see all available commands!
    `;
        await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown'
        });
        logger_1.default.info(`Start command executed for user ${userId} (${username})`);
    }
    catch (error) {
        logger_1.default.error('Error in start command:', error);
        await ctx.reply('Sorry, something went wrong. Please try again later.');
    }
};
exports.startCommand = startCommand;
//# sourceMappingURL=start.js.map