# Research: Adyen Advanced Flow Payment Integration

**Date**: 2025-11-13  
**Feature**: Adyen Advanced Flow Payment Integration  
**Phase**: 0 - Outline & Research

## Research Topics

### 1. Adyen API Integration Best Practices

**Decision**: Use Adyen Checkout API v71 with REST endpoints for payment methods and transactions

**Rationale**:
- Adyen API v71 is the latest stable version (specified in assumptions)
- REST API provides direct control over payment flow without UI dependencies
- Supports Advanced Flow pattern for custom checkout experiences
- Enables encrypted card data handling for PCI SAQ-A compliance

**Alternatives Considered**:
- Adyen Drop-in/Components: Rejected - requires frontend UI integration (out of scope)
- Adyen API v70: Rejected - older version, v71 provides improved error handling
- Custom card integration: Partially used - for encrypted card data only

**Implementation Details**:
- Endpoint: `https://checkout-test.adyen.com/v71/`
- Key endpoints: `/paymentMethods`, `/payments`, `/payments/details`
- Authentication: API key via `x-api-key` header
- Request format: JSON with specific required fields per endpoint

**References**:
- Adyen Advanced Flow Documentation: https://docs.adyen.com/online-payments/build-your-integration/advanced-flow
- Adyen API Explorer: https://docs.adyen.com/api-explorer

---

### 2. Idempotency Implementation Strategy

**Decision**: Client-provided UUID idempotency keys with 24-hour response caching

**Rationale**:
- Client controls retry safety across network failures
- 24-hour cache window covers typical payment session durations
- Aligns with industry standards (Stripe, PayPal use similar patterns)
- Prevents duplicate charges from legitimate retries

**Alternatives Considered**:
- Server-generated merchant references: Rejected - doesn't protect against client retries
- No idempotency: Rejected - violates NFR-006 and creates duplicate payment risk
- Request body hashing: Rejected - same request body with different intent should be allowed

**Implementation Details**:
- Accept `X-Idempotency-Key` header (UUID v4 format)
- Cache key: `idempotency:{merchantAccount}:{idempotencyKey}`
- Cache storage: In-memory cache (initial), migrate to Redis for production
- Cache entry: Full payment response + timestamp
- Validation: Reject mismatched request body with same idempotency key

**Code Pattern**:
```typescript
// Infrastructure layer - Cache implementation
interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

// Use case orchestration
const cacheKey = `idempotency:${merchantAccount}:${idempotencyKey}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const response = await adyenClient.createPayment(paymentData);
await cache.set(cacheKey, response, 24 * 60 * 60); // 24 hours
```

---

### 3. Payment State Management & Persistence Timing

**Decision**: Persist transaction before API call with initial "pending" state, update with response

**Rationale**:
- Complete audit trail even for failed API requests
- Enables retry logic with consistent transaction tracking
- Supports correlation between stored transactions and Adyen PSP references
- Aligns with event sourcing principles (record intent before outcome)

**Alternatives Considered**:
- Persist after API response only: Rejected - loses failed requests in audit trail
- Asynchronous persistence via queue: Rejected - adds complexity, risks losing data
- Dual-write (before and after): Selected approach minimizes write operations

**Implementation Details**:
```typescript
// Transaction state machine
enum PaymentTransactionState {
  PENDING = 'pending',
  AUTHORISED = 'authorised',
  REFUSED = 'refused',
  REDIRECT = 'redirect',
  ERROR = 'error',
}

// Persistence flow
1. Generate merchant reference and correlation ID
2. Create transaction record with state=PENDING
3. Call Adyen API
4. Update transaction with:
   - state (from resultCode)
   - pspReference
   - actionData (if redirect/3DS)
   - errorDetails (if failed)
   - updatedAt timestamp
```

**State Transitions**:
- `pending → authorised` (successful direct payment)
- `pending → refused` (declined by issuer)
- `pending → redirect` (requires external authentication)
- `pending → error` (API error or validation failure)
- `redirect → authorised` (successful after redirect)
- `redirect → refused` (declined after authentication)

---

### 4. Retry Logic & Error Classification

**Decision**: Maximum 3 retries with exponential backoff (1s, 2s, 4s) for network/5xx errors only

**Rationale**:
- 3 retries with exponential backoff handles ~99% of transient failures
- Total retry time: ~7 seconds (acceptable within 30s timeout)
- Avoids retry storms on Adyen infrastructure
- 4xx errors are client-side and won't succeed on retry

**Alternatives Considered**:
- Fixed delay retries: Rejected - increases load on already-stressed services
- Unlimited retries: Rejected - can cause cascading failures
- Retry all errors: Rejected - wastes resources on permanent failures

**Implementation Details**:
```typescript
// Retry-eligible errors
- Network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
- HTTP 500 (Internal Server Error)
- HTTP 502 (Bad Gateway)
- HTTP 503 (Service Unavailable)
- HTTP 504 (Gateway Timeout)

