# Implementation Plan: Adyen Advanced Flow Payment Integration

**Branch**: `001-adyen-payment-integration` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-adyen-payment-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate Adyen Advanced Flow payment processing to enable merchants to retrieve available payment methods and process payment transactions. The system will support MXN (Mexican Pesos) as the base currency, handle encrypted card data for PCI compliance, implement client-provided idempotency keys for duplicate prevention, and manage payment state transitions with comprehensive audit trails. The implementation follows hexagonal architecture with strict layer separation: domain layer for business logic, application layer for orchestration use cases, and infrastructure layer for Adyen API integration and data persistence.

## Technical Context

**Language/Version**: Node.js 22.x, TypeScript 5.x  
**Primary Dependencies**: 
- NestJS 11 (web framework)
- @adyen/api-library (official Adyen Node.js SDK - v71+)
- class-validator, class-transformer (DTO validation)
- TypeORM (PostgreSQL ORM)
- Jest (testing framework)

**Storage**: PostgreSQL 14+ with TypeORM (repository pattern with entity mapping)  
**Testing**: Jest with 95% lines/statements, 90% branches/functions coverage  
**Target Platform**: Backend microservice (single bounded context)
**Project Type**: Single NestJS microservice following hexagonal architecture  
**Performance Goals**: 
- Payment method retrieval: <2s for 95% of requests, <100ms for cached requests (99%)
- Payment processing: 100 concurrent transactions without degradation
- API timeouts: Handled by @adyen/api-library (configurable via Client options)
**Constraints**: 
- PCI DSS compliance (SAQ-A): encrypted card data only
- Adyen API version 71+ (managed by @adyen/api-library)
- MXN base currency with minor units (centavos)
- Idempotency: 24-hour cache for duplicate prevention
- Logging: masked sensitive fields with correlation IDs
**Scale/Scope**: 
- 3 primary use cases (payment methods, initiate payment, handle additional actions)
- 4 key entities (PaymentMethod, PaymentTransaction, PaymentAction, PaymentDetails)
- 17 functional requirements, 8 non-functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Hexagonal Architecture (NON-NEGOTIABLE)
- **Domain Layer**: Payment entities (PaymentMethod, PaymentTransaction, PaymentAction, PaymentDetails) with `_entity` schema pattern, value objects for validation, interfaces (I-prefix including IAdyenClient), DTOs (I-prefix + DTO-suffix), domain errors
- **Application Layer**: Use cases implementing `IUseCase<TInput, TOutput>` (GetPaymentMethodsUseCase, CreatePaymentUseCase, ProcessPaymentDetailsUseCase) with max 3 dependencies, orchestration only
- **Infrastructure Layer**: AdyenClientService (wraps @adyen/api-library), repositories, controllers, API DTOs with class-validator decorators, environment configuration service
- **Status**: ✅ PASS - No forbidden imports, strict layer boundaries maintained, Adyen SDK only in infrastructure

### ✅ Single Microservice Pattern
- Single bounded context: Payment processing
- Direct `src/domain/`, `src/application/`, `src/infrastructure/` structure
- All DI in `app.module.ts` using Symbol-based tokens
- **Status**: ✅ PASS - No nested modules, utilities in infrastructure layer

### ✅ Test-First Development (NON-NEGOTIABLE)
- Controller tests: Verify API endpoints with NestJS Test.createTestingModule()
- Use case tests: Mock repositories, verify orchestration
- Domain tests: Pure unit tests for entities and value objects
- Coverage: 95% lines/statements, 90% branches/functions
- **Status**: ✅ PASS - Test strategy aligns with constitution

### ✅ Domain-Driven Design
- Entities: PaymentMethod, PaymentTransaction with immutable state, private constructor, static factory methods
- Value objects: Amount (with MXN validation), PaymentReference, IdempotencyKey
- Domain errors: PaymentMethodNotFoundError, InvalidPaymentDataError, DuplicatePaymentError
- **Status**: ✅ PASS - Business logic isolated in domain layer

### ✅ Interface Segregation & Dependency Inversion
- Interfaces: `IPaymentMethodRepository`, `IPaymentTransactionRepository`, `IAdyenClient`, `IHttpClient`, `ICache`
- Domain DTOs: `IGetPaymentMethodsDTO`, `ICreatePaymentDTO`, `IPaymentDetailsDTO`
- API DTOs: Classes with class-validator decorators implementing domain DTOs
- Symbol-based DI tokens in `application/config/tokens.ts`
- **Status**: ✅ PASS - Interface-first design, no direct node_modules imports in domain/application

### ✅ Explicit DTO Flow
- Domain DTOs: Interfaces in `domain/contracts/dtos/`
- API DTOs: Classes in `infrastructure/dto/` with validation decorators
- Flow: Controller → API DTO → Domain DTO → Use Case → Domain DTO → Controller → API Response
- **Status**: ✅ PASS - Clear separation between domain contracts and API validation

### ✅ Observability & Error Handling
- Domain errors: PaymentMethodNotFoundError, InvalidPaymentDataError, PaymentProcessingError
- Controllers: Convert domain errors to HttpException with proper HttpStatus codes
- Logging: Full request/response with masked sensitive fields, correlation IDs, latency metrics
- **Status**: ✅ PASS - Structured error handling, comprehensive logging strategy

