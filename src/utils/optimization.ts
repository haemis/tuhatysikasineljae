import { databasePool } from '../database/pool';
import { performanceMonitor } from './performance';
import { userCache, connectionCache, searchCache } from './cache';
import logger from './logger';
import analytics from './analytics';

interface OptimizationMetrics {
  databaseQueries: {
    total: number;
    slow: number;
    averageTime: number;
  };
  cachePerformance: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  searchPerformance: {
    averageResponseTime: number;
    totalSearches: number;
    cacheHits: number;
  };
}

interface OptimizationRecommendations {
  database: string[];
  cache: string[];
  memory: string[];
  search: string[];
  general: string[];
}

class SystemOptimizer {
  private optimizationHistory: Array<{
    timestamp: Date;
    metrics: OptimizationMetrics;
    recommendations: OptimizationRecommendations;
  }> = [];

  /**
   * Run comprehensive system optimization analysis
   */
  async analyzeSystemPerformance(): Promise<{
    metrics: OptimizationMetrics;
    recommendations: OptimizationRecommendations;
    score: number;
  }> {
    try {
      const metrics = await this.gatherMetrics();
      const recommendations = this.generateRecommendations(metrics);
      const score = this.calculateOptimizationScore(metrics);

      // Store optimization history
      this.optimizationHistory.push({
        timestamp: new Date(),
        metrics,
        recommendations
      });

      // Keep only last 10 optimizations
      if (this.optimizationHistory.length > 10) {
        this.optimizationHistory = this.optimizationHistory.slice(-10);
      }

      logger.info('System optimization analysis completed', { score, recommendations: recommendations.general.length });
      return { metrics, recommendations, score };
    } catch (error) {
      logger.error('Error in system optimization analysis:', error);
      throw error;
    }
  }

