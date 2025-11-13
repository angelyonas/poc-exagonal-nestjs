import { Inject, Injectable } from '@nestjs/common';
import { Client, CheckoutAPI, EnvironmentEnum } from '@adyen/api-library';
import type {
  IAdyenClient,
  IAdyenPaymentMethodsRequest,
  IAdyenPaymentMethodsResponse,
} from '../../domain/contracts/adyen-client.interface';
import type { ILogger } from '../../domain/contracts/logger.interface';
import type { IEnvironmentService } from '../../domain/contracts/environment-service.interface';
import { INFRASTRUCTURE_TOKENS } from '../../application/config/tokens';
import { PaymentProcessingError } from '../../domain/errors/payment-processing.error';

/**
 * Adyen Client Service
 * Implementation of IAdyenClient for Adyen Advanced Flow API integration
 * Uses official @adyen/api-library
 *
 * Responsibilities:
 * - Call Adyen /paymentMethods endpoint
 * - Handle authentication (API key)
 * - Transform requests/responses
 * - Error handling and logging
 */
@Injectable()
export class AdyenClientService implements IAdyenClient {
  private readonly client: Client;
  private readonly checkout: CheckoutAPI;
  private readonly merchantAccount: string;

  constructor(
    @Inject(INFRASTRUCTURE_TOKENS.LOGGER)
    private readonly logger: ILogger,
    @Inject(INFRASTRUCTURE_TOKENS.ENVIRONMENT_SERVICE)
    private readonly env: IEnvironmentService,
  ) {
    // Load Adyen configuration from environment
    const apiKey = this.env.getAdyenApiKey();
    this.merchantAccount = this.env.getAdyenMerchantAccount();
    const environment = this.env.getAdyenEnvironment();

    // Initialize Adyen client
    this.client = new Client({
      apiKey,
      environment:
        environment === 'LIVE' ? EnvironmentEnum.LIVE : EnvironmentEnum.TEST,
    });
    this.checkout = new CheckoutAPI(this.client);

    this.logger.info('AdyenClientService initialized', {
      environment,
      merchantAccount: this.merchantAccount,
      libraryVersion: 'v71',
    });
  }

  /**
   * Retrieve available payment methods from Adyen
   *
   * @param request - Payment methods request
   * @returns Adyen payment methods response
   * @throws PaymentProcessingError if API call fails
   */
  async getPaymentMethods(
    request: IAdyenPaymentMethodsRequest,
  ): Promise<IAdyenPaymentMethodsResponse> {
    this.logger.info('Calling Adyen /paymentMethods endpoint', {
      countryCode: request.countryCode,
      currency: request.currency,
      amount: request.amount.value,
    });

    try {
      // Call Adyen API using official library
      const response = await this.checkout.PaymentsApi.paymentMethods({
        merchantAccount: request.merchantAccount,
        countryCode: request.countryCode,
        amount: request.amount,
        shopperLocale: request.shopperLocale,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        channel: request.channel as any, // Adyen library type compatibility
      });

      this.logger.info('Adyen /paymentMethods response received', {
        paymentMethodsCount: response.paymentMethods?.length || 0,
      });

      // Map Adyen library response to our interface
      return {
        paymentMethods: (response.paymentMethods || []).map((pm) => ({
          type: pm.type || '',
          name: pm.name || '',
          brands: pm.brands,
          configuration: pm.configuration as Record<string, unknown>,
        })),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        'Adyen /paymentMethods call failed',
        error instanceof Error ? error : undefined,
        {
          message: errorMessage,
          countryCode: request.countryCode,
          currency: request.currency,
        },
      );

      throw new PaymentProcessingError(
        'Failed to retrieve payment methods from Adyen',
      );
    }
  }
}