### Summary
**All gates PASSED** ✅ - Ready to proceed with Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── contracts/
│   │   ├── adyen-client.interface.ts           # IAdyenClient
│   │   ├── payment-method-repository.interface.ts  # IPaymentMethodRepository
│   │   ├── payment-transaction-repository.interface.ts  # IPaymentTransactionRepository
│   │   ├── cache.interface.ts                  # ICache
│   │   ├── get-payment-methods-use-case.interface.ts  # IGetPaymentMethodsUseCase
│   │   ├── create-payment-use-case.interface.ts      # ICreatePaymentUseCase
│   │   ├── process-payment-details-use-case.interface.ts  # IProcessPaymentDetailsUseCase
│   │   └── dtos/
│   │       ├── get-payment-methods.dto.ts      # IGetPaymentMethodsDTO
│   │       ├── payment-method-response.dto.ts  # IPaymentMethodResponseDTO
│   │       ├── create-payment.dto.ts           # ICreatePaymentDTO
│   │       ├── payment-response.dto.ts         # IPaymentResponseDTO
│   │       ├── payment-details.dto.ts          # IPaymentDetailsDTO
│   │       └── pagination-result.dto.ts        # IPaginationResult
│   ├── entities/
│   │   ├── payment-method.ts                   # PaymentMethod entity
│   │   ├── payment-transaction.ts              # PaymentTransaction entity
│   │   ├── payment-action.ts                   # PaymentAction entity
│   │   └── payment-details.ts                  # PaymentDetails entity
│   ├── value-objects/
│   │   ├── amount.ts                           # Amount value object (MXN validation)
│   │   ├── payment-reference.ts                # PaymentReference value object
│   │   ├── idempotency-key.ts                  # IdempotencyKey value object
│   │   ├── currency.ts                         # Currency value object
│   │   └── country-code.ts                     # CountryCode value object
│   └── errors/
│       ├── payment-method-not-found.error.ts   # Domain error
│       ├── invalid-payment-data.error.ts       # Domain error
│       ├── duplicate-payment.error.ts          # Domain error
│       └── payment-processing.error.ts         # Domain error
│
├── application/
│   ├── use-cases/
│   │   ├── get-payment-methods.use-case.ts     # GetPaymentMethodsUseCase
│   │   ├── create-payment.use-case.ts          # CreatePaymentUseCase
│   │   └── process-payment-details.use-case.ts # ProcessPaymentDetailsUseCase
│   └── config/
│       └── tokens.ts                           # DI tokens using Symbol()
│
└── infrastructure/
    ├── repositories/
    │   ├── payment-method.repository.ts        # Payment method persistence
    │   └── payment-transaction.repository.ts   # Transaction persistence
    ├── external-services/
    │   └── adyen-client.ts                     # Adyen API integration
    ├── cache/
    │   └── memory-cache.ts                     # In-memory cache implementation
    ├── dto/
    │   ├── get-payment-methods.dto.ts          # API request DTO with validators
    │   ├── payment-method-response.dto.ts      # API response DTO
    │   ├── create-payment.dto.ts               # API request DTO with validators
    │   ├── payment-response.dto.ts             # API response DTO
    │   └── payment-details.dto.ts              # API request DTO with validators
    ├── controllers/
    │   └── payment.controller.ts               # REST endpoints
    ├── http-client/
    │   └── fetch-http-client.ts                # HTTP client wrapper
    ├── logger/
    │   └── winston-logger.ts                   # Logger with masking
    ├── services/
    │   ├── nest-config-environment.service.ts  # Environment config
    │   └── correlation-id.service.ts           # Correlation ID generation
    └── app.module.ts                           # Main NestJS module

test/
├── domain/
│   ├── entities/
│   │   ├── payment-method.spec.ts
│   │   ├── payment-transaction.spec.ts
│   │   ├── payment-action.spec.ts
│   │   └── payment-details.spec.ts
│   ├── value-objects/
│   │   ├── amount.spec.ts
│   │   ├── payment-reference.spec.ts
│   │   ├── idempotency-key.spec.ts
│   │   ├── currency.spec.ts
│   │   └── country-code.spec.ts
│   └── errors/
│       ├── payment-method-not-found.error.spec.ts
│       ├── invalid-payment-data.error.spec.ts
│       ├── duplicate-payment.error.spec.ts
│       └── payment-processing.error.spec.ts
├── application/
│   └── use-cases/
│       ├── get-payment-methods.use-case.spec.ts
│       ├── create-payment.use-case.spec.ts
│       └── process-payment-details.use-case.spec.ts
├── infrastructure/
│   ├── controllers/
│   │   └── payment.controller.spec.ts
│   ├── repositories/
│   │   ├── payment-method.repository.spec.ts
│   │   └── payment-transaction.repository.spec.ts
│   └── external-services/
│       └── adyen-client.spec.ts
└── e2e/
    └── payment.e2e-spec.ts
```

**Structure Decision**: Single NestJS microservice following hexagonal architecture. Direct layer structure at `src/` root (domain/, application/, infrastructure/) without nested modules. This aligns with the single bounded context principle - one microservice = one payment processing domain. All dependency injection managed in `infrastructure/app.module.ts` using Symbol-based tokens from `application/config/tokens.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
