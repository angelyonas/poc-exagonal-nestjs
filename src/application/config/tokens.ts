export const HEALTH_TOKENS = {
  GET_HEALTH_USE_CASE: Symbol('IGetHealthUseCase'),
};

export const INFRASTRUCTURE_TOKENS = {
  ENVIRONMENT_SERVICE: Symbol('IEnvironmentService'),
  HTTP_CLIENT: Symbol('IHttpClient'),
  LOGGER: Symbol('ILogger'),
  CACHE: Symbol('ICache'),
  UUID_GENERATOR: Symbol('IUuidGenerator'),
};

export const PAYMENT_METHOD_TOKENS = {
  PAYMENT_METHOD_REPOSITORY: Symbol('IPaymentMethodRepository'),
  GET_PAYMENT_METHODS_USE_CASE: Symbol('IGetPaymentMethodsUseCase'),
  ADYEN_CLIENT: Symbol('IAdyenClient'),
};

export const PAYMENT_TRANSACTION_TOKENS = {
  PAYMENT_TRANSACTION_REPOSITORY: Symbol('IPaymentTransactionRepository'),
  CREATE_PAYMENT_USE_CASE: Symbol('ICreatePaymentUseCase'),
  PROCESS_PAYMENT_DETAILS_USE_CASE: Symbol('IProcessPaymentDetailsUseCase'),
};
