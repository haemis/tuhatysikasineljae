"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = __importDefault(require("./bot"));
const connection_1 = __importDefault(require("./database/connection"));
const logger_1 = __importDefault(require("./utils/logger"));
const config_1 = require("./config");
async function startBot() {
    try {
        (0, config_1.validateConfig)();
        logger_1.default.info('Configuration validated successfully');
        const dbConnected = await connection_1.default.testConnection();
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }
        logger_1.default.info('Database connection established');
        await bot_1.default.launch();
        logger_1.default.info('Telegram bot started successfully');
        const botInfo = await bot_1.default.telegram.getMe();
        logger_1.default.info(`Bot @${botInfo.username} is running`);
    }
    catch (error) {
        logger_1.default.error('Failed to start bot:', error);
        process.exit(1);
    }
}
process.once('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    await bot_1.default.stop('SIGINT');
    await connection_1.default.close();
    process.exit(0);
});
process.once('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    await bot_1.default.stop('SIGTERM');
    await connection_1.default.close();
    process.exit(0);
});
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
startBot().catch((error) => {
    logger_1.default.error('Application startup failed:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map