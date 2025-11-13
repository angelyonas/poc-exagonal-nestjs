# Quick Start Guide: Adyen Advanced Flow Payment Integration

**Feature**: Adyen Advanced Flow Payment Integration  
**Last Updated**: 2025-11-13

## Prerequisites

- **Node.js**: 22.x or higher
- **npm**: 10.x or higher
- **PostgreSQL**: 14.x or higher (for data persistence)
- **Docker** (optional): For running PostgreSQL in container
- **Adyen Test Account**: Required for API credentials
- **Adyen Client-Side Encryption**: Required for handling card data (if testing card payments)

## 1. Environment Setup

### Clone and Install

```bash
# From project root
git checkout 001-adyen-payment-integration
npm install
```

### Database Setup (PostgreSQL)

#### Option 1: Docker (Recommended for Development)

```bash
# Start PostgreSQL container
docker run --name payments-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=payments_db \
  -p 5432:5432 \
  -d postgres:14

# Verify container is running
docker ps | grep payments-postgres
```

#### Option 2: Local Installation

```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Create database
psql -U postgres -c "CREATE DATABASE payments_db;"
```

### Environment Variables

Create `.env` file in project root:

```bash
# Adyen Configuration
ADYEN_API_KEY=your_adyen_api_key_here
ADYEN_MERCHANT_ACCOUNT=YourMerchantAccount
ADYEN_ENVIRONMENT=TEST  # TEST or LIVE
ADYEN_API_VERSION=71

# Application Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Timeouts
ADYEN_TIMEOUT_MS=30000
PAYMENT_METHOD_CACHE_TTL_MS=300000  # 5 minutes
IDEMPOTENCY_CACHE_TTL_MS=86400000   # 24 hours

# Database (PostgreSQL with TypeORM)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=payments_db
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/payments_db
```

### Get Adyen Credentials

1. Sign up for Adyen Test Account: https://www.adyen.com/signup
2. Navigate to **Developers > API credentials**
3. Create new API credential
4. Copy **API Key** and **Merchant Account** to `.env`

### Run Database Migrations

```bash
# Generate TypeORM migration (after entity changes)
npm run migration:generate -- -n CreatePaymentTransactions

# Run migrations
npm run migration:run

# Revert last migration (if needed)
npm run migration:revert
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "migration:generate": "typeorm migration:generate -d src/infrastructure/config/typeorm.config.ts",
    "migration:run": "typeorm migration:run -d src/infrastructure/config/typeorm.config.ts",
    "migration:revert": "typeorm migration:revert -d src/infrastructure/config/typeorm.config.ts"
  }
}
```

## 2. Running the Application

### Development Mode

```bash
# Start with hot-reload
npm run start:dev

# Server starts at http://localhost:3000
```

### Production Mode

```bash
# Build application
npm run build

# Start production server
npm run start:prod
```

### Debug Mode

```bash
# Start with debugging enabled
npm run start:debug

# Attach debugger at chrome://inspect
```

## 3. Testing the API

### Health Check

Verify application is running:

```bash
curl http://localhost:3000/api/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Get Payment Methods

Retrieve available payment methods for MXN transactions:

```bash
curl -X GET "http://localhost:3000/api/payment-methods?country=MX&currency=MXN&amount=1500.00&platform=web" \
  -H "X-Correlation-ID: $(uuidgen)"
```

**Expected Response**:
```json
{
  "paymentMethods": [
    {
      "type": "scheme",
      "name": "Credit Card",
      "brands": ["visa", "mc", "amex"]
    },
    {
      "type": "oxxo",
      "name": "OXXO"
    },
    {
      "type": "spei",
      "name": "SPEI Transfer"
    }
  ]
}
```

**Query Parameters**:
- `country` (required): ISO-3166-1 alpha-2 country code (e.g., MX)
- `currency` (required): ISO-4217 currency code (MXN)
- `amount` (required): Transaction amount in major units (pesos)
- `shopperLocale` (optional): Shopper locale (e.g., es-MX)
- `platform` (optional): Payment platform (web, ios, android)

---

### Create Payment (OXXO Example)

Create payment transaction using OXXO (voucher-based payment):

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: $(uuidgen)" \
  -d '{
    "merchantReference": "PAY-1699564800000-A1B2C3",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 1500.00,
    "currency": "MXN",
    "paymentMethodType": "oxxo",
    "shopperEmail": "shopper@example.com",
    "shopperReference": "SHOPPER-12345",
    "paymentMethod": {
      "type": "oxxo"
    }
  }'
```

