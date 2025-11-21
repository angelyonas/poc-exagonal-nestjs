/**
 * Amount DTO (Domain Layer)
 * Represents payment amount
 */
export interface IAmountDTO {
  currency: string; // ISO-4217 currency code (MXN)
  value: number; // Amount in minor units (centavos)
}

/**
 * Create Payment DTO (Domain Layer)
 * Input contract for creating a new payment transaction
 */
export interface ICreatePaymentDTO {
  reference: string;
  amount: IAmountDTO;
  paymentMethod: IPaymentMethodDataDTO;
  returnUrl: string;
  merchantAccount: string;
  shopperEmail?: string;
  shopperReference?: string;
  countryCode?: string; // ISO-3166-1 alpha-2 country code
}

/**
 * Payment method data DTO
 */
export interface IPaymentMethodDataDTO {
  type: string;
  encryptedCardNumber?: string;
  encryptedExpiryMonth?: string;
  encryptedExpiryYear?: string;
  encryptedSecurityCode?: string;
  [key: string]: unknown; // Allow additional payment method-specific fields
}