// Non-retryable errors
- HTTP 400 (Bad Request) - invalid data
- HTTP 401 (Unauthorized) - invalid API key
- HTTP 403 (Forbidden) - insufficient permissions
- HTTP 404 (Not Found) - invalid endpoint
- HTTP 422 (Unprocessable Entity) - validation error
```

**Retry Pattern**:
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts || !isRetryable(error)) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

function isRetryable(error: any): boolean {
  const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
  const retryableStatusCodes = [500, 502, 503, 504];
  
  return networkErrors.includes(error.code) ||
         retryableStatusCodes.includes(error.statusCode);
}
```

---

### 5. Payment Method Caching Strategy

**Decision**: 5-minute TTL cache per shopper context (country + currency + amount range)

**Rationale**:
- Payment methods rarely change within a checkout session (<5 minutes)
- Reduces Adyen API calls by ~90% for high-traffic scenarios
- Context-specific caching ensures accurate method availability
- 5-minute window balances freshness with performance

**Alternatives Considered**:
- No caching: Rejected - unnecessary API load, violates SC-001a
- Global cache (shared across all shoppers): Rejected - inaccurate for different contexts
- 1-hour TTL: Rejected - too stale, might show unavailable methods

**Implementation Details**:
```typescript
// Cache key structure
function buildCacheKey(context: PaymentMethodContext): string {
  const { country, currency, amountRange, platform } = context;
  // Amount range: bucket amounts to reduce cache fragmentation
  const bucket = Math.floor(context.amount / 10000) * 10000; // 100 MXN buckets
  return `payment-methods:${country}:${currency}:${bucket}:${platform}`;
}

// Cache configuration
const PAYMENT_METHOD_CACHE_TTL = 5 * 60; // 5 minutes in seconds

// Usage in use case
const cacheKey = buildCacheKey(filters);
let methods = await cache.get<PaymentMethod[]>(cacheKey);

if (!methods) {
  methods = await adyenClient.getPaymentMethods(filters);
  await cache.set(cacheKey, methods, PAYMENT_METHOD_CACHE_TTL);
}
```

**Cache Invalidation**:
- Automatic expiration after 5 minutes
- Manual invalidation not required (stale data is acceptable for this duration)
- Different contexts = different cache keys (no cross-contamination)

---

### 6. MXN Currency Handling & Minor Units

**Decision**: Store amounts in minor units (centavos), validate as MXN ISO-4217

**Rationale**:
- Adyen API requires amounts in minor units (1 MXN = 100 centavos)
- Avoids floating-point precision errors
- Standard practice for financial systems
- ISO-4217 compliance ensures international compatibility

**Alternatives Considered**:
- Store as decimal: Rejected - floating-point errors in calculations
- Store in major units: Rejected - requires conversion on every API call
- Multiple currency support: Deferred - MXN only for MVP

**Implementation Details**:
```typescript
// Value object for Amount
class Amount {
  private constructor(
    private readonly _entity: {
      value: number; // In minor units (centavos)
      currency: Currency;
    }
  ) {}

  static createMXN(pesos: number): Amount {
    if (pesos < 0) {
      throw new InvalidAmountError('Amount cannot be negative');
    }
    const centavos = Math.round(pesos * 100);
    return new Amount({
      value: centavos,
      currency: Currency.MXN,
    });
  }

  static fromMinorUnits(centavos: number, currency: Currency): Amount {
    if (centavos < 0) {
      throw new InvalidAmountError('Amount cannot be negative');
    }
    return new Amount({ value: centavos, currency });
  }

  get minorUnits(): number {
    return this._entity.value;
  }

  get majorUnits(): number {
    return this._entity.value / 100;
  }

  getFormatted(): string {
    return `${this._entity.currency} $${(this._entity.value / 100).toFixed(2)}`;
  }
}

// Usage
const amount = Amount.createMXN(2000.50); // 2000.50 MXN
console.log(amount.minorUnits); // 200050 centavos (for Adyen API)
console.log(amount.getFormatted()); // "MXN $2000.50"
```

**Validation Rules**:
- Currency must be "MXN" (ISO-4217)
- Amount must be non-negative
- Minor units must be integer (no fractional centavos)
- Maximum amount: 9,999,999.99 MXN (999,999,999 centavos)

---

### 7. Logging & Sensitive Data Masking

**Decision**: Log full request/response with field-level masking for PCI compliance

**Rationale**:
- Full payloads enable effective debugging
- Field-level masking protects sensitive data
- Correlation IDs enable distributed tracing
- Latency metrics support performance monitoring

**Alternatives Considered**:
- Metadata-only logging: Rejected - insufficient for debugging complex issues
- No logging: Rejected - violates NFR-002 and audit requirements
- Encryption instead of masking: Rejected - still stores sensitive data

