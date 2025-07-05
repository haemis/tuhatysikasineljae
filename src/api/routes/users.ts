import express from 'express';
import { UserModel } from '../../models/UserModel';
import { userCache } from '../../utils/cache';
import { securityManager } from '../../utils/security';
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
 * GET /api/v1/users/:id
 * Get user profile by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check cache first
    const cacheKey = `user:${userId}`;
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser) {
      return res.json({ user: cachedUser, cached: true });
    }

    const user = await UserModel.getProfile(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cache the result
    userCache.set(cacheKey, user, 5 * 60 * 1000); // 5 minutes

    res.json({ user, cached: false });
    
    // Track analytics
    analytics.track(userId, 'api_user_profile_viewed', { 
      viewer_ip: req.ip,
      user_agent: req.get('User-Agent')
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/users/:id
 * Update user profile
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const updates = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate input
    const validation = securityManager.validateInput(updates.name || '', 'text');
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Invalid input', details: validation.errors });
    }

    const updatedUser = await UserModel.updateProfile(userId, updates);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear cache
    userCache.delete(`user:${userId}`);

    res.json({ user: updatedUser, message: 'Profile updated successfully' });
    
    // Track analytics
    analytics.track(userId, 'api_user_profile_updated', { 
      updated_fields: Object.keys(updates),
      ip: req.ip
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/users/:id
 * Delete user profile
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const success = await UserModel.deactivateUser(userId);
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear cache
    userCache.delete(`user:${userId}`);

    res.json({ message: 'User profile deleted successfully' });
    
    // Track analytics
    analytics.track(userId, 'api_user_profile_deleted', { 
      ip: req.ip,
      user_agent: req.get('User-Agent')
    });
  } catch (error) {
    logger.error('Error deleting user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/users/:id/connections
 * Get user connections
 */
router.get('/:id/connections', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // This would require implementing getUserConnections in ConnectionModel
    // For now, return a placeholder
    res.json({ 
      connections: [],
      message: 'Connections endpoint - implementation pending'
    });
    
    // Track analytics
    analytics.track(userId, 'api_user_connections_viewed', { 
      viewer_ip: req.ip
    });
  } catch (error) {
    logger.error('Error getting user connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 