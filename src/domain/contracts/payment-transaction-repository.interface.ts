import type { PaymentTransaction } from '../entities/payment-transaction';

/**
 * Payment Transaction Repository interface
 * Handles persistence of payment transactions
 */
export interface IPaymentTransactionRepository {
  /**
   * Save a payment transaction
   * @param transaction - Payment transaction entity
   * @returns Saved transaction with generated ID
   */
  save(transaction: PaymentTransaction): Promise<PaymentTransaction>;

  /**
   * Find payment transaction by ID
   * @param id - Transaction ID
   * @returns Transaction or null if not found
   */
  findById(id: string): Promise<PaymentTransaction | null>;

  /**
   * Find payment transaction by merchant reference
   * @param merchantReference - Unique merchant reference
   * @returns Transaction or null if not found
   */
  findByMerchantReference(
    merchantReference: string,
  ): Promise<PaymentTransaction | null>;

  /**
   * Find payment transaction by idempotency key
   * @param idempotencyKey - Unique idempotency key
   * @returns Transaction or null if not found
   */
  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PaymentTransaction | null>;

  /**
   * Find payment transaction by PSP reference
   * @param pspReference - Adyen PSP reference
   * @returns Transaction or null if not found
   */
  findByPspReference(pspReference: string): Promise<PaymentTransaction | null>;

  /**
   * Update an existing payment transaction
   * @param transaction - Payment transaction entity with updates
   * @returns Updated transaction
   */
  update(transaction: PaymentTransaction): Promise<PaymentTransaction>;

  /**
   * Delete payment transaction by ID
   * @param id - Transaction ID
   */
  delete(id: string): Promise<void>;
}
