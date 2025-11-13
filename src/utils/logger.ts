/**
 * Production-ready logging utility
 * Provides structured logging with different levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    const envLogLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    this.logLevel = envLogLevel;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && { context }),
    };

    if (this.isDevelopment) {
      // Pretty print in development
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${context ? '\n' + JSON.stringify(context, null, 2) : ''}`;
    }

    // JSON format for production (easier to parse)
    return JSON.stringify(baseLog);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext: LogContext = {
        ...context,
        ...(error instanceof Error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }),
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  // Specialized logging methods
  logRequest(method: string, path: string, userId?: string): void {
    this.info('HTTP Request', { method, path, userId });
  }

  logResponse(method: string, path: string, statusCode: number, duration: number): void {
    this.info('HTTP Response', { method, path, statusCode, duration });
  }

  logJobStart(jobId: string, userId: string, feedCount: number): void {
    this.info('Analysis job started', { jobId, userId, feedCount });
  }

  logJobComplete(jobId: string, duration: number, articleCount: number, cost: number): void {
    this.info('Analysis job completed', { jobId, duration, articleCount, cost });
  }

  logJobError(jobId: string, error: Error): void {
    this.error('Analysis job failed', error, { jobId });
  }

  logDatabaseQuery(query: string, duration: number): void {
    this.debug('Database query', { query: query.substring(0, 100), duration });
  }

  logAuthAttempt(email: string, success: boolean, reason?: string): void {
    this.info('Authentication attempt', { email, success, reason });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or custom instances
export { Logger };
