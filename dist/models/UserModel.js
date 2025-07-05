"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const connection_1 = __importDefault(require("../database/connection"));
const logger_1 = __importDefault(require("../utils/logger"));
class UserModel {
    static async createProfile(profile) {
        const defaultPrivacySettings = {
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
            const result = await connection_1.default.query(query, values);
            const user = result.rows[0];
            user.privacy_settings = JSON.parse(user.privacy_settings);
            user.created_at = new Date(user.created_at);
            user.updated_at = new Date(user.updated_at);
            logger_1.default.info(`User profile created for telegram_id: ${profile.telegram_id}`);
            return user;
        }
        catch (error) {
            logger_1.default.error('Error creating user profile:', error);
            throw error;
        }
    }
    static async getProfile(telegramId) {
        const query = 'SELECT * FROM users WHERE telegram_id = $1 AND is_active = true';
        try {
            const result = await connection_1.default.query(query, [telegramId]);
            if (result.rows.length === 0) {
                return null;
            }
            const user = result.rows[0];
            user.privacy_settings = JSON.parse(user.privacy_settings);
            user.created_at = new Date(user.created_at);
            user.updated_at = new Date(user.updated_at);
            return user;
        }
        catch (error) {
            logger_1.default.error('Error getting user profile:', error);
            throw error;
        }
    }
    static async updateProfile(telegramId, updates) {
        const allowedFields = ['name', 'title', 'description', 'github_username', 'linkedin_url', 'website_url', 'world_id'];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
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
            const result = await connection_1.default.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            const user = result.rows[0];
            user.privacy_settings = JSON.parse(user.privacy_settings);
            user.created_at = new Date(user.created_at);
            user.updated_at = new Date(user.updated_at);
            logger_1.default.info(`User profile updated for telegram_id: ${telegramId}`);
            return user;
        }
        catch (error) {
            logger_1.default.error('Error updating user profile:', error);
            throw error;
        }
    }
    static async updatePrivacySettings(telegramId, privacySettings) {
        const query = `
      UPDATE users 
      SET privacy_settings = privacy_settings || $1::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = $2 AND is_active = true
      RETURNING *
    `;
        try {
            const result = await connection_1.default.query(query, [JSON.stringify(privacySettings), telegramId]);
            if (result.rows.length === 0) {
                return null;
            }
            const user = result.rows[0];
            user.privacy_settings = JSON.parse(user.privacy_settings);
            user.created_at = new Date(user.created_at);
            user.updated_at = new Date(user.updated_at);
            logger_1.default.info(`Privacy settings updated for telegram_id: ${telegramId}`);
            return user;
        }
        catch (error) {
            logger_1.default.error('Error updating privacy settings:', error);
            throw error;
        }
    }
    static async searchUsers(query, limit = 10, offset = 0) {
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
            const result = await connection_1.default.query(searchQuery, [query, searchTerm, limit, offset]);
            return result.rows.map((row) => ({
                ...row,
                privacy_settings: JSON.parse(row.privacy_settings),
                created_at: new Date(row.created_at),
                updated_at: new Date(row.updated_at)
            }));
        }
        catch (error) {
            logger_1.default.error('Error searching users:', error);
            throw error;
        }
    }
    static async getByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
        try {
            const result = await connection_1.default.query(query, [username]);
            if (result.rows.length === 0) {
                return null;
            }
            const user = result.rows[0];
            user.privacy_settings = JSON.parse(user.privacy_settings);
            user.created_at = new Date(user.created_at);
            user.updated_at = new Date(user.updated_at);
            return user;
        }
        catch (error) {
            logger_1.default.error('Error getting user by username:', error);
            throw error;
        }
    }
    static async deactivateUser(telegramId) {
        const query = 'UPDATE users SET is_active = false WHERE telegram_id = $1';
        try {
            const result = await connection_1.default.query(query, [telegramId]);
            const success = result.rowCount > 0;
            if (success) {
                logger_1.default.info(`User deactivated: ${telegramId}`);
            }
            return success;
        }
        catch (error) {
            logger_1.default.error('Error deactivating user:', error);
            throw error;
        }
    }
    static async userExists(telegramId) {
        const query = 'SELECT 1 FROM users WHERE telegram_id = $1 AND is_active = true';
        try {
            const result = await connection_1.default.query(query, [telegramId]);
            return result.rows.length > 0;
        }
        catch (error) {
            logger_1.default.error('Error checking if user exists:', error);
            throw error;
        }
    }
    static async getTotalUsers() {
        const query = 'SELECT COUNT(*) as count FROM users WHERE is_active = true';
        try {
            const result = await connection_1.default.query(query);
            return parseInt(result.rows[0].count);
        }
        catch (error) {
            logger_1.default.error('Error getting total user count:', error);
            throw error;
        }
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=UserModel.js.map