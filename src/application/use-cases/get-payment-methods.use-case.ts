import { Inject, Injectable } from '@nestjs/common';
import type { IGetPaymentMethodsUseCase } from '../../domain/contracts/get-payment-methods-use-case.interface';
import type { IPaymentMethodRepository } from '../../domain/contracts/payment-method-repository.interface';
import type { IGetPaymentMethodsDTO } from '../../domain/contracts/dtos/get-payment-methods.dto';
import type { IPaymentMethodResponseDTO } from '../../domain/contracts/dtos/payment-method-response.dto';
import type { PaymentMethod } from '../../domain/entities/payment-method';
import { PAYMENT_METHOD_TOKENS } from '../config/tokens';

/**
 * Get Payment Methods Use Case
 * Orchestrates retrieving available payment methods from Adyen
 *
 * Responsibilities:
 * - Call payment method repository
 * - Convert PaymentMethod entities to response DTOs
 * - Return payment methods to controller
 *
 * @implements IGetPaymentMethodsUseCase
 */
@Injectable()
export class GetPaymentMethodsUseCase implements IGetPaymentMethodsUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_TOKENS.PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepository: IPaymentMethodRepository,
  ) {}

  /**
   * Execute use case to retrieve payment methods
   *
   * @param filters - Payment method filters (country, currency, amount, etc.)
   * @returns Array of payment method response DTOs
   */
  async execute(
    filters: IGetPaymentMethodsDTO,
  ): Promise<IPaymentMethodResponseDTO[]> {
    // Fetch payment methods from repository (cached)
    const paymentMethods =
      await this.paymentMethodRepository.getPaymentMethods(filters);

    // Convert entities to DTOs
    return paymentMethods.map((method) => this.entityToDTO(method));
  }

  /**
   * Convert PaymentMethod entity to response DTO
   *
   * @param method - PaymentMethod entity
   * @returns Payment method response DTO
   */
  private entityToDTO(method: PaymentMethod): IPaymentMethodResponseDTO {
    return {
      type: method.type,
      name: method.name,
      brands: method.brands,
      configuration: method.configuration,
    };
  }
}
