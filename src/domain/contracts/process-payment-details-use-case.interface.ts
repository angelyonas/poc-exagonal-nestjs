import { IUseCase } from './use-case.interface';
import { IPaymentDetailsDTO } from './dtos/payment-details.dto';
import { IPaymentResponseDTO } from './dtos/payment-response.dto';

/**
 * Use case interface for processing payment additional details
 * Handles redirect results and 3DS authentication completions
 */
export type IProcessPaymentDetailsUseCase = IUseCase<
  IPaymentDetailsDTO,
  IPaymentResponseDTO
>;
