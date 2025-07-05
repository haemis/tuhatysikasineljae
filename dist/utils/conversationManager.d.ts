export interface ConversationState {
    userId: number;
    step: string;
    data: Record<string, any>;
    createdAt: Date;
    lastActivity: Date;
}
export interface ConversationStep {
    name: string;
    message: string;
    validator?: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    nextStep?: string;
    isOptional?: boolean;
}
declare class ConversationManager {
    private conversations;
    private readonly TIMEOUT_MINUTES;
    startConversation(userId: number, initialStep: string, initialData?: Record<string, any>): void;
    getConversation(userId: number): ConversationState | null;
    updateConversation(userId: number, step: string, data?: Record<string, any>): void;
    endConversation(userId: number): void;
    hasActiveConversation(userId: number): boolean;
    getConversationData(userId: number): Record<string, any> | null;
    cleanupExpiredConversations(): void;
    getActiveConversations(): ConversationState[];
}
declare const _default: ConversationManager;
export default _default;
//# sourceMappingURL=conversationManager.d.ts.map