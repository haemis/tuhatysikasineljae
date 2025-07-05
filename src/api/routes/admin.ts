import express from 'express';
import { UserModel } from '../../models/UserModel';
import { ConnectionModel } from '../../models/ConnectionModel';
import { securityManager } from '../../utils/security';
import { complianceManager } from '../../utils/compliance';
import { performanceMonitor } from '../../utils/performance';
import { userCache, connectionCache, searchCache } from '../../utils/cache';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';

const router = express.Router();

// Middleware to validate admin API key
const validateAdminApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env['ADMIN_API_KEY']) {
    return res.status(401).json({ error: 'Invalid admin API key' });
  }
  
  next();
};

// Apply admin API key validation to all routes
router.use(validateAdminApiKey);

/**
 * GET /api/v1/admin/stats
 * Get system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await UserModel.getTotalUsers();
    const analyticsSummary = analytics.getSummary();
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    const securityStats = securityManager.getSecurityStats();
    const complianceReport = complianceManager.generateComplianceReport();

    res.json({
      users: {
        total: totalUsers,
        unique_active_24h: analyticsSummary.uniqueUsers,
        recent_activity_1h: analyticsSummary.recentActivity
      },
      performance: {
        total_operations: performanceSummary.totalOperations,
        average_response_time: performanceSummary.averageResponseTime,
        slow_operations: performanceSummary.slowOperations,
        memory_usage: performanceSummary.memoryUsage
      },
      security: {
        threat_level: securityStats.threatLevel,
        total_events: securityStats.totalEvents,
        blocked_users: securityStats.blockedUsers,
        suspicious_ips: securityStats.suspiciousIPs
      },
      compliance: {
        gdpr_compliance: complianceReport.gdprCompliance,
        privacy_requests: complianceReport.privacyRequests
      },
      cache: {
        user_cache: userCache.getStats(),
        connection_cache: connectionCache.getStats(),
        search_cache: searchCache.getStats()
      }
    });
  } catch (error) {
    logger.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/users
 * Get all users (paginated)
 */
router.get('/users', async (req, res) => {
  try {
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 50;
    const offset = (page - 1) * limit;

    // This would require implementing getAllUsers in UserModel
    // For now, return a placeholder
    res.json({
      users: [],
      pagination: {
        page,
        limit,
        offset,
        total: 0
      },
      message: 'Get all users endpoint - implementation pending'
    });
  } catch (error) {
    logger.error('Error getting all users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/security
 * Get security information
 */
router.get('/security', async (req, res) => {
  try {
    const securityStats = securityManager.getSecurityStats();
    const recentEvents = securityManager.getRecentEvents(undefined, 60); // Last hour

    res.json({
      stats: securityStats,
      recent_events: recentEvents.slice(-20), // Last 20 events
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting security info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/admin/maintenance
 * Run maintenance tasks
 */
router.post('/maintenance', async (req, res) => {
  try {
    const { tasks } = req.body;
    
    const results: any = {};

    if (tasks?.includes('cache_clear')) {
      userCache.clear();
      connectionCache.clear();
      searchCache.clear();
      results.cache_cleared = true;
    }

    if (tasks?.includes('retention_cleanup')) {
      const retentionResults = await complianceManager.runDataRetentionCleanup();
      results.retention_cleanup = retentionResults;
    }

    if (tasks?.includes('performance_cleanup')) {
      performanceMonitor.clearOldMetrics(24);
      results.performance_cleanup = true;
    }

    res.json({
      message: 'Maintenance tasks completed',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error running maintenance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/performance
 * Get performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    const recentMetrics = performanceMonitor.getRecentMetrics(5); // Last 5 minutes
    const recentQueries = performanceMonitor.getRecentQueries(5); // Last 5 minutes

    res.json({
      summary: performanceSummary,
      recent_metrics: recentMetrics.slice(-10),
      recent_queries: recentQueries.slice(-10),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/cache
 * Get cache statistics
 */
router.get('/cache', async (req, res) => {
  try {
    res.json({
      user_cache: userCache.getStats(),
      connection_cache: connectionCache.getStats(),
      search_cache: searchCache.getStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/admin/cache/clear
 * Clear all caches
 */
router.post('/cache/clear', async (req, res) => {
  try {
    userCache.clear();
    connectionCache.clear();
    searchCache.clear();

    res.json({
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing caches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 