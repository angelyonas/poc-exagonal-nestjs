# Tasks: Adyen Advanced Flow Payment Integration

**Input**: Design documents from `/specs/001-adyen-payment-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature requires 95% test coverage (lines/statements) and 90% branches/functions coverage as per NFR and hexagonal architecture constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single NestJS microservice at repository root:
- Source: `src/domain/`, `src/application/`, `src/infrastructure/`
- Tests: `test/domain/`, `test/application/`, `test/infrastructure/`, `test/e2e/`

---

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Initialize project dependencies and configuration for Adyen integration

- [x] T001 Install dependencies: `@nestjs/typeorm`, `typeorm`, `pg`, `class-validator`, `class-transformer`
- [x] T002 [P] Create environment configuration in `.env` (Adyen API key, merchant account, database credentials)
- [x] T003 [P] Configure TypeORM connection in `src/infrastructure/config/typeorm.config.ts`
- [x] T004 [P] Setup PostgreSQL database and run initial migration for payment_transactions table
- [x] T005 [P] Create DI tokens file in `src/application/config/tokens.ts` with Symbol-based tokens

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Domain Foundation

- [x] T006 [P] Create base DomainError class in `src/domain/errors/base.error.ts`
- [x] T007 [P] Create IUseCase generic interface in `src/domain/contracts/use-case.interface.ts`

### Value Objects (Used by Multiple Stories)

- [x] T008 [P] Create Currency value object in `src/domain/value-objects/currency.ts` with MXN support
- [x] T009 [P] Create Amount value object in `src/domain/value-objects/amount.ts` with minor units (centavos) validation
- [x] T010 [P] Create CountryCode value object in `src/domain/value-objects/country-code.ts` with ISO-3166-1 validation
- [x] T011 [P] Create PaymentReference value object in `src/domain/value-objects/payment-reference.ts` with generation logic
- [x] T012 [P] Create IdempotencyKey value object in `src/domain/value-objects/idempotency-key.ts` with UUID v4 validation

### Value Object Tests

- [ ] T013 [P] Test Currency value object in `test/domain/value-objects/currency.spec.ts`
- [ ] T014 [P] Test Amount value object in `test/domain/value-objects/amount.spec.ts` (MXN, centavos, validation)
- [ ] T015 [P] Test CountryCode value object in `test/domain/value-objects/country-code.spec.ts`
- [ ] T016 [P] Test PaymentReference value object in `test/domain/value-objects/payment-reference.spec.ts`
- [ ] T017 [P] Test IdempotencyKey value object in `test/domain/value-objects/idempotency-key.spec.ts`

### Infrastructure Foundation

- [x] T018 [P] Create IHttpClient interface in `src/domain/contracts/http-client.interface.ts`
- [x] T019 [P] Implement FetchHttpClient with retry logic in `src/infrastructure/http-client/fetch-http-client.ts` (3 retries, exponential backoff)
- [x] T020 [P] Create ICache interface in `src/domain/contracts/cache.interface.ts`
- [x] T021 [P] Implement InMemoryCacheService in `src/infrastructure/cache/in-memory-cache.service.ts` with TTL support
- [x] T022 [P] Create ILogger interface in `src/domain/contracts/logger.interface.ts`
- [x] T023 [P] Implement StructuredLogger with field masking in `src/infrastructure/logger/structured-logger.service.ts`
- [x] T024 [P] Create CorrelationIdService in `src/infrastructure/services/correlation-id.service.ts` with UUID v4 generation
- [x] T025 [P] Create NestConfigEnvironmentService in `src/infrastructure/services/nest-config-environment.service.ts`

### Database Foundation

- [x] T026 Create PaymentTransactionEntity (TypeORM) in `src/infrastructure/orm/payment-transaction.entity.ts`
- [x] T027 Create TypeORM migration for payment_transactions table in `src/infrastructure/migrations/[timestamp]-CreatePaymentTransactions.ts`
- [x] T028 Create IPaymentTransactionRepository interface in `src/domain/contracts/payment-transaction-repository.interface.ts`
- [x] T029 Implement TypeOrmPaymentTransactionRepository in `src/infrastructure/repositories/typeorm-payment-transaction.repository.ts` with entity-domain mapping

### Domain Errors

- [x] T030 [P] Create PaymentMethodNotFoundError in `src/domain/errors/payment-method-not-found.error.ts`
- [x] T031 [P] Create InvalidPaymentDataError in `src/domain/errors/invalid-payment-data.error.ts`
- [x] T032 [P] Create DuplicatePaymentError in `src/domain/errors/duplicate-payment.error.ts`
- [x] T033 [P] Create PaymentProcessingError in `src/domain/errors/payment-processing.error.ts`

### Domain Error Tests

- [ ] T034 [P] Test PaymentMethodNotFoundError in `test/domain/errors/payment-method-not-found.error.spec.ts`
- [ ] T035 [P] Test InvalidPaymentDataError in `test/domain/errors/invalid-payment-data.error.spec.ts`
- [ ] T036 [P] Test DuplicatePaymentError in `test/domain/errors/duplicate-payment.error.spec.ts`
- [ ] T037 [P] Test PaymentProcessingError in `test/domain/errors/payment-processing.error.spec.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Retrieve Available Payment Methods (Priority: P1) 🎯 MVP

