import { Inject, Injectable } from '@nestjs/common';
import type { ICreatePaymentUseCase } from '../../domain/contracts/create-payment-use-case.interface';
import type { ICreatePaymentDTO } from '../../domain/contracts/dtos/create-payment.dto';
import type { IPaymentResponseDTO } from '../../domain/contracts/dtos/payment-response.dto';
import type { IAdyenClient } from '../../domain/contracts/adyen-client.interface';
import type { IPaymentTransactionRepository } from '../../domain/contracts/payment-transaction-repository.interface';
import type { ICache } from '../../domain/contracts/cache.interface';
import type { ILogger } from '../../domain/contracts/logger.interface';
import type { IEnvironmentService } from '../../domain/contracts/environment-service.interface';
import { PaymentTransaction } from '../../domain/entities/payment-transaction';
import { DuplicatePaymentError } from '../../domain/errors/duplicate-payment.error';
import { PaymentProcessingError } from '../../domain/errors/payment-processing.error';
import {
  INFRASTRUCTURE_TOKENS,
  PAYMENT_METHOD_TOKENS,
  PAYMENT_TRANSACTION_TOKENS,
} from '../config/tokens';

/**
 * Create Payment Use Case
 * Orchestrates payment creation with idempotency and persistence
 */
@Injectable()
export class CreatePaymentUseCase implements ICreatePaymentUseCase {
  private readonly IDEMPOTENCY_CACHE_PREFIX = 'payment:idempotency:';

  constructor(
    @Inject(PAYMENT_METHOD_TOKENS.ADYEN_CLIENT)
    private readonly adyenClient: IAdyenClient,
    @Inject(PAYMENT_TRANSACTION_TOKENS.PAYMENT_TRANSACTION_REPOSITORY)
    private readonly transactionRepository: IPaymentTransactionRepository,
    @Inject(INFRASTRUCTURE_TOKENS.CACHE)
    private readonly cache: ICache,
    @Inject(INFRASTRUCTURE_TOKENS.LOGGER)
    private readonly logger: ILogger,
    @Inject(INFRASTRUCTURE_TOKENS.ENVIRONMENT_SERVICE)
    private readonly env: IEnvironmentService,
  ) {}

