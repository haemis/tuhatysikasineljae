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

  /**
   * Advanced search with comprehensive filters
   */
  static async advancedSearchWithFilters(filters: {
    query?: string;
    industry?: string;
    skills?: string[];
    location?: string;
    experience?: string;
    availability?: string;
    company?: string;
    education?: string;
    languages?: string[];
    certifications?: string[];
    remote?: boolean;
    salary_range?: string;
    sort_by?: 'name' | 'title' | 'created_at' | 'connections' | 'relevance';
    sort_order?: 'asc' | 'desc';
  }, options: {
    limit?: number;
    offset?: number;
    excludeTelegramId?: number;
  } = {}): Promise<UserProfile[]> {
    try {
      const { limit = 10, offset = 0, excludeTelegramId } = options;
      
      let query = `
        SELECT u.*, 
               COUNT(c.id) as connection_count,
               CASE 
                 WHEN $1 IS NOT NULL THEN 
                   similarity(LOWER(u.name || ' ' || u.title || ' ' || u.description), LOWER($1))
                 ELSE 0 
               END as relevance_score
        FROM users u
        LEFT JOIN connections c ON (u.telegram_id = c.requester_id OR u.telegram_id = c.receiver_id) 
          AND c.status = 'accepted'
        WHERE u.is_active = true
      `;
      
      const params: any[] = [filters.query || null];
      let paramIndex = 2;

      if (excludeTelegramId) {
        query += ` AND u.telegram_id != $${paramIndex}`;
        params.push(excludeTelegramId);
        paramIndex++;
      }

      if (filters.industry) {
        query += ` AND LOWER(u.title) LIKE $${paramIndex}`;
        params.push(`%${filters.industry.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters.skills && filters.skills.length > 0) {
        const skillConditions = filters.skills.map((_, index) => 
          `LOWER(u.description) LIKE $${paramIndex + index}`
        ).join(' OR ');
        query += ` AND (${skillConditions})`;
        params.push(...filters.skills.map(skill => `%${skill.toLowerCase()}%`));
        paramIndex += filters.skills.length;
      }

      if (filters.location) {
        query += ` AND LOWER(u.description) LIKE $${paramIndex}`;
        params.push(`%${filters.location.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters.experience) {
        query += ` AND LOWER(u.title) LIKE $${paramIndex}`;
        params.push(`%${filters.experience.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters.availability) {
        query += ` AND LOWER(u.description) LIKE $${paramIndex}`;
        params.push(`%${filters.availability.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters.company) {
        query += ` AND LOWER(u.title) LIKE $${paramIndex}`;
        params.push(`%${filters.company.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters.education) {
        query += ` AND LOWER(u.description) LIKE $${paramIndex}`;
        params.push(`%${filters.education.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters.languages && filters.languages.length > 0) {
        const languageConditions = filters.languages.map((_, index) => 
          `LOWER(u.description) LIKE $${paramIndex + index}`
        ).join(' OR ');
        query += ` AND (${languageConditions})`;
        params.push(...filters.languages.map(lang => `%${lang.toLowerCase()}%`));
        paramIndex += filters.languages.length;
      }

      if (filters.certifications && filters.certifications.length > 0) {
        const certConditions = filters.certifications.map((_, index) => 
          `LOWER(u.description) LIKE $${paramIndex + index}`
        ).join(' OR ');
        query += ` AND (${certConditions})`;
        params.push(...filters.certifications.map(cert => `%${cert.toLowerCase()}%`));
        paramIndex += filters.certifications.length;
      }

      if (filters.remote !== undefined) {
        query += ` AND LOWER(u.description) LIKE $${paramIndex}`;
        params.push(filters.remote ? '%remote%' : '%office%');
        paramIndex++;
      }

      query += ` GROUP BY u.telegram_id`;

      // Sorting
      const sortBy = filters.sort_by || 'relevance';
      const sortOrder = filters.sort_order || 'desc';
      
      switch (sortBy) {
        case 'name':
          query += ` ORDER BY u.name ${sortOrder.toUpperCase()}`;
          break;
        case 'title':
          query += ` ORDER BY u.title ${sortOrder.toUpperCase()}`;
          break;
        case 'created_at':
          query += ` ORDER BY u.created_at ${sortOrder.toUpperCase()}`;
          break;
        case 'connections':
          query += ` ORDER BY connection_count ${sortOrder.toUpperCase()}`;
          break;
        case 'relevance':
        default:
          query += ` ORDER BY relevance_score ${sortOrder.toUpperCase()}, u.name ASC`;
          break;
      }

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows.map((row: any) => ({
        ...row,
        privacy_settings: JSON.parse(row.privacy_settings),
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        connection_count: parseInt(row.connection_count) || 0,
        relevance_score: parseFloat(row.relevance_score) || 0
      }));
    } catch (error) {
      logger.error('Error in advanced search with filters:', error);
      throw error;
    }
  }

  /**
   * Bulk export user profiles
   */
  static async bulkExportProfiles(userIds: number[]): Promise<{
    profiles: UserProfile[];
    exportDate: string;
    totalCount: number;
  }> {
    try {
      if (userIds.length === 0) {
        return { profiles: [], exportDate: new Date().toISOString(), totalCount: 0 };
      }

      const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');
      const query = `
        SELECT u.*, 
               COUNT(c.id) as connection_count
        FROM users u
        LEFT JOIN connections c ON (u.telegram_id = c.requester_id OR u.telegram_id = c.receiver_id) 
          AND c.status = 'accepted'
        WHERE u.telegram_id IN (${placeholders})
        GROUP BY u.telegram_id
        ORDER BY u.name
      `;

      const result = await db.query(query, userIds);
      
      return {
        profiles: result.rows.map((row: any) => ({
          ...row,
          privacy_settings: JSON.parse(row.privacy_settings),
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          connection_count: parseInt(row.connection_count) || 0
        })),
        exportDate: new Date().toISOString(),
        totalCount: result.rows.length
      };
    } catch (error) {
      logger.error('Error in bulk export profiles:', error);
      throw error;
    }
  }

  /**
   * Bulk import user profiles
   */
  static async bulkImportProfiles(profiles: Array<{
    telegram_id: number;
    username?: string;
    name: string;
    title: string;
    description: string;
    github_username?: string;
    linkedin_url?: string;
    website_url?: string;
    world_id?: string;
  }>): Promise<{
    imported: number;
    updated: number;
    failed: number;
    errors: Array<{ telegram_id: number; error: string }>;
  }> {
    const results = {
      imported: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ telegram_id: number; error: string }>
    };

    for (const profile of profiles) {
      try {
        const existingUser = await this.getProfile(profile.telegram_id);
        
        if (existingUser) {
          await this.updateProfile(profile.telegram_id, profile);
          results.updated++;
        } else {
          await this.createProfile(profile);
          results.imported++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          telegram_id: profile.telegram_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Get network insights for a user
   */
  static async getNetworkInsights(userId: number): Promise<{
    totalConnections: number;
    industryBreakdown: Array<{ industry: string; count: number }>;
    skillBreakdown: Array<{ skill: string; count: number }>;
    locationBreakdown: Array<{ location: string; count: number }>;
    connectionGrowth: Array<{ month: string; count: number }>;
    mutualConnections: Array<{ user_id: number; name: string; mutual_count: number }>;
  }> {
    try {
      // Get user's connections
      const connectionsQuery = `
        SELECT DISTINCT 
          CASE 
            WHEN c.requester_id = $1 THEN c.receiver_id 
            ELSE c.requester_id 
          END as connected_user_id
        FROM connections c
        WHERE (c.requester_id = $1 OR c.receiver_id = $1)
        AND c.status = 'accepted'
      `;
      
      const connectionsResult = await db.query(connectionsQuery, [userId]);
      const connectedUserIds = connectionsResult.rows.map((row: any) => row.connected_user_id);

      if (connectedUserIds.length === 0) {
        return {
          totalConnections: 0,
          industryBreakdown: [],
          skillBreakdown: [],
          locationBreakdown: [],
          connectionGrowth: [],
          mutualConnections: []
        };
      }

      // Get industry breakdown
      const industryQuery = `
        SELECT 
          CASE 
            WHEN LOWER(title) LIKE '%software%' OR LOWER(title) LIKE '%developer%' THEN 'Software Development'
            WHEN LOWER(title) LIKE '%design%' OR LOWER(title) LIKE '%ui%' OR LOWER(title) LIKE '%ux%' THEN 'Design'
            WHEN LOWER(title) LIKE '%marketing%' OR LOWER(title) LIKE '%growth%' THEN 'Marketing'
            WHEN LOWER(title) LIKE '%sales%' OR LOWER(title) LIKE '%business%' THEN 'Sales & Business'
            WHEN LOWER(title) LIKE '%product%' OR LOWER(title) LIKE '%manager%' THEN 'Product Management'
            ELSE 'Other'
          END as industry,
          COUNT(*) as count
        FROM users
        WHERE telegram_id = ANY($1)
        GROUP BY industry
        ORDER BY count DESC
      `;
      
      const industryResult = await db.query(industryQuery, [connectedUserIds]);

      // Get skill breakdown (simplified)
      const skillQuery = `
        SELECT 
          unnest(ARRAY['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'PHP']) as skill,
          COUNT(*) as count
        FROM users
        WHERE telegram_id = ANY($1)
        AND LOWER(description) LIKE '%' || LOWER(unnest(ARRAY['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'PHP'])) || '%'
      `;
      
      const skillResult = await db.query(skillQuery, [connectedUserIds]);

      // Get mutual connections
      const mutualQuery = `
        SELECT 
          u.telegram_id as user_id,
          u.name,
          COUNT(DISTINCT c2.id) as mutual_count
        FROM users u
        JOIN connections c1 ON (u.telegram_id = c1.requester_id OR u.telegram_id = c1.receiver_id)
        JOIN connections c2 ON (
          (c1.requester_id = c2.requester_id OR c1.requester_id = c2.receiver_id OR 
           c1.receiver_id = c2.requester_id OR c1.receiver_id = c2.receiver_id)
          AND c2.requester_id != $1 AND c2.receiver_id != $1
        )
        WHERE u.telegram_id = ANY($2)
        AND c1.status = 'accepted' AND c2.status = 'accepted'
        GROUP BY u.telegram_id, u.name
        ORDER BY mutual_count DESC
        LIMIT 10
      `;
      
      const mutualResult = await db.query(mutualQuery, [userId, connectedUserIds]);

      return {
        totalConnections: connectedUserIds.length,
        industryBreakdown: industryResult.rows,
        skillBreakdown: skillResult.rows,
        locationBreakdown: [], // Would need location data
        connectionGrowth: [], // Would need historical data
        mutualConnections: mutualResult.rows.map((row: any) => ({
          user_id: row.user_id,
          name: row.name,
          mutual_count: parseInt(row.mutual_count) || 0
        }))
      };
    } catch (error) {
      logger.error('Error getting network insights:', error);
      throw error;
    }
  }

  /**
   * Verify LinkedIn profile
   */
  static async verifyLinkedInProfile(userId: number, linkedinUrl: string): Promise<{
    verified: boolean;
    profileData?: any;
    error?: string;
  }> {
    try {
      // This would integrate with LinkedIn API
      // For now, return a mock verification
      const isValidUrl = linkedinUrl.includes('linkedin.com/in/');
      
      if (!isValidUrl) {
        return { verified: false, error: 'Invalid LinkedIn URL' };
      }

      // Mock verification - in real implementation, would call LinkedIn API
      const verified = Math.random() > 0.3; // 70% success rate for demo
      
      if (verified) {
        await this.updateProfile(userId, { linkedin_url: linkedinUrl });
        return {
          verified: true,
          profileData: {
            name: 'Mock LinkedIn Profile',
            headline: 'Software Engineer',
            company: 'Tech Company',
            location: 'San Francisco, CA'
          }
        };
      } else {
        return { verified: false, error: 'LinkedIn profile verification failed' };
      }
    } catch (error) {
      logger.error('Error verifying LinkedIn profile:', error);
      return { verified: false, error: 'Verification service unavailable' };
    }
  }

  /**
   * Verify GitHub profile
   */
  static async verifyGitHubProfile(userId: number, githubUsername: string): Promise<{
    verified: boolean;
    profileData?: any;
    error?: string;
  }> {
    try {
      // This would integrate with GitHub API
      // For now, return a mock verification
      const isValidUsername = /^[a-zA-Z0-9-]+$/.test(githubUsername);
      
      if (!isValidUsername) {
        return { verified: false, error: 'Invalid GitHub username' };
      }

      // Mock verification - in real implementation, would call GitHub API
      const verified = Math.random() > 0.2; // 80% success rate for demo
      
      if (verified) {
        await this.updateProfile(userId, { github_username: githubUsername });
        return {
          verified: true,
          profileData: {
            username: githubUsername,
            name: 'Mock GitHub User',
            bio: 'Software Developer',
            public_repos: Math.floor(Math.random() * 50) + 5,
            followers: Math.floor(Math.random() * 100) + 10
          }
        };
      } else {
        return { verified: false, error: 'GitHub profile not found' };
      }
    } catch (error) {
      logger.error('Error verifying GitHub profile:', error);
      return { verified: false, error: 'Verification service unavailable' };
    }
  }

  /**
   * Get integration status for a user
   */
  static async getIntegrationStatus(userId: number): Promise<{
    linkedin: { connected: boolean; verified: boolean; lastSync?: string };
    github: { connected: boolean; verified: boolean; lastSync?: string };
    calendar: { connected: boolean; lastSync?: string };
    email: { connected: boolean; lastSync?: string };
  }> {
    try {
      const user = await this.getProfile(userId);
      
      if (!user) {
        return {
          linkedin: { connected: false, verified: false },
          github: { connected: false, verified: false },
          calendar: { connected: false },
          email: { connected: false }
        };
      }
      
      return {
        linkedin: {
          connected: !!user.linkedin_url,
          verified: !!user.linkedin_url,
          ...(user.linkedin_url && { lastSync: new Date().toISOString() })
        },
        github: {
          connected: !!user.github_username,
          verified: !!user.github_username,
          ...(user.github_username && { lastSync: new Date().toISOString() })
        },
        calendar: {
          connected: false
        },
        email: {
          connected: false
        }
      };
    } catch (error) {
      logger.error('Error getting integration status:', error);
      throw error;
    }
  }
} 