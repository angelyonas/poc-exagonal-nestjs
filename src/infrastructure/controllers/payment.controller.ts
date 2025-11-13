import {
  Controller,
  Get,
  Query,
  Inject,
  HttpStatus,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import type { IGetPaymentMethodsUseCase } from '../../domain/contracts/get-payment-methods-use-case.interface';
import type { IGetPaymentMethodsDTO } from '../../domain/contracts/dtos/get-payment-methods.dto';
import { PAYMENT_METHOD_TOKENS } from '../../application/config/tokens';
import { GetPaymentMethodsDto } from '../dto/get-payment-methods.dto';
import { PaymentMethodResponseDto } from '../dto/payment-method-response.dto';
import { PaymentMethodNotFoundError } from '../../domain/errors/payment-method-not-found.error';
import { PaymentProcessingError } from '../../domain/errors/payment-processing.error';
import { ValidationError } from '../../domain/errors/validation.error';

/**
 * Payment Controller
 * Handles HTTP endpoints for payment operations
 *
 * Endpoints:
 * - GET /payment-methods - Retrieve available payment methods
 */
@Controller('payment-methods')
export class PaymentController {
  constructor(
    @Inject(PAYMENT_METHOD_TOKENS.GET_PAYMENT_METHODS_USE_CASE)
    private readonly getPaymentMethodsUseCase: IGetPaymentMethodsUseCase,
  ) {}

  /**
   * GET /payment-methods
   * Retrieve available payment methods based on shopper context
   *
   * @param query - Query parameters (country, currency, amount, etc.)
   * @returns Array of available payment methods
   * @throws HttpException 400 - Invalid request parameters
   * @throws HttpException 404 - No payment methods available
   * @throws HttpException 500 - Payment processing error
   *
   * @example
   * GET /payment-methods?country=MX&currency=MXN&amount=1500.00&platform=web
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getPaymentMethods(
    @Query() query: GetPaymentMethodsDto,
  ): Promise<PaymentMethodResponseDto[]> {
    try {
      // Convert API DTO to Domain DTO
      const domainFilters: IGetPaymentMethodsDTO = {
        country: query.country,
        currency: query.currency,
        amount: query.amount,
        shopperLocale: query.shopperLocale,
        platform: query.platform,
      };

      // Call use case
      const paymentMethods =
        await this.getPaymentMethodsUseCase.execute(domainFilters);

      // Convert to API response DTOs
      return paymentMethods.map(
        (pm) =>
          new PaymentMethodResponseDto(
            pm.type,
            pm.name,
            pm.brands,
            pm.configuration,
          ),
      );
    } catch (error) {
      // Convert domain errors to HTTP exceptions
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof PaymentMethodNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error instanceof PaymentProcessingError) {
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // Re-throw unknown errors
      throw error;
    }
  }
}
