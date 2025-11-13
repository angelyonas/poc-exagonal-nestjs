import { ValidationError } from '../errors/validation.error';

/**
 * Payment action type enum
 */
export enum PaymentActionTypeEnum {
  REDIRECT = 'redirect',
  THREE_DS2 = 'threeDS2',
  VOUCHER = 'voucher',
  QR_CODE = 'qrCode',
}

/**
 * Payment action schema
 */
export interface IPaymentActionSchema {
  type: PaymentActionTypeEnum;
  paymentMethodType: string;
  url?: string;
  method?: string;
  data?: Record<string, unknown>;
}

/**
 * Payment Action entity
 * Represents an additional action required to complete a payment
 */
export class PaymentAction {
  private constructor(private readonly _entity: IPaymentActionSchema) {}

  /**
   * Create a new payment action
   */
  static create(
    type: PaymentActionTypeEnum,
    paymentMethodType: string,
    url?: string,
    method?: string,
    data?: Record<string, unknown>,
  ): PaymentAction {
    if (!paymentMethodType || paymentMethodType.trim().length === 0) {
      throw new ValidationError('Payment method type is required');
    }

    // Validate redirect actions have URL
    if (type === PaymentActionTypeEnum.REDIRECT && !url) {
      throw new ValidationError('Redirect actions must have a URL');
    }

    return new PaymentAction({
      type,
      paymentMethodType: paymentMethodType.trim(),
      url,
      method,
      data,
    });
  }

  /**
   * Create from Adyen action response
   */
  static fromAdyenAction(action: {
    type: string;
    paymentMethodType?: string;
    url?: string;
    method?: string;
    data?: Record<string, unknown>;
  }): PaymentAction {
    // Map Adyen action type to enum
    let actionType: PaymentActionTypeEnum;
    switch (action.type.toLowerCase()) {
      case 'redirect':
        actionType = PaymentActionTypeEnum.REDIRECT;
        break;
      case 'threeds2':
      case 'threeds2challenge':
      case 'threeds2fingerprint':
        actionType = PaymentActionTypeEnum.THREE_DS2;
        break;
      case 'voucher':
        actionType = PaymentActionTypeEnum.VOUCHER;
        break;
      case 'qrcode':
        actionType = PaymentActionTypeEnum.QR_CODE;
        break;
      default:
        throw new ValidationError(`Unsupported action type: ${action.type}`);
    }

    return PaymentAction.create(
      actionType,
      action.paymentMethodType || '',
      action.url,
      action.method,
      action.data,
    );
  }

  /**
   * Create from schema (for repository mapping)
   */
  static fromSchema(schema: IPaymentActionSchema): PaymentAction {
    return new PaymentAction(schema);
  }

  // Getters
  get type(): PaymentActionTypeEnum {
    return this._entity.type;
  }

  get paymentMethodType(): string {
    return this._entity.paymentMethodType;
  }

  get url(): string | undefined {
    return this._entity.url;
  }

  get method(): string | undefined {
    return this._entity.method;
  }

  get data(): Record<string, unknown> | undefined {
    return this._entity.data;
  }

  /**
   * Get the complete schema
   */
  toSchema(): IPaymentActionSchema {
    return { ...this._entity };
  }

  /**
   * Check if action is a redirect
   */
  isRedirect(): boolean {
    return this._entity.type === PaymentActionTypeEnum.REDIRECT;
  }

  /**
   * Check if action is 3D Secure
   */
  is3DSecure(): boolean {
    return this._entity.type === PaymentActionTypeEnum.THREE_DS2;
  }

  /**
   * Check if action is a voucher
   */
  isVoucher(): boolean {
    return this._entity.type === PaymentActionTypeEnum.VOUCHER;
  }

  /**
   * Check if action is a QR code
   */
  isQrCode(): boolean {
    return this._entity.type === PaymentActionTypeEnum.QR_CODE;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      type: this._entity.type,
      paymentMethodType: this._entity.paymentMethodType,
      url: this._entity.url,
      method: this._entity.method,
      data: this._entity.data,
    };
  }
}
