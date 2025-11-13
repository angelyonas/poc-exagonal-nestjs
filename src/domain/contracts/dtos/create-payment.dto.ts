/**
 * Create Payment DTO (Domain Layer)
 * Input contract for creating a new payment transaction
 */
export interface ICreatePaymentDTO {
  merchantReference: string;
  idempotencyKey: string;
  amount: number; // Amount in minor units (centavos)
  currency: string; // ISO-4217 currency code (MXN)
  paymentMethodType: string;
  shopperEmail?: string;
  shopperReference?: string;
  countryCode?: string; // ISO-3166-1 alpha-2 country code
  paymentMethod: IPaymentMethodDataDTO;
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
