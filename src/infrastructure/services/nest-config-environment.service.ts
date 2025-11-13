import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEnvironmentService } from '../../domain/contracts/environment-service.interface';

@Injectable()
export class NestConfigEnvironmentService implements IEnvironmentService {
  constructor(private readonly configService: ConfigService) {}

  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') || 'development';
  }

  getPort(): number {
    const port = this.configService.get<string>('PORT');
    return port ? parseInt(port, 10) : 3000;
  }

  isDevelopment(): boolean {
    return this.getNodeEnv() === 'development';
  }

  isProduction(): boolean {
    return this.getNodeEnv() === 'production';
  }

  isTest(): boolean {
    return this.getNodeEnv() === 'test';
  }

  // Adyen Configuration
  getAdyenApiKey(): string {
    return this.configService.get<string>('ADYEN_API_KEY') || '';
  }

  getAdyenMerchantAccount(): string {
    return this.configService.get<string>('ADYEN_MERCHANT_ACCOUNT') || '';
  }

  getAdyenEnvironment(): string {
    return this.configService.get<string>('ADYEN_ENVIRONMENT') || 'TEST';
  }

  getAdyenApiVersion(): string {
    return this.configService.get<string>('ADYEN_API_VERSION') || '71';
  }

  getAdyenTimeoutMs(): number {
    const timeout = this.configService.get<string>('ADYEN_TIMEOUT_MS');
    return timeout ? parseInt(timeout, 10) : 30000;
  }
}
