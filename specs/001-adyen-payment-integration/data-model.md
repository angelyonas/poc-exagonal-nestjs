# Data Model: Adyen Advanced Flow Payment Integration

**Date**: 2025-11-13  
**Feature**: Adyen Advanced Flow Payment Integration  
**Phase**: 1 - Design & Contracts

## Entity Definitions

### 1. PaymentMethod

**Purpose**: Represents a payment option available to shoppers based on their context (location, device, amount).

**Schema**:
```typescript
interface IPaymentMethodSchema {
  type: string;              // Payment method type (scheme, ideal, sepadirectdebit, etc.)
  name: string;              // Display name for shopper
  brands?: string[];         // Card brands (visa, mc, amex) if applicable
  configuration?: Record<string, unknown>; // Payment method-specific config
}
```

**Entity Implementation**:
```typescript
class PaymentMethod {
  private constructor(private readonly _entity: IPaymentMethodSchema) {}
  
  static create(
    type: string,
    name: string,
    brands?: string[],
    configuration?: Record<string, unknown>
  ): PaymentMethod {
    if (!type || type.trim().length === 0) {
      throw new ValidationError('Payment method type is required');
    }
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Payment method name is required');
    }
    
    return new PaymentMethod({
      type: type.trim().toLowerCase(),
      name: name.trim(),
      brands,
      configuration,
    });
  }
  
  static fromSchema(schema: IPaymentMethodSchema): PaymentMethod {
    return new PaymentMethod(schema);
  }
  
  get type(): string {
    return this._entity.type;
  }
  
  get name(): string {
    return this._entity.name;
  }
  
  get brands(): string[] | undefined {
    return this._entity.brands;
  }
  
  get configuration(): Record<string, unknown> | undefined {
    return this._entity.configuration;
  }
  
  isCardPayment(): boolean {
    return this._entity.type === 'scheme';
  }
  
  supportsRecurring(): boolean {
    return this._entity.configuration?.['supportsRecurring'] === true;
  }
}
```

**Validation Rules**:
- Type must be non-empty lowercase string
- Name must be non-empty string
- Brands optional, array of strings
- Configuration optional, key-value object

**Relationships**:
- None (value object-like entity, no references to other entities)

---

### 2. PaymentTransaction

**Purpose**: Represents a payment attempt with full state tracking and audit trail.

**Schema**:
```typescript
interface IPaymentTransactionSchema {
  merchantReference: string;     // Unique transaction identifier
  idempotencyKey: string;         // Client-provided UUID for duplicate prevention
  amount: number;                 // Amount in minor units (centavos)
  currency: string;               // ISO-4217 currency code (MXN)
  paymentMethodType: string;      // Selected payment method type
  shopperEmail?: string;          // Shopper email for receipts
  shopperReference?: string;      // Shopper identifier for future reference
  state: PaymentTransactionState; // Current transaction state
  resultCode?: string;            // Adyen result code (Authorised, Refused, etc.)
  pspReference?: string;          // Adyen PSP reference
  refusalReason?: string;         // Reason for refusal if declined
  actionData?: unknown;           // Additional action data (redirect, 3DS)
  correlationId: string;          // Tracing correlation ID
  createdAt: Date;                // Transaction creation timestamp
  updatedAt: Date;                // Last update timestamp
}

enum PaymentTransactionState {
  PENDING = 'pending',
  AUTHORISED = 'authorised',
  REFUSED = 'refused',
  REDIRECT = 'redirect',
  ERROR = 'error',
}
```

