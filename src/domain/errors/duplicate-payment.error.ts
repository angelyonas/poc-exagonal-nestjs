import { DomainError } from './base.error';

/**
 * Duplicate payment error
 * Thrown when attempting to process a payment with a duplicate idempotency key
 */
export class DuplicatePaymentError extends DomainError {
  constructor(
    public readonly idempotencyKey: string,
    public readonly existingMerchantReference?: string,
  ) {
    super(
      `Duplicate payment detected. Idempotency key '${idempotencyKey}' already used${existingMerchantReference ? ` for transaction '${existingMerchantReference}'` : ''}`,
    );
  }
}
