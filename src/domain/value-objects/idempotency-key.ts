import { DomainError } from '../errors/base.error';

/**
 * Invalid idempotency key error
 * Thrown when an invalid idempotency key is provided
 */
export class InvalidIdempotencyKeyError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Idempotency key value object schema
 */
interface IIdempotencyKeySchemaValueObject {
  value: string;
}

/**
 * IdempotencyKey value object
 * Represents a unique idempotency key with UUID v4 validation
 * Used to prevent duplicate payment submissions
 */
export class IdempotencyKey {
  // UUID v4 regex pattern
  private static readonly UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(
    private readonly _entity: IIdempotencyKeySchemaValueObject,
  ) {}

  /**
   * Create an IdempotencyKey from a UUID v4 string
   * @param value - UUID v4 string (e.g., '550e8400-e29b-41d4-a716-446655440000')
   * @throws {InvalidIdempotencyKeyError} If key is not a valid UUID v4
   */
  static create(value: string): IdempotencyKey {
    const trimmedValue = value.trim().toLowerCase();

    // Validate UUID v4 format
    if (!this.UUID_V4_REGEX.test(trimmedValue)) {
      throw new InvalidIdempotencyKeyError(
        `Invalid idempotency key format. Must be a valid UUID v4. Received: ${value}`,
      );
    }

    return new IdempotencyKey({ value: trimmedValue });
  }

  /**
   * Generate a new random idempotency key (UUID v4)
   * Note: In production, this should use a proper UUID library like 'uuid'
   * This implementation is for demonstration purposes
   */
  static generate(): IdempotencyKey {
    // Generate UUID v4 (simplified version)
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

    return new IdempotencyKey({ value: uuid });
  }

  /**
   * Get the idempotency key value
   */
  get value(): string {
    return this._entity.value;
  }

  /**
   * Compare with another IdempotencyKey
   */
  equals(other: IdempotencyKey): boolean {
    return this._entity.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._entity.value;
  }
}