**Entity Implementation**:
```typescript
class PaymentTransaction {
  private constructor(private readonly _entity: IPaymentTransactionSchema) {}
  
  static create(
    merchantReference: string,
    idempotencyKey: string,
    amount: Amount,
    paymentMethodType: string,
    correlationId: string,
    shopperEmail?: string,
    shopperReference?: string
  ): PaymentTransaction {
    if (!merchantReference || merchantReference.trim().length === 0) {
      throw new ValidationError('Merchant reference is required');
    }
    if (!idempotencyKey || !IdempotencyKey.isValid(idempotencyKey)) {
      throw new ValidationError('Valid idempotency key is required');
    }
    if (!paymentMethodType || paymentMethodType.trim().length === 0) {
      throw new ValidationError('Payment method type is required');
    }
    
    const now = new Date();
    
    return new PaymentTransaction({
      merchantReference: merchantReference.trim(),
      idempotencyKey: idempotencyKey.trim(),
      amount: amount.minorUnits,
      currency: amount.currency.code,
      paymentMethodType: paymentMethodType.trim(),
      shopperEmail,
      shopperReference,
      state: PaymentTransactionState.PENDING,
      correlationId,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  static fromSchema(schema: IPaymentTransactionSchema): PaymentTransaction {
    return new PaymentTransaction(schema);
  }
  
  // Getters
  get merchantReference(): string {
    return this._entity.merchantReference;
  }
  
  get idempotencyKey(): string {
    return this._entity.idempotencyKey;
  }
  
  get amount(): number {
    return this._entity.amount;
  }
  
  get currency(): string {
    return this._entity.currency;
  }
  
  get state(): PaymentTransactionState {
    return this._entity.state;
  }
  
  get pspReference(): string | undefined {
    return this._entity.pspReference;
  }
  
  get correlationId(): string {
    return this._entity.correlationId;
  }
  
  // Business logic
  isPending(): boolean {
    return this._entity.state === PaymentTransactionState.PENDING;
  }
  
  isAuthorised(): boolean {
    return this._entity.state === PaymentTransactionState.AUTHORISED;
  }
  
  isRefused(): boolean {
    return this._entity.state === PaymentTransactionState.REFUSED;
  }
  
  requiresAdditionalAction(): boolean {
    return this._entity.state === PaymentTransactionState.REDIRECT;
  }
  
  // State transitions (immutable - return new instance)
  withAuthorised(pspReference: string, resultCode: string): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      state: PaymentTransactionState.AUTHORISED,
      pspReference,
      resultCode,
      updatedAt: new Date(),
    });
  }
  
  withRefused(refusalReason: string, resultCode: string): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      state: PaymentTransactionState.REFUSED,
      refusalReason,
      resultCode,
      updatedAt: new Date(),
    });
  }
  
  withRedirect(actionData: unknown, pspReference?: string): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      state: PaymentTransactionState.REDIRECT,
      actionData,
      pspReference,
      updatedAt: new Date(),
    });
  }
  
  withError(errorMessage: string): PaymentTransaction {
    return new PaymentTransaction({
      ...this._entity,
      state: PaymentTransactionState.ERROR,
      refusalReason: errorMessage,
      updatedAt: new Date(),
    });
  }
}
```

**Validation Rules**:
- Merchant reference must be unique, non-empty string
- Idempotency key must be valid UUID v4 format
- Amount must be positive integer (minor units)
- Currency must be valid ISO-4217 code (initially MXN only)
- Payment method type must be non-empty string
- State must be valid enum value

**State Transitions**:
1. `PENDING → AUTHORISED` (successful direct payment)
2. `PENDING → REFUSED` (declined by issuer)
3. `PENDING → REDIRECT` (requires external authentication)
4. `PENDING → ERROR` (API error or validation failure)
5. `REDIRECT → AUTHORISED` (successful after redirect)
6. `REDIRECT → REFUSED` (declined after authentication)

**Relationships**:
- Has one PaymentAction (optional, when state=REDIRECT)
- References PaymentMethod via paymentMethodType

---

### 3. PaymentAction

**Purpose**: Represents additional steps required to complete payment (redirects, 3DS challenges).

**Schema**:
```typescript
interface IPaymentActionSchema {
  type: string;                // Action type (redirect, threeDS2, voucher, qrCode)
  paymentMethodType: string;   // Payment method requiring action
  url?: string;                // Redirect URL
  method?: string;             // HTTP method (GET, POST)
  data?: Record<string, unknown>; // Action-specific data
}
```

