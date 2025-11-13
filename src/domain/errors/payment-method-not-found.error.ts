import { DomainError } from './base.error';

/**
 * Payment method not found error
 * Thrown when a requested payment method is not available
 */
export class PaymentMethodNotFoundError extends DomainError {
  constructor(
    public readonly paymentMethodType: string,
    public readonly country?: string,
  ) {
    super(
      `Payment method '${paymentMethodType}' not found${country ? ` for country '${country}'` : ''}`,
    );
  }
}
