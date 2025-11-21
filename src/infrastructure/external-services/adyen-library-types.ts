/**
 * Type definitions for @adyen/api-library
 * These interfaces define the shape of responses from the Adyen library
 * to avoid unsafe type assertions and improve type safety
 */

/**
 * Adyen Action object structure
 * Represents an action required from the shopper (e.g., 3DS redirect, QR code, etc.)
 */
export interface IAdyenLibraryAction {
  type: string;
  paymentMethodType?: string;
  url?: string;
  method?: string;
  data?: Record<string, unknown>;
  paymentData?: string;
  token?: string;
  subtype?: string;
  qrCodeData?: string;
}

/**
 * Adyen Payment Method object structure
 * Represents a payment method available to the shopper
 */
export interface IAdyenLibraryPaymentMethod {
  type?: string;
  name?: string;
  brands?: string[];
  configuration?: Record<string, unknown>;
}

/**
 * Adyen Amount object structure
 */
export interface IAdyenLibraryAmount {
  value: number;
  currency: string;
}

/**
 * Adyen Payment Method Details structure
 * Used when creating a payment
 */
export interface IAdyenLibraryPaymentMethodDetails {
  type: string;
  encryptedCardNumber?: string;
  encryptedExpiryMonth?: string;
  encryptedExpiryYear?: string;
  encryptedSecurityCode?: string;
  holderName?: string;
  storedPaymentMethodId?: string;
  [key: string]: unknown;
}

/**
 * Adyen Payment Methods Response
 */
export interface IAdyenLibraryPaymentMethodsResponse {
  paymentMethods?: IAdyenLibraryPaymentMethod[];
  storedPaymentMethods?: IAdyenLibraryPaymentMethod[];
}

/**
 * Adyen Payment Response
 */
export interface IAdyenLibraryPaymentResponse {
  pspReference?: string;
  resultCode?: string;
  action?: IAdyenLibraryAction;
  refusalReason?: string;
  refusalReasonCode?: string;
  merchantReference?: string;
  additionalData?: Record<string, string>;
}

/**
 * Adyen Payment Details object structure
 * Used for submitting payment details
 */
export interface IAdyenLibraryPaymentDetails {
  redirectResult?: string;
  threeDSResult?: string;
  MD?: string;
  PaRes?: string;
  [key: string]: string | undefined;
}
