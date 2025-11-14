import type { ICreatePaymentDTO } from './dtos/create-payment.dto';
import type { IPaymentResponseDTO } from './dtos/payment-response.dto';

/**
 * Create Payment Use Case Interface
 * Contract for creating payment transactions
 */
export interface ICreatePaymentUseCase {
  execute(input: ICreatePaymentDTO): Promise<IPaymentResponseDTO>;
}