**Entity Implementation**:
```typescript
class PaymentAction {
  private constructor(private readonly _entity: IPaymentActionSchema) {}
  
  static create(
    type: string,
    paymentMethodType: string,
    url?: string,
    method?: string,
    data?: Record<string, unknown>
  ): PaymentAction {
    if (!type || type.trim().length === 0) {
      throw new ValidationError('Action type is required');
    }
    if (!paymentMethodType || paymentMethodType.trim().length === 0) {
      throw new ValidationError('Payment method type is required');
    }
    
    return new PaymentAction({
      type: type.trim(),
      paymentMethodType: paymentMethodType.trim(),
      url,
      method: method?.toUpperCase(),
      data,
    });
  }
  
  static fromSchema(schema: IPaymentActionSchema): PaymentAction {
    return new PaymentAction(schema);
  }
  
  get type(): string {
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
  
  isRedirect(): boolean {
    return this._entity.type === 'redirect';
  }
  
  is3DSecure(): boolean {
    return this._entity.type === 'threeDS2';
  }
  
  isVoucher(): boolean {
    return this._entity.type === 'voucher';
  }
}
```

**Validation Rules**:
- Type must be one of: redirect, threeDS2, voucher, qrCode
- Payment method type must be non-empty string
- URL required for redirect actions
- Method required for redirect actions (GET or POST)

**Relationships**:
- Linked to PaymentTransaction (actionData field)

---

### 4. PaymentDetails

**Purpose**: Additional data needed to finalize payment after shopper completes external action.

**Schema**:
```typescript
interface IPaymentDetailsSchema {
  redirectResult?: string;       // Result from redirect flow
  threeDSResult?: string;         // Result from 3DS authentication
  details?: Record<string, unknown>; // Additional details by payment method
}
```

**Entity Implementation**:
```typescript
class PaymentDetails {
  private constructor(private readonly _entity: IPaymentDetailsSchema) {}
  
  static createFromRedirect(redirectResult: string): PaymentDetails {
    if (!redirectResult || redirectResult.trim().length === 0) {
      throw new ValidationError('Redirect result is required');
    }
    
    return new PaymentDetails({
      redirectResult: redirectResult.trim(),
    });
  }
  
  static createFrom3DS(threeDSResult: string): PaymentDetails {
    if (!threeDSResult || threeDSResult.trim().length === 0) {
      throw new ValidationError('3DS result is required');
    }
    
    return new PaymentDetails({
      threeDSResult: threeDSResult.trim(),
    });
  }
  
  static createWithDetails(details: Record<string, unknown>): PaymentDetails {
    if (!details || Object.keys(details).length === 0) {
      throw new ValidationError('Payment details are required');
    }
    
    return new PaymentDetails({
      details,
    });
  }
  
  static fromSchema(schema: IPaymentDetailsSchema): PaymentDetails {
    return new PaymentDetails(schema);
  }
  
  get redirectResult(): string | undefined {
    return this._entity.redirectResult;
  }
  
  get threeDSResult(): string | undefined {
    return this._entity.threeDSResult;
  }
  
  get details(): Record<string, unknown> | undefined {
    return this._entity.details;
  }
  
  hasRedirectResult(): boolean {
    return !!this._entity.redirectResult;
  }
  
  has3DSResult(): boolean {
    return !!this._entity.threeDSResult;
  }
}
```

**Validation Rules**:
- At least one field must be present (redirectResult, threeDSResult, or details)
- Redirect result must be non-empty if provided
- 3DS result must be non-empty if provided

**Relationships**:
- Used to complete PaymentTransaction via /payments/details endpoint

---

## Value Objects

### Amount

**Purpose**: Encapsulate monetary value with currency validation.

