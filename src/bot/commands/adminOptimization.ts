import { Context } from 'telegraf';
import { systemOptimizer } from '../../utils/optimization';
import { performanceMonitor } from '../../utils/performance';
import { userCache, connectionCache, searchCache } from '../../utils/cache';
import analytics from '../../utils/analytics';
import logger from '../../utils/logger';

// Admin user IDs (should be moved to environment variables in production)
const ADMIN_USER_IDS = [123456789]; // Replace with actual admin user IDs

/**
 * Check if user is admin
 */
function isAdmin(userId: number): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * Admin command for system optimization analysis
 */
export const adminOptimizationCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    await ctx.reply('🔧 Running system optimization analysis... This may take a moment.');

    const analysis = await systemOptimizer.analyzeSystemPerformance();

    let response = `🔧 *System Optimization Analysis*\n\n`;
    response += `*Overall Score:* ${analysis.score}/100\n\n`;

    response += `*Database Performance:*\n`;
    response += `• Total Queries: ${analysis.metrics.databaseQueries.total}\n`;
    response += `• Slow Queries: ${analysis.metrics.databaseQueries.slow}\n`;
    response += `• Average Time: ${analysis.metrics.databaseQueries.averageTime}ms\n\n`;

    response += `*Cache Performance:*\n`;
    response += `• Hit Rate: ${Math.round(analysis.metrics.cachePerformance.hitRate * 100)}%\n`;
    response += `• Total Requests: ${analysis.metrics.cachePerformance.totalRequests}\n\n`;

    response += `*Memory Usage:*\n`;
    response += `• Heap Used: ${analysis.metrics.memoryUsage.heapUsed}MB\n`;
    response += `• Heap Total: ${analysis.metrics.memoryUsage.heapTotal}MB\n`;
    response += `• External: ${analysis.metrics.memoryUsage.external}MB\n\n`;

    response += `*Search Performance:*\n`;
    response += `• Average Response: ${analysis.metrics.searchPerformance.averageResponseTime}ms\n`;
    response += `• Total Searches: ${analysis.metrics.searchPerformance.totalSearches}\n`;
    response += `• Cache Hits: ${analysis.metrics.searchPerformance.cacheHits}\n\n`;

    if (analysis.recommendations.general.length > 0) {
      response += `*Recommendations:*\n`;
      analysis.recommendations.general.slice(0, 5).forEach(rec => {
        response += `• ${rec}\n`;
      });
    }

    response += `\n*Commands:*\n`;
    response += `/adminoptimize db - Optimize database\n`;
    response += `/adminoptimize cache - Optimize cache\n`;
    response += `/adminoptimize memory - Optimize memory\n`;
    response += `/adminoptimize trends - View optimization trends`;

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_optimization_analysis_run', { score: analysis.score });
  } catch (error) {
    logger.error('Error in admin optimization command:', error);
    await ctx.reply('Error running optimization analysis.');
  }
};

/**
 * Admin command for database optimization
 */
export const adminOptimizeDatabaseCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    await ctx.reply('🗄️ Optimizing database queries...');

    const optimization = await systemOptimizer.optimizeDatabaseQueries();

    let response = `🗄️ *Database Optimization Complete*\n\n`;
    response += `*Results:*\n`;
    response += `• Queries Analyzed: ${optimization.optimized}\n\n`;

    if (optimization.recommendations.length > 0) {
      response += `*Recommendations:*\n`;
      optimization.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
    } else {
      response += `✅ No optimization needed - database performance is good!`;
    }

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_database_optimization_run', { 
      optimized_queries: optimization.optimized 
    });
  } catch (error) {
    logger.error('Error in admin database optimization command:', error);
    await ctx.reply('Error optimizing database.');
  }
};

/**
 * Admin command for cache optimization
 */
export const adminOptimizeCacheCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    await ctx.reply('💾 Optimizing cache performance...');

    const optimization = await systemOptimizer.optimizeCachePerformance();

    let response = `💾 *Cache Optimization Complete*\n\n`;
    response += `*Results:*\n`;
    response += `• Optimizations Applied: ${optimization.optimized ? 'Yes' : 'No'}\n\n`;

    if (optimization.improvements.length > 0) {
      response += `*Improvements:*\n`;
      optimization.improvements.forEach(imp => {
        response += `• ${imp}\n`;
      });
    } else {
      response += `✅ Cache performance is optimal!`;
    }

    // Show current cache stats
    const userCacheStats = userCache.getStats();
    const connectionCacheStats = connectionCache.getStats();
    const searchCacheStats = searchCache.getStats();

    response += `\n*Current Cache Stats:*\n`;
    response += `• User Cache: ${userCacheStats.size} entries, ${Math.round(userCacheStats.hitRate)}% hit rate\n`;
    response += `• Connection Cache: ${connectionCacheStats.size} entries, ${Math.round(connectionCacheStats.hitRate)}% hit rate\n`;
    response += `• Search Cache: ${searchCacheStats.size} entries, ${Math.round(searchCacheStats.hitRate)}% hit rate`;

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_cache_optimization_run', { 
      optimizations_applied: optimization.optimized 
    });
  } catch (error) {
    logger.error('Error in admin cache optimization command:', error);
    await ctx.reply('Error optimizing cache.');
  }
};

