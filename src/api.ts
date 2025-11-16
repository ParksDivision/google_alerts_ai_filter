import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import authRoutes from './routes/auth.js';
import feedRoutes from './routes/feeds.js';
import promptRoutes from './routes/prompts.js';
import jobRoutes from './routes/jobs.js';
import statsRoutes from './routes/stats.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { testConnection } from './db/connection.js';
import { validateAndExitOnError } from './utils/validateEnv.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

// Validate environment variables before starting
validateAndExitOnError();

/**
 * Create and configure the API server
 */
export function createApiServer(): Express {
  const app = express();

  // ============================================================================
  // Security Middleware
  // ============================================================================

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For email templates if needed
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Hide Express server information
  app.disable('x-powered-by');

  // CORS configuration - Allow all origins in development
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.FRONTEND_URL || 'http://localhost:3000')
      : true, // Allow all origins in development
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400, // 24 hours
  };
  app.use(cors(corsOptions));

  // Request size limits to prevent DoS
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request timeout to prevent slow requests from blocking
  app.use((req, res, next) => {
    req.setTimeout(30000); // 30 seconds
    res.setTimeout(30000);
    next();
  });

  // Apply rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // ============================================================================
  // Health Check
  // ============================================================================

  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const dbConnected = await testConnection();

      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      });
    }
  });

  // ============================================================================
  // API Routes
  // ============================================================================

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // RSS Feed routes
  app.use('/api/feeds', feedRoutes);

  // Analysis Prompt routes
  app.use('/api/prompts', promptRoutes);

  // Analysis Job routes
  app.use('/api/jobs', jobRoutes);

  // Stats routes (AI cost tracking, usage, etc.)
  app.use('/api/stats', statsRoutes);

  // ============================================================================
  // Root Route
  // ============================================================================

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'RSS Content Analyzer API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: '/api/auth/*',
        feeds: '/api/feeds/*',
        prompts: '/api/prompts/*',
        jobs: '/api/jobs/*',
        stats: '/api/stats/*',
        docs: 'Coming soon',
      },
    });
  });

  // ============================================================================
  // 404 Handler
  // ============================================================================

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      path: req.path,
    });
  });

  // ============================================================================
  // Error Handler
  // ============================================================================

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', err, {
      method: req.method,
      path: req.path,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    });
  });

  return app;
}

/**
 * Start the API server
 */
export async function startApiServer(port: number = 3001): Promise<void> {
  const app = createApiServer();

  // Test database connection before starting server
  logger.info('Testing database connection...');
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.error('Failed to connect to database. Please check your DATABASE_URL.');
    process.exit(1);
  }
  logger.info('Database connection successful');

  app.listen(port, () => {
    logger.info('API Server started', {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
    console.log(`\n🚀 API Server running on port ${port}`);
    console.log(`   Health check: http://localhost:${port}/health`);
    console.log(`   API endpoints: http://localhost:${port}/api`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

// Start server if this file is run directly
const isRunDirectly = process.argv[1] && (
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].includes('api.js')
);

if (isRunDirectly) {
  const port = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);
  startApiServer(port).catch(console.error);
}
