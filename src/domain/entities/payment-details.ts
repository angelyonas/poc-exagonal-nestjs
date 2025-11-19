import { ValidationError } from '../errors/validation.error';

export interface IPaymentDetailsSchema {
  redirectResult?: string;
  threeDSResult?: string;
  md?: string;
  paRes?: string;
}

/**
 * PaymentDetails entity
 * Represents additional payment details required to complete a payment transaction
 * Used for handling redirect flows and 3DS authentication
 */
export class PaymentDetails {
  private constructor(private readonly _entity: IPaymentDetailsSchema) {}

  /**
   * Create PaymentDetails from redirect result
   * @param redirectResult - The redirect result from payment provider
   * @returns PaymentDetails instance
   */
  static createFromRedirect(redirectResult: string): PaymentDetails {
    if (!redirectResult || redirectResult.trim().length === 0) {
      throw new ValidationError(
        'Redirect result is required',
        'redirectResult',
      );
    }

    return new PaymentDetails({
      redirectResult: redirectResult.trim(),
    });
  }

  /**
   * Create PaymentDetails from 3D Secure authentication
   * @param md - The MD parameter from 3DS flow
   * @param paRes - The PaRes parameter from 3DS flow
   * @returns PaymentDetails instance
   */
  static createFrom3DS(md: string, paRes: string): PaymentDetails {
    if (!md || md.trim().length === 0) {
      throw new ValidationError('MD parameter is required', 'md');
    }

    if (!paRes || paRes.trim().length === 0) {
      throw new ValidationError('PaRes parameter is required', 'paRes');
    }

    return new PaymentDetails({
      md: md.trim(),
      paRes: paRes.trim(),
    });
  }

  /**
   * Create PaymentDetails from generic 3DS result
   * @param threeDSResult - The 3DS authentication result
   * @returns PaymentDetails instance
   */
  static createFromThreeDSResult(threeDSResult: string): PaymentDetails {
    if (!threeDSResult || threeDSResult.trim().length === 0) {
      throw new ValidationError('3DS result is required', 'threeDSResult');
    }

    return new PaymentDetails({
      threeDSResult: threeDSResult.trim(),
    });
  }

  /**
   * Create PaymentDetails from schema
   * @param schema - The payment details schema
   * @returns PaymentDetails instance
   */
  static fromSchema(schema: IPaymentDetailsSchema): PaymentDetails {
    // Validate that at least one field is provided
    const hasRedirect =
      schema.redirectResult && schema.redirectResult.trim().length > 0;
    const hasThreeDS =
      schema.threeDSResult && schema.threeDSResult.trim().length > 0;
    const hasClassic3DS = schema.md && schema.paRes;

    if (!hasRedirect && !hasThreeDS && !hasClassic3DS) {
      throw new ValidationError(
        'At least one payment detail field is required',
      );
    }

    return new PaymentDetails(schema);
  }

  // Getters
  get redirectResult(): string | undefined {
    return this._entity.redirectResult;
  }

  get threeDSResult(): string | undefined {
    return this._entity.threeDSResult;
  }

  get md(): string | undefined {
    return this._entity.md;
  }

  get paRes(): string | undefined {
    return this._entity.paRes;
  }

  /**
   * Check if payment details are for redirect flow
   */
  isRedirectFlow(): boolean {
    return !!this._entity.redirectResult;
  }

  /**
   * Check if payment details are for 3DS flow
   */
  is3DSFlow(): boolean {
    return (
      !!this._entity.threeDSResult ||
      (!!this._entity.md && !!this._entity.paRes)
    );
  }

  /**
   * Check if payment details are for classic 3DS flow (MD/PaRes)
   */
  isClassic3DS(): boolean {
    return !!this._entity.md && !!this._entity.paRes;
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject(): IPaymentDetailsSchema {
    return {
      redirectResult: this._entity.redirectResult,
      threeDSResult: this._entity.threeDSResult,
      md: this._entity.md,
      paRes: this._entity.paRes,
    };
  }
}
