"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectCommand = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const connectCommand = async (ctx) => {
    try {
        await ctx.reply('Connect command will be implemented in the next phase.');
        const userId = ctx.from?.id;
        const username = ctx.from?.username;
        logger_1.default.info(`Connect command executed for user ${userId} (${username})`);
    }
    catch (error) {
        logger_1.default.error('Error in connect command:', error);
        await ctx.reply('Sorry, something went wrong. Please try again later.');
    }
};
exports.connectCommand = connectCommand;
//# sourceMappingURL=connect.js.map