**Goal**: Enable merchants to retrieve payment methods from Adyen based on shopper context (country, currency, amount, platform)

**Independent Test**: Call GET /api/payment-methods?country=MX&currency=MXN&amount=1500.00 and verify response contains payment methods list

### Domain Layer - US1

- [x] T038 [P] [US1] Create PaymentMethod entity in `src/domain/entities/payment-method.ts` with _entity schema pattern
- [x] T039 [P] [US1] Create IPaymentMethodSchema interface in `src/domain/entities/payment-method.ts`
- [x] T040 [P] [US1] Create IGetPaymentMethodsDTO in `src/domain/contracts/dtos/get-payment-methods.dto.ts`
- [x] T041 [P] [US1] Create IPaymentMethodResponseDTO in `src/domain/contracts/dtos/payment-method-response.dto.ts`
- [x] T042 [P] [US1] Create IPaymentMethodRepository interface in `src/domain/contracts/payment-method-repository.interface.ts`
- [x] T043 [P] [US1] Create IGetPaymentMethodsUseCase interface in `src/domain/contracts/get-payment-methods-use-case.interface.ts`

### Domain Tests - US1

- [ ] T044 [US1] Test PaymentMethod entity in `test/domain/entities/payment-method.spec.ts` (create, fromSchema, getters, isCardPayment)

### Application Layer - US1

- [x] T045 [US1] Create GetPaymentMethodsUseCase with @Injectable in `src/application/use-cases/get-payment-methods.use-case.ts` implementing IUseCase<IGetPaymentMethodsDTO, IPaymentMethodResponseDTO[]>
- [x] T046 [US1] Add PAYMENT_METHOD_TOKENS to `src/application/config/tokens.ts`

### Application Tests - US1

- [ ] T047 [US1] Test GetPaymentMethodsUseCase in `test/application/use-cases/get-payment-methods.use-case.spec.ts` (mock repository, verify orchestration, DTO conversion)

### Infrastructure Layer - US1

- [x] T048 [P] [US1] Create IAdyenClient interface in `src/domain/contracts/adyen-client.interface.ts` with getPaymentMethods method
- [x] T049 [US1] Implement AdyenClientService in `src/infrastructure/external-services/adyen-client.service.ts` (call /paymentMethods endpoint)
- [x] T050 [US1] Implement AdyenPaymentMethodRepository in `src/infrastructure/repositories/adyen-payment-method.repository.ts` with cache integration
- [x] T051 [P] [US1] Create GetPaymentMethodsDto (API DTO) in `src/infrastructure/dto/get-payment-methods.dto.ts` with class-validator decorators
- [x] T052 [P] [US1] Create PaymentMethodResponseDto (API DTO) in `src/infrastructure/dto/payment-method-response.dto.ts`
- [x] T053 [US1] Create PaymentController with GET /payment-methods endpoint in `src/infrastructure/controllers/payment.controller.ts`
- [x] T054 [US1] Update AppModule with US1 providers in `src/infrastructure/app.module.ts` (use Symbol tokens, useClass pattern)

### Infrastructure Tests - US1

- [ ] T055 [US1] Test AdyenClientService in `test/infrastructure/external-services/adyen-client.service.spec.ts` (mock HTTP client, verify API calls)
- [ ] T056 [US1] Test AdyenPaymentMethodRepository in `test/infrastructure/repositories/adyen-payment-method.repository.spec.ts` (mock Adyen client, verify caching)
- [ ] T057 [US1] Test PaymentController GET /payment-methods in `test/infrastructure/controllers/payment.controller.spec.ts` (use Test.createTestingModule, mock use case)

### E2E Tests - US1