```typescript
class Amount {
  private constructor(
    private readonly _entity: {
      value: number;    // Minor units (centavos)
      currency: Currency;
    }
  ) {}
  
  static createMXN(pesos: number): Amount {
    if (pesos < 0) {
      throw new ValidationError('Amount cannot be negative');
    }
    if (pesos > 9999999.99) {
      throw new ValidationError('Amount exceeds maximum (9,999,999.99 MXN)');
    }
    
    const centavos = Math.round(pesos * 100);
    return new Amount({
      value: centavos,
      currency: Currency.MXN,
    });
  }
  
  static fromMinorUnits(centavos: number, currency: Currency): Amount {
    if (centavos < 0) {
      throw new ValidationError('Amount cannot be negative');
    }
    if (!Number.isInteger(centavos)) {
      throw new ValidationError('Minor units must be integer');
    }
    
    return new Amount({ value: centavos, currency });
  }
  
  get minorUnits(): number {
    return this._entity.value;
  }
  
  get majorUnits(): number {
    return this._entity.value / 100;
  }
  
  get currency(): Currency {
    return this._entity.currency;
  }
  
  getFormatted(): string {
    return `${this._entity.currency.code} $${(this._entity.value / 100).toFixed(2)}`;
  }
  
  equals(other: Amount): boolean {
    return this._entity.value === other.minorUnits &&
           this._entity.currency.equals(other.currency);
  }
}
```

### Currency

**Purpose**: Validate and encapsulate ISO-4217 currency codes.

```typescript
class Currency {
  static readonly MXN = new Currency('MXN', 'Mexican Peso', 2);
  
  private constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly decimalPlaces: number
  ) {}
  
  static fromCode(code: string): Currency {
    if (code === 'MXN') return Currency.MXN;
    throw new ValidationError(`Unsupported currency: ${code}`);
  }
  
  equals(other: Currency): boolean {
    return this.code === other.code;
  }
}
```

### CountryCode

**Purpose**: Validate ISO-3166-1 alpha-2 country codes.

```typescript
class CountryCode {
  private constructor(private readonly code: string) {}
  
  static create(code: string): CountryCode {
    const normalized = code.toUpperCase().trim();
    if (normalized.length !== 2) {
      throw new ValidationError('Country code must be 2 characters (ISO-3166-1 alpha-2)');
    }
    // Additional validation can check against known codes
    return new CountryCode(normalized);
  }
  
  get value(): string {
    return this.code;
  }
  
  equals(other: CountryCode): boolean {
    return this.code === other.value;
  }
}
```

### PaymentReference

**Purpose**: Generate unique merchant references for transactions.

```typescript
class PaymentReference {
  private constructor(private readonly value: string) {}
  
  static generate(prefix: string = 'PAY'): PaymentReference {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;
    return new PaymentReference(reference);
  }
  
  static fromString(value: string): PaymentReference {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('Payment reference cannot be empty');
    }
    return new PaymentReference(value.trim());
  }
  
  toString(): string {
    return this.value;
  }
}
```

### IdempotencyKey

**Purpose**: Validate UUID v4 format for idempotency keys.

```typescript
class IdempotencyKey {
  private static readonly UUID_V4_REGEX = 
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  private constructor(private readonly value: string) {}
  
  static create(uuid: string): IdempotencyKey {
    if (!IdempotencyKey.isValid(uuid)) {
      throw new ValidationError('Invalid UUID v4 format for idempotency key');
    }
    return new IdempotencyKey(uuid.toLowerCase());
  }
  
  static isValid(uuid: string): boolean {
    return IdempotencyKey.UUID_V4_REGEX.test(uuid);
  }
  
  toString(): string {
    return this.value;
  }
  
  equals(other: IdempotencyKey): boolean {
    return this.value === other.value;
  }
}
```

---

## Domain Errors

### PaymentMethodNotFoundError

```typescript
export class PaymentMethodNotFoundError extends DomainError {
  constructor(filters: string) {
    super(`No payment methods found for filters: ${filters}`);
  }
}
```

### InvalidPaymentDataError

```typescript
export class InvalidPaymentDataError extends DomainError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
  }
}
```

### DuplicatePaymentError

```typescript
export class DuplicatePaymentError extends DomainError {
  constructor(
    public readonly idempotencyKey: string
  ) {
    super(`Duplicate payment request with idempotency key: ${idempotencyKey}`);
  }
}
```