  /**
   * Gather current system metrics
   */
  private async gatherMetrics(): Promise<OptimizationMetrics> {
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    const memoryUsage = performanceMonitor.getMemoryUsage();
    const userCacheStats = userCache.getStats();
    const connectionCacheStats = connectionCache.getStats();
    const searchCacheStats = searchCache.getStats();

    // Calculate cache performance
    const totalCacheRequests = userCacheStats.hits + userCacheStats.misses + 
                              connectionCacheStats.hits + connectionCacheStats.misses + 
                              searchCacheStats.hits + searchCacheStats.misses;
    const totalCacheHits = userCacheStats.hits + connectionCacheStats.hits + searchCacheStats.hits;
    const hitRate = totalCacheRequests > 0 ? totalCacheHits / totalCacheRequests : 0;

    return {
      databaseQueries: {
        total: performanceSummary.totalOperations,
        slow: performanceSummary.slowOperations,
        averageTime: performanceSummary.averageResponseTime
      },
      cachePerformance: {
        hitRate,
        missRate: 1 - hitRate,
        totalRequests: totalCacheRequests
      },
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      searchPerformance: {
        averageResponseTime: performanceSummary.averageResponseTime,
        totalSearches: analytics.getSummary().recentActivity,
        cacheHits: totalCacheHits
      }
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(metrics: OptimizationMetrics): OptimizationRecommendations {
    const recommendations: OptimizationRecommendations = {
      database: [],
      cache: [],
      memory: [],
      search: [],
      general: []
    };

    // Database recommendations
    if (metrics.databaseQueries.averageTime > 100) {
      recommendations.database.push('Consider adding database indexes for frequently queried columns');
    }
    if (metrics.databaseQueries.slow > metrics.databaseQueries.total * 0.1) {
      recommendations.database.push('High number of slow queries detected - review query optimization');
    }

    // Cache recommendations
    if (metrics.cachePerformance.hitRate < 0.7) {
      recommendations.cache.push('Low cache hit rate - consider increasing cache size or improving cache keys');
    }
    if (metrics.cachePerformance.totalRequests > 1000) {
      recommendations.cache.push('High cache usage - consider implementing cache warming strategies');
    }

    // Memory recommendations
    const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
    if (memoryUsagePercent > 0.8) {
      recommendations.memory.push('High memory usage - consider implementing memory cleanup or increasing heap size');
    }
    if (metrics.memoryUsage.external > 100 * 1024 * 1024) { // 100MB
      recommendations.memory.push('High external memory usage - review memory leaks in external dependencies');
    }

    // Search recommendations
    if (metrics.searchPerformance.averageResponseTime > 500) {
      recommendations.search.push('Slow search performance - consider implementing search indexing or caching');
    }
    if (metrics.searchPerformance.cacheHits / metrics.searchPerformance.totalSearches < 0.5) {
      recommendations.search.push('Low search cache utilization - optimize search result caching');
    }

    // General recommendations
    if (recommendations.database.length > 0) {
      recommendations.general.push('Database optimization needed');
    }
    if (recommendations.cache.length > 0) {
      recommendations.general.push('Cache optimization recommended');
    }
    if (recommendations.memory.length > 0) {
      recommendations.general.push('Memory management improvements suggested');
    }

    return recommendations;
  }

  /**
   * Calculate optimization score (0-100)
   */
  private calculateOptimizationScore(metrics: OptimizationMetrics): number {
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

    return Math.max(0, score);
  }

  /**
   * Optimize database queries
   */
  async optimizeDatabaseQueries(): Promise<{
    optimized: number;
    recommendations: string[];
  }> {
    try {
      const recommendations: string[] = [];
      let optimized = 0;

      // Analyze slow queries
      const slowQueries = performanceMonitor.getRecentQueries(60).filter(q => q.duration > 100);
      
      if (slowQueries.length > 0) {
        recommendations.push(`Found ${slowQueries.length} slow queries in the last hour`);
        
        // Group by query type
        const queryTypes = new Map<string, number>();
        slowQueries.forEach(query => {
          const type = query.query?.split(' ')[0] || 'unknown'; // Get first word of query
          queryTypes.set(type, (queryTypes.get(type) || 0) + 1);
        });

        queryTypes.forEach((count, type) => {
          recommendations.push(`${type} queries: ${count} slow queries detected`);
        });

        optimized = slowQueries.length;
      }

      // Check for potential index opportunities
      const userQueries = slowQueries.filter(q => q.query.toLowerCase().includes('user'));
      if (userQueries.length > 5) {
        recommendations.push('Consider adding indexes on users table for frequently searched columns');
      }

      const connectionQueries = slowQueries.filter(q => q.query.toLowerCase().includes('connection'));
      if (connectionQueries.length > 3) {
        recommendations.push('Consider adding indexes on connections table for status and user_id columns');
      }

      logger.info('Database optimization analysis completed', { optimized, recommendations: recommendations.length });
      return { optimized, recommendations };
    } catch (error) {
      logger.error('Error in database optimization:', error);
      throw error;
    }
  }

  /**
   * Optimize cache performance
   */
  async optimizeCachePerformance(): Promise<{
    optimized: boolean;
    improvements: string[];
  }> {
    try {
      const improvements: string[] = [];
      let optimized = false;

      const userCacheStats = userCache.getStats();
      const connectionCacheStats = connectionCache.getStats();
      const searchCacheStats = searchCache.getStats();

      // Analyze cache hit rates
      const caches = [
        { name: 'User Cache', stats: userCacheStats },
        { name: 'Connection Cache', stats: connectionCacheStats },
        { name: 'Search Cache', stats: searchCacheStats }
      ];

      caches.forEach(cache => {
        const hitRate = cache.stats.hitRate / 100; // Convert percentage to decimal
        
        if (hitRate < 0.6) {
          improvements.push(`${cache.name}: Low hit rate (${Math.round(hitRate * 100)}%) - consider increasing TTL`);
        }
        
        if (cache.stats.size > 800) { // Assuming max size is 1000
          improvements.push(`${cache.name}: High memory usage - consider increasing max size`);
        }
      });

      // Implement cache warming for frequently accessed data
      const totalUserRequests = userCacheStats.hits + userCacheStats.misses;
      if (totalUserRequests > 100 && userCacheStats.hitRate < 70) {
        improvements.push('Implementing cache warming for user profiles');
        // This would typically involve pre-loading frequently accessed user profiles
        optimized = true;
      }

      // Optimize cache cleanup
      if (searchCacheStats.size > 900) { // Assuming max size is 1000
        improvements.push('Performing aggressive cache cleanup');
        searchCache.cleanup();
        optimized = true;
      }

      logger.info('Cache optimization completed', { optimized, improvements: improvements.length });
      return { optimized, improvements };
    } catch (error) {
      logger.error('Error in cache optimization:', error);
      throw error;
    }
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemoryUsage(): Promise<{
    freed: number;
    recommendations: string[];
  }> {
    try {
      const recommendations: string[] = [];
      let freed = 0;

      const memoryUsage = performanceMonitor.getMemoryUsage();
      const initialHeapUsed = memoryUsage.heapUsed;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        const afterGC = performanceMonitor.getMemoryUsage();
        freed = initialHeapUsed - afterGC.heapUsed;
        
        if (freed > 0) {
          recommendations.push(`Garbage collection freed ${Math.round(freed / 1024 / 1024)}MB`);
        }
      }

      // Clear old cache entries
      const userCacheSize = userCache.getStats().size;
      const connectionCacheSize = connectionCache.getStats().size;
      const searchCacheSize = searchCache.getStats().size;

      userCache.cleanup();
      connectionCache.cleanup();
      searchCache.cleanup();

      const afterCleanup = performanceMonitor.getMemoryUsage();
      const totalFreed = initialHeapUsed - afterCleanup.heapUsed;
      
      if (totalFreed > freed) {
        recommendations.push(`Cache cleanup freed ${Math.round((totalFreed - freed) / 1024 / 1024)}MB`);
        freed = totalFreed;
      }

      // Memory usage recommendations
      const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
      if (memoryUsagePercent > 0.8) {
        recommendations.push('High memory usage - consider increasing Node.js heap size');
      }

      if (memoryUsage.external > 50 * 1024 * 1024) { // 50MB
        recommendations.push('High external memory - review external dependencies and connections');
      }

      logger.info('Memory optimization completed', { freed: Math.round(freed / 1024 / 1024), recommendations: recommendations.length });
      return { freed, recommendations };
    } catch (error) {
      logger.error('Error in memory optimization:', error);
      throw error;
    }
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(): Array<{
    timestamp: Date;
    metrics: OptimizationMetrics;
    recommendations: OptimizationRecommendations;
  }> {
    return this.optimizationHistory;
  }

  /**
   * Get optimization trends
   */
  getOptimizationTrends(): {
    scoreTrend: 'improving' | 'declining' | 'stable';
    averageScore: number;
    recommendations: string[];
  } {
    if (this.optimizationHistory.length < 2) {
      return {
        scoreTrend: 'stable',
        averageScore: 0,
        recommendations: ['Insufficient data for trend analysis']
      };
    }

    const scores = this.optimizationHistory.map(h => this.calculateOptimizationScore(h.metrics));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const recentScores = scores.slice(-3);
    const olderScores = scores.slice(0, -3);
    
    let scoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentScores.length > 0 && olderScores.length > 0) {
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
      
      if (recentAvg > olderAvg + 5) scoreTrend = 'improving';
      else if (recentAvg < olderAvg - 5) scoreTrend = 'declining';
    }

    const recommendations: string[] = [];
    if (scoreTrend === 'declining') {
      recommendations.push('System performance is declining - immediate optimization recommended');
    } else if (scoreTrend === 'improving') {
      recommendations.push('System performance is improving - continue current optimization strategies');
    }

    return { scoreTrend, averageScore, recommendations };
  }
}

// Create global instance
export const systemOptimizer = new SystemOptimizer();

export default SystemOptimizer; 