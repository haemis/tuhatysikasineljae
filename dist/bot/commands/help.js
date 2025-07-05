"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpCommand = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const helpCommand = async (ctx) => {
    try {
        const helpMessage = `
📚 *Business Card Bot - Help*

*Profile Management:*
• /profile - Create or edit your professional profile
• /myprofile - View your own profile
• /settings - Manage your privacy settings

*Networking:*
• /search [query] - Search for professionals
• /connect @username - Send connection request
• /requests - View pending connection requests
• /accept @username - Accept a connection request
• /decline @username - Decline a connection request
• /connections - View your connections
• /view @username - View someone's profile

*Examples:*
• /search developer
• /connect @john_doe
• /view @jane_smith

*Tips:*
• Use @username to mention specific users
• Search works with names, titles, and descriptions
• You can have up to 10 pending connection requests
• Your profile is visible to other users unless you change privacy settings

Need more help? Contact the bot administrator.
    `;
        await ctx.reply(helpMessage, {
            parse_mode: 'Markdown'
        });
        const userId = ctx.from?.id;
        const username = ctx.from?.username;
        logger_1.default.info(`Help command executed for user ${userId} (${username})`);
    }
    catch (error) {
        logger_1.default.error('Error in help command:', error);
        await ctx.reply('Sorry, something went wrong. Please try again later.');
    }
};
exports.helpCommand = helpCommand;
//# sourceMappingURL=help.js.map