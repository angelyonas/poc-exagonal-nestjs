import { Injectable, Scope } from '@nestjs/common';
import type { ILogger } from '@/domain/contracts/logger.interface';

/**
 * Structured logger implementation with field masking
 * Masks sensitive fields in logs (card numbers, API keys, PSP references, CVV)
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements ILogger {
  private correlationId?: string;
  private readonly SENSITIVE_FIELDS = [
    'cardNumber',
    'encryptedCardNumber',
    'cvv',
    'securityCode',
    'encryptedSecurityCode',
    'apiKey',
    'password',
    'token',
    'authorization',
    'pspReference',
    'encryptedExpiryMonth',
    'encryptedExpiryYear',
  ];

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context);
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void {
    this.log('ERROR', message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  /**
   * Core logging method with masking
   */
  private log(
    level: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      ...this.maskSensitiveFields(context || {}),
    };

    // Use console methods based on log level
    switch (level) {
      case 'DEBUG':
        console.debug(JSON.stringify(logEntry));
        break;
      case 'INFO':
        console.info(JSON.stringify(logEntry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'ERROR':
        console.error(JSON.stringify(logEntry));
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Mask sensitive fields in context object
   */
  private maskSensitiveFields(
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveField(key)) {
        masked[key] = this.maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively mask nested objects
        if (Array.isArray(value)) {
          masked[key] = value.map((item) =>
            typeof item === 'object' && item !== null
              ? this.maskSensitiveFields(item as Record<string, unknown>)
              : item,
          );
        } else {
          masked[key] = this.maskSensitiveFields(
            value as Record<string, unknown>,
          );
        }
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Check if field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.SENSITIVE_FIELDS.some((sensitive) =>
      lowerFieldName.includes(sensitive.toLowerCase()),
    );
  }

  /**
   * Mask sensitive value
   */
  private maskValue(value: unknown): string {
    if (typeof value !== 'string') {
      return '***MASKED***';
    }

    // Show only first 4 and last 4 characters for card numbers
    if (value.length > 8) {
      return `${value.slice(0, 4)}...${value.slice(-4)}`;
    }

    return '***MASKED***';
  }
}