- [ ] T058 [US1] E2E test for GET /payment-methods in `test/e2e/payment-methods.e2e-spec.ts` (verify 200 response, validate schema, test caching)

**Checkpoint**: User Story 1 complete - merchants can retrieve payment methods with caching

---

## Phase 4: User Story 2 - Initiate Payment Transaction (Priority: P2)

**Goal**: Enable merchants to create payment transactions with Adyen, handle idempotency, and manage payment state

**Independent Test**: Call POST /api/payments with payment data and verify response contains transaction state (authorised/refused/redirect)

### Domain Layer - US2

- [x] T059 [P] [US2] Create PaymentTransactionState enum in `src/domain/entities/payment-transaction.ts`
- [x] T060 [P] [US2] Create IPaymentTransactionSchema interface in `src/domain/entities/payment-transaction.ts`
- [x] T061 [US2] Create PaymentTransaction entity in `src/domain/entities/payment-transaction.ts` with state transitions (withAuthorised, withRefused, withRedirect, withError)
- [x] T062 [P] [US2] Create PaymentAction entity in `src/domain/entities/payment-action.ts` with _entity schema pattern
- [x] T063 [P] [US2] Create ICreatePaymentDTO in `src/domain/contracts/dtos/create-payment.dto.ts`
- [x] T064 [P] [US2] Create IPaymentResponseDTO in `src/domain/contracts/dtos/payment-response.dto.ts`
- [x] T065 [P] [US2] Create ICreatePaymentUseCase interface in `src/domain/contracts/create-payment-use-case.interface.ts`

### Domain Tests - US2

- [ ] T066 [US2] Test PaymentTransaction entity in `test/domain/entities/payment-transaction.spec.ts` (create, state transitions, immutability, getters)
- [ ] T067 [P] [US2] Test PaymentAction entity in `test/domain/entities/payment-action.spec.ts` (create, isRedirect, is3DSecure, validation)

### Application Layer - US2

- [x] T068 [US2] Create CreatePaymentUseCase with @Injectable in `src/application/use-cases/create-payment.use-case.ts` implementing IUseCase<ICreatePaymentDTO, IPaymentResponseDTO>
- [x] T069 [US2] Add idempotency check logic in CreatePaymentUseCase (check cache before processing)
- [x] T070 [US2] Add persistence before API call in CreatePaymentUseCase (persist PENDING state, then update with response)
- [x] T071 [US2] Add CREATE_PAYMENT_TOKENS to `src/application/config/tokens.ts`

### Application Tests - US2

- [ ] T072 [US2] Test CreatePaymentUseCase in `test/application/use-cases/create-payment.use-case.spec.ts` (mock repository, verify idempotency, verify persistence timing, DTO conversion)

### Infrastructure Layer - US2

- [x] T073 [US2] Add createPayment method to AdyenClientService in `src/infrastructure/external-services/adyen-client.service.ts` (call /payments endpoint)
- [x] T074 [P] [US2] Create CreatePaymentDto (API DTO) in `src/infrastructure/dto/create-payment.dto.ts` with class-validator decorators
- [x] T075 [P] [US2] Create PaymentResponseDto (API DTO) in `src/infrastructure/dto/payment-response.dto.ts`
- [x] T076 [US2] Add POST /payments endpoint to PaymentController in `src/infrastructure/controllers/payment.controller.ts` with error handling (convert domain errors to HttpException)
- [x] T077 [US2] Update AppModule with US2 providers in `src/infrastructure/app.module.ts`

### Infrastructure Tests - US2

- [ ] T078 [US2] Test AdyenClientService createPayment in `test/infrastructure/external-services/adyen-client.service.spec.ts` (mock HTTP client, verify retry logic)
- [ ] T079 [US2] Test TypeOrmPaymentTransactionRepository in `test/infrastructure/repositories/typeorm-payment-transaction.repository.spec.ts` (mock TypeORM repository, verify entity-domain mapping)
- [ ] T080 [US2] Test PaymentController POST /payments in `test/infrastructure/controllers/payment.controller.spec.ts` (test authorised, refused, redirect, error scenarios)

### E2E Tests - US2

- [ ] T081 [US2] E2E test for POST /payments (authorised) in `test/e2e/create-payment.e2e-spec.ts`
- [ ] T082 [US2] E2E test for POST /payments (refused) in `test/e2e/create-payment.e2e-spec.ts`
- [ ] T083 [US2] E2E test for POST /payments (redirect) in `test/e2e/create-payment.e2e-spec.ts`
- [ ] T084 [US2] E2E test for POST /payments (idempotency) in `test/e2e/create-payment.e2e-spec.ts` (duplicate requests return cached response)
- [ ] T085 [US2] E2E test for POST /payments (duplicate idempotency key with different data) in `test/e2e/create-payment.e2e-spec.ts` (expect 409 Conflict)

