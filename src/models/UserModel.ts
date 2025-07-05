import db from '../database/connection';
import { UserProfile, PrivacySettings, ProfileValidation } from '../types';
import logger from '../utils/logger';

export class UserModel {
  /**
   * Create a new user profile
   */
  static async createProfile(profile: ProfileValidation & { telegram_id: number; username?: string }): Promise<UserProfile> {
    const defaultPrivacySettings: PrivacySettings = {
      profile_visible: true,
      show_github: true,
      show_linkedin: true,
      show_website: true,
      show_world_id: true,
      allow_search: true,
      allow_connections: true
    };

    const query = `
      INSERT INTO users (
        telegram_id, username, name, title, description, 
        github_username, linkedin_url, website_url, world_id, 
        privacy_settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      profile.telegram_id,
      profile.username,
      profile.name,
      profile.title,
      profile.description,
      profile.github_username,
      profile.linkedin_url,
      profile.website_url,
      profile.world_id,
      JSON.stringify(defaultPrivacySettings)
    ];

    try {
      const result = await db.query(query, values);
      const user = result.rows[0];
      
      // Parse privacy settings from JSON
      user.privacy_settings = JSON.parse(user.privacy_settings);
      user.created_at = new Date(user.created_at);
      user.updated_at = new Date(user.updated_at);

      logger.info(`User profile created for telegram_id: ${profile.telegram_id}`);
      return user;
    } catch (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by telegram ID
   */
  static async getProfile(telegramId: number): Promise<UserProfile | null> {
    const query = 'SELECT * FROM users WHERE telegram_id = $1 AND is_active = true';
    
    try {
      const result = await db.query(query, [telegramId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      user.privacy_settings = JSON.parse(user.privacy_settings);
      user.created_at = new Date(user.created_at);
      user.updated_at = new Date(user.updated_at);

      return user;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(telegramId: number, updates: Partial<ProfileValidation>): Promise<UserProfile | null> {
    const allowedFields = ['name', 'title', 'description', 'github_username', 'linkedin_url', 'website_url', 'world_id'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(telegramId);
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = $${paramIndex} AND is_active = true
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      user.privacy_settings = JSON.parse(user.privacy_settings);
      user.created_at = new Date(user.created_at);
      user.updated_at = new Date(user.updated_at);

      logger.info(`User profile updated for telegram_id: ${telegramId}`);
      return user;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(telegramId: number, privacySettings: Partial<PrivacySettings>): Promise<UserProfile | null> {
    const query = `
      UPDATE users 
      SET privacy_settings = privacy_settings || $1::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = $2 AND is_active = true
      RETURNING *
    `;

    try {
      const result = await db.query(query, [JSON.stringify(privacySettings), telegramId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      user.privacy_settings = JSON.parse(user.privacy_settings);
      user.created_at = new Date(user.created_at);
      user.updated_at = new Date(user.updated_at);

      logger.info(`Privacy settings updated for telegram_id: ${telegramId}`);
      return user;
    } catch (error) {
      logger.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  /**
   * Search users by query
   */
  static async searchUsers(query: string, limit: number = 10, offset: number = 0): Promise<UserProfile[]> {
    const searchQuery = `
      SELECT * FROM users 
      WHERE is_active = true 
      AND (
        to_tsvector('english', name) @@ plainto_tsquery('english', $1) OR
        to_tsvector('english', title) @@ plainto_tsquery('english', $1) OR
        to_tsvector('english', description) @@ plainto_tsquery('english', $1) OR
        name ILIKE $2 OR
        title ILIKE $2 OR
        description ILIKE $2
      )
      ORDER BY 
        ts_rank(to_tsvector('english', name), plainto_tsquery('english', $1)) +
        ts_rank(to_tsvector('english', title), plainto_tsquery('english', $1)) +
        ts_rank(to_tsvector('english', description), plainto_tsquery('english', $1)) DESC
      LIMIT $3 OFFSET $4
    `;

    const searchTerm = `%${query}%`;

    try {
      const result = await db.query(searchQuery, [query, searchTerm, limit, offset]);
      
      return result.rows.map((row: any) => ({
        ...row,
        privacy_settings: JSON.parse(row.privacy_settings),
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  static async getByUsername(username: string): Promise<UserProfile | null> {
    const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    
    try {
      const result = await db.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      user.privacy_settings = JSON.parse(user.privacy_settings);
      user.created_at = new Date(user.created_at);
      user.updated_at = new Date(user.updated_at);

      return user;
    } catch (error) {
      logger.error('Error getting user by username:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(telegramId: number): Promise<boolean> {
    const query = 'UPDATE users SET is_active = false WHERE telegram_id = $1';
    
    try {
      const result = await db.query(query, [telegramId]);
      const success = result.rowCount > 0;
      
      if (success) {
        logger.info(`User deactivated: ${telegramId}`);
      }
      
      return success;
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Check if user exists
   */
  static async userExists(telegramId: number): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE telegram_id = $1 AND is_active = true';
    
    try {
      const result = await db.query(query, [telegramId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking if user exists:', error);
      throw error;
    }
  }

  /**
   * Get total user count
   */
  static async getTotalUsers(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users WHERE is_active = true';
    
    try {
      const result = await db.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting total user count:', error);
      throw error;
    }
  }

  /**
   * Search user profiles by query, respecting privacy settings
   */
  static async searchProfiles(query: string, options: { limit?: number; offset?: number; excludeTelegramId?: number } = {}): Promise<UserProfile[]> {
    const { limit = 10, offset = 0, excludeTelegramId } = options;
    const searchQuery = `
      SELECT * FROM users 
      WHERE is_active = true 
        AND (privacy_settings->>'allow_search')::boolean = true
        ${excludeTelegramId ? 'AND telegram_id != $5' : ''}
        AND (
          to_tsvector('english', name) @@ plainto_tsquery('english', $1) OR
          to_tsvector('english', title) @@ plainto_tsquery('english', $1) OR
          to_tsvector('english', description) @@ plainto_tsquery('english', $1) OR
          name ILIKE $2 OR
          title ILIKE $2 OR
          description ILIKE $2
        )
      ORDER BY 
        ts_rank(to_tsvector('english', name), plainto_tsquery('english', $1)) +
        ts_rank(to_tsvector('english', title), plainto_tsquery('english', $1)) +
        ts_rank(to_tsvector('english', description), plainto_tsquery('english', $1)) DESC
      LIMIT $3 OFFSET $4
    `;
    const searchTerm = `%${query}%`;
    const values = [query, searchTerm, limit, offset];
    if (excludeTelegramId) values.push(excludeTelegramId);
    try {
      const result = await db.query(searchQuery, values);
      return result.rows.map((row: any) => ({
        ...row,
        privacy_settings: JSON.parse(row.privacy_settings),
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Error searching profiles:', error);
      throw error;
    }
  }
} 