### PaymentProcessingError

```typescript
export class PaymentProcessingError extends DomainError {
  constructor(
    message: string,
    public readonly pspReference?: string
  ) {
    super(message);
  }
}
```

---

## Persistence Schema

### Database: PostgreSQL with TypeORM

**ORM**: TypeORM 0.3.x  
**Database**: PostgreSQL 14+  
**Migration Strategy**: TypeORM migrations for schema versioning

### payment_transactions Table (SQL Schema)

```sql
CREATE TABLE payment_transactions (
  merchant_reference VARCHAR(100) PRIMARY KEY,
  idempotency_key UUID NOT NULL,
  amount INTEGER NOT NULL,                  -- Minor units (centavos)
  currency VARCHAR(3) NOT NULL,             -- ISO-4217 code
  payment_method_type VARCHAR(50) NOT NULL,
  shopper_email VARCHAR(255),
  shopper_reference VARCHAR(100),
  state VARCHAR(20) NOT NULL,               -- ENUM: pending, authorised, refused, redirect, error
  result_code VARCHAR(50),
  psp_reference VARCHAR(100),
  refusal_reason TEXT,
  action_data JSONB,                        -- Serialized PaymentAction
  correlation_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_idempotency_key (idempotency_key),
  INDEX idx_psp_reference (psp_reference),
  INDEX idx_state (state),
  INDEX idx_created_at (created_at)
);
```

### TypeORM Entity (Infrastructure Layer)

**File**: `src/infrastructure/orm/payment-transaction.entity.ts`

```typescript
import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_transactions')
@Index('idx_idempotency_key', ['idempotencyKey'])
@Index('idx_psp_reference', ['pspReference'])
@Index('idx_state', ['state'])
@Index('idx_created_at', ['createdAt'])
export class PaymentTransactionEntity {
  @PrimaryColumn({ name: 'merchant_reference', type: 'varchar', length: 100 })
  merchantReference: string;

  @Column({ name: 'idempotency_key', type: 'uuid' })
  idempotencyKey: string;

  @Column({ name: 'amount', type: 'integer' })
  amount: number;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  currency: string;

  @Column({ name: 'payment_method_type', type: 'varchar', length: 50 })
  paymentMethodType: string;

  @Column({ name: 'shopper_email', type: 'varchar', length: 255, nullable: true })
  shopperEmail?: string;

  @Column({ name: 'shopper_reference', type: 'varchar', length: 100, nullable: true })
  shopperReference?: string;

  @Column({ name: 'state', type: 'varchar', length: 20 })
  state: string;

  @Column({ name: 'result_code', type: 'varchar', length: 50, nullable: true })
  resultCode?: string;

  @Column({ name: 'psp_reference', type: 'varchar', length: 100, nullable: true })
  pspReference?: string;

  @Column({ name: 'refusal_reason', type: 'text', nullable: true })
  refusalReason?: string;

  @Column({ name: 'action_data', type: 'jsonb', nullable: true })
  actionData?: unknown;

  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
```

### TypeORM Repository Pattern

