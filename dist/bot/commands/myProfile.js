"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.myProfileCommand = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const myProfileCommand = async (ctx) => {
    try {
        await ctx.reply('MyProfile command will be implemented in the next phase.');
        const userId = ctx.from?.id;
        const username = ctx.from?.username;
        logger_1.default.info(`MyProfile command executed for user ${userId} (${username})`);
    }
    catch (error) {
        logger_1.default.error('Error in myProfile command:', error);
        await ctx.reply('Sorry, something went wrong. Please try again later.');
    }
};
exports.myProfileCommand = myProfileCommand;
//# sourceMappingURL=myProfile.js.map