import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { botConfig } from '../config';
import { securityMiddleware } from '../utils/security';
import { performanceMonitor } from '../utils/performance';
import { userCache, connectionCache, searchCache } from '../utils/cache';
import logger from '../utils/logger';
import analytics from '../utils/analytics';

// Import route handlers
import userRoutes from './routes/users';
import connectionRoutes from './routes/connections';
import searchRoutes from './routes/search';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}

const app = express();
const PORT = process.env['API_PORT'] || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Custom security middleware
app.use(securityMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  logger.info(`API Request: ${method} ${url} from ${ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    logger.info(`API Response: ${method} ${url} - ${statusCode} (${duration}ms)`);
    
    // Track API performance
    performanceMonitor.trackOperation(`api.${method.toLowerCase()}.${url.split('/')[1] || 'root'}`, duration, {
      statusCode,
      ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// API versioning
app.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1';
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] || '1.0.0',
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/connections', connectionRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/health', healthRoutes);

// API documentation endpoint
app.get('/api/v1/docs', (req, res) => {
  res.json({
    name: 'Telegram Business Card Bot API',
    version: '1.0.0',
    description: 'REST API for the Telegram Business Card Bot',
    endpoints: {
      users: {
        'GET /api/v1/users/:id': 'Get user profile',
        'PUT /api/v1/users/:id': 'Update user profile',
        'DELETE /api/v1/users/:id': 'Delete user profile',
        'GET /api/v1/users/:id/connections': 'Get user connections'
      },
      connections: {
        'GET /api/v1/connections': 'Get user connections',
        'POST /api/v1/connections': 'Create connection request',
        'PUT /api/v1/connections/:id': 'Update connection status',
        'DELETE /api/v1/connections/:id': 'Delete connection'
      },
      search: {
        'GET /api/v1/search': 'Search users',
        'GET /api/v1/search/advanced': 'Advanced search with filters',
        'GET /api/v1/search/recommendations': 'Get recommendations'
      },
      admin: {
        'GET /api/v1/admin/stats': 'Get system statistics',
        'GET /api/v1/admin/users': 'Get all users',
        'GET /api/v1/admin/security': 'Get security information',
        'POST /api/v1/admin/maintenance': 'Run maintenance tasks'
      },
      health: {
        'GET /api/v1/health': 'System health check',
        'GET /api/v1/health/performance': 'Performance metrics',
        'GET /api/v1/health/cache': 'Cache statistics'
      }
    },
    authentication: 'API key required in Authorization header',
    rateLimit: '100 requests per 15 minutes per IP'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('API Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down API server gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down API server gracefully');
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`API server running on port ${PORT}`);
    logger.info(`API documentation available at http://localhost:${PORT}/api/v1/docs`);
  });
}

export default app; 