**Checkpoint**: User Story 2 complete - merchants can create payments with idempotency and state management

---

## Phase 5: User Story 3 - Handle Payment Additional Actions (Priority: P3)

**Goal**: Enable merchants to complete payments requiring additional steps (redirects, 3DS authentication)

**Independent Test**: Call POST /api/payments/details with redirect result and verify final payment status

### Domain Layer - US3

- [ ] T086 [P] [US3] Create PaymentDetails entity in `src/domain/entities/payment-details.ts` with static factory methods (createFromRedirect, createFrom3DS)
- [ ] T087 [P] [US3] Create IPaymentDetailsDTO in `src/domain/contracts/dtos/payment-details.dto.ts`
- [ ] T088 [P] [US3] Create IProcessPaymentDetailsUseCase interface in `src/domain/contracts/process-payment-details-use-case.interface.ts`

### Domain Tests - US3

- [ ] T089 [US3] Test PaymentDetails entity in `test/domain/entities/payment-details.spec.ts` (createFromRedirect, createFrom3DS, validation)

### Application Layer - US3

- [ ] T090 [US3] Create ProcessPaymentDetailsUseCase with @Injectable in `src/application/use-cases/process-payment-details.use-case.ts` implementing IUseCase<IPaymentDetailsDTO, IPaymentResponseDTO>
- [ ] T091 [US3] Add PROCESS_PAYMENT_DETAILS_TOKENS to `src/application/config/tokens.ts`

### Application Tests - US3

- [ ] T092 [US3] Test ProcessPaymentDetailsUseCase in `test/application/use-cases/process-payment-details.use-case.spec.ts` (mock repository, verify orchestration)

### Infrastructure Layer - US3

- [ ] T093 [US3] Add submitPaymentDetails method to AdyenClientService in `src/infrastructure/external-services/adyen-client.service.ts` (call /payments/details endpoint)
- [ ] T094 [P] [US3] Create PaymentDetailsDto (API DTO) in `src/infrastructure/dto/payment-details.dto.ts` with class-validator decorators
- [ ] T095 [US3] Add POST /payments/details endpoint to PaymentController in `src/infrastructure/controllers/payment.controller.ts`
- [ ] T096 [US3] Update AppModule with US3 providers in `src/infrastructure/app.module.ts`

### Infrastructure Tests - US3

- [ ] T097 [US3] Test AdyenClientService submitPaymentDetails in `test/infrastructure/external-services/adyen-client.service.spec.ts`
- [ ] T098 [US3] Test PaymentController POST /payments/details in `test/infrastructure/controllers/payment.controller.spec.ts`

### E2E Tests - US3

- [ ] T099 [US3] E2E test for POST /payments/details (redirect success) in `test/e2e/payment-details.e2e-spec.ts`
- [ ] T100 [US3] E2E test for POST /payments/details (3DS success) in `test/e2e/payment-details.e2e-spec.ts`
- [ ] T101 [US3] E2E test for POST /payments/details (failure) in `test/e2e/payment-details.e2e-spec.ts`

**Checkpoint**: User Story 3 complete - merchants can handle payments requiring additional actions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T102 [P] Verify all sensitive fields masked in logs (card numbers, API keys, PSP references, CVV)
- [ ] T103 [P] Verify correlation IDs propagated through all layers
- [ ] T104 [P] Verify retry logic works for network errors and 5xx responses only
- [ ] T105 [P] Verify cache TTLs: payment methods (5min), idempotency (24h)
- [ ] T106 Run test coverage report and verify 95% lines/statements, 90% branches/functions
- [ ] T107 [P] Update README.md with setup instructions
- [ ] T108 [P] Create TESTING.md with test execution guide
- [ ] T109 Run quickstart.md validation (manual testing with Adyen test cards)
- [ ] T110 [P] Performance testing: verify <2s for payment methods, <100ms for cached requests
- [ ] T111 [P] Load testing: verify 100 concurrent transactions without degradation
- [ ] T112 Code cleanup and refactoring (remove unused imports, format code)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Independent - no dependencies on other stories
  - User Story 2 (P2): Independent - no dependencies on other stories (but logically follows P1)
  - User Story 3 (P3): Depends on User Story 2 (needs payment state transitions)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (implements payment creation)
