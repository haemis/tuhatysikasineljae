import logger from './logger';

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
  validator?: (input: string) => { isValid: boolean; error?: string };
  nextStep?: string;
  isOptional?: boolean;
}

class ConversationManager {
  private conversations: Map<number, ConversationState> = new Map();
  private readonly TIMEOUT_MINUTES = 30; // 30 minutes timeout

  /**
   * Start a new conversation
   */
  public startConversation(userId: number, initialStep: string, initialData: Record<string, any> = {}): void {
    const conversation: ConversationState = {
      userId,
      step: initialStep,
      data: initialData,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.conversations.set(userId, conversation);
    logger.info(`Conversation started for user ${userId} at step: ${initialStep}`);
  }

  /**
   * Get current conversation state
   */
  public getConversation(userId: number): ConversationState | null {
    const conversation = this.conversations.get(userId);
    
    if (!conversation) {
      return null;
    }

    // Check if conversation has timed out
    const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
    const timeSinceLastActivity = Date.now() - conversation.lastActivity.getTime();
    
    if (timeSinceLastActivity > timeoutMs) {
      this.endConversation(userId);
      return null;
    }

    return conversation;
  }

  /**
   * Update conversation step and data
   */
  public updateConversation(userId: number, step: string, data: Record<string, any> = {}): void {
    const conversation = this.conversations.get(userId);
    
    if (!conversation) {
      throw new Error(`No active conversation found for user ${userId}`);
    }

    conversation.step = step;
    conversation.data = { ...conversation.data, ...data };
    conversation.lastActivity = new Date();

    this.conversations.set(userId, conversation);
    logger.info(`Conversation updated for user ${userId} to step: ${step}`);
  }

  /**
   * End conversation
   */
  public endConversation(userId: number): void {
    const conversation = this.conversations.get(userId);
    if (conversation) {
      this.conversations.delete(userId);
      logger.info(`Conversation ended for user ${userId}`);
    }
  }

  /**
   * Check if user has active conversation
   */
  public hasActiveConversation(userId: number): boolean {
    return this.getConversation(userId) !== null;
  }

  /**
   * Get conversation data
   */
  public getConversationData(userId: number): Record<string, any> | null {
    const conversation = this.getConversation(userId);
    return conversation ? conversation.data : null;
  }

  /**
   * Clean up expired conversations
   */
  public cleanupExpiredConversations(): void {
    const now = Date.now();
    const timeoutMs = this.TIMEOUT_MINUTES * 60 * 1000;
    
    for (const [userId, conversation] of this.conversations.entries()) {
      const timeSinceLastActivity = now - conversation.lastActivity.getTime();
      
      if (timeSinceLastActivity > timeoutMs) {
        this.conversations.delete(userId);
        logger.info(`Expired conversation cleaned up for user ${userId}`);
      }
    }
  }

  /**
   * Get all active conversations (for monitoring)
   */
  public getActiveConversations(): ConversationState[] {
    return Array.from(this.conversations.values());
  }
}

export default new ConversationManager(); 