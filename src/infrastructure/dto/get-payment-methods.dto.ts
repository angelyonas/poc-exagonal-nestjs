import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { IGetPaymentMethodsDTO } from '../../domain/contracts/dtos/get-payment-methods.dto';

/**
 * Get Payment Methods Query DTO (API/Infrastructure)
 * Used for validating HTTP query parameters in GET /payment-methods endpoint
 *
 * Implements domain contract IGetPaymentMethodsDTO
 */
export class GetPaymentMethodsDto implements IGetPaymentMethodsDTO {
  /**
   * ISO-3166-1 alpha-2 country code (e.g., MX)
   * @example 'MX'
   */
  @IsString()
  country!: string;

  /**
   * ISO-4217 currency code (e.g., MXN)
   * @example 'MXN'
   */
  @IsString()
  currency!: string;

  /**
   * Transaction amount in major units (pesos)
   * @example 1500.00
   */
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  /**
   * Optional shopper locale (e.g., es-MX)
   * @example 'es-MX'
   */
  @IsOptional()
  @IsString()
  shopperLocale?: string;

  /**
   * Optional payment platform (web, ios, android)
   * @example 'web'
   */
  @IsOptional()
  @IsString()
  platform?: string;
}
