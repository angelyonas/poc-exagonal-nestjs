/**
 * Adyen Client Interface (Domain Contract)
 * Contract for interacting with Adyen Advanced Flow API
 *
 * Implementation should handle:
 * - HTTP calls to Adyen API endpoints
 * - Authentication (API key header)
 * - Error handling and retries
 * - Request/response transformation
 */
export interface IAdyenClient {
  /**
   * Retrieve available payment methods from Adyen /paymentMethods endpoint
   *
   * @param request - Payment methods request data
   * @returns Adyen payment methods response
   * @throws PaymentProcessingError if API call fails
   */
  getPaymentMethods(
    request: IAdyenPaymentMethodsRequest,
  ): Promise<IAdyenPaymentMethodsResponse>;

  /**
   * Create a payment transaction via Adyen /payments endpoint
   *
   * @param request - Payment request data
   * @returns Adyen payment response
   * @throws PaymentProcessingError if API call fails
   */
  createPayment(request: IAdyenPaymentRequest): Promise<IAdyenPaymentResponse>;
}

/**
 * Adyen Payment Methods Request
 * Request structure for /paymentMethods endpoint
 */
export interface IAdyenPaymentMethodsRequest {
  /** ISO-3166-1 alpha-2 country code (e.g., MX) */
  countryCode: string;

  /** ISO-4217 currency code (e.g., MXN) */
  currency: string;

  /** Amount in minor units (centavos) */
  amount: {
    value: number;
    currency: string;
  };

  /** Optional shopper locale (e.g., es-MX) */
  shopperLocale?: string;

  /** Optional payment platform (web, ios, android) */
  channel?: string;

  /** Merchant account identifier */
  merchantAccount: string;
}

/**
 * Adyen Payment Methods Response
 * Response structure from /paymentMethods endpoint
 */
export interface IAdyenPaymentMethodsResponse {
  /** Array of available payment methods */
  paymentMethods: Array<{
    type: string;
    name: string;
    brands?: string[];
    configuration?: Record<string, unknown>;
  }>;
}

/**
 * Adyen Payment Request
 * Request structure for /payments endpoint
 */
export interface IAdyenPaymentRequest {
  /** Merchant account identifier */
  merchantAccount: string;

  /** Payment amount */
  amount: {
    value: number; // Amount in minor units (centavos)
    currency: string; // ISO-4217 currency code
  };

  /** Unique merchant reference */
  reference: string;

  /** Selected payment method */
  paymentMethod: {
    type: string;
    [key: string]: unknown; // Allow payment method-specific fields
  };

  /** Return URL for redirects */
  returnUrl: string;

  /** Optional shopper email */
  shopperEmail?: string;

  /** Optional shopper reference for tokenization */
  shopperReference?: string;

  /** Optional country code */
  countryCode?: string;

  /** Optional channel (web, iOS, Android) */
  channel?: string;
}

/**
 * Adyen Payment Response
 * Response structure from /payments endpoint
 */
export interface IAdyenPaymentResponse {
  /** Adyen PSP reference */
  pspReference?: string;

  /** Payment result code */
  resultCode: string;

  /** Optional action required (redirect, 3DS, etc.) */
  action?: {
    type: string;
    paymentMethodType?: string;
    url?: string;
    method?: string;
    data?: Record<string, unknown>;
  };

  /** Optional refusal reason */
  refusalReason?: string;

  /** Optional refusal reason code */
  refusalReasonCode?: string;
}
