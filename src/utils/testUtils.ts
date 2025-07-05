import { Context } from 'telegraf';
import { UserModel } from '../models/UserModel';
import { ConnectionModel } from '../models/ConnectionModel';
import analytics from './analytics';
import rateLimiter from './rateLimiter';
import conversationManager from './conversationManager';

export interface MockContext {
  from?: {
    id: number;
    username?: string;
    first_name?: string;
  };
  message?: {
    text?: string;
  };
  reply: jest.Mock;
}

/**
 * Create a mock Telegram context for testing
 */
export function createMockContext(
  userId: number = 123456789,
  username: string = 'testuser',
  messageText?: string
): MockContext {
  return {
    from: {
      id: userId,
      username,
      first_name: 'Test'
    },
    ...(messageText && { message: { text: messageText } }),
    reply: jest.fn().mockResolvedValue(undefined)
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Clear analytics
    analytics.clearOldEvents(0); // Clear all events
    
    // Clear rate limiter
    rateLimiter.reset(123456789);
    
    // Clear conversations
    conversationManager.endConversation(123456789);
    
    // Note: In a real test environment, you'd also clean up database test data
    // This would require test-specific database operations
    
    console.log('Test data cleaned up');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Create test user profile
 */
export async function createTestUser(
  telegramId: number = 123456789,
  username: string = 'testuser'
): Promise<any> {
  const testProfile = {
    telegram_id: telegramId,
    username,
    name: 'Test User',
    title: 'Software Engineer',
    description: 'Test user for automated testing',
    github_username: 'testuser',
    linkedin_url: 'https://linkedin.com/in/testuser',
    website_url: 'https://testuser.com',
    world_id: 'test-world-id'
  };

  try {
    return await UserModel.createProfile(testProfile);
  } catch (error) {
    // If user already exists, return existing profile
    return await UserModel.getProfile(telegramId);
  }
}

/**
 * Create test connection
 */
export async function createTestConnection(
  requesterId: number = 123456789,
  receiverId: number = 987654321
): Promise<any> {
  try {
    return await ConnectionModel.createConnectionRequest(requesterId, receiverId);
  } catch (error) {
    // If connection already exists, return existing connection
    return await ConnectionModel.getConnection(requesterId, receiverId);
  }
}

/**
 * Validate command response
 */
export function validateCommandResponse(
  mockReply: jest.Mock,
  expectedPattern?: RegExp,
  expectedCallCount: number = 1
): void {
  expect(mockReply).toHaveBeenCalledTimes(expectedCallCount);
  
  if (expectedPattern) {
    const lastCall = mockReply.mock.calls[mockReply.mock.calls.length - 1];
    const response = lastCall[0];
    expect(response).toMatch(expectedPattern);
  }
}

/**
 * Test rate limiting
 */
export function testRateLimiting(userId: number, maxRequests: number = 20): boolean[] {
  const results: boolean[] = [];
  
  for (let i = 0; i < maxRequests + 5; i++) {
    results.push(rateLimiter.isRateLimited(userId));
  }
  
  return results;
}

/**
 * Generate test data
 */
export function generateTestData(count: number = 10): Array<{
  telegram_id: number;
  username: string;
  name: string;
  title: string;
  description: string;
}> {
  const testData = [];
  
  for (let i = 1; i <= count; i++) {
    testData.push({
      telegram_id: 100000000 + i,
      username: `testuser${i}`,
      name: `Test User ${i}`,
      title: `Software Engineer ${i}`,
      description: `Test user ${i} for automated testing`
    });
  }
  
  return testData;
}

/**
 * Mock database operations for testing
 */
export class MockDatabase {
  private users: Map<number, any> = new Map();
  private connections: Map<string, any> = new Map();

  async createUser(userData: any): Promise<any> {
    const user = { ...userData, id: Date.now() };
    this.users.set(userData.telegram_id, user);
    return user;
  }

  async getUser(telegramId: number): Promise<any> {
    return this.users.get(telegramId) || null;
  }

  async createConnection(connectionData: any): Promise<any> {
    const connection = { ...connectionData, id: Date.now().toString() };
    const key = `${connectionData.requester_id}-${connectionData.receiver_id}`;
    this.connections.set(key, connection);
    return connection;
  }

  async getConnection(user1Id: number, user2Id: number): Promise<any> {
    const key1 = `${user1Id}-${user2Id}`;
    const key2 = `${user2Id}-${user1Id}`;
    return this.connections.get(key1) || this.connections.get(key2) || null;
  }

  clear(): void {
    this.users.clear();
    this.connections.clear();
  }
} 