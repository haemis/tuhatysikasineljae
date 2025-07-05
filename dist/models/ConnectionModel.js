"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionModel = void 0;
const connection_1 = __importDefault(require("../database/connection"));
const UserModel_1 = require("./UserModel");
const logger_1 = __importDefault(require("../utils/logger"));
class ConnectionModel {
    static async createConnectionRequest(requesterId, receiverId) {
        const requesterExists = await UserModel_1.UserModel.userExists(requesterId);
        const receiverExists = await UserModel_1.UserModel.userExists(receiverId);
        if (!requesterExists || !receiverExists) {
            throw new Error('One or both users do not exist');
        }
        const existingConnection = await this.getConnection(requesterId, receiverId);
        if (existingConnection) {
            throw new Error('Connection already exists');
        }
        const pendingRequests = await this.getPendingRequestsCount(requesterId);
        if (pendingRequests >= 10) {
            throw new Error('Maximum pending requests limit reached (10)');
        }
        const query = `
      INSERT INTO connections (requester_id, receiver_id, status)
      VALUES ($1, $2, 'pending')
      RETURNING *
    `;
        try {
            const result = await connection_1.default.query(query, [requesterId, receiverId]);
            const connection = result.rows[0];
            connection.created_at = new Date(connection.created_at);
            connection.updated_at = new Date(connection.updated_at);
            logger_1.default.info(`Connection request created: ${requesterId} -> ${receiverId}`);
            return connection;
        }
        catch (error) {
            logger_1.default.error('Error creating connection request:', error);
            throw error;
        }
    }
    static async getConnection(user1Id, user2Id) {
        const query = `
      SELECT * FROM connections 
      WHERE (requester_id = $1 AND receiver_id = $2) 
         OR (requester_id = $2 AND receiver_id = $1)
    `;
        try {
            const result = await connection_1.default.query(query, [user1Id, user2Id]);
            if (result.rows.length === 0) {
                return null;
            }
            const connection = result.rows[0];
            connection.created_at = new Date(connection.created_at);
            connection.updated_at = new Date(connection.updated_at);
            return connection;
        }
        catch (error) {
            logger_1.default.error('Error getting connection:', error);
            throw error;
        }
    }
    static async updateConnectionStatus(connectionId, status) {
        const query = `
      UPDATE connections 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
        try {
            const result = await connection_1.default.query(query, [status, connectionId]);
            if (result.rows.length === 0) {
                return null;
            }
            const connection = result.rows[0];
            connection.created_at = new Date(connection.created_at);
            connection.updated_at = new Date(connection.updated_at);
            logger_1.default.info(`Connection status updated: ${connectionId} -> ${status}`);
            return connection;
        }
        catch (error) {
            logger_1.default.error('Error updating connection status:', error);
            throw error;
        }
    }
    static async acceptConnection(requesterId, receiverId) {
        const query = `
      UPDATE connections 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE requester_id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING *
    `;
        try {
            const result = await connection_1.default.query(query, [requesterId, receiverId]);
            if (result.rows.length === 0) {
                return null;
            }
            const connection = result.rows[0];
            connection.created_at = new Date(connection.created_at);
            connection.updated_at = new Date(connection.updated_at);
            logger_1.default.info(`Connection accepted: ${requesterId} -> ${receiverId}`);
            return connection;
        }
        catch (error) {
            logger_1.default.error('Error accepting connection:', error);
            throw error;
        }
    }
    static async declineConnection(requesterId, receiverId) {
        const query = `
      UPDATE connections 
      SET status = 'declined', updated_at = CURRENT_TIMESTAMP
      WHERE requester_id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING *
    `;
        try {
            const result = await connection_1.default.query(query, [requesterId, receiverId]);
            if (result.rows.length === 0) {
                return null;
            }
            const connection = result.rows[0];
            connection.created_at = new Date(connection.created_at);
            connection.updated_at = new Date(connection.updated_at);
            logger_1.default.info(`Connection declined: ${requesterId} -> ${receiverId}`);
            return connection;
        }
        catch (error) {
            logger_1.default.error('Error declining connection:', error);
            throw error;
        }
    }
    static async getPendingRequests(userId, limit = 10, offset = 0) {
        const query = `
      SELECT c.*, 
             u1.telegram_id as requester_telegram_id, u1.username as requester_username, 
             u1.name as requester_name, u1.title as requester_title,
             u2.telegram_id as receiver_telegram_id, u2.username as receiver_username,
             u2.name as receiver_name, u2.title as receiver_title
      FROM connections c
      JOIN users u1 ON c.requester_id = u1.telegram_id
      JOIN users u2 ON c.receiver_id = u2.telegram_id
      WHERE c.receiver_id = $1 AND c.status = 'pending'
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
        try {
            const result = await connection_1.default.query(query, [userId, limit, offset]);
            return result.rows.map((row) => ({
                id: row.id,
                requester: {
                    telegram_id: row.requester_telegram_id,
                    username: row.requester_username,
                    name: row.requester_name,
                    title: row.requester_title
                },
                receiver: {
                    telegram_id: row.receiver_telegram_id,
                    username: row.receiver_username,
                    name: row.receiver_name,
                    title: row.receiver_title
                },
                status: row.status,
                created_at: new Date(row.created_at)
            }));
        }
        catch (error) {
            logger_1.default.error('Error getting pending requests:', error);
            throw error;
        }
    }
    static async getUserConnections(userId, limit = 10, offset = 0) {
        const query = `
      SELECT c.*, 
             u1.telegram_id as user1_telegram_id, u1.username as user1_username, 
             u1.name as user1_name, u1.title as user1_title,
             u2.telegram_id as user2_telegram_id, u2.username as user2_username,
             u2.name as user2_name, u2.title as user2_title
      FROM connections c
      JOIN users u1 ON c.requester_id = u1.telegram_id
      JOIN users u2 ON c.receiver_id = u2.telegram_id
      WHERE (c.requester_id = $1 OR c.receiver_id = $1) AND c.status = 'accepted'
      ORDER BY c.updated_at DESC
      LIMIT $2 OFFSET $3
    `;
        try {
            const result = await connection_1.default.query(query, [userId, limit, offset]);
            return result.rows.map((row) => {
                const isRequester = row.requester_id === userId;
                return {
                    id: row.id,
                    requester: isRequester ? {
                        telegram_id: row.user1_telegram_id,
                        username: row.user1_username,
                        name: row.user1_name,
                        title: row.user1_title
                    } : {
                        telegram_id: row.user2_telegram_id,
                        username: row.user2_username,
                        name: row.user2_name,
                        title: row.user2_title
                    },
                    receiver: isRequester ? {
                        telegram_id: row.user2_telegram_id,
                        username: row.user2_username,
                        name: row.user2_name,
                        title: row.user2_title
                    } : {
                        telegram_id: row.user1_telegram_id,
                        username: row.user1_username,
                        name: row.user1_name,
                        title: row.user1_title
                    },
                    status: row.status,
                    created_at: new Date(row.created_at)
                };
            });
        }
        catch (error) {
            logger_1.default.error('Error getting user connections:', error);
            throw error;
        }
    }
    static async getMutualConnections(user1Id, user2Id) {
        const query = `
      SELECT c.*, 
             u.telegram_id, u.username, u.name, u.title
      FROM connections c
      JOIN users u ON (
        CASE 
          WHEN c.requester_id = $1 THEN c.receiver_id = u.telegram_id
          WHEN c.receiver_id = $1 THEN c.requester_id = u.telegram_id
        END
      )
      WHERE c.status = 'accepted'
      AND (
        (c.requester_id = $1 AND c.receiver_id IN (
          SELECT CASE 
            WHEN requester_id = $2 THEN receiver_id
            WHEN receiver_id = $2 THEN requester_id
          END
          FROM connections 
          WHERE (requester_id = $2 OR receiver_id = $2) AND status = 'accepted'
        ))
        OR
        (c.receiver_id = $1 AND c.requester_id IN (
          SELECT CASE 
            WHEN requester_id = $2 THEN receiver_id
            WHEN receiver_id = $2 THEN requester_id
          END
          FROM connections 
          WHERE (requester_id = $2 OR receiver_id = $2) AND status = 'accepted'
        ))
      )
    `;
        try {
            const result = await connection_1.default.query(query, [user1Id, user2Id]);
            return result.rows.map((row) => ({
                id: row.id,
                requester: {
                    telegram_id: row.telegram_id,
                    username: row.username,
                    name: row.name,
                    title: row.title
                },
                receiver: {
                    telegram_id: row.telegram_id,
                    username: row.username,
                    name: row.name,
                    title: row.title
                },
                status: row.status,
                created_at: new Date(row.created_at)
            }));
        }
        catch (error) {
            logger_1.default.error('Error getting mutual connections:', error);
            throw error;
        }
    }
    static async getPendingRequestsCount(userId) {
        const query = `
      SELECT COUNT(*) as count 
      FROM connections 
      WHERE requester_id = $1 AND status = 'pending'
    `;
        try {
            const result = await connection_1.default.query(query, [userId]);
            return parseInt(result.rows[0].count);
        }
        catch (error) {
            logger_1.default.error('Error getting pending requests count:', error);
            throw error;
        }
    }
    static async getConnectionsCount(userId) {
        const query = `
      SELECT COUNT(*) as count 
      FROM connections 
      WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'
    `;
        try {
            const result = await connection_1.default.query(query, [userId]);
            return parseInt(result.rows[0].count);
        }
        catch (error) {
            logger_1.default.error('Error getting connections count:', error);
            throw error;
        }
    }
    static async removeConnection(user1Id, user2Id) {
        const query = `
      DELETE FROM connections 
      WHERE (requester_id = $1 AND receiver_id = $2) 
         OR (requester_id = $2 AND receiver_id = $1)
    `;
        try {
            const result = await connection_1.default.query(query, [user1Id, user2Id]);
            const success = result.rowCount > 0;
            if (success) {
                logger_1.default.info(`Connection removed: ${user1Id} <-> ${user2Id}`);
            }
            return success;
        }
        catch (error) {
            logger_1.default.error('Error removing connection:', error);
            throw error;
        }
    }
}
exports.ConnectionModel = ConnectionModel;
//# sourceMappingURL=ConnectionModel.js.map