import { DomainError } from '../errors/base.error';
import { Currency } from './currency';

/**
 * Invalid amount error
 * Thrown when an invalid amount is provided
 */
export class InvalidAmountError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Amount value object schema
 */
interface IAmountSchemaValueObject {
  value: number;
  currency: Currency;
}

/**
 * Amount value object
 * Represents a monetary amount with currency and minor units (centavos) validation
 * For MXN: Stores amount in minor units (centavos)
 */
export class Amount {
  private constructor(private readonly _entity: IAmountSchemaValueObject) {}

  /**
   * Create an Amount value object from major units (e.g., pesos)
   * @param value - Amount in major units (e.g., 1500.00 pesos)
   * @param currency - Currency value object
   * @throws {InvalidAmountError} If amount is negative or invalid
   */
  static fromMajorUnits(value: number, currency: Currency): Amount {
    if (value < 0) {
      throw new InvalidAmountError(
        `Amount cannot be negative. Received: ${value}`,
      );
    }

    if (!Number.isFinite(value)) {
      throw new InvalidAmountError(
        `Amount must be a finite number. Received: ${value}`,
      );
    }

    // Convert to minor units for storage
    const minorUnits = currency.toMinorUnits(value);

    return new Amount({
      value: minorUnits,
      currency,
    });
  }

  /**
   * Create an Amount value object from minor units (e.g., centavos)
   * @param value - Amount in minor units (e.g., 150000 centavos)
   * @param currency - Currency value object
   * @throws {InvalidAmountError} If amount is negative or invalid
   */
  static fromMinorUnits(value: number, currency: Currency): Amount {
    if (value < 0) {
      throw new InvalidAmountError(
        `Amount cannot be negative. Received: ${value}`,
      );
    }

    if (!Number.isFinite(value)) {
      throw new InvalidAmountError(
        `Amount must be a finite number. Received: ${value}`,
      );
    }

    if (!Number.isInteger(value)) {
      throw new InvalidAmountError(
        `Minor units must be an integer. Received: ${value}`,
      );
    }

    return new Amount({
      value,
      currency,
    });
  }

  /**
   * Get the amount in minor units (centavos)
   */
  get valueInMinorUnits(): number {
    return this._entity.value;
  }

  /**
   * Get the amount in major units (pesos)
   */
  get valueInMajorUnits(): number {
    return this._entity.currency.toMajorUnits(this._entity.value);
  }

  /**
   * Get the currency
   */
  get currency(): Currency {
    return this._entity.currency;
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this._entity.value === 0;
  }

  /**
   * Check if amount is positive
   */
  isPositive(): boolean {
    return this._entity.value > 0;
  }

  /**
   * Add another amount
   * @throws {InvalidAmountError} If currencies don't match
   */
  add(other: Amount): Amount {
    if (!this._entity.currency.equals(other.currency)) {
      throw new InvalidAmountError(
        `Cannot add amounts with different currencies: ${this._entity.currency.code} and ${other.currency.code}`,
      );
    }

    return Amount.fromMinorUnits(
      this._entity.value + other.valueInMinorUnits,
      this._entity.currency,
    );
  }

  /**
   * Subtract another amount
   * @throws {InvalidAmountError} If currencies don't match or result is negative
   */
  subtract(other: Amount): Amount {
    if (!this._entity.currency.equals(other.currency)) {
      throw new InvalidAmountError(
        `Cannot subtract amounts with different currencies: ${this._entity.currency.code} and ${other.currency.code}`,
      );
    }

    const result = this._entity.value - other.valueInMinorUnits;

    if (result < 0) {
      throw new InvalidAmountError(
        `Cannot subtract amounts resulting in negative value`,
      );
    }

    return Amount.fromMinorUnits(result, this._entity.currency);
  }

  /**
   * Compare with another amount
   */
  equals(other: Amount): boolean {
    return (
      this._entity.value === other.valueInMinorUnits &&
      this._entity.currency.equals(other.currency)
    );
  }

  /**
   * Check if greater than another amount
   * @throws {InvalidAmountError} If currencies don't match
   */
  greaterThan(other: Amount): boolean {
    if (!this._entity.currency.equals(other.currency)) {
      throw new InvalidAmountError(
        `Cannot compare amounts with different currencies: ${this._entity.currency.code} and ${other.currency.code}`,
      );
    }

    return this._entity.value > other.valueInMinorUnits;
  }

  /**
   * Check if less than another amount
   * @throws {InvalidAmountError} If currencies don't match
   */
  lessThan(other: Amount): boolean {
    if (!this._entity.currency.equals(other.currency)) {
      throw new InvalidAmountError(
        `Cannot compare amounts with different currencies: ${this._entity.currency.code} and ${other.currency.code}`,
      );
    }

    return this._entity.value < other.valueInMinorUnits;
  }

  /**
   * Format amount for display
   * For MXN: 150000 centavos -> "MXN 1,500.00"
   */
  format(): string {
    const major = this.valueInMajorUnits;
    const formatted = major.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${this._entity.currency.code} ${formatted}`;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.format();
  }
}
