import type {
  IPaymentResponseDTO,
  IPaymentActionDTO,
} from '../../domain/contracts/dtos/payment-response.dto';

/**
 * Payment Action DTO (API Layer)
 */
export class PaymentActionDto implements IPaymentActionDTO {
  type: string;
  paymentMethodType: string;
  url?: string;
  method?: string;
  data?: Record<string, unknown>;
}

/**
 * Payment Response DTO (API Layer)
 * Response structure for payment operations
 */
export class PaymentResponseDto implements IPaymentResponseDTO {
  merchantReference: string;
  state: string;
  resultCode?: string;
  pspReference?: string;
  amount: number;
  currency: string;
  action?: PaymentActionDto;
  refusalReason?: string;
  errorMessage?: string;
}
