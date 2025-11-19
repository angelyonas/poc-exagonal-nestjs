import { IsOptional, IsString } from 'class-validator';
import { IPaymentDetailsDTO } from '@/domain/contracts/dtos/payment-details.dto';

/**
 * Payment Details DTO (API Layer)
 * Request DTO for POST /payments/details endpoint
 * Implements domain IPaymentDetailsDTO interface with validation decorators
 */
export class PaymentDetailsDto implements IPaymentDetailsDTO {
  /**
   * Result of redirect flow (e.g., from redirect payment methods)
   */
  @IsOptional()
  @IsString()
  redirectResult?: string;

  /**
   * Result of 3D Secure authentication flow
   */
  @IsOptional()
  @IsString()
  threeDSResult?: string;

  /**
   * MD parameter from classic 3DS flow
   */
  @IsOptional()
  @IsString()
  md?: string;

  /**
   * PaRes parameter from classic 3DS flow
   */
  @IsOptional()
  @IsString()
  paRes?: string;
}
