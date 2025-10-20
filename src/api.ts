import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import authRoutes from './routes/auth.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { testConnection } from './db/connection.js';

// Load environment variables
config();

/**
 * Create and configure the API server
 */
export function createApiServer(): Express {
  const app = express();

  // ============================================================================
  // Security Middleware
  // ============================================================================

  // Helmet helps secure Express apps by setting various HTTP headers
  app.use(helmet());

  // CORS configuration
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));

  // Parse JSON bodies
  app.use(express.json());

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Apply rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // ============================================================================
  // Health Check
  // ============================================================================

  app.get('/health', async (req: Request, res: Response) => {
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

  // TODO: Add more routes
  // app.use('/api/feeds', feedRoutes);
  // app.use('/api/prompts', promptRoutes);
  // app.use('/api/jobs', jobRoutes);

  // ============================================================================
  // Root Route
  // ============================================================================

  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'RSS Content Analyzer API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: '/api/auth/*',
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

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

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
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Please check your DATABASE_URL.');
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`\n🚀 API Server running on port ${port}`);
    console.log(`   Health check: http://localhost:${port}/health`);
    console.log(`   API endpoints: http://localhost:${port}/api`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);
  startApiServer(port).catch(console.error);
}
