import { DomainError } from './base.error';

/**
 * Payment processing error
 * Thrown when payment processing fails due to external service errors or business rules
 */
export class PaymentProcessingError extends DomainError {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
