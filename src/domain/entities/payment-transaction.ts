/**
 * Payment transaction state enum
 */
export enum PaymentTransactionStateEnum {
  PENDING = 'pending',
  AUTHORISED = 'authorised',
  REFUSED = 'refused',
  REDIRECT = 'redirect',
  ERROR = 'error',
}

/**
 * Payment transaction schema
 */
export interface IPaymentTransactionSchema {
  id?: string;
  merchantReference: string;
  idempotencyKey: string;
  pspReference: string | null;
  state: PaymentTransactionStateEnum;
  resultCode: string | null;
  amountMinorUnits: number;
  currencyCode: string;
  paymentMethodType: string;
  shopperEmail: string | null;
  shopperReference: string | null;
  countryCode: string | null;
  actionType: string | null;
  actionUrl: string | null;
  actionMethod: string | null;
  actionData: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Payment Transaction entity
 * Represents a payment attempt with full state tracking
 */
export class PaymentTransaction {
  private constructor(private readonly _entity: IPaymentTransactionSchema) {}

  /**
   * Create a new payment transaction
   */
  static create(
    merchantReference: string,
    idempotencyKey: string,
    amountMinorUnits: number,
    currencyCode: string,
    paymentMethodType: string,
    shopperEmail?: string,
    shopperReference?: string,
    countryCode?: string,
  ): PaymentTransaction {
    return new PaymentTransaction({
      merchantReference,
      idempotencyKey,
      pspReference: null,
      state: PaymentTransactionStateEnum.PENDING,
      resultCode: null,
      amountMinorUnits,
      currencyCode,
      paymentMethodType,
      shopperEmail: shopperEmail ?? null,
      shopperReference: shopperReference ?? null,
      countryCode: countryCode ?? null,
      actionType: null,
      actionUrl: null,
      actionMethod: null,
      actionData: null,
      errorMessage: null,
    });
  }

  /**
   * Create from schema (for repository mapping)
   */
  static fromSchema(schema: IPaymentTransactionSchema): PaymentTransaction {
    return new PaymentTransaction(schema);
  }

  // Getters
  get id(): string | undefined {
    return this._entity.id;
  }

  get merchantReference(): string {
    return this._entity.merchantReference;
  }

  get idempotencyKey(): string {
    return this._entity.idempotencyKey;
  }

  get pspReference(): string | null {
    return this._entity.pspReference;
  }

  get state(): PaymentTransactionStateEnum {
    return this._entity.state;
  }

  get resultCode(): string | null {
    return this._entity.resultCode;
  }

  get amountMinorUnits(): number {
    return this._entity.amountMinorUnits;
  }

  get currencyCode(): string {
    return this._entity.currencyCode;
  }

  get paymentMethodType(): string {
    return this._entity.paymentMethodType;
  }

  get shopperEmail(): string | null {
    return this._entity.shopperEmail;
  }

  get shopperReference(): string | null {
    return this._entity.shopperReference;
  }

  get countryCode(): string | null {
    return this._entity.countryCode;
  }

  get actionType(): string | null {
    return this._entity.actionType;
  }

  get actionUrl(): string | null {
    return this._entity.actionUrl;
  }

  get actionMethod(): string | null {
    return this._entity.actionMethod;
  }

  get actionData(): Record<string, unknown> | null {
    return this._entity.actionData;
  }

  get errorMessage(): string | null {
    return this._entity.errorMessage;
  }

  get createdAt(): Date | undefined {
    return this._entity.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._entity.updatedAt;
  }

  /**
   * Get the complete schema (for repository persistence)
   */
  toSchema(): IPaymentTransactionSchema {
    return { ...this._entity };
  }

  /**
   * State transition: mark as authorised
   */
  withAuthorised(pspReference: string, resultCode: string): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      pspReference,
      state: PaymentTransactionStateEnum.AUTHORISED,
      resultCode,
    });
  }

  /**
   * State transition: mark as refused
   */
  withRefused(pspReference: string, resultCode: string): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      pspReference,
      state: PaymentTransactionStateEnum.REFUSED,
      resultCode,
    });
  }

  /**
   * State transition: mark as redirect required
   */
  withRedirect(
    pspReference: string,
    resultCode: string,
    actionType: string,
    actionUrl: string,
    actionMethod: string,
    actionData?: Record<string, unknown>,
  ): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      pspReference,
      state: PaymentTransactionStateEnum.REDIRECT,
      resultCode,
      actionType,
      actionUrl,
      actionMethod,
      actionData: actionData ?? null,
    });
  }

  /**
   * State transition: mark as error
   */
  withError(errorMessage: string): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      state: PaymentTransactionStateEnum.ERROR,
      errorMessage,
    });
  }

  /**
   * Check if payment is pending
   */
  isPending(): boolean {
    return this._entity.state === PaymentTransactionStateEnum.PENDING;
  }

  /**
   * Check if payment is authorised
   */
  isAuthorised(): boolean {
    return this._entity.state === PaymentTransactionStateEnum.AUTHORISED;
  }

  /**
   * Check if payment is refused
   */
  isRefused(): boolean {
    return this._entity.state === PaymentTransactionStateEnum.REFUSED;
  }

  /**
   * Check if payment requires redirect
   */
  requiresRedirect(): boolean {
    return this._entity.state === PaymentTransactionStateEnum.REDIRECT;
  }

  /**
   * Check if payment has error
   */
  hasError(): boolean {
    return this._entity.state === PaymentTransactionStateEnum.ERROR;
  }

  /**
   * Check if payment is in final state
   */
  isFinalState(): boolean {
    return this.isAuthorised() || this.isRefused() || this.hasError();
  }
}
