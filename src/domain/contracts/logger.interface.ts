/**
 * Log level enum
 */
export enum LogLevelEnum {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Logger interface
 * Abstraction for logging operations with field masking support
 */
export interface ILogger {
  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void;

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * Log error message
   */
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void;

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): void;

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined;
}
