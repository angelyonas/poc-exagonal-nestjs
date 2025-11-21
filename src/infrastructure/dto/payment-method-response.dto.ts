import type { IPaymentMethodResponseDTO } from '../../domain/contracts/dtos/payment-method-response.dto';

/**
 * Payment Method Response DTO (API/Infrastructure)
 * Used for HTTP response serialization in GET /payment-methods endpoint
 *
 * Implements domain contract IPaymentMethodResponseDTO
 */
export class PaymentMethodResponseDto implements IPaymentMethodResponseDTO {
  /**
   * Payment method type (scheme, oxxo, spei, etc.)
   * @example 'scheme'
   */
  type!: string;

  /**
   * Display name for shopper
   * @example 'Credit Card'
   */
  name!: string;

  /**
   * Optional card brands (visa, mc, amex) if applicable
   * @example ['visa', 'mc', 'amex']
   */
  brands?: string[];

  /**
   * Optional payment method-specific configuration
   */
  configuration?: Record<string, unknown>;

  constructor(
    type: string,
    name: string,
    brands?: string[],
    configuration?: Record<string, unknown>,
  ) {
    this.type = type;
    this.name = name;
    this.brands = brands;
    this.configuration = configuration;
  }
}