- **User Story 3 (P3)**: Depends on User Story 2 (requires PaymentTransaction entity and state transitions)

### Within Each User Story

1. Domain entities and value objects first (can be parallel)
2. Domain tests (verify entities work correctly)
3. Application use cases (orchestrate domain logic)
4. Application tests (verify orchestration with mocked repositories)
5. Infrastructure implementations (repositories, services, controllers)
6. Infrastructure tests (verify infrastructure with mocked dependencies)
7. E2E tests (verify complete flow end-to-end)

### Parallel Opportunities

**Phase 1 (Setup)**: T002, T003, T004, T005 can run in parallel after T001

**Phase 2 (Foundational)**:
- Value objects (T008-T012) can all run in parallel
- Value object tests (T013-T017) can all run in parallel after value objects complete
- Infrastructure services (T018-T025) can run in parallel
- Domain errors (T030-T033) can all run in parallel
- Domain error tests (T034-T037) can all run in parallel after errors complete

**User Story 1**:
- T038-T043 (domain layer) can run in parallel
- T051-T052 (API DTOs) can run in parallel
- Once domain complete: T045 (use case) can start

**User Story 2**:
- T059-T060 can run in parallel with T062 (entities)
- T063-T065 (DTOs and interfaces) can run in parallel
- T074-T075 (API DTOs) can run in parallel

**User Story 3**:
- T086-T088 (domain layer) can run in parallel
- T094 (API DTO) independent

**Phase 6 (Polish)**: T102-T105, T107-T108, T110-T111 can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase complete, these can run simultaneously:
# Developer A:
T038 # Create PaymentMethod entity
T044 # Test PaymentMethod entity

# Developer B:
T039-T043 # Create interfaces and DTOs

# Developer C:
T051-T052 # Create API DTOs

# Then sequentially:
T045 # Create use case (needs domain entities)
T047 # Test use case
T048-T050 # Infrastructure implementations
T053-T054 # Controller and module setup
T055-T057 # Infrastructure tests
T058 # E2E test
```

---

## Parallel Example: User Story 2

```bash
# After Foundational phase complete, these can run simultaneously:
# Developer A:
T059-T061 # Create PaymentTransaction entity and state enum
T066 # Test PaymentTransaction

# Developer B:
T062 # Create PaymentAction entity
T067 # Test PaymentAction

# Developer C:
T063-T065 # Create DTOs and interfaces
T074-T075 # Create API DTOs

# Then sequentially:
T068-T070 # Create use case with idempotency and persistence logic
T072 # Test use case
T073, T076-T077 # Infrastructure implementations
T078-T080 # Infrastructure tests
T081-T085 # E2E tests
```

---

## Implementation Strategy

### MVP Scope (Recommended First Delivery)

**Phase 1 + Phase 2 + User Story 1 (P1)**

This delivers:
- ✅ Complete project setup
- ✅ All foundational infrastructure (value objects, cache, logging, HTTP client)
- ✅ Payment method retrieval with caching
- ✅ Independent test: `GET /api/payment-methods?country=MX&currency=MXN&amount=1500.00`

**Estimated effort**: ~15-20 tasks (T001-T058)

### Incremental Delivery

1. **MVP (P1)**: Deliver payment method retrieval - merchants can discover available options
2. **Core Payment (P2)**: Add payment creation - merchants can process payments with full idempotency
3. **Complete Flow (P3)**: Add redirect handling - merchants support all payment methods
4. **Polish**: Optimize, document, finalize

### Testing Strategy

- **TDD Approach**: Write tests first, see them fail, implement, see them pass
- **Coverage Target**: 95% lines/statements, 90% branches/functions (enforced by Jest)
- **Test Layers**:
  - Domain: Pure unit tests (no mocks)
  - Application: Mock repositories, verify orchestration
  - Infrastructure: Mock external dependencies (HTTP, database)
  - E2E: Full integration tests with test database

### Critical Path

```
Setup → Foundational → US1 → US2 → US3 → Polish
```

User stories can be parallelized if team capacity allows, but P3 depends on P2 completion.

---

## Total Task Count

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 32 tasks
- **Phase 3 (User Story 1 - P1)**: 21 tasks
- **Phase 4 (User Story 2 - P2)**: 27 tasks
- **Phase 5 (User Story 3 - P3)**: 16 tasks
- **Phase 6 (Polish)**: 11 tasks

**Total**: 112 tasks

**MVP**: 58 tasks (Phase 1 + Phase 2 + Phase 3)
