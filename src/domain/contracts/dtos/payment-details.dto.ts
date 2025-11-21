/**
 * Payment Details DTO
 * Represents additional payment details required to complete a payment transaction
 */
export interface IPaymentDetailsDTO {
  /**
   * Result of redirect flow (e.g., from redirect payment methods)
   */
  redirectResult?: string;

  /**
   * Result of 3D Secure authentication flow
   */
  threeDSResult?: string;

  /**
   * MD parameter from classic 3DS flow
   */
  md?: string;

  /**
   * PaRes parameter from classic 3DS flow
   */
  paRes?: string;
}
