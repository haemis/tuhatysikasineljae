import db from '../database/connection';
import { Connection, ConnectionStatus, ConnectionRequest } from '../types';
import { UserModel } from './UserModel';
import logger from '../utils/logger';

export class ConnectionModel {
  /**
   * Create a connection request
   */
  static async createConnectionRequest(requesterId: number, receiverId: number): Promise<Connection> {
    // Check if both users exist
    const requesterExists = await UserModel.userExists(requesterId);
    const receiverExists = await UserModel.userExists(receiverId);

    if (!requesterExists || !receiverExists) {
      throw new Error('One or both users do not exist');
    }

    // Check receiver's privacy settings
    const receiverProfile = await UserModel.getProfile(receiverId);
    if (!receiverProfile || !receiverProfile.privacy_settings.allow_connections) {
      throw new Error('This user is not accepting new connections.');
    }

    // Check if connection already exists
    const existingConnection = await this.getConnection(requesterId, receiverId);
    if (existingConnection) {
      throw new Error('Connection already exists');
    }

    // Check pending requests limit (max 10)
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
      const result = await db.query(query, [requesterId, receiverId]);
      const connection = result.rows[0];
      
      connection.created_at = new Date(connection.created_at);
      connection.updated_at = new Date(connection.updated_at);

      logger.info(`Connection request created: ${requesterId} -> ${receiverId}`);
      return connection;
    } catch (error) {
      logger.error('Error creating connection request:', error);
      throw error;
    }
  }

  /**
   * Get connection between two users
   */
  static async getConnection(user1Id: number, user2Id: number): Promise<Connection | null> {
    const query = `
      SELECT * FROM connections 
      WHERE (requester_id = $1 AND receiver_id = $2) 
         OR (requester_id = $2 AND receiver_id = $1)
    `;

    try {
      const result = await db.query(query, [user1Id, user2Id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const connection = result.rows[0];
      connection.created_at = new Date(connection.created_at);
      connection.updated_at = new Date(connection.updated_at);

      return connection;
    } catch (error) {
      logger.error('Error getting connection:', error);
      throw error;
    }
  }

  /**
   * Update connection status
   */
  static async updateConnectionStatus(connectionId: string, status: ConnectionStatus): Promise<Connection | null> {
    const query = `
      UPDATE connections 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [status, connectionId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const connection = result.rows[0];
      connection.created_at = new Date(connection.created_at);
      connection.updated_at = new Date(connection.updated_at);

      logger.info(`Connection status updated: ${connectionId} -> ${status}`);
      return connection;
    } catch (error) {
      logger.error('Error updating connection status:', error);
      throw error;
    }
  }

  /**
   * Accept connection request
   */
  static async acceptConnection(requesterId: number, receiverId: number): Promise<Connection | null> {
    const query = `
      UPDATE connections 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE requester_id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING *
    `;

    try {
      const result = await db.query(query, [requesterId, receiverId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const connection = result.rows[0];
      connection.created_at = new Date(connection.created_at);
      connection.updated_at = new Date(connection.updated_at);

      logger.info(`Connection accepted: ${requesterId} -> ${receiverId}`);
      return connection;
    } catch (error) {
      logger.error('Error accepting connection:', error);
      throw error;
    }
  }

  /**
   * Decline connection request
   */
  static async declineConnection(requesterId: number, receiverId: number): Promise<Connection | null> {
    const query = `
      UPDATE connections 
      SET status = 'declined', updated_at = CURRENT_TIMESTAMP
      WHERE requester_id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING *
    `;

    try {
      const result = await db.query(query, [requesterId, receiverId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const connection = result.rows[0];
      connection.created_at = new Date(connection.created_at);
      connection.updated_at = new Date(connection.updated_at);

      logger.info(`Connection declined: ${requesterId} -> ${receiverId}`);
      return connection;
    } catch (error) {
      logger.error('Error declining connection:', error);
      throw error;
    }
  }

  /**
   * Get pending connection requests for a user
   */
  static async getPendingRequests(userId: number, limit: number = 10, offset: number = 0): Promise<ConnectionRequest[]> {
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
      const result = await db.query(query, [userId, limit, offset]);
      
      return result.rows.map((row: any) => ({
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
    } catch (error) {
      logger.error('Error getting pending requests:', error);
      throw error;
    }
  }

  /**
   * Get user's connections (accepted)
   */
  static async getUserConnections(userId: number, limit: number = 10, offset: number = 0): Promise<ConnectionRequest[]> {
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
      const result = await db.query(query, [userId, limit, offset]);
      
      return result.rows.map((row: any) => {
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
    } catch (error) {
      logger.error('Error getting user connections:', error);
      throw error;
    }
  }

  /**
   * Get mutual connections between two users
   */
  static async getMutualConnections(user1Id: number, user2Id: number): Promise<ConnectionRequest[]> {
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
      const result = await db.query(query, [user1Id, user2Id]);
      
      return result.rows.map((row: any) => ({
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
    } catch (error) {
      logger.error('Error getting mutual connections:', error);
      throw error;
    }
  }

  /**
   * Get count of pending requests for a user
   */
  static async getPendingRequestsCount(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM connections 
      WHERE requester_id = $1 AND status = 'pending'
    `;

    try {
      const result = await db.query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting pending requests count:', error);
      throw error;
    }
  }

  /**
   * Get count of user's connections
   */
  static async getConnectionsCount(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM connections 
      WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'
    `;

    try {
      const result = await db.query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting connections count:', error);
      throw error;
    }
  }

  /**
   * Remove connection
   */
  static async removeConnection(user1Id: number, user2Id: number): Promise<boolean> {
    const query = `
      DELETE FROM connections 
      WHERE (requester_id = $1 AND receiver_id = $2) 
         OR (requester_id = $2 AND receiver_id = $1)
    `;

    try {
      const result = await db.query(query, [user1Id, user2Id]);
      const success = result.rowCount > 0;
      
      if (success) {
        logger.info(`Connection removed: ${user1Id} <-> ${user2Id}`);
      }
      
      return success;
    } catch (error) {
      logger.error('Error removing connection:', error);
      throw error;
    }
  }
} 