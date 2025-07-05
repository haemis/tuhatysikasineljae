import express from 'express';
import { performanceMonitor } from '../../utils/performance';
import { userCache, connectionCache, searchCache } from '../../utils/cache';
import { databasePool } from '../../database/pool';
import logger from '../../utils/logger';

const router = express.Router();

/**
 * GET /api/v1/health
 * System health check
 */
router.get('/', async (req, res) => {
  try {
    const dbHealth = await databasePool.isHealthy();
    const memoryUsage = performanceMonitor.getMemoryUsage();
    const uptime = process.uptime();

    const healthStatus = {
      status: dbHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        memory: memoryUsage.heapUsed < 500 ? 'healthy' : 'warning', // Warning if > 500MB
        cache: 'healthy'
      },
      memory: memoryUsage,
      version: process.env['npm_package_version'] || '1.0.0'
    };

    const statusCode = dbHealth ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /api/v1/health/performance
 * Performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    const recentMetrics = performanceMonitor.getRecentMetrics(5); // Last 5 minutes

    res.json({
      summary: performanceSummary,
      recent_activity: recentMetrics.slice(-10),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Performance check failed:', error);
    res.status(500).json({ error: 'Performance check failed' });
  }
});

/**
 * GET /api/v1/health/cache
 * Cache statistics
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
    logger.error('Cache check failed:', error);
    res.status(500).json({ error: 'Cache check failed' });
  }
});

/**
 * GET /api/v1/health/database
 * Database health check
 */
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await databasePool.isHealthy();
    const poolInfo = databasePool.getPoolInfo();

    res.json({
      status: dbHealth ? 'healthy' : 'unhealthy',
      pool_info: poolInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/health/memory
 * Memory usage information
 */
router.get('/memory', async (req, res) => {
  try {
    const memoryUsage = performanceMonitor.getMemoryUsage();
    const uptime = process.uptime();

    res.json({
      memory: memoryUsage,
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Memory check failed:', error);
    res.status(500).json({ error: 'Memory check failed' });
  }
});

export default router; 