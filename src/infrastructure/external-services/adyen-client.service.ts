import { Inject, Injectable } from '@nestjs/common';
import { Client, CheckoutAPI, EnvironmentEnum } from '@adyen/api-library';
import type {
  IAdyenClient,
  IAdyenPaymentMethodsRequest,
  IAdyenPaymentMethodsResponse,
  IAdyenPaymentRequest,
  IAdyenPaymentResponse,
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

  /**
   * Create a payment transaction via Adyen
   *
   * @param request - Payment request
   * @returns Adyen payment response
   * @throws PaymentProcessingError if API call fails
   */
  async createPayment(
    request: IAdyenPaymentRequest,
  ): Promise<IAdyenPaymentResponse> {
    this.logger.info('Calling Adyen /payments endpoint', {
      reference: request.reference,
      amount: request.amount.value,
      currency: request.amount.currency,
      paymentMethodType: request.paymentMethod.type,
    });

    try {
      // Call Adyen API using official library
      const response = await this.checkout.PaymentsApi.payments({
        merchantAccount: request.merchantAccount,
        amount: request.amount,
        reference: request.reference,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentMethod: request.paymentMethod as any,
        returnUrl: request.returnUrl,
        shopperEmail: request.shopperEmail,
        shopperReference: request.shopperReference,
        countryCode: request.countryCode,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        channel: request.channel as any, // Adyen library type compatibility
      });

      this.logger.info('Adyen /payments response received', {
        pspReference: response.pspReference,
        resultCode: response.resultCode,
        actionType: response.action?.type,
      });

      // Map Adyen library response to our interface
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const action = response.action as any;

      return {
        pspReference: response.pspReference,
        resultCode: response.resultCode || 'Unknown',
        action: action
          ? {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              type: action.type || '',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              paymentMethodType: action.paymentMethodType,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              url: action.url,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              method: action.method,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              data: action.data,
            }
          : undefined,
        refusalReason: response.refusalReason,
        refusalReasonCode: response.refusalReasonCode,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        'Adyen /payments call failed',
        error instanceof Error ? error : undefined,
        {
          message: errorMessage,
          reference: request.reference,
          paymentMethodType: request.paymentMethod.type,
        },
      );

      throw new PaymentProcessingError('Failed to create payment with Adyen');
    }
  }
}
