import { DomainError } from '../errors/base.error';

/**
 * Invalid currency error
 * Thrown when an unsupported currency code is provided
 */
export class InvalidCurrencyError extends DomainError {
  constructor(currency: string, supportedCurrencies: string[]) {
    super(
      `Invalid currency: ${currency}. Supported currencies: ${supportedCurrencies.join(', ')}`,
    );
  }
}

/**
 * Currency value object schema
 */
interface ICurrencySchemaValueObject {
  code: string;
}

/**
 * Currency value object
 * Represents a currency code (ISO-4217) with validation
 * Currently supports MXN (Mexican Peso) as base currency
 */
export class Currency {
  private static readonly SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP'];

  private constructor(private readonly _entity: ICurrencySchemaValueObject) {}

  /**
   * Create a Currency value object
   * @param code - ISO-4217 currency code (e.g., 'MXN', 'USD')
   * @throws {InvalidCurrencyError} If currency code is not supported
   */
  static create(code: string): Currency {
    const normalizedCode = code.toUpperCase();

    if (!Currency.SUPPORTED_CURRENCIES.includes(normalizedCode)) {
      throw new InvalidCurrencyError(code, Currency.SUPPORTED_CURRENCIES);
    }

    return new Currency({ code: normalizedCode });
  }

  /**
   * Get the currency code
   */
  get code(): string {
    return this._entity.code;
  }

  /**
   * Check if currency is MXN
   */
  isMXN(): boolean {
    return this._entity.code === 'MXN';
  }

  /**
   * Check if currency is USD
   */
  isUSD(): boolean {
    return this._entity.code === 'USD';
  }

  /**
   * Compare with another Currency
   */
  equals(other: Currency): boolean {
    return this._entity.code === other.code;
  }

  /**
   * Get the number of minor units (decimal places) for this currency
   * For MXN: 2 (centavos)
   */
  getMinorUnits(): number {
    // Most currencies use 2 decimal places
    return 2;
  }

  /**
   * Convert major units to minor units
   * For MXN: 1500.00 pesos -> 150000 centavos
   */
  toMinorUnits(majorAmount: number): number {
    return Math.round(majorAmount * Math.pow(10, this.getMinorUnits()));
  }

  /**
   * Convert minor units to major units
   * For MXN: 150000 centavos -> 1500.00 pesos
   */
  toMajorUnits(minorAmount: number): number {
    return minorAmount / Math.pow(10, this.getMinorUnits());
  }

  /**
   * String representation
   */
  toString(): string {
    return this._entity.code;
  }
}
