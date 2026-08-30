/**
 * Production Structured JSON Logger & Security Audit Logging
 * src/lib/logger.ts
 *
 * Provides high-performance, structured JSON logging for production observability,
 * security event tracking, error diagnostic traces, and operational metrics.
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export interface LogContext {
  businessId?: string;
  userId?: string;
  requestId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  [key: string]: unknown;
}

class StructuredLogger {
  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: process.env.NODE_ENV || 'development',
      ...context,
    });
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatLog('INFO', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('WARN', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { rawError: String(error) };

    console.error(
      this.formatLog('ERROR', message, {
        ...context,
        ...errorDetails,
      })
    );
  }

  security(message: string, context?: LogContext) {
    console.warn(
      this.formatLog('SECURITY', message, {
        ...context,
        securityEvent: true,
      })
    );
  }
}

export const logger = new StructuredLogger();
