import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './controllers/health.controller';
import { PaymentController } from './controllers/payment.controller';
import { NestConfigEnvironmentService } from './services/nest-config-environment.service';
import { GetHealthUseCase } from '../application/use-cases/get-health.use-case';
import { GetPaymentMethodsUseCase } from '../application/use-cases/get-payment-methods.use-case';
import { CreatePaymentUseCase } from '../application/use-cases/create-payment.use-case';
import { ProcessPaymentDetailsUseCase } from '../application/use-cases/process-payment-details.use-case';
import { AdyenClientService } from './external-services/adyen-client.service';
import { AdyenPaymentMethodRepository } from './repositories/adyen-payment-method.repository';
import { TypeOrmPaymentTransactionRepository } from './repositories/typeorm-payment-transaction.repository';
import { FetchHttpClient } from './http-client/fetch-http-client';
import { StructuredLogger } from './logger/structured-logger.service';
import { InMemoryCacheService } from './cache/in-memory-cache.service';
import {
  HEALTH_TOKENS,
  INFRASTRUCTURE_TOKENS,
  PAYMENT_METHOD_TOKENS,
  PAYMENT_TRANSACTION_TOKENS,
} from '../application/config/tokens';
import { typeOrmConfig } from './config/typeorm.config';
import { PaymentTransactionEntity } from './orm/payment-transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([PaymentTransactionEntity]),
  ],
  controllers: [HealthController, PaymentController],
  providers: [
    // Infrastructure Services
    {
      provide: INFRASTRUCTURE_TOKENS.ENVIRONMENT_SERVICE,
      useClass: NestConfigEnvironmentService,
    },
    {
      provide: INFRASTRUCTURE_TOKENS.HTTP_CLIENT,
      useFactory: () => {
        // FetchHttpClient doesn't need a baseURL since Adyen services provide full URLs
        return new FetchHttpClient();
      },
    },
    {
      provide: INFRASTRUCTURE_TOKENS.LOGGER,
      useClass: StructuredLogger,
    },
    {
      provide: INFRASTRUCTURE_TOKENS.CACHE,
      useClass: InMemoryCacheService,
    },
    // Health Use Cases
    {
      provide: HEALTH_TOKENS.GET_HEALTH_USE_CASE,
      useClass: GetHealthUseCase,
    },
    // Adyen Client
    {
      provide: PAYMENT_METHOD_TOKENS.ADYEN_CLIENT,
      useClass: AdyenClientService,
    },
    // Payment Method Repository
    {
      provide: PAYMENT_METHOD_TOKENS.PAYMENT_METHOD_REPOSITORY,
      useClass: AdyenPaymentMethodRepository,
    },
    // Payment Method Use Cases
    {
      provide: PAYMENT_METHOD_TOKENS.GET_PAYMENT_METHODS_USE_CASE,
      useClass: GetPaymentMethodsUseCase,
    },
    // Payment Transaction Repository
    {
      provide: PAYMENT_TRANSACTION_TOKENS.PAYMENT_TRANSACTION_REPOSITORY,
      useClass: TypeOrmPaymentTransactionRepository,
    },
    // Payment Transaction Use Cases
    {
      provide: PAYMENT_TRANSACTION_TOKENS.CREATE_PAYMENT_USE_CASE,
      useClass: CreatePaymentUseCase,
    },
    {
      provide: PAYMENT_TRANSACTION_TOKENS.PROCESS_PAYMENT_DETAILS_USE_CASE,
      useClass: ProcessPaymentDetailsUseCase,
    },
  ],
})
export class AppModule {}
