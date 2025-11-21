# Feature Specification: Adyen Advanced Flow Payment Integration

**Feature Branch**: `001-adyen-payment-integration`  
**Created**: 2025-11-13  
**Status**: Draft  
**Input**: User description: "Integrate the Advanced Flow from adyen payments provider, before we need to create the service for get the available payment methods and then the service for insert a transaction payment."

## Clarifications

### Session 2025-11-13

- Q: Payment Transaction Idempotency Strategy - The spec mentions idempotency but doesn't specify the idempotency key mechanism. → A: Client provides idempotency key (UUID) with each request; system caches responses for 24 hours
- Q: Payment Transaction State Persistence Timing - The spec requires persisting payment transaction records but doesn't specify when persistence occurs relative to Adyen API calls. → A: Persist transaction record immediately before calling Adyen API, then update with response
- Q: Retry Logic Scope and Limits - NFR-004 mentions retry logic with exponential backoff for transient failures, but doesn't specify retry limits or which error types qualify as transient. → A: Maximum 3 retries with exponential backoff (1s, 2s, 4s) only for network errors and 5xx server errors
- Q: Payment Method Caching Strategy - The spec requires retrieving payment methods but doesn't specify if results can be cached to improve performance. → A: Cache payment methods for 5 minutes per shopper context (country + currency + amount range)
- Q: Logging Detail Level for Payment Transactions - NFR-002 requires logging all payment API interactions but doesn't specify what level of detail should be captured or how sensitive data is handled in logs. → A: Log full request/response payloads with masked sensitive fields (card numbers, API keys), include correlation IDs and latency metrics
- Q: Base Currency for Payment Processing - User requested to specify the base currency for managing payments. → A: MXN (Mexican Pesos) is the base currency for all payment transactions

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve Available Payment Methods (Priority: P1)

As a merchant, I need to retrieve available payment methods for my shoppers based on their location, device, and transaction amount so that I can present relevant payment options at checkout.

**Why this priority**: This is the foundation of the payment flow - without knowing available payment methods, we cannot proceed with any payment processing. This enables the most basic payment integration functionality.

**Independent Test**: Can be fully tested by calling the payment methods service with shopper details (country, amount, currency) and verifying the response contains a list of supported payment methods. Delivers value by allowing merchants to discover what payment options they can offer.

**Acceptance Scenarios**:

1. **Given** a shopper in the Netherlands with EUR 100.00 cart total, **When** the system requests available payment methods, **Then** the response includes iDEAL, SEPA Direct Debit, and card payment options
2. **Given** a shopper in Mexico with MXN 2000.00 cart total, **When** the system requests available payment methods, **Then** the response includes card payment options and Mexico-specific payment methods compatible with MXN currency
3. **Given** a shopper with an invalid country code, **When** the system requests available payment methods, **Then** the system returns an error with a clear message about the invalid country
4. **Given** a merchant account with limited payment methods enabled, **When** the system requests available payment methods, **Then** only enabled payment methods for that merchant are returned
4. **Given** a shopper on a mobile device (Android/iOS), **When** the system requests available payment methods, **Then** the response filters methods compatible with mobile platforms

---

### User Story 2 - Initiate Payment Transaction (Priority: P2)

As a merchant, I need to create payment transactions with Adyen so that shoppers can complete their purchases using their selected payment method.

**Why this priority**: This enables actual payment processing after discovering available methods. Critical for completing the payment flow but depends on P1 being implemented first.

**Independent Test**: Can be fully tested by submitting a payment request with shopper payment details and verifying the response contains a payment status and any required additional actions (redirects, 3DS). Delivers value by enabling actual payment collection.

**Acceptance Scenarios**:

