import { Inject, Injectable } from '@nestjs/common';
import { Client, CheckoutAPI, EnvironmentEnum } from '@adyen/api-library';
import type {
  IAdyenClient,
  IAdyenPaymentMethodsRequest,
  IAdyenPaymentMethodsResponse,
  IAdyenPaymentRequest,
  IAdyenPaymentResponse,
  IAdyenPaymentDetailsRequest,
} from '../../domain/contracts/adyen-client.interface';
import type { ILogger } from '../../domain/contracts/logger.interface';
import type { IEnvironmentService } from '../../domain/contracts/environment-service.interface';
import { INFRASTRUCTURE_TOKENS } from '../../application/config/tokens';
import { PaymentProcessingError } from '../../domain/errors/payment-processing.error';
import type {
  IAdyenLibraryPaymentMethodsResponse,
  IAdyenLibraryPaymentResponse,
  IAdyenLibraryPaymentDetails,
} from './adyen-library-types';

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
      // Type assertion needed for Adyen library ChannelEnum compatibility
      type AdyenChannel = 'Web' | 'iOS' | 'Android';
      const response = await this.checkout.PaymentsApi.paymentMethods({
        merchantAccount: request.merchantAccount,
        countryCode: request.countryCode,
        amount: request.amount,
        shopperLocale: request.shopperLocale,
        channel: request.channel as AdyenChannel as never,
      });

      this.logger.info('Adyen /paymentMethods response received', {
        paymentMethodsCount: response.paymentMethods?.length || 0,
      });

      // Map Adyen library response to our interface
      const typedResponse = response as IAdyenLibraryPaymentMethodsResponse;
      return {
        paymentMethods: (typedResponse.paymentMethods || []).map((pm) => ({
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
      // Type assertion needed for Adyen library ChannelEnum compatibility
      type AdyenChannel = 'Web' | 'iOS' | 'Android';
      const response = await this.checkout.PaymentsApi.payments({
        merchantAccount: request.merchantAccount,
        amount: request.amount,
        reference: request.reference,
        paymentMethod: request.paymentMethod as Record<string, unknown>,
        returnUrl: request.returnUrl,
        shopperEmail: request.shopperEmail,
        shopperReference: request.shopperReference,
        countryCode: request.countryCode,
        channel: request.channel as AdyenChannel as never,
      });

      this.logger.info('Adyen /payments response received', {
        pspReference: response.pspReference,
        resultCode: response.resultCode,
        actionType: response.action?.type,
      });

      // Map Adyen library response to our interface
      const typedResponse = response as IAdyenLibraryPaymentResponse;
      const action = typedResponse.action;

      return {
        pspReference: typedResponse.pspReference,
        resultCode: typedResponse.resultCode || 'Unknown',
        action: action
          ? {
              type: action.type || '',
              paymentMethodType: action.paymentMethodType,
              url: action.url,
              method: action.method,
              data: action.data,
            }
          : undefined,
        refusalReason: typedResponse.refusalReason,
        refusalReasonCode: typedResponse.refusalReasonCode,
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

  /**
   * Submit payment details to complete a payment transaction
   * Used for redirect flows and 3DS authentication completions
   *
   * @param request - Payment details request
   * @returns Adyen payment response
   * @throws PaymentProcessingError if API call fails
   */
  async submitPaymentDetails(
    request: IAdyenPaymentDetailsRequest,
  ): Promise<IAdyenPaymentResponse> {
    this.logger.info('Calling Adyen /payments/details endpoint', {
      hasRedirectResult: !!request.redirectResult,
      hasThreeDSResult: !!request.threeDSResult,
      hasClassic3DS: !!(request.md && request.paRes),
    });

    try {
      // Prepare details object based on available fields
      const details: IAdyenLibraryPaymentDetails = {};

      if (request.redirectResult) {
        details.redirectResult = request.redirectResult;
      }
      if (request.threeDSResult) {
        details.threeDSResult = request.threeDSResult;
      }
      if (request.md) {
        details.MD = request.md;
      }
      if (request.paRes) {
        details.PaRes = request.paRes;
      }

      // Call Adyen API using official library
      const response = await this.checkout.PaymentsApi.paymentsDetails({
        details: details as Record<string, unknown>,
      });

      this.logger.info('Adyen /payments/details response received', {
        pspReference: response.pspReference,
        resultCode: response.resultCode,
      });

      // Map Adyen library response to our interface
      const typedResponse = response as IAdyenLibraryPaymentResponse;
      const action = typedResponse.action;

      return {
        pspReference: typedResponse.pspReference,
        resultCode: typedResponse.resultCode || 'Unknown',
        action: action
          ? {
              type: action.type || '',
              paymentMethodType: action.paymentMethodType,
              url: action.url,
              method: action.method,
              data: action.data,
            }
          : undefined,
        refusalReason: typedResponse.refusalReason,
        refusalReasonCode: typedResponse.refusalReasonCode,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        'Adyen /payments/details call failed',
        error instanceof Error ? error : undefined,
        {
          message: errorMessage,
          hasRedirectResult: !!request.redirectResult,
          hasThreeDSResult: !!request.threeDSResult,
        },
      );

      throw new PaymentProcessingError(
        'Failed to submit payment details to Adyen',
      );
    }
  }
}
