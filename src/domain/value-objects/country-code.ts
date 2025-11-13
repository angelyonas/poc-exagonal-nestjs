import { DomainError } from '../errors/base.error';

/**
 * Invalid country code error
 * Thrown when an invalid ISO-3166-1 alpha-2 country code is provided
 */
export class InvalidCountryCodeError extends DomainError {
  constructor(code: string) {
    super(
      `Invalid country code: ${code}. Must be a valid ISO-3166-1 alpha-2 code (e.g., 'MX', 'US')`,
    );
  }
}

/**
 * Country code value object schema
 */
interface ICountryCodeSchemaValueObject {
  code: string;
}

/**
 * CountryCode value object
 * Represents an ISO-3166-1 alpha-2 country code with validation
 * Currently supports MX (Mexico) and other common country codes
 */
export class CountryCode {
  private static readonly SUPPORTED_COUNTRIES = [
    'MX', // Mexico
    'US', // United States
    'CA', // Canada
    'GB', // United Kingdom
    'DE', // Germany
    'FR', // France
    'ES', // Spain
    'IT', // Italy
    'BR', // Brazil
    'AR', // Argentina
    'CL', // Chile
    'CO', // Colombia
    'PE', // Peru
    'NL', // Netherlands
    'BE', // Belgium
    'AU', // Australia
    'NZ', // New Zealand
    'JP', // Japan
    'CN', // China
    'IN', // India
  ];

  private constructor(
    private readonly _entity: ICountryCodeSchemaValueObject,
  ) {}

  /**
   * Create a CountryCode value object
   * @param code - ISO-3166-1 alpha-2 country code (e.g., 'MX', 'US')
   * @throws {InvalidCountryCodeError} If country code is invalid or not supported
   */
  static create(code: string): CountryCode {
    const normalizedCode = code.toUpperCase().trim();

    // Validate format (must be exactly 2 letters)
    if (!/^[A-Z]{2}$/.test(normalizedCode)) {
      throw new InvalidCountryCodeError(code);
    }

    // Validate against supported countries
    if (!CountryCode.SUPPORTED_COUNTRIES.includes(normalizedCode)) {
      throw new InvalidCountryCodeError(code);
    }

    return new CountryCode({ code: normalizedCode });
  }

  /**
   * Get the country code
   */
  get code(): string {
    return this._entity.code;
  }

  /**
   * Check if country is Mexico
   */
  isMexico(): boolean {
    return this._entity.code === 'MX';
  }

  /**
   * Check if country is United States
   */
  isUnitedStates(): boolean {
    return this._entity.code === 'US';
  }

  /**
   * Check if country is in Latin America
   */
  isLatinAmerica(): boolean {
    const latinAmericanCountries = [
      'MX',
      'BR',
      'AR',
      'CL',
      'CO',
      'PE',
      'VE',
      'EC',
      'GT',
      'CU',
      'BO',
      'DO',
      'HN',
      'PY',
      'SV',
      'NI',
      'CR',
      'PA',
      'UY',
    ];

    return latinAmericanCountries.includes(this._entity.code);
  }

  /**
   * Compare with another CountryCode
   */
  equals(other: CountryCode): boolean {
    return this._entity.code === other.code;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._entity.code;
  }
}