**File**: `src/infrastructure/repositories/typeorm-payment-transaction.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPaymentTransactionRepository } from '@/domain/contracts/payment-transaction-repository.interface';
import { PaymentTransaction } from '@/domain/entities/payment-transaction';
import { PaymentTransactionEntity } from '../orm/payment-transaction.entity';

@Injectable()
export class TypeOrmPaymentTransactionRepository implements IPaymentTransactionRepository {
  constructor(
    @InjectRepository(PaymentTransactionEntity)
    private readonly repository: Repository<PaymentTransactionEntity>,
  ) {}

  async save(transaction: PaymentTransaction): Promise<PaymentTransaction> {
    const entity = this.toEntity(transaction);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findByMerchantReference(merchantReference: string): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({
      where: { merchantReference },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({
      where: { idempotencyKey },
    });
    return entity ? this.toDomain(entity) : null;
  }

  // Map domain entity to TypeORM entity
  private toEntity(domain: PaymentTransaction): PaymentTransactionEntity {
    const entity = new PaymentTransactionEntity();
    entity.merchantReference = domain.merchantReference;
    entity.idempotencyKey = domain.idempotencyKey;
    entity.amount = domain.amount;
    entity.currency = domain.currency;
    entity.paymentMethodType = domain.paymentMethodType;
    entity.shopperEmail = domain.shopperEmail;
    entity.shopperReference = domain.shopperReference;
    entity.state = domain.state;
    entity.resultCode = domain.resultCode;
    entity.pspReference = domain.pspReference;
    entity.refusalReason = domain.refusalReason;
    entity.actionData = domain.actionData;
    entity.correlationId = domain.correlationId;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  // Map TypeORM entity to domain entity
  private toDomain(entity: PaymentTransactionEntity): PaymentTransaction {
    return PaymentTransaction.fromSchema({
      merchantReference: entity.merchantReference,
      idempotencyKey: entity.idempotencyKey,
      amount: entity.amount,
      currency: entity.currency,
      paymentMethodType: entity.paymentMethodType,
      shopperEmail: entity.shopperEmail,
      shopperReference: entity.shopperReference,
      state: entity.state as PaymentTransactionState,
      resultCode: entity.resultCode,
      pspReference: entity.pspReference,
      refusalReason: entity.refusalReason,
      actionData: entity.actionData,
      correlationId: entity.correlationId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
```

### TypeORM Configuration

**File**: `src/infrastructure/config/typeorm.config.ts`

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentTransactionEntity } from '../orm/payment-transaction.entity';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER', 'postgres'),
  password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
  database: configService.get<string>('DATABASE_NAME', 'payments_db'),
  entities: [PaymentTransactionEntity],
  synchronize: configService.get<string>('NODE_ENV') === 'development', // Use migrations in production
  logging: configService.get<string>('NODE_ENV') === 'development',
  migrations: ['dist/infrastructure/migrations/*.js'],
  migrationsRun: true,
});
```

### Database Migration Example

**File**: `src/infrastructure/migrations/1699564800000-CreatePaymentTransactions.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePaymentTransactions1699564800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_transactions',
        columns: [
          {
            name: 'merchant_reference',
            type: 'varchar',
            length: '100',
            isPrimary: true,
          },
          {
            name: 'idempotency_key',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'payment_method_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'shopper_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'shopper_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'result_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'psp_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'refusal_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'action_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'correlation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'idx_idempotency_key',
        columnNames: ['idempotency_key'],
      }),
    );

    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'idx_psp_reference',
        columnNames: ['psp_reference'],
      }),
    );

    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'idx_state',
        columnNames: ['state'],
      }),
    );

    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'idx_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payment_transactions');
  }
}
```

**Notes**:
- Amounts stored as integers (centavos) to avoid floating-point errors
- State is string enum for database compatibility
- Action data stored as JSONB for flexibility
- Indexes on frequently queried fields (idempotency, PSP reference, state, timestamps)
- TypeORM decorators map database columns to entity properties
- Repository pattern separates domain entities from ORM entities
- Migrations provide version control for database schema changes

---

## Summary

Data model follows hexagonal architecture principles:

1. **Entities**: Immutable with private constructor, static factory methods, `_entity` schema pattern
2. **Value Objects**: Encapsulate validation logic, immutable, equality methods
3. **Domain Errors**: Specific business rule violations
4. **Persistence**: Separate schema from domain model, repositories handle mapping

**Coverage**:
- ✅ All 4 key entities defined (PaymentMethod, PaymentTransaction, PaymentAction, PaymentDetails)
- ✅ 5 value objects for validation (Amount, Currency, CountryCode, PaymentReference, IdempotencyKey)
- ✅ 4 domain errors for business rule violations
- ✅ State machine for transaction lifecycle
- ✅ Persistence schema for transaction storage

**Next**: Generate API contracts in contracts/ directory
