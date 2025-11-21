/**
 * Get Payment Methods DTO (Domain Contract)
 * Input DTO for retrieving available payment methods based on shopper context
 *
 * Used by GetPaymentMethodsUseCase to fetch payment methods from Adyen
 */
export interface IGetPaymentMethodsDTO {
  /** ISO-3166-1 alpha-2 country code (e.g., MX) */
  country: string;

  /** ISO-4217 currency code (e.g., MXN) */
  currency: string;

  /** Transaction amount in major units (pesos) */
  amount: number;

  /** Optional shopper locale (e.g., es-MX) */
  shopperLocale?: string;

  /** Optional payment platform (web, ios, android) */
  platform?: string;
}
