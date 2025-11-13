import { Injectable } from '@nestjs/common';

/**
 * Correlation ID service
 * Generates and manages correlation IDs for request tracking (UUID v4)
 */
@Injectable()
export class CorrelationIdService {
  /**
   * Generate a new correlation ID (UUID v4)
   */
  generate(): string {
    // Generate UUID v4
    const hex = '0123456789abcdef';
    let uuid = '';

    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4'; // UUID v4
      } else if (i === 19) {
        uuid += hex.charAt(Math.floor(Math.random() * 4) + 8); // 8, 9, a, or b
      } else {
        uuid += hex.charAt(Math.floor(Math.random() * 16));
      }
    }

    return uuid;
  }

  /**
   * Validate correlation ID format (UUID v4)
   */
  validate(correlationId: string): boolean {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(correlationId);
  }

  /**
   * Extract correlation ID from request headers
   * Standard header: X-Correlation-ID
   */
  extractFromHeaders(
    headers: Record<string, string | undefined>,
  ): string | undefined {
    return (
      headers['x-correlation-id'] ||
      headers['X-Correlation-ID'] ||
      headers['x-request-id'] ||
      headers['X-Request-ID']
    );
  }
}
