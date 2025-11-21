import { DomainError } from '../errors/base.error';

/**
 * Invalid payment reference error
 * Thrown when an invalid payment reference is provided
 */
export class InvalidPaymentReferenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Payment reference value object schema
 */
interface IPaymentReferenceSchemaValueObject {
  value: string;
}

/**
 * PaymentReference value object
 * Represents a unique payment reference with generation logic
 * Format: PAY-{timestamp}-{random}
 * Example: PAY-1699564800000-A1B2C3
 */
export class PaymentReference {
  private static readonly PREFIX = 'PAY-';
  private static readonly MIN_LENGTH = 10;
  private static readonly MAX_LENGTH = 100;

  private constructor(
    private readonly _entity: IPaymentReferenceSchemaValueObject,
  ) {}

  /**
   * Generate a new unique payment reference
   * Format: PAY-{timestamp}-{random}
   * Example: PAY-1699564800000-A1B2C3
   */
  static generate(): PaymentReference {
    const timestamp = Date.now();
    const random = this.generateRandomString(6);
    const reference = `${this.PREFIX}${timestamp}-${random}`;

    return new PaymentReference({ value: reference });
  }

  /**
   * Create a PaymentReference from an existing value
   * @param value - Payment reference string
   * @throws {InvalidPaymentReferenceError} If reference is invalid
   */
  static fromValue(value: string): PaymentReference {
    const trimmedValue = value.trim();

    // Validate length
    if (trimmedValue.length < this.MIN_LENGTH) {
      throw new InvalidPaymentReferenceError(
        `Payment reference too short. Minimum length: ${this.MIN_LENGTH}`,
      );
    }

    if (trimmedValue.length > this.MAX_LENGTH) {
      throw new InvalidPaymentReferenceError(
        `Payment reference too long. Maximum length: ${this.MAX_LENGTH}`,
      );
    }

    // Validate format (alphanumeric, hyphens, underscores only)
    if (!/^[A-Za-z0-9\-_]+$/.test(trimmedValue)) {
      throw new InvalidPaymentReferenceError(
        `Payment reference must contain only alphanumeric characters, hyphens, and underscores`,
      );
    }

    return new PaymentReference({ value: trimmedValue });
  }

  /**
   * Generate a random alphanumeric string
   */
  private static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Get the reference value
   */
  get value(): string {
    return this._entity.value;
  }

  /**
   * Check if reference starts with the standard prefix
   */
  hasStandardPrefix(): boolean {
    return this._entity.value.startsWith(PaymentReference.PREFIX);
  }

  /**
   * Compare with another PaymentReference
   */
  equals(other: PaymentReference): boolean {
    return this._entity.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._entity.value;
  }
}