  async execute(input: ICreatePaymentDTO): Promise<IPaymentResponseDTO> {
    this.logger.info('Creating payment', {
      merchantReference: input.merchantReference,
      idempotencyKey: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency,
    });

    // Check idempotency cache
    const cachedResponse = await this.checkIdempotencyCache(
      input.idempotencyKey,
    );
    if (cachedResponse) {
      this.logger.info('Returning cached payment response', {
        idempotencyKey: input.idempotencyKey,
      });
      return cachedResponse;
    }

    // Check for existing transaction with same idempotency key but different data
    const existingTransaction =
      await this.transactionRepository.findByIdempotencyKey(
        input.idempotencyKey,
      );
    if (existingTransaction) {
      // Validate it's the same request
      if (
        existingTransaction.merchantReference !== input.merchantReference ||
        existingTransaction.amountMinorUnits !== input.amount ||
        existingTransaction.currencyCode !== input.currency
      ) {
        throw new DuplicatePaymentError(
          input.idempotencyKey,
          'Idempotency key already used with different payment data',
        );
      }

      // Return existing result if already processed
      if (existingTransaction.isFinalState()) {
        const response = this.entityToDTO(existingTransaction);
        await this.cacheResponse(input.idempotencyKey, response);
        return response;
      }
    }

    // Create pending transaction (persist BEFORE calling Adyen)
    const pendingTransaction = PaymentTransaction.create(
      input.merchantReference,
      input.idempotencyKey,
      input.amount,
      input.currency,
      input.paymentMethodType,
      input.shopperEmail,
      input.shopperReference,
      input.countryCode,
    );

    await this.transactionRepository.save(pendingTransaction);
    this.logger.info('Persisted pending transaction', {
      merchantReference: input.merchantReference,
    });

    try {
      // Call Adyen API
      const adyenResponse = await this.adyenClient.createPayment({
        merchantAccount: this.env.getAdyenMerchantAccount(),
        amount: {
          value: input.amount,
          currency: input.currency,
        },
        reference: input.merchantReference,
        paymentMethod: input.paymentMethod,
        returnUrl: this.buildReturnUrl(input.merchantReference),
        shopperEmail: input.shopperEmail,
        shopperReference: input.shopperReference,
        countryCode: input.countryCode,
        channel: 'web',
      });

      // Update transaction with Adyen response
      const updatedTransaction = this.updateTransactionWithResponse(
        pendingTransaction,
        adyenResponse,
      );
      await this.transactionRepository.save(updatedTransaction);

      this.logger.info('Updated transaction with Adyen response', {
        merchantReference: input.merchantReference,
        resultCode: adyenResponse.resultCode,
        pspReference: adyenResponse.pspReference,
      });

      // Convert to DTO
      const response = this.entityToDTO(updatedTransaction);

      // Cache response
      await this.cacheResponse(input.idempotencyKey, response);

      return response;
    } catch (error) {
      // Update transaction with error state
      const errorTransaction = pendingTransaction.withError(
        error instanceof Error ? error.message : 'Unknown error',
      );
      await this.transactionRepository.save(errorTransaction);

      this.logger.error(
        'Payment processing failed',
        error instanceof Error ? error : new Error('Unknown error'),
      );

      throw new PaymentProcessingError(
        `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check idempotency cache for existing response
   */
  private async checkIdempotencyCache(
    idempotencyKey: string,
  ): Promise<IPaymentResponseDTO | null> {
    const cacheKey = `${this.IDEMPOTENCY_CACHE_PREFIX}${idempotencyKey}`;
    return await this.cache.get<IPaymentResponseDTO>(cacheKey);
  }

  /**
   * Cache payment response for idempotency
   */
  private async cacheResponse(
    idempotencyKey: string,
    response: IPaymentResponseDTO,
  ): Promise<void> {
    const cacheKey = `${this.IDEMPOTENCY_CACHE_PREFIX}${idempotencyKey}`;
    const ttl = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    await this.cache.set(cacheKey, response, ttl);
  }

  /**
   * Update transaction entity with Adyen response
   */
  private updateTransactionWithResponse(
    transaction: PaymentTransaction,
    response: {
      pspReference?: string;
      resultCode: string;
      action?: {
        type: string;
        paymentMethodType?: string;
        url?: string;
        method?: string;
        data?: Record<string, unknown>;
      };
      refusalReason?: string;
    },
  ): PaymentTransaction {
    const pspReference = response.pspReference || '';

    // Handle different result codes
    switch (response.resultCode) {
      case 'Authorised':
        return transaction.withAuthorised(pspReference, response.resultCode);

      case 'Refused':
      case 'Cancelled':
      case 'Error':
        return transaction.withRefused(pspReference, response.resultCode);

      case 'RedirectShopper':
      case 'IdentifyShopper':
      case 'ChallengeShopper':
      case 'PresentToShopper':
        if (response.action) {
          return transaction.withRedirect(
            pspReference,
            response.resultCode,
            response.action.type,
            response.action.url || '',
            response.action.method || 'GET',
            response.action.data,
          );
        }
        return transaction.withError(
          'Action required but no action data provided',
        );

      case 'Pending':
      case 'Received':
        // Keep as pending
        return transaction;

      default:
        return transaction.withError(
          `Unknown result code: ${response.resultCode}`,
        );
    }
  }

  /**
   * Convert transaction entity to DTO
   */
  private entityToDTO(transaction: PaymentTransaction): IPaymentResponseDTO {
    const response: IPaymentResponseDTO = {
      merchantReference: transaction.merchantReference,
      state: transaction.state,
      amount: transaction.amountMinorUnits,
      currency: transaction.currencyCode,
      resultCode: transaction.resultCode || undefined,
      pspReference: transaction.pspReference || undefined,
      refusalReason: transaction.errorMessage || undefined,
      errorMessage: transaction.errorMessage || undefined,
    };

    // Add action if present
    if (transaction.requiresRedirect() && transaction.actionType) {
      response.action = {
        type: transaction.actionType,
        paymentMethodType: transaction.paymentMethodType,
        url: transaction.actionUrl || undefined,
        method: transaction.actionMethod || undefined,
        data: transaction.actionData || undefined,
      };
    }

    return response;
  }

  /**
   * Build return URL for redirects
   */
  private buildReturnUrl(merchantReference: string): string {
    // In production, this should be configurable
    const baseUrl =
      this.env.getNodeEnv() === 'production'
        ? 'https://your-production-domain.com'
        : 'http://localhost:3000';

    return `${baseUrl}/api/payments/return?merchantReference=${merchantReference}`;
  }
}
