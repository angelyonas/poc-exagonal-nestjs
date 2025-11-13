/**
 * Payment Response DTO (Domain Layer)
 * Output contract for payment operations
 */
export interface IPaymentResponseDTO {
  merchantReference: string;
  state: string; // pending, authorised, refused, redirect, error
  resultCode?: string; // Adyen result code
  pspReference?: string; // Adyen PSP reference
  amount: number; // Amount in minor units (centavos)
  currency: string; // ISO-4217 currency code
  action?: IPaymentActionDTO;
  refusalReason?: string;
  errorMessage?: string;
}

/**
 * Payment action DTO
 */
export interface IPaymentActionDTO {
  type: string; // redirect, threeDS2, voucher, qrCode
  paymentMethodType: string;
  url?: string;
  method?: string;
  data?: Record<string, unknown>;
}
