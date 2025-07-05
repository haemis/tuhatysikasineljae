import logger from './logger';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface DatabaseQueryMetric {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface MemoryUsage {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private dbQueries: DatabaseQueryMetric[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly MAX_QUERIES = 500;

  /**
   * Track operation performance
   */
  trackOperation(operation: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      ...(metadata && { metadata })
    };

    this.metrics.push(metric);

    // Keep only the latest metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow operations
    if (duration > 1000) { // 1 second threshold
      logger.warn(`Slow operation detected: ${operation} took ${duration}ms`, metadata);
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(query: string, duration: number, success: boolean, error?: string): void {
    const metric: DatabaseQueryMetric = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      success,
      ...(error && { error })
    };

    this.dbQueries.push(metric);

    // Keep only the latest queries
    if (this.dbQueries.length > this.MAX_QUERIES) {
      this.dbQueries = this.dbQueries.slice(-this.MAX_QUERIES);
    }

    // Log slow queries
    if (duration > 500) { // 500ms threshold
      logger.warn(`Slow database query detected: ${duration}ms`, { query: metric.query, error });
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    averageResponseTime: number;
    slowOperations: number;
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    memoryUsage: MemoryUsage;
    topSlowOperations: Array<{ operation: string; avgDuration: number; count: number }>;
    topSlowQueries: Array<{ query: string; avgDuration: number; count: number }>;
  } {
    const totalOperations = this.metrics.length;
    const averageResponseTime = totalOperations > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;

    const slowOperations = this.metrics.filter(m => m.duration > 1000).length;

    const totalQueries = this.dbQueries.length;
    const averageQueryTime = totalQueries > 0 
      ? this.dbQueries.reduce((sum, q) => sum + q.duration, 0) / totalQueries 
      : 0;

    const slowQueries = this.dbQueries.filter(q => q.duration > 500).length;

    // Group operations by type and calculate averages
    const operationGroups = new Map<string, { total: number; count: number }>();
    for (const metric of this.metrics) {
      const existing = operationGroups.get(metric.operation) || { total: 0, count: 0 };
      existing.total += metric.duration;
      existing.count += 1;
      operationGroups.set(metric.operation, existing);
    }

    const topSlowOperations = Array.from(operationGroups.entries())
      .map(([operation, { total, count }]) => ({
        operation,
        avgDuration: Math.round(total / count),
        count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    // Group queries by type and calculate averages
    const queryGroups = new Map<string, { total: number; count: number }>();
    for (const query of this.dbQueries) {
      const queryType = this.getQueryType(query.query);
      const existing = queryGroups.get(queryType) || { total: 0, count: 0 };
      existing.total += query.duration;
      existing.count += 1;
      queryGroups.set(queryType, existing);
    }

    const topSlowQueries = Array.from(queryGroups.entries())
      .map(([query, { total, count }]) => ({
        query,
        avgDuration: Math.round(total / count),
        count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      totalOperations,
      averageResponseTime: Math.round(averageResponseTime),
      slowOperations,
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime),
      slowQueries,
      memoryUsage: this.getMemoryUsage(),
      topSlowOperations,
      topSlowQueries
    };
  }

  /**
   * Get recent performance metrics
   */
  getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get recent database queries
   */
  getRecentQueries(minutes: number = 5): DatabaseQueryMetric[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.dbQueries.filter(q => q.timestamp > cutoff);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(hours: number = 24): void {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const oldMetricsCount = this.metrics.length;
    const oldQueriesCount = this.dbQueries.length;

    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.dbQueries = this.dbQueries.filter(q => q.timestamp > cutoff);

    const clearedMetrics = oldMetricsCount - this.metrics.length;
    const clearedQueries = oldQueriesCount - this.dbQueries.length;

    if (clearedMetrics > 0 || clearedQueries > 0) {
      logger.info(`Cleared old performance data: ${clearedMetrics} metrics, ${clearedQueries} queries`);
    }
  }

  /**
   * Performance decorator for methods
   */
  static track(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - start;
        
        performanceMonitor.trackOperation(
          `${target.constructor.name}.${propertyName}`,
          duration,
          { args: args.length }
        );
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        performanceMonitor.trackOperation(
          `${target.constructor.name}.${propertyName}`,
          duration,
          { 
            args: args.length,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        
        throw error;
      }
    };
  }

  /**
   * Database query decorator
   */
  static trackQuery(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - start;
        
        performanceMonitor.trackDatabaseQuery(
          args[0] || 'unknown',
          duration,
          true
        );
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        performanceMonitor.trackDatabaseQuery(
          args[0] || 'unknown',
          duration,
          false,
          error instanceof Error ? error.message : String(error)
        );
        
        throw error;
      }
    };
  }

  /**
   * Sanitize SQL query for logging
   */
  private sanitizeQuery(query: string): string {
    // Remove sensitive data and limit length
    return query
      .replace(/\s+/g, ' ')
      .replace(/['"][^'"]*['"]/g, '?')
      .substring(0, 100);
  }

  /**
   * Get query type for grouping
   */
  private getQueryType(query: string): string {
    const upperQuery = query.toUpperCase();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

// Export decorators
export const trackPerformance = PerformanceMonitor.track;
export const trackQuery = PerformanceMonitor.trackQuery;

export default PerformanceMonitor; 