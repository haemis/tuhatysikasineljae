"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
const conversationManager_1 = __importDefault(require("../utils/conversationManager"));
const start_1 = require("./commands/start");
const help_1 = require("./commands/help");
const profile_1 = require("./commands/profile");
const myProfile_1 = require("./commands/myProfile");
const search_1 = require("./commands/search");
const connect_1 = require("./commands/connect");
const requests_1 = require("./commands/requests");
const accept_1 = require("./commands/accept");
const decline_1 = require("./commands/decline");
const connections_1 = require("./commands/connections");
const view_1 = require("./commands/view");
const settings_1 = require("./commands/settings");
(0, config_1.validateConfig)();
const bot = new telegraf_1.Telegraf(config_1.botConfig.token);
bot.use(async (ctx, next) => {
    const start = Date.now();
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const message = 'text' in ctx.message ? ctx.message.text : 'No text';
    logger_1.default.info(`Incoming message from ${username} (${userId}): ${message}`);
    await next();
    const ms = Date.now() - start;
    logger_1.default.info(`Response time: ${ms}ms`);
});
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId && conversationManager_1.default.hasActiveConversation(userId)) {
        await (0, profile_1.handleProfileConversation)(ctx);
        return;
    }
    await next();
});
bot.catch((err, ctx) => {
    logger_1.default.error(`Bot error for ${ctx.updateType}:`, err);
    ctx.reply('Sorry, something went wrong. Please try again later.').catch((replyError) => {
        logger_1.default.error('Error sending error message:', replyError);
    });
});
bot.start(start_1.startCommand);
bot.help(help_1.helpCommand);
bot.command('profile', profile_1.profileCommand);
bot.command('myprofile', myProfile_1.myProfileCommand);
bot.command('search', search_1.searchCommand);
bot.command('connect', connect_1.connectCommand);
bot.command('requests', requests_1.requestsCommand);
bot.command('accept', accept_1.acceptCommand);
bot.command('decline', decline_1.declineCommand);
bot.command('connections', connections_1.connectionsCommand);
bot.command('view', view_1.viewCommand);
bot.command('settings', settings_1.settingsCommand);
bot.on('text', async (ctx) => {
    const message = ctx.message.text;
    if (message.startsWith('/')) {
        await ctx.reply('Unknown command. Use /help to see available commands.', { parse_mode: 'Markdown' });
    }
    else {
        await ctx.reply('Please use commands to interact with the bot. Type /help to see available commands.', { parse_mode: 'Markdown' });
    }
});
setInterval(() => {
    conversationManager_1.default.cleanupExpiredConversations();
}, 5 * 60 * 1000);
process.once('SIGINT', () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    bot.stop('SIGTERM');
});
exports.default = bot;
//# sourceMappingURL=index.js.map