export interface IEnvironmentService {
  getNodeEnv(): string;
  getPort(): number;
  isDevelopment(): boolean;
  isProduction(): boolean;
  isTest(): boolean;

  // Adyen Configuration
  getAdyenApiKey(): string;
  getAdyenMerchantAccount(): string;
  getAdyenEnvironment(): string;
  getAdyenApiVersion(): string;
  getAdyenTimeoutMs(): number;
}