/**
 * Admin command for memory optimization
 */
export const adminOptimizeMemoryCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    await ctx.reply('🧠 Optimizing memory usage...');

    const optimization = await systemOptimizer.optimizeMemoryUsage();

    let response = `🧠 *Memory Optimization Complete*\n\n`;
    response += `*Results:*\n`;
    response += `• Memory Freed: ${Math.round(optimization.freed / 1024 / 1024)}MB\n\n`;

    if (optimization.recommendations.length > 0) {
      response += `*Recommendations:*\n`;
      optimization.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
    } else {
      response += `✅ Memory usage is optimal!`;
    }

    // Show current memory usage
    const memoryUsage = performanceMonitor.getMemoryUsage();
    response += `\n*Current Memory Usage:*\n`;
    response += `• Heap Used: ${memoryUsage.heapUsed}MB\n`;
    response += `• Heap Total: ${memoryUsage.heapTotal}MB\n`;
    response += `• External: ${memoryUsage.external}MB\n`;
    response += `• RSS: ${memoryUsage.rss}MB`;

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_memory_optimization_run', { 
      memory_freed_mb: Math.round(optimization.freed / 1024 / 1024) 
    });
  } catch (error) {
    logger.error('Error in admin memory optimization command:', error);
    await ctx.reply('Error optimizing memory.');
  }
};

/**
 * Admin command for optimization trends
 */
export const adminOptimizationTrendsCommand = async (ctx: Context): Promise<void> => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply('Access denied. Admin privileges required.');
      return;
    }

    const trends = systemOptimizer.getOptimizationTrends();
    const history = systemOptimizer.getOptimizationHistory();

    let response = `📈 *Optimization Trends*\n\n`;
    response += `*Trend:* ${trends.scoreTrend.toUpperCase()}\n`;
    response += `*Average Score:* ${Math.round(trends.averageScore)}/100\n`;
    response += `*Analysis Period:* ${history.length} optimization runs\n\n`;

    if (trends.recommendations.length > 0) {
      response += `*Trend Analysis:*\n`;
      trends.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
    }

    if (history.length > 0) {
      const latest = history[history.length - 1];
      response += `\n*Latest Optimization (${latest.timestamp.toLocaleDateString()}):*\n`;
      response += `• Score: ${Math.round(this.calculateOptimizationScore(latest.metrics))}/100\n`;
      response += `• Database Queries: ${latest.metrics.databaseQueries.total}\n`;
      response += `• Cache Hit Rate: ${Math.round(latest.metrics.cachePerformance.hitRate * 100)}%\n`;
      response += `• Memory Usage: ${latest.metrics.memoryUsage.heapUsed}MB`;
    }

    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Track admin action
    analytics.track(userId, 'admin_optimization_trends_viewed', { 
      trend: trends.scoreTrend,
      average_score: Math.round(trends.averageScore)
    });
  } catch (error) {
    logger.error('Error in admin optimization trends command:', error);
    await ctx.reply('Error retrieving optimization trends.');
  }
}

/**
 * Calculate optimization score (helper method)
 */
private calculateOptimizationScore(metrics: any): number {
  let score = 100;

  // Database performance (30% weight)
  if (metrics.databaseQueries.averageTime > 200) score -= 15;
  else if (metrics.databaseQueries.averageTime > 100) score -= 8;
  else if (metrics.databaseQueries.averageTime > 50) score -= 3;

  // Cache performance (25% weight)
  if (metrics.cachePerformance.hitRate < 0.5) score -= 12;
  else if (metrics.cachePerformance.hitRate < 0.7) score -= 6;
  else if (metrics.cachePerformance.hitRate < 0.8) score -= 3;

  // Memory usage (25% weight)
  const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
  if (memoryUsagePercent > 0.9) score -= 12;
  else if (memoryUsagePercent > 0.8) score -= 6;
  else if (memoryUsagePercent > 0.7) score -= 3;

  // Search performance (20% weight)
  if (metrics.searchPerformance.averageResponseTime > 1000) score -= 10;
  else if (metrics.searchPerformance.averageResponseTime > 500) score -= 5;
  else if (metrics.searchPerformance.averageResponseTime > 200) score -= 2;

 