1. **Given** a shopper has selected a card payment method with valid card details, **When** the system submits the payment request, **Then** the response includes a result code (Authorised, Refused, or RedirectShopper) and a unique payment reference
2. **Given** a shopper selects iDEAL payment method, **When** the system submits the payment request, **Then** the response includes redirect action with URL for shopper authentication
3. **Given** a payment requires 3D Secure authentication, **When** the system submits the payment request, **Then** the response includes threeDS2 action object with authentication details
4. **Given** invalid payment details are submitted, **When** the system submits the payment request, **Then** the system returns a validation error with specific field information
5. **Given** a payment transaction is initiated, **When** the request includes shopper information, **Then** the system stores the merchant reference for reconciliation

---

### User Story 3 - Handle Payment Additional Actions (Priority: P3)

As a merchant, I need to process additional payment actions (redirects, 3DS authentication) so that shoppers can complete payment flows requiring extra steps.

**Why this priority**: Enhances payment flow by supporting payment methods requiring redirects or additional authentication. Important for payment method coverage but not required for basic card payments.

**Independent Test**: Can be fully tested by simulating redirect returns with payment details and verifying the system completes the payment flow. Delivers value by expanding payment method support beyond direct card processing.

**Acceptance Scenarios**:

1. **Given** a shopper completes authentication on external payment provider site, **When** they are redirected back with payment details, **Then** the system processes the additional payment details and retrieves final payment status
2. **Given** a shopper abandons the payment on external site, **When** the redirect timeout expires, **Then** the system handles the timeout gracefully with appropriate error status
3. **Given** a 3D Secure authentication is successful, **When** the authentication result is submitted, **Then** the payment is authorized and confirmed

---

### Edge Cases

- What happens when Adyen API is unavailable or times out during payment methods retrieval? (System retries up to 3 times with exponential backoff, then returns error)
- How does the system handle network interruptions during payment submission? (System retries network errors up to 3 times, persists transaction state before retry)
- What happens when a shopper's payment method becomes unavailable between retrieval and payment submission?
- How does the system handle currency mismatches between cart and payment request?
- What happens when payment webhook notifications arrive before payment details response?
- What happens when Adyen returns unknown/new payment method types not yet supported?
- How does the system handle duplicate idempotency keys with different payment details?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST retrieve available payment methods from Adyen based on merchant account, country code, amount, currency, and platform (Web/iOS/Android)
- **FR-001a**: System MUST cache payment method responses for 5 minutes per unique shopper context (country + currency + amount range) to improve performance
- **FR-001b**: System MUST support MXN (Mexican Pesos) as the base currency for payment transactions, with proper formatting and validation according to ISO-4217 standards
- **FR-002**: System MUST filter payment methods based on shopper's device type and location
- **FR-003**: System MUST create payment transactions by submitting payment details to Adyen /payments endpoint
- **FR-004**: System MUST include merchant account identifier, payment amount, currency, payment method type, and shopper details in payment requests
- **FR-004a**: System MUST accept client-provided idempotency key (UUID format) with each payment request to prevent duplicate processing
- **FR-004b**: System MUST cache payment responses associated with idempotency keys for 24 hours and return cached response for duplicate requests
- **FR-005**: System MUST generate and track unique merchant references for each payment transaction
- **FR-006**: System MUST handle payment responses including result codes (Authorised, Refused, RedirectShopper, PresentToShopper)
- **FR-007**: System MUST process additional payment details for redirect-based payment methods via /payments/details endpoint
- **FR-008**: System MUST handle action objects in payment responses (redirect, threeDS2, voucher, qrCode)
- **FR-009**: System MUST validate required fields before submitting to Adyen API (country code format, currency codes including MXN validation, amount values in minor units - centavos for MXN)
- **FR-010**: System MUST transform Adyen API responses to domain-appropriate data structures
- **FR-011**: System MUST handle Adyen API errors and map them to domain errors
- **FR-012**: System MUST support encrypted card data format for PCI compliance (not raw card data)
- **FR-013**: System MUST include return URL for redirect-based payment methods
- **FR-014**: System MUST persist payment transaction records immediately before calling Adyen API with initial state (pending), then update with response status, amount, payment method, PSP reference, and timestamps
- **FR-015**: System MUST maintain transaction state transitions in audit trail (pending → authorised/refused/redirect/error)

### Key Entities

