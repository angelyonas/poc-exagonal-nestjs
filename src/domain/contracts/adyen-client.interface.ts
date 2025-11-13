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
