import express from 'express';
import { UserModel } from '../../models/UserModel';
import { searchCache } from '../../utils/cache';
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
 * GET /api/v1/search
 * Search users
 */
router.get('/', async (req, res) => {
  try {
    const query = req.query['query'] as string;
    const limit = Number(req.query['limit']) || 10;
    const offset = Number(req.query['offset']) || 0;
    const userId = Number(req.query['userId']);
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check cache first
    const cacheKey = `search:${query}:${limit}:${offset}`;
    const cachedResults = searchCache.get(cacheKey);
    
    if (cachedResults) {
      return res.json({ results: cachedResults, cached: true });
    }

    const results = await UserModel.searchProfiles(query, {
      limit,
      offset,
      excludeTelegramId: userId
    });
    
    // Cache the result
    searchCache.set(cacheKey, results, 2 * 60 * 1000); // 2 minutes

    res.json({ 
      results, 
      cached: false,
      query,
      limit,
      offset,
      total: results.length
    });
    
    // Track analytics
    if (userId) {
      analytics.track(userId, 'api_search_performed', { 
        query,
        results_count: results.length,
        ip: req.ip
      });
    }
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/search/advanced
 * Advanced search with filters
 */
router.get('/advanced', async (req, res) => {
  try {
    const {
      industry,
      skills,
      location,
      experience,
      availability,
      limit = 10,
      offset = 0,
      userId
    } = req.query;

    const filters: any = {};
    if (industry) filters.industry = industry as string;
    if (skills) filters.skills = (skills as string).split(',');
    if (location) filters.location = location as string;
    if (experience) filters.experience = experience as string;
    if (availability) filters.availability = availability as string;

    const results = await UserModel.advancedSearch(filters, {
      limit: Number(limit),
      offset: Number(offset),
      excludeTelegramId: userId ? Number(userId) : undefined
    });

    res.json({ 
      results,
      filters,
      limit: Number(limit),
      offset: Number(offset),
      total: results.length
    });
    
    // Track analytics
    if (userId) {
      analytics.track(Number(userId), 'api_advanced_search_performed', { 
        filters,
        results_count: results.length,
        ip: req.ip
      });
    }
  } catch (error) {
    logger.error('Error in advanced search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/search/recommendations
 * Get recommendations for user
 */
router.get('/recommendations', async (req, res) => {
  try {
    const userId = Number(req.query['userId']);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // This would require implementing recommendations logic
    // For now, return a placeholder
    res.json({ 
      recommendations: [],
      message: 'Recommendations endpoint - implementation pending',
      user_id: userId
    });
    
    // Track analytics
    analytics.track(userId, 'api_recommendations_requested', { 
      ip: req.ip
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 