- **Payment Method**: Represents a payment option available to shoppers, including method type (scheme, iDEAL, SEPA, etc.), display name, and platform compatibility
- **Payment Transaction**: Represents a payment attempt, including unique merchant reference, idempotency key, amount, currency, payment method type, shopper details, result code, PSP reference, state (pending/authorised/refused/redirect/error), and timestamps (created, updated)
- **Payment Action**: Represents additional steps required to complete payment (redirect URL, 3DS challenge data, voucher details), linked to payment transaction
- **Payment Details**: Additional data needed to finalize payment after shopper completes external action (redirect result, 3DS authentication result)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System retrieves available payment methods in under 2 seconds for 95% of requests (including cache hits and misses)
- **SC-001a**: Cached payment method requests return results in under 100 milliseconds for 99% of requests
- **SC-002**: System successfully processes payment requests with 99% uptime when Adyen API is available
- **SC-003**: System handles 100 concurrent payment transactions without performance degradation
- **SC-004**: All payment transactions include complete audit trail with timestamps and status changes
- **SC-005**: System correctly handles all Adyen payment result codes (Authorised, Refused, RedirectShopper, etc.) without errors
- **SC-006**: 95% of payment method retrieval requests return results within defined timeout period
- **SC-007**: Payment transaction data persists successfully for 100% of initiated payments
- **SC-008**: System prevents duplicate payment submissions through proper idempotency handling

### Assumptions

1. Merchant account is pre-configured in Adyen with payment methods enabled
2. Adyen API credentials (API key, merchant account code) are available via environment configuration
3. Webhook infrastructure for payment status updates will be implemented separately
4. Client-side card encryption is handled by frontend (encrypted card data passed to backend)
5. Return URLs for redirect payments are configured and accessible
5. Currency and country code validations follow ISO standards (ISO-4217 for currency, ISO-3166-1 alpha-2 for countries)
6. MXN (Mexican Pesos) is the primary base currency for payment processing; amounts are expressed in minor units (centavos: 1 MXN = 100 centavos)
7. Adyen API version 71 is used for integration
8. System operates in test environment initially before live migration
9. PCI compliance uses SAQ-A approach with encrypted card data only

### Out of Scope

- Frontend UI components for payment forms
- Client-side card encryption implementation (assumed handled by client)
- Webhook server implementation for payment outcome notifications
- Payment capture/refund/cancellation operations
- Recurring payment setup and tokenization
- 3D Secure 2 Component implementation (native authentication flows)
- Multi-currency conversion handling
- Payment method logos and UI assets
- Live environment configuration and go-live process
- PCI compliance assessment and certification

### Dependencies

- Adyen merchant account with API access
- Adyen API credentials (API key)
- Network connectivity to Adyen API endpoints (https://checkout-test.adyen.com/v71)
- Environment configuration service for managing credentials
- HTTP client service for API communication
- Data persistence layer for transaction records

### Non-Functional Requirements

- **NFR-001**: System MUST maintain PCI DSS compliance by handling only encrypted card data
- **NFR-002**: System MUST log all payment API interactions with full request/response payloads (with masked sensitive fields including card numbers, CVV, API keys, PSP references), correlation IDs for distributed tracing, and latency metrics for audit and debugging purposes
- **NFR-003**: System MUST implement proper timeout handling (30 seconds for API calls)
- **NFR-004**: System MUST implement retry logic with exponential backoff (1 second, 2 seconds, 4 seconds) for maximum 3 attempts on network errors and HTTP 5xx server errors only; client errors (4xx) MUST NOT be retried
- **NFR-005**: System MUST sanitize and validate all input data before API submission
- **NFR-006**: System MUST implement idempotency using client-provided UUID keys, caching responses for 24 hours to prevent duplicate payment processing
- **NFR-007**: System MUST mask sensitive payment data (card numbers showing only last 4 digits, API keys, PSP references, CVV codes) in all logs and error messages
- **NFR-008**: System MUST generate unique correlation IDs for each payment flow to enable distributed tracing across services