**Expected Response (Voucher)**:
```json
{
  "merchantReference": "PAY-1699564800000-A1B2C3",
  "state": "redirect",
  "resultCode": "Pending",
  "pspReference": "8816178952380553",
  "amount": 1500.00,
  "currency": "MXN",
  "action": {
    "type": "voucher",
    "paymentMethodType": "oxxo",
    "url": "https://test.adyen.com/hpp/voucher/...",
    "data": {
      "reference": "999123456789012",
      "expiresAt": "2024-01-22T23:59:59Z"
    }
  }
}
```

---

### Create Payment (Credit Card Example - Requires Client-Side Encryption)

**Note**: Card data must be encrypted using Adyen Web SDK. This example shows the API structure.

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: $(uuidgen)" \
  -d '{
    "merchantReference": "PAY-1699564801000-B2C3D4",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
    "amount": 2500.00,
    "currency": "MXN",
    "paymentMethodType": "scheme",
    "shopperEmail": "shopper@example.com",
    "paymentMethod": {
      "type": "scheme",
      "encryptedCardNumber": "adyenjs_0_1_25$...",
      "encryptedExpiryMonth": "adyenjs_0_1_25$...",
      "encryptedExpiryYear": "adyenjs_0_1_25$...",
      "encryptedSecurityCode": "adyenjs_0_1_25$..."
    }
  }'
```

**Expected Response (3D Secure Required)**:
```json
{
  "merchantReference": "PAY-1699564801000-B2C3D4",
  "state": "redirect",
  "resultCode": "RedirectShopper",
  "pspReference": "8816178952380554",
  "amount": 2500.00,
  "currency": "MXN",
  "action": {
    "type": "redirect",
    "paymentMethodType": "scheme",
    "url": "https://test.adyen.com/hpp/3d/...",
    "method": "GET"
  }
}
```

**Expected Response (Authorized)**:
```json
{
  "merchantReference": "PAY-1699564801000-B2C3D4",
  "state": "authorised",
  "resultCode": "Authorised",
  "pspReference": "8816178952380554",
  "amount": 2500.00,
  "currency": "MXN"
}
```

---

### Submit Payment Details (After Redirect)

Complete payment after shopper completes external action:

```bash
curl -X POST http://localhost:3000/api/payments/details \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: $(uuidgen)" \
  -d '{
    "redirectResult": "Ab02b4c0!BQABAgCUeRP+..."
  }'
```

**Expected Response**:
```json
{
  "merchantReference": "PAY-1699564801000-B2C3D4",
  "state": "authorised",
  "resultCode": "Authorised",
  "pspReference": "8816178952380554",
  "amount": 2500.00,
  "currency": "MXN"
}
```

---

## 4. Testing with Adyen Test Cards

Adyen provides test card numbers for integration testing:

### Successful Authorisation

| Card Number          | Expiry | CVC | Result      |
|---------------------|--------|-----|-------------|
| 4111 1111 1111 1111 | 03/30  | 737 | Authorised  |

### 3D Secure Challenge

| Card Number          | Expiry | CVC | Result       |
|---------------------|--------|-----|--------------|
| 5212 3456 7890 1234 | 03/30  | 737 | 3DS Required |

### Declined

| Card Number          | Expiry | CVC | Result         |
|---------------------|--------|-----|----------------|
| 4000 3000 0000 3003 | 03/30  | 737 | Refused        |

**Full list**: https://docs.adyen.com/development-resources/testing/test-card-numbers

---

## 5. Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

### Coverage Requirements

- **Lines**: 95% minimum
- **Statements**: 95% minimum
- **Branches**: 90% minimum
- **Functions**: 90% minimum

---

## 6. Common Issues & Troubleshooting

### Issue: "Invalid API key"

**Cause**: Incorrect or missing `ADYEN_API_KEY` in `.env`

**Solution**:
```bash
# Verify environment variable is set
echo $ADYEN_API_KEY

