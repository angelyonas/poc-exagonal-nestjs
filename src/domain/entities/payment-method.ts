import { ValidationError } from '../errors/validation.error';

/**
 * PaymentMethod Entity Schema
 * Represents the structure of a payment method available to shoppers
 */
export interface IPaymentMethodSchema {
  type: string; // Payment method type (scheme, oxxo, spei, etc.)
  name: string; // Display name for shopper
  brands?: string[]; // Card brands (visa, mc, amex) if applicable
  configuration?: Record<string, unknown>; // Payment method-specific config
}

/**
 * PaymentMethod Entity
 * Domain entity representing a payment option available based on shopper context
 *
 * @example
 * const creditCard = PaymentMethod.create('scheme', 'Credit Card', ['visa', 'mc', 'amex']);
 * const oxxo = PaymentMethod.create('oxxo', 'OXXO');
 */
export class PaymentMethod {
  private constructor(private readonly _entity: IPaymentMethodSchema) {}

  /**
   * Factory method to create a new PaymentMethod entity
   *
   * @param type - Payment method type (lowercase, non-empty)
   * @param name - Display name (non-empty)
   * @param brands - Optional array of supported brands (for card payments)
   * @param configuration - Optional payment method-specific configuration
   * @returns PaymentMethod instance
   * @throws ValidationError if type or name is invalid
   */
  static create(
    type: string,
    name: string,
    brands?: string[],
    configuration?: Record<string, unknown>,
  ): PaymentMethod {
    if (!type || type.trim().length === 0) {
      throw new ValidationError('Payment method type is required', 'type');
    }
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Payment method name is required', 'name');
    }

    return new PaymentMethod({
      type: type.trim().toLowerCase(),
      name: name.trim(),
      brands,
      configuration,
    });
  }

  /**
   * Factory method to create PaymentMethod from schema
   * Used for repository deserialization
   *
   * @param schema - Payment method schema
   * @returns PaymentMethod instance
   */
  static fromSchema(schema: IPaymentMethodSchema): PaymentMethod {
    return new PaymentMethod(schema);
  }

  get type(): string {
    return this._entity.type;
  }

  get name(): string {
    return this._entity.name;
  }

  get brands(): string[] | undefined {
    return this._entity.brands;
  }

  get configuration(): Record<string, unknown> | undefined {
    return this._entity.configuration;
  }

  /**
   * Check if this payment method is a card payment
   * Card payments use type 'scheme' in Adyen
   */
  isCardPayment(): boolean {
    return this._entity.type === 'scheme';
  }

  /**
   * Check if this payment method supports recurring payments
   * Based on configuration metadata
   */
  supportsRecurring(): boolean {
    return this._entity.configuration?.['supportsRecurring'] === true;
  }

  /**
   * Convert entity to plain object (for serialization)
   */
  toJSON(): IPaymentMethodSchema {
    return {
      type: this._entity.type,
      name: this._entity.name,
      brands: this._entity.brands,
      configuration: this._entity.configuration,
    };
  }
}
