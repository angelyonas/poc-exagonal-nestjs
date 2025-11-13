import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  ICreatePaymentDTO,
  IPaymentMethodDataDTO,
} from '../../domain/contracts/dtos/create-payment.dto';

/**
 * Payment Method Data DTO (API Layer)
 */
export class PaymentMethodDataDto implements IPaymentMethodDataDTO {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  encryptedCardNumber?: string;

  @IsOptional()
  @IsString()
  encryptedExpiryMonth?: string;

  @IsOptional()
  @IsString()
  encryptedExpiryYear?: string;

  @IsOptional()
  @IsString()
  encryptedSecurityCode?: string;

  // Allow additional payment method-specific fields
  [key: string]: unknown;
}

/**
 * Create Payment DTO (API Layer)
 * Validates incoming POST /payments requests
 */
export class CreatePaymentDto implements ICreatePaymentDTO {
  @IsString()
  @IsNotEmpty()
  merchantReference: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodType: string;

  @IsOptional()
  @IsEmail()
  shopperEmail?: string;

  @IsOptional()
  @IsString()
  shopperReference?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @ValidateNested()
  @Type(() => PaymentMethodDataDto)
  @IsObject()
  @IsNotEmpty()
  paymentMethod: PaymentMethodDataDto;
}