# Regenerate API key from Adyen Dashboard if needed
```

---

### Issue: "Payment method not available"

**Cause**: Payment method not configured in Adyen merchant account

**Solution**:
1. Login to Adyen Dashboard
2. Navigate to **Account > Payment Methods**
3. Enable required payment methods (OXXO, SPEI, Cards)
4. Clear payment method cache:
   ```bash
   # Restart application to clear in-memory cache
   npm run start:dev
   ```

---

### Issue: "Timeout calling Adyen API"

**Cause**: Network latency or Adyen service degradation

**Solution**:
```bash
# Increase timeout in .env
ADYEN_TIMEOUT_MS=60000

# Check Adyen status page
# https://status.adyen.com
```

---

### Issue: "Duplicate payment request"

**Cause**: Reusing same `idempotencyKey` for different payment

**Solution**:
```bash
# Generate new UUID v4 for each payment
uuidgen  # macOS/Linux
# Or use UUID generator in your application
```

---

## 7. Project Structure

```
src/
├── domain/
│   ├── contracts/
│   │   ├── payment-method-repository.interface.ts
│   │   ├── payment-transaction-repository.interface.ts
│   │   └── dtos/
│   │       ├── payment-method-filters.dto.ts
│   │       ├── create-payment.dto.ts
│   │       └── payment-details.dto.ts
│   ├── entities/
│   │   ├── payment-method.ts
│   │   ├── payment-transaction.ts
│   │   ├── payment-action.ts
│   │   └── payment-details.ts
│   ├── value-objects/
│   │   ├── amount.ts
│   │   ├── currency.ts
│   │   ├── country-code.ts
│   │   ├── payment-reference.ts
│   │   └── idempotency-key.ts
│   └── errors/
│       ├── payment-method-not-found.error.ts
│       ├── invalid-payment-data.error.ts
│       ├── duplicate-payment.error.ts
│       └── payment-processing.error.ts
├── application/
│   ├── use-cases/
│   │   ├── get-payment-methods.use-case.ts
│   │   ├── create-payment.use-case.ts
│   │   └── submit-payment-details.use-case.ts
│   └── config/
│       └── tokens.ts
└── infrastructure/
    ├── controllers/
    │   └── payment.controller.ts
    ├── repositories/
    │   ├── adyen-payment-method.repository.ts
    │   └── in-memory-payment-transaction.repository.ts
    ├── external-services/
    │   └── adyen-api.service.ts
    ├── dto/
    │   ├── payment-method-filters.dto.ts
    │   ├── create-payment.dto.ts
    │   └── payment-details.dto.ts
    ├── cache/
    │   └── in-memory-cache.service.ts
    ├── http-client/
    │   └── fetch-http-client.ts
    └── logger/
        └── structured-logger.service.ts
```

---

## 8. Next Steps

After successful local testing:

1. **Implement Persistence**: Replace in-memory repository with PostgreSQL/MongoDB
2. **Add Webhooks**: Handle Adyen notifications for payment updates
3. **Deploy**: Configure production environment variables
4. **Monitoring**: Set up logging and error tracking
5. **Security**: Enable API authentication, rate limiting

---

## 9. Additional Resources

- **Adyen API Explorer**: https://docs.adyen.com/api-explorer/
- **Adyen Advanced Flow Guide**: https://docs.adyen.com/online-payments/web-drop-in/
- **Test Cards**: https://docs.adyen.com/development-resources/testing/test-card-numbers
- **PCI Compliance**: https://docs.adyen.com/development-resources/pci-dss-compliance-guide/
- **Adyen Status**: https://status.adyen.com

---

## 10. Support

For issues or questions:
- Review specification: `specs/001-adyen-payment-integration/spec.md`
- Check research notes: `specs/001-adyen-payment-integration/research.md`
- API contracts: `specs/001-adyen-payment-integration/contracts/api-spec.yml`
- Data model: `specs/001-adyen-payment-integration/data-model.md`
