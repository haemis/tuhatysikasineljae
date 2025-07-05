import express from 'express';
import { ConnectionModel } from '../../models/ConnectionModel';
import { connectionCache } from '../../utils/cache';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';

const router = express.Router();

// Middleware to validate API key
const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env['API_KEY']) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Apply API key validation to all routes
router.use(validateApiKey);

/**
 * GET /api/v1/connections
 * Get user connections
 */
router.get('/', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check cache first
    const cacheKey = `connections:${userId}`;
    const cachedConnections = connectionCache.get(cacheKey);
    
    if (cachedConnections) {
      return res.json({ connections: cachedConnections, cached: true });
    }

    const connections = await ConnectionModel.getUserConnections(userId);
    
    // Cache the result
    connectionCache.set(cacheKey, connections, 5 * 60 * 1000); // 5 minutes

    res.json({ connections, cached: false });
    
    // Track analytics
    analytics.track(userId, 'api_connections_viewed', { 
      viewer_ip: req.ip,
      connections_count: connections.length
    });
  } catch (error) {
    logger.error('Error getting connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/connections
 * Create connection request
 */
router.post('/', async (req, res) => {
  try {
    const { requesterId, receiverId } = req.body;
    
    if (!requesterId || !receiverId) {
      return res.status(400).json({ error: 'Requester ID and receiver ID are required' });
    }

    if (requesterId === receiverId) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }

    const connection = await ConnectionModel.createConnection(requesterId, receiverId);
    
    // Clear cache for both users
    connectionCache.delete(`connections:${requesterId}`);
    connectionCache.delete(`connections:${receiverId}`);

    res.status(201).json({ 
      connection, 
      message: 'Connection request sent successfully' 
    });
    
    // Track analytics
    analytics.track(requesterId, 'api_connection_request_sent', { 
      receiver_id: receiverId,
      ip: req.ip
    });
  } catch (error) {
    logger.error('Error creating connection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/connections/:id
 * Update connection status
 */
router.put('/:id', async (req, res) => {
  try {
    const connectionId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (accepted/declined) is required' });
    }

    const connection = await ConnectionModel.updateConnectionStatus(connectionId, status);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Clear cache for both users
    connectionCache.delete(`connections:${connection.requester_id}`);
    connectionCache.delete(`connections:${connection.receiver_id}`);

    res.json({ 
      connection, 
      message: `Connection ${status} successfully` 
    });
    
    // Track analytics
    analytics.track(connection.receiver_id, 'api_connection_status_updated', { 
      connection_id: connectionId,
      status,
      ip: req.ip
    });
  } catch (error) {
    logger.error('Error updating connection status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/connections/:id
 * Delete connection
 */
router.delete('/:id', async (req, res) => {
  try {
    const connectionId = req.params.id;
    
    const connection = await ConnectionModel.getConnectionById(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // This would require implementing deleteConnection in ConnectionModel
    // For now, return a placeholder
    res.json({ 
      message: 'Connection deletion endpoint - implementation pending',
      connection_id: connectionId
    });
    
    // Track analytics
    analytics.track(connection.requester_id, 'api_connection_deleted', { 
      connection_id: connectionId,
      ip: req.ip
    });
  } catch (error) {
    logger.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/connections/pending
 * Get pending connection requests
 */
router.get('/pending', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pendingRequests = await ConnectionModel.getPendingRequests(userId);
    
    res.json({ 
      pending_requests: pendingRequests,
      count: pendingRequests.length
    });
    
    // Track analytics
    analytics.track(userId, 'api_pending_requests_viewed', { 
      viewer_ip: req.ip,
      pending_count: pendingRequests.length
    });
  } catch (error) {
    logger.error('Error getting pending requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 