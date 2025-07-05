"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptCommand = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const acceptCommand = async (ctx) => {
    try {
        await ctx.reply('Accept command will be implemented in the next phase.');
        const userId = ctx.from?.id;
        const username = ctx.from?.username;
        logger_1.default.info(`Accept command executed for user ${userId} (${username})`);
    }
    catch (error) {
        logger_1.default.error('Error in accept command:', error);
        await ctx.reply('Sorry, something went wrong. Please try again later.');
    }
};
exports.acceptCommand = acceptCommand;
//# sourceMappingURL=accept.js.map