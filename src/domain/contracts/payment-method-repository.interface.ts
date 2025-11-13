import type { IGetPaymentMethodsDTO } from './dtos/get-payment-methods.dto';
import type { PaymentMethod } from '../entities/payment-method';

/**
 * Payment Method Repository Interface (Domain Contract)
 * Contract for retrieving available payment methods from Adyen
 *
 * Implementation should handle:
 * - Calling Adyen /paymentMethods endpoint
 * - Caching payment methods (5 min TTL)
 * - Converting Adyen response to domain entities
 */
export interface IPaymentMethodRepository {
  /**
   * Retrieve available payment methods based on shopper context
   *
   * @param filters - Payment method filters (country, currency, amount, etc.)
   * @returns Array of PaymentMethod entities
   * @throws PaymentMethodNotFoundError if no methods available
   * @throws PaymentProcessingError if Adyen API call fails
   */
  getPaymentMethods(filters: IGetPaymentMethodsDTO): Promise<PaymentMethod[]>;
}
