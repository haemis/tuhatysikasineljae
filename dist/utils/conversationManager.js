"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./logger"));
class ConversationManager {
    constructor() {
        this.conversations = new Map();
        this.TIMEOUT_MINUTES = 30;
    }
    startConversation(userId, initialStep, initialData = {}) {
        const conversation = {
            userId,
            step: initialStep,
            data: initialData,
            createdAt: new Date(),
            lastActivity: new Date()
        };
        this.conversations.set(userId, conversation);
        logger_1.default.info(`Conversation started for user ${userId} at step: ${initialStep}`);
    }
    getConversation(userId) {
        const conversation = this.conversations.get(userId);
        if (!conversation) {
            return null;
        }
        const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
        const timeSinceLastActivity = Date.now() - conversation.lastActivity.getTime();
        if (timeSinceLastActivity > timeoutMs) {
            this.endConversation(userId);
            return null;
        }
        return conversation;
    }
    updateConversation(userId, step, data = {}) {
        const conversation = this.conversations.get(userId);
        if (!conversation) {
            throw new Error(`No active conversation found for user ${userId}`);
        }
        conversation.step = step;
        conversation.data = { ...conversation.data, ...data };
        conversation.lastActivity = new Date();
        this.conversations.set(userId, conversation);
        logger_1.default.info(`Conversation updated for user ${userId} to step: ${step}`);
    }
    endConversation(userId) {
        const conversation = this.conversations.get(userId);
        if (conversation) {
            this.conversations.delete(userId);
            logger_1.default.info(`Conversation ended for user ${userId}`);
        }
    }
    hasActiveConversation(userId) {
        return this.getConversation(userId) !== null;
    }
    getConversationData(userId) {
        const conversation = this.getConversation(userId);
        return conversation ? conversation.data : null;
    }
    cleanupExpiredConversations() {
        const now = Date.now();
        const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
        for (const [userId, conversation] of this.conversations.entries()) {
            const timeSinceLastActivity = now - conversation.lastActivity.getTime();
            if (timeSinceLastActivity > timeoutMs) {
                this.conversations.delete(userId);
                logger_1.default.info(`Expired conversation cleaned up for user ${userId}`);
            }
        }
    }
    getActiveConversations() {
        return Array.from(this.conversations.values());
    }
}
exports.default = new ConversationManager();
//# sourceMappingURL=conversationManager.js.map