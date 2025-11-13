/**
 * Payment Method Response DTO (Domain Contract)
 * Output DTO for payment method data returned to clients
 *
 * Used by GetPaymentMethodsUseCase to return payment method information
 */
export interface IPaymentMethodResponseDTO {
  /** Payment method type (scheme, oxxo, spei, etc.) */
  type: string;

  /** Display name for shopper */
  name: string;

  /** Optional card brands (visa, mc, amex) if applicable */
  brands?: string[];

  /** Optional payment method-specific configuration */
  configuration?: Record<string, unknown>;
}