**Implementation Details**:
```typescript
// Fields to mask (PCI DSS requirement)
const SENSITIVE_FIELDS = [
  'encryptedCardNumber',
  'encryptedExpiryMonth',
  'encryptedExpiryYear',
  'encryptedSecurityCode',
  'cardNumber', // If somehow present
  'cvv', 'cvc', 'securityCode',
  'apiKey', 'x-api-key',
  'pspReference', // Partially mask
];

function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const masked = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      // Mask credit card numbers - show last 4 digits only
      if (key.includes('cardNumber') || key.includes('Card')) {
        masked[key] = typeof value === 'string' 
          ? `****${value.slice(-4)}` 
          : '****';
      }
      // Fully mask other sensitive fields
      else {
        masked[key] = '***MASKED***';
      }
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

// Log format
interface PaymentLogEntry {
  timestamp: string;
  correlationId: string;
  operation: string; // 'GET_PAYMENT_METHODS', 'CREATE_PAYMENT', etc.
  request: {
    method: string;
    url: string;
    headers: Record<string, string>; // Masked
    body: any; // Masked
  };
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: any; // Masked
    latencyMs: number;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}
```

---

### 8. Correlation ID Generation & Propagation

**Decision**: Generate UUID v4 correlation IDs at API entry point, propagate through all layers

**Rationale**:
- Enables end-to-end request tracing
- Supports distributed debugging across services
- Industry standard (OpenTelemetry, AWS X-Ray use similar patterns)
- Low overhead (UUID generation is fast)

**Implementation Details**:
```typescript
// NestJS middleware for correlation ID
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.header('X-Correlation-ID') || 
                          uuidv4();
    
    req['correlationId'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    next();
  }
}

// Pass through layers
interface IUseCase<TInput, TOutput> {
  execute(input: TInput, correlationId: string): Promise<TOutput>;
}

// Log with correlation ID
logger.info({
  correlationId,
  operation: 'CREATE_PAYMENT',
  ...logData
});
```

---

### 9. HTTP Client Configuration for Adyen API

**Decision**: Use native Fetch API with custom wrapper for retry, timeout, and logging

**Rationale**:
- Native fetch is built-in (Node.js 18+, no external dependency)
- Wrapper provides consistent error handling across all HTTP calls
- Enables middleware pattern for logging, retry, correlation ID injection
- Lightweight compared to axios or other HTTP libraries

**Alternatives Considered**:
- Axios: Rejected - adds dependency, fetch is sufficient for API calls
- Native fetch without wrapper: Rejected - duplicates retry/logging logic
- Adyen Node.js SDK: Rejected - opaque implementation, harder to customize

**Implementation Details**:
```typescript
// HTTP client interface (domain layer)
interface IHttpClient {
  get<T>(url: string, config?: IHttpConfig): Promise<IHttpResponse<T>>;
  post<T>(url: string, data?: unknown, config?: IHttpConfig): Promise<IHttpResponse<T>>;
}

interface IHttpConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

interface IHttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

// Fetch wrapper implementation (infrastructure layer)
export class FetchHttpClient implements IHttpClient {
  constructor(
    private readonly baseURL: string,
    private readonly logger: ILogger
  ) {}

  async post<T>(
    url: string, 
    data?: unknown, 
    config?: IHttpConfig
  ): Promise<IHttpResponse<T>> {
    const fullUrl = `${this.baseURL}${url}`;
    const timeout = config?.timeout || 30000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config?.headers,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseData = await response.json();
      
      return {
        data: responseData,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }
  
  private handleError(error: any): Error {
    if (error.name === 'AbortError') {
      return new NetworkTimeoutError('Request timeout');
    }
    return new NetworkError(error.message);
  }
}
```

---

## Summary

All research topics have been resolved with clear decisions, rationale, and implementation details. The technical approach aligns with:

1. **Hexagonal Architecture**: Clear layer separation with domain-first design
2. **PCI Compliance**: Encrypted card data only, sensitive field masking
3. **Performance**: Caching strategies for sub-100ms response times
4. **Reliability**: Retry logic, idempotency, audit trails
5. **Observability**: Correlation IDs, structured logging, latency metrics
6. **MXN Support**: Minor units, ISO-4217 validation, proper formatting
7. **Persistence**: PostgreSQL with TypeORM for reliable data storage

**Database Technology**: PostgreSQL 14+ with TypeORM 0.3.x
- **Why PostgreSQL**: ACID compliance, JSONB support for flexible action data, mature ecosystem
- **Why TypeORM**: NestJS native integration, decorator-based entities, migration support, type-safe queries
- **Schema Strategy**: Separate TypeORM entities from domain entities, repository pattern for mapping
- **Migration Strategy**: TypeORM migrations for version control, `synchronize: false` in production

**Next Phase**: Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)

