import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Inject,
  HttpStatus,
  HttpCode,
  HttpException,
  Headers,
} from '@nestjs/common';
import type { IGetPaymentMethodsUseCase } from '../../domain/contracts/get-payment-methods-use-case.interface';
import type { ICreatePaymentUseCase } from '../../domain/contracts/create-payment-use-case.interface';
import type { IGetPaymentMethodsDTO } from '../../domain/contracts/dtos/get-payment-methods.dto';
import type { ICreatePaymentDTO } from '../../domain/contracts/dtos/create-payment.dto';
import {
  PAYMENT_METHOD_TOKENS,
  PAYMENT_TRANSACTION_TOKENS,
} from '../../application/config/tokens';
import { GetPaymentMethodsDto } from '../dto/get-payment-methods.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentMethodResponseDto } from '../dto/payment-method-response.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { PaymentMethodNotFoundError } from '../../domain/errors/payment-method-not-found.error';
import { PaymentProcessingError } from '../../domain/errors/payment-processing.error';
import { ValidationError } from '../../domain/errors/validation.error';
import { DuplicatePaymentError } from '../../domain/errors/duplicate-payment.error';
import { InvalidPaymentDataError } from '../../domain/errors/invalid-payment-data.error';

/**
 * Payment Controller
 * Handles HTTP endpoints for payment operations
 *
 * Endpoints:
 * - GET /payment-methods - Retrieve available payment methods
 * - POST /payments - Create payment transaction
 */
@Controller()
export class PaymentController {
  constructor(
    @Inject(PAYMENT_METHOD_TOKENS.GET_PAYMENT_METHODS_USE_CASE)
    private readonly getPaymentMethodsUseCase: IGetPaymentMethodsUseCase,
    @Inject(PAYMENT_TRANSACTION_TOKENS.CREATE_PAYMENT_USE_CASE)
    private readonly createPaymentUseCase: ICreatePaymentUseCase,
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
  @Get('payment-methods')
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

  /**
   * POST /payments
   * Create a new payment transaction
   *
   * @param body - Payment request data
   * @param idempotencyKey - Idempotency key from header
   * @returns Payment response with state and action
   * @throws HttpException 400 - Invalid payment data
   * @throws HttpException 409 - Duplicate idempotency key with different data
   * @throws HttpException 500 - Payment processing error
   *
   * @example
   * POST /payments
   * X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
   * Body: { merchantReference, amount, currency, paymentMethod, ... }
   */
  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Body() body: CreatePaymentDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    try {
      // Use header idempotency key if provided, otherwise use body
      const effectiveIdempotencyKey = idempotencyKey || body.idempotencyKey;

      // Convert API DTO to Domain DTO
      const domainDto: ICreatePaymentDTO = {
        merchantReference: body.merchantReference,
        idempotencyKey: effectiveIdempotencyKey,
        amount: body.amount,
        currency: body.currency,
        paymentMethodType: body.paymentMethodType,
        shopperEmail: body.shopperEmail,
        shopperReference: body.shopperReference,
        countryCode: body.countryCode,
        paymentMethod: body.paymentMethod,
      };

      // Call use case
      const result = await this.createPaymentUseCase.execute(domainDto);

      // Return as API response DTO
      return result as PaymentResponseDto;
    } catch (error) {
      // Convert domain errors to HTTP exceptions
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof InvalidPaymentDataError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof DuplicatePaymentError) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
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
