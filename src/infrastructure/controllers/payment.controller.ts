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
import type { IProcessPaymentDetailsUseCase } from '../../domain/contracts/process-payment-details-use-case.interface';
import type { IGetPaymentMethodsDTO } from '../../domain/contracts/dtos/get-payment-methods.dto';
import type { ICreatePaymentDTO } from '../../domain/contracts/dtos/create-payment.dto';
import type { IPaymentDetailsDTO } from '../../domain/contracts/dtos/payment-details.dto';
import {
  PAYMENT_METHOD_TOKENS,
  PAYMENT_TRANSACTION_TOKENS,
} from '../../application/config/tokens';
import { GetPaymentMethodsDto } from '../dto/get-payment-methods.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentDetailsDto } from '../dto/payment-details.dto';
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
 * - POST /payments/details - Submit payment additional details
 */
@Controller()
export class PaymentController {
  constructor(
    @Inject(PAYMENT_METHOD_TOKENS.GET_PAYMENT_METHODS_USE_CASE)
    private readonly getPaymentMethodsUseCase: IGetPaymentMethodsUseCase,
    @Inject(PAYMENT_TRANSACTION_TOKENS.CREATE_PAYMENT_USE_CASE)
    private readonly createPaymentUseCase: ICreatePaymentUseCase,
    @Inject(PAYMENT_TRANSACTION_TOKENS.PROCESS_PAYMENT_DETAILS_USE_CASE)
    private readonly processPaymentDetailsUseCase: IProcessPaymentDetailsUseCase,
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
   * @param body - Payment request data (Adyen format)
   * @param idempotencyKey - Idempotency key from header (required)
   * @returns Payment response with state and action
   * @throws HttpException 400 - Invalid payment data or missing idempotency key
   * @throws HttpException 409 - Duplicate idempotency key with different data
   * @throws HttpException 500 - Payment processing error
   *
   * @example
   * POST /payments
   * X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
   * Body: { reference, amount: { value, currency }, paymentMethod, returnUrl, merchantAccount }
   */
  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Body() body: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    try {
      // Domain DTO is same as API DTO now (Adyen format)
      const domainDto: ICreatePaymentDTO = {
        reference: body.reference,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        returnUrl: body.returnUrl,
        merchantAccount: body.merchantAccount,
        shopperEmail: body.shopperEmail,
        shopperReference: body.shopperReference,
        countryCode: body.countryCode,
      };

      // Call use case with idempotency key
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

  /**
   * POST /payments/details
   * Submit additional payment details to complete a payment transaction
   * Used for redirect flows and 3DS authentication completions
   *
   * @param body - Payment details data
   * @returns Payment response with final state
   * @throws HttpException 400 - Invalid payment details
   * @throws HttpException 404 - Payment transaction not found
   * @throws HttpException 500 - Payment processing error
   *
   * @example
   * POST /payments/details
   * Body: { redirectResult: "Ab02b4c0!..." }
   */
  @Post('payments/details')
  @HttpCode(HttpStatus.OK)
  async submitPaymentDetails(
    @Body() body: PaymentDetailsDto,
  ): Promise<PaymentResponseDto> {
    try {
      // Convert API DTO to Domain DTO
      const domainDto: IPaymentDetailsDTO = {
        redirectResult: body.redirectResult,
        threeDSResult: body.threeDSResult,
        md: body.md,
        paRes: body.paRes,
      };

      // Call use case
      const result = await this.processPaymentDetailsUseCase.execute(domainDto);

      // Return as API response DTO
      return result as PaymentResponseDto;
    } catch (error) {
      // Convert domain errors to HTTP exceptions
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
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
