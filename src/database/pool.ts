import { Pool, PoolClient, PoolConfig } from 'pg';
import logger from '../utils/logger';
import { performanceMonitor } from '../utils/performance';

interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  activeCount: number;
}

class DatabasePool {
  private pool: Pool;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(config: PoolConfig) {
    this.pool = new Pool({
      ...config,
      // Optimize connection pool settings
      max: 20, // Maximum number of clients
      min: 2,  // Minimum number of clients
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    });

    this.setupEventHandlers();
    this.startHealthCheck();
  }

  /**
   * Setup pool event handlers
   */
  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      logger.debug('New client connected to database pool');
    });

    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('Client acquired from database pool');
    });

    this.pool.on('release', (client: PoolClient) => {
      logger.debug('Client released back to database pool');
    });

    this.pool.on('error', (err: Error, client: PoolClient) => {
      logger.error('Unexpected error on idle client', err);
    });

    this.pool.on('remove', (client: PoolClient) => {
      logger.debug('Client removed from database pool');
    });
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check on the pool
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      const stats = this.getPoolStats();
      logger.debug('Database pool health check passed', stats);
    } catch (error) {
      logger.error('Database pool health check failed:', error);
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): PoolStats {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      activeCount: this.pool.totalCount - this.pool.idleCount
    };
  }

  /**
   * Execute a query with performance tracking
   */
  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Track query performance
      performanceMonitor.trackDatabaseQuery(text, duration, true);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      // Track failed query
      performanceMonitor.trackDatabaseQuery(
        text, 
        duration, 
        false, 
        error instanceof Error ? error.message : String(error)
      );
      
      throw error;
    }
  }

  /**
   * Get a client from the pool
   */
  async connect(): Promise<PoolClient> {
    const start = Date.now();
    
    try {
      const client = await this.pool.connect();
      const duration = Date.now() - start;
      
      // Track connection acquisition
      performanceMonitor.trackOperation('database.connect', duration);
      
      return client;
    } catch (error) {
      const duration = Date.now() - start;
      
      performanceMonitor.trackOperation(
        'database.connect', 
        duration, 
        { error: error instanceof Error ? error.message : String(error) }
      );
      
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if pool is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1');
      return result.rows.length === 1 && result.rows[0]['?column?'] === 1;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get detailed pool information
   */
  getPoolInfo(): {
    stats: PoolStats;
    config: {
      max: number;
      min: number;
      idleTimeoutMillis: number;
      connectionTimeoutMillis: number;
    };
    health: boolean;
  } {
    return {
      stats: this.getPoolStats(),
      config: {
        max: this.pool.options.max || 20,
        min: this.pool.options.min || 2,
        idleTimeoutMillis: this.pool.options.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.pool.options.connectionTimeoutMillis || 2000,
      },
      health: this.pool.totalCount > 0
    };
  }

  /**
   * Drain the pool (close all connections)
   */
  async drain(): Promise<void> {
    logger.info('Draining database pool...');
    await this.pool.end();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down database pool...');
    await this.drain();
  }
}

// Create and export the pool instance
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'telegram_bot',
  user: process.env.DB_USER || 'bot_user',
  password: process.env.DB_PASSWORD || 'secure_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const databasePool = new DatabasePool(poolConfig);

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down database pool...');
  await databasePool.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down database pool...');
  await databasePool.shutdown();
  process.exit(0);
});

export default databasePool; 