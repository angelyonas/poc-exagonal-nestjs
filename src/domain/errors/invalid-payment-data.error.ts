import { DomainError } from './base.error';

/**
 * Invalid payment data error
 * Thrown when payment request contains invalid or malformed data
 */
export class InvalidPaymentDataError extends DomainError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}
