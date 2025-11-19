import { Inject, Injectable } from '@nestjs/common';
import { IProcessPaymentDetailsUseCase } from '@/domain/contracts/process-payment-details-use-case.interface';
import type { IPaymentDetailsDTO } from '@/domain/contracts/dtos/payment-details.dto';
import type { IPaymentResponseDTO } from '@/domain/contracts/dtos/payment-response.dto';
import type {
  IAdyenClient,
  IAdyenPaymentResponse,
} from '@/domain/contracts/adyen-client.interface';
import type { IPaymentTransactionRepository } from '@/domain/contracts/payment-transaction-repository.interface';
import type { ILogger } from '@/domain/contracts/logger.interface';
import {
  INFRASTRUCTURE_TOKENS,
  PAYMENT_METHOD_TOKENS,
  PAYMENT_TRANSACTION_TOKENS,
} from '@/application/config/tokens';
import { PaymentDetails } from '@/domain/entities/payment-details';
import { PaymentTransaction } from '@/domain/entities/payment-transaction';
import { PaymentProcessingError } from '@/domain/errors/payment-processing.error';
import { NotFoundError } from '@/domain/errors/not-found.error';

/**
 * Use case for processing payment additional details
 * Handles redirect results and 3DS authentication completions
 *
 * Flow:
 * 1. Validate payment details
 * 2. Submit details to Adyen
 * 3. Update payment transaction with final result
 * 4. Return payment response DTO
 */
@Injectable()
export class ProcessPaymentDetailsUseCase
  implements IProcessPaymentDetailsUseCase
{
  constructor(
    @Inject(PAYMENT_METHOD_TOKENS.ADYEN_CLIENT)
    private readonly adyenClient: IAdyenClient,
    @Inject(PAYMENT_TRANSACTION_TOKENS.PAYMENT_TRANSACTION_REPOSITORY)
    private readonly paymentTransactionRepository: IPaymentTransactionRepository,
    @Inject(INFRASTRUCTURE_TOKENS.LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(dto: IPaymentDetailsDTO): Promise<IPaymentResponseDTO> {
    this.logger.info('Processing payment details', {
      hasRedirectResult: !!dto.redirectResult,
      hasThreeDSResult: !!dto.threeDSResult,
      hasClassic3DS: !!(dto.md && dto.paRes),
    });

    // Create PaymentDetails entity for validation
    const paymentDetails = this.createPaymentDetailsEntity(dto);

    try {
      // Submit payment details to Adyen
      const adyenResponse: IAdyenPaymentResponse =
        await this.adyenClient.submitPaymentDetails({
          redirectResult: paymentDetails.redirectResult,
          threeDSResult: paymentDetails.threeDSResult,
          md: paymentDetails.md,
          paRes: paymentDetails.paRes,
        });

      this.logger.info('Payment details processed', {
        resultCode: adyenResponse.resultCode,
        pspReference: adyenResponse.pspReference,
      });

      // Update payment transaction with final result
      await this.updatePaymentTransaction(adyenResponse);

      // Convert to response DTO
      return this.toPaymentResponseDTO(adyenResponse);
    } catch (error) {
      this.logger.error(
        'Failed to process payment details',
        error instanceof Error ? error : undefined,
        {
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      );

      if (error instanceof PaymentProcessingError) {
        throw error;
      }

      throw new PaymentProcessingError(
        'Failed to process payment details',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  private createPaymentDetailsEntity(dto: IPaymentDetailsDTO): PaymentDetails {
    // Determine which factory method to use based on available fields
    if (dto.redirectResult) {
      return PaymentDetails.createFromRedirect(dto.redirectResult);
    }

    if (dto.threeDSResult) {
      return PaymentDetails.createFromThreeDSResult(dto.threeDSResult);
    }

    if (dto.md && dto.paRes) {
      return PaymentDetails.createFrom3DS(dto.md, dto.paRes);
    }

    // Use fromSchema as fallback
    return PaymentDetails.fromSchema(dto);
  }

  private async updatePaymentTransaction(
    adyenResponse: IAdyenPaymentResponse,
  ): Promise<void> {
    if (!adyenResponse.pspReference) {
      this.logger.warn(
        'Cannot update payment transaction: missing PSP reference',
      );
      return;
    }

    try {
      const transaction =
        await this.paymentTransactionRepository.findByPspReference(
          adyenResponse.pspReference,
        );

      if (!transaction) {
        throw new NotFoundError(
          'PaymentTransaction',
          adyenResponse.pspReference,
        );
      }

      // Update transaction based on result code
      const updatedTransaction = this.getUpdatedTransaction(
        transaction,
        adyenResponse,
      );

      await this.paymentTransactionRepository.save(updatedTransaction);
    } catch (error) {
      this.logger.error(
        'Failed to update payment transaction',
        error instanceof Error ? error : undefined,
        {
          pspReference: adyenResponse.pspReference,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      );
      // Don't throw - payment processing succeeded even if we can't update our records
    }
  }

  private toPaymentResponseDTO(
    adyenResponse: IAdyenPaymentResponse,
  ): IPaymentResponseDTO {
    return {
      merchantReference: '', // Not available in details response
      state: this.mapResultCodeToState(adyenResponse.resultCode),
      resultCode: adyenResponse.resultCode,
      pspReference: adyenResponse.pspReference,
      amount: 0, // Not available in details response
      currency: 'MXN', // Default currency
      refusalReason: adyenResponse.refusalReason,
    };
  }

  private mapResultCodeToState(
    resultCode: string,
  ): 'authorised' | 'refused' | 'redirect' | 'error' | 'pending' {
    switch (resultCode) {
      case 'Authorised':
        return 'authorised';
      case 'Refused':
      case 'Cancelled':
        return 'refused';
      case 'Error':
        return 'error';
      case 'Pending':
      case 'Received':
        return 'pending';
      case 'RedirectShopper':
      case 'IdentifyShopper':
      case 'ChallengeShopper':
        return 'redirect';
      default:
        return 'error';
    }
  }

  private getUpdatedTransaction(
    transaction: PaymentTransaction,
    adyenResponse: IAdyenPaymentResponse,
  ): PaymentTransaction {
    switch (adyenResponse.resultCode) {
      case 'Authorised':
        return transaction.withAuthorised(
          adyenResponse.pspReference || '',
          adyenResponse.resultCode,
        );
      case 'Refused':
      case 'Cancelled':
      case 'Error':
        return transaction.withRefused(
          adyenResponse.pspReference || '',
          adyenResponse.refusalReason || adyenResponse.resultCode,
        );
      default:
        this.logger.warn('Unexpected result code from payment details', {
          resultCode: adyenResponse.resultCode,
          pspReference: adyenResponse.pspReference,
        });
        return transaction.withError(
          `Unexpected result code: ${adyenResponse.resultCode}`,
        );
    }
  }
}
