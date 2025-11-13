import { Inject, Injectable } from '@nestjs/common';
import type { IPaymentMethodRepository } from '../../domain/contracts/payment-method-repository.interface';
import type { IAdyenClient } from '../../domain/contracts/adyen-client.interface';
import type { ICache } from '../../domain/contracts/cache.interface';
import type { ILogger } from '../../domain/contracts/logger.interface';
import type { IEnvironmentService } from '../../domain/contracts/environment-service.interface';
import type { IGetPaymentMethodsDTO } from '../../domain/contracts/dtos/get-payment-methods.dto';
import { PaymentMethod } from '../../domain/entities/payment-method';
import {
  PAYMENT_METHOD_TOKENS,
  INFRASTRUCTURE_TOKENS,
} from '../../application/config/tokens';
import { PaymentMethodNotFoundError } from '../../domain/errors/payment-method-not-found.error';

/**
 * Adyen Payment Method Repository
 * Implementation of IPaymentMethodRepository using Adyen API
 *
 * Responsibilities:
 * - Call Adyen client to fetch payment methods
 * - Cache payment methods (5 min TTL)
 * - Convert Adyen response to domain entities
 * - Handle errors
 */
@Injectable()
export class AdyenPaymentMethodRepository implements IPaymentMethodRepository {
  private readonly cacheTtlMs: number = 300000; // 5 minutes

  constructor(
    @Inject(PAYMENT_METHOD_TOKENS.ADYEN_CLIENT)
    private readonly adyenClient: IAdyenClient,
    @Inject(INFRASTRUCTURE_TOKENS.CACHE)
    private readonly cache: ICache,
    @Inject(INFRASTRUCTURE_TOKENS.LOGGER)
    private readonly logger: ILogger,
    @Inject(INFRASTRUCTURE_TOKENS.ENVIRONMENT_SERVICE)
    private readonly env: IEnvironmentService,
  ) {}

  /**
   * Retrieve available payment methods from Adyen with caching
   *
   * @param filters - Payment method filters
   * @returns Array of PaymentMethod entities
   * @throws PaymentMethodNotFoundError if no methods available
   */
  async getPaymentMethods(
    filters: IGetPaymentMethodsDTO,
  ): Promise<PaymentMethod[]> {
    const cacheKey = this.buildCacheKey(filters);

    // Check cache first
    const cached = await this.cache.get<PaymentMethod[]>(cacheKey);
    if (cached) {
      this.logger.info('Payment methods retrieved from cache', {
        cacheKey,
        count: cached.length,
      });
      return cached;
    }

    // Build Adyen request
    const request = {
      countryCode: filters.country,
      currency: filters.currency,
      amount: {
        value: Math.round(filters.amount * 100), // Convert to minor units (centavos)
        currency: filters.currency,
      },
      shopperLocale: filters.shopperLocale,
      channel: filters.platform,
      merchantAccount: this.env.getAdyenMerchantAccount(),
    };

    this.logger.info('Fetching payment methods from Adyen', {
      countryCode: filters.country,
      currency: filters.currency,
      amount: filters.amount,
    });

    // Call Adyen API
    const response = await this.adyenClient.getPaymentMethods(request);

    // Check if payment methods are available
    if (!response.paymentMethods || response.paymentMethods.length === 0) {
      throw new PaymentMethodNotFoundError(
        `No payment methods available for ${filters.country}/${filters.currency}`,
      );
    }

    // Convert to domain entities
    const paymentMethods = response.paymentMethods.map((pm) =>
      PaymentMethod.create(pm.type, pm.name, pm.brands, pm.configuration),
    );

    // Cache the result
    await this.cache.set(cacheKey, paymentMethods, this.cacheTtlMs);

    this.logger.info('Payment methods fetched and cached', {
      count: paymentMethods.length,
      cacheKey,
    });

    return paymentMethods;
  }

  /**
   * Build cache key from filters
   */
  private buildCacheKey(filters: IGetPaymentMethodsDTO): string {
    return `payment-methods:${filters.country}:${filters.currency}:${filters.amount}:${filters.shopperLocale || 'none'}:${filters.platform || 'none'}`;
  }
}
