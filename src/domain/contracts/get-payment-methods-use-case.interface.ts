import type { IUseCase } from './use-case.interface';
import type { IGetPaymentMethodsDTO } from './dtos/get-payment-methods.dto';
import type { IPaymentMethodResponseDTO } from './dtos/payment-method-response.dto';

/**
 * Get Payment Methods Use Case Interface (Domain Contract)
 * Orchestrates retrieving available payment methods from Adyen
 *
 * Responsibilities:
 * - Call payment method repository to fetch methods
 * - Convert PaymentMethod entities to DTOs
 * - Return payment methods to controller
 */
export type IGetPaymentMethodsUseCase = IUseCase<
  IGetPaymentMethodsDTO,
  IPaymentMethodResponseDTO[]
>;
