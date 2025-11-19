import { IUseCase } from './use-case.interface';
import { IPaymentDetailsDTO } from './dtos/payment-details.dto';
import { IPaymentResponseDTO } from './dtos/payment-response.dto';

/**
 * Use case interface for processing payment additional details
 * Handles redirect results and 3DS authentication completions
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IProcessPaymentDetailsUseCase
  extends IUseCase<IPaymentDetailsDTO, IPaymentResponseDTO> {
  // Inherits execute method from IUseCase
}
