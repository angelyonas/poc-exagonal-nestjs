# GitHub Copilot – NestJS + Hexagonal Architecture

**Quick Reference: Core patterns and workflows for AI productivity**

## Project Stack & Architecture

- **Node.js**: 22.x or higher (required)
- **Framework**: NestJS 11 + TypeScript
- **Architecture**: Hexagonal/Ports & Adapters with Domain-Driven Design
- **Microservice Pattern**: Single bounded context per microservice
- **Testing**: Jest with 95% lines/statements, 90% branches/functions coverage
- **Build**: NestJS CLI (`npm run start:dev`)

## Critical Architecture Rules

### Layer Boundaries (Strictly Enforced)

```
Domain Layer (Pure TypeScript) - src/domain/
  ├─ contracts/     → Interfaces (I-prefix), DTOs (I-prefix + DTO-suffix)
  ├─ entities/      → Business logic with `_entity` schema pattern
  ├─ value-objects/ → Validation with `_entity` pattern
  └─ errors/        → Domain errors (business rule violations)

Application Layer - src/application/
  ├─ use-cases/     → Orchestration ONLY (max 3 deps), implements IUseCase<TInput, TOutput>
  └─ config/
      └─ tokens.ts  → Dependency injection tokens using Symbol()

Infrastructure Layer - src/infrastructure/
  ├─ repositories/                → Data persistence (implements domain contracts)
  ├─ orm/                         → Database entities and mappings (TypeORM, Prisma, etc.)
  ├─ dto/                         → API DTOs with validation decorators (class-validator)
  ├─ controllers/                 → REST/GraphQL endpoints (uses NestJS decorators)
  ├─ http-client/                 → HTTP client implementations (for external APIs)
  ├─ logger/                      → Logger implementations (Winston, Pino, etc.)
  ├─ uuid/                        → UUID generator implementations
  └─ app.module.ts                → Main NestJS module configuration (handles all DI)
```

**DTO Guidelines:**
- **Domain DTOs** (`domain/contracts/dtos/`) - Interfaces (`I` prefix + `DTO` suffix) used by use cases for business logic
  - Example: `ICreateProductDTO`, `IProductResponseDTO`, `IProductFiltersDTO`
  - Pure TypeScript interfaces - no decorators
  - Define the contract between use cases and repositories
- **API DTOs** (`infrastructure/dto/`) - Classes with validation decorators (`class-validator`) used by controllers
  - Example: `CreateProductDto`, `ProductResponseDto`, `ProductFiltersDto`
  - Classes with validation decorators (`@IsString()`, `@IsNumber()`, etc.)
  - Used for HTTP request/response validation
  - Must implement their corresponding domain DTO interfaces
- **Flow**: Controller receives API DTO → Converts to Domain DTO → Calls use case with Domain DTO → Use case returns Domain DTO → Controller converts to API response

**Forbidden Imports:**

- ❌ `infrastructure/controllers` → Never import into domain/application layers
- ❌ External framework code → Never import NestJS decorators in domain/application layers
- ❌ `node_modules` → Never import directly in domain/application layers (use interfaces)
- ✅ External libraries ONLY in infrastructure layer or via abstracted interfaces

### Entity Pattern (Domain Layer)

```typescript
// All entities use _entity schema pattern with private constructor
interface IProductSchema {
  id: string;
  name: string;
  price: number;
}

class Product {
  private constructor(private readonly _entity: IProductSchema) {}

  static create(id: string, name: string, price: number): Product {
    // Validation here
    return new Product({ id, name, price });
  }

  static fromSchema(schema: IProductSchema): Product {
    return new Product(schema);
  }

  get id(): string {
    return this._entity.id;
  }
  get price(): number {
    return this._entity.price;
  }

  // Business logic methods
  isExpensive(): boolean {
    return this._entity.price > 1000;
  }
}
```

### Use Case Pattern (Application Layer)

```typescript
// Generic Use Case Interface
interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

// Use Case implementation - orchestrate only, NO business logic
export class GetProductsUseCase implements IUseCase<IProductFiltersDTO, IPaginationResult> {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(filters: IProductFiltersDTO): Promise<IPaginationResult> {
    // Just pass through - no error handling needed here
    // Controllers handle HttpException throwing
    return await this.productRepository.getProducts(filters);
  }
}
```

### Error Handling Pattern

**Two-Layer Error Approach:**

1. **Domain Layer** - Business rule violations (pure TypeScript errors)
2. **Infrastructure Layer** - HTTP error responses (NestJS HttpException + HttpStatus)

```typescript
// Domain Layer - Business errors
export class NotFoundError extends DomainError {
  constructor(resource: string, identifier: string) {
    super(`${resource} with identifier '${identifier}' not found`);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

// Infrastructure Layer - Controllers convert domain errors to HTTP responses
import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { NotFoundError } from '@/domain/errors/not-found.error';

@Controller('products')
export class ProductController {
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getProduct(@Param('id') id: string) {
    try {
      const product = await this.getProductUseCase.execute(id);
      return product;
    } catch (error) {
      // Convert domain errors to HTTP exceptions
      if (error instanceof NotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error; // Re-throw unknown errors
    }
  }
}

// Common HttpStatus codes:
// HttpStatus.OK (200) - GET, PUT, PATCH success
// HttpStatus.CREATED (201) - POST success
// HttpStatus.NO_CONTENT (204) - DELETE success
// HttpStatus.BAD_REQUEST (400) - Invalid request / validation error
// HttpStatus.UNAUTHORIZED (401) - Not authenticated
// HttpStatus.FORBIDDEN (403) - Not authorized
// HttpStatus.NOT_FOUND (404) - Resource not found
// HttpStatus.CONFLICT (409) - Resource conflict
// HttpStatus.UNPROCESSABLE_ENTITY (422) - Complex validation error
// HttpStatus.INTERNAL_SERVER_ERROR (500) - Server error
```

### Dependency Injection Pattern

```typescript
// application/config/tokens.ts - Dependency injection tokens
export const PRODUCT_TOKENS = {
  PRODUCT_REPOSITORY: Symbol('IProductRepository'),
  GET_PRODUCTS_USE_CASE: Symbol('IGetProductsUseCase'),
  GET_PRODUCT_BY_ID_USE_CASE: Symbol('IGetProductByIdUseCase'),
};

export const INFRASTRUCTURE_TOKENS = {
  HTTP_CLIENT: Symbol('IHttpClient'),
  LOGGER: Symbol('ILogger'),
  UUID_GENERATOR: Symbol('IUuidGenerator'),
};

// infrastructure/app.module.ts - NestJS DI configuration with Symbols
import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { PlatziProductRepository } from './repositories/platzi-product.repository';
import { GetProductsUseCase } from '../application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from '../application/use-cases/get-product-by-id.use-case';
import { FetchHttpClient } from './http-client/fetch-http-client';
import { PRODUCT_TOKENS, INFRASTRUCTURE_TOKENS } from '../application/config/tokens';

@Module({
  controllers: [ProductController],
  providers: [
    {
      provide: INFRASTRUCTURE_TOKENS.HTTP_CLIENT,
      useClass: FetchHttpClient,
    },
    {
      provide: PRODUCT_TOKENS.PRODUCT_REPOSITORY,
      useClass: PlatziProductRepository,
    },
    {
      provide: PRODUCT_TOKENS.GET_PRODUCTS_USE_CASE,
      useClass: GetProductsUseCase,
    },
  ],
})
export class AppModule {}

// infrastructure/controllers/product.controller.ts - Controller using DI with Symbols
@Controller('products')
export class ProductController {
  constructor(
    @Inject(PRODUCT_TOKENS.GET_PRODUCTS_USE_CASE)
    private readonly getProductsUseCase: IGetProductsUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getProducts(@Query() filtersDto: ProductFiltersDto) {
    // Convert API DTO to Domain DTO
    const domainFilters: IProductFiltersDTO = {
      page: filtersDto.page,
      pageSize: filtersDto.pageSize,
      search: filtersDto.search,
    };
    
    // Call use case with Domain DTO
    const result = await this.getProductsUseCase.execute(domainFilters);
    
    // Convert Domain DTO to API Response DTO
    return result; // Or map to specific response DTO if needed
  }
  
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getProductById(@Param('id') id: string) {
    try {
      const product = await this.getProductByIdUseCase.execute(id);
      return product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }
}
```

## Development Workflows

### Running the Project

```bash
npm run start:dev      # Start dev server with watch mode
npm run start:debug    # Start with debugging
npm run start:prod     # Production mode
npm run build          # Build for production
npm run test           # Run Jest tests
npm run test:watch     # Watch mode
npm run test:cov       # Generate coverage report (requires 95% lines/statements, 90% branches/functions)
npm run test:e2e       # Run E2E tests
npm run lint           # ESLint check
```

### Testing Strategy

- **Domain tests**: Pure unit tests (no mocks) - test entities, value objects
- **Application tests**: Mock repositories and services
- **Controller tests**: Use NestJS testing utilities
- **Coverage**: 95% lines/statements, 90% branches/functions (enforced by Jest)

```typescript
// Example: Domain entity test (no mocks)
describe('Product.create', () => {
  it('should create product with valid data', () => {
    const product = Product.create('1', 'Laptop', 'Description', 1500);
    expect(product.price).toBe(1500);
  });
});

// Example: Service test (mock repository)
describe('ProductListService', () => {
  let service: ProductListService;
  let mockRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepo = { getProducts: jest.fn() } as any;
    service = new ProductListService(mockRepo);
  });

  it('should fetch products', async () => {
    mockRepo.getProducts.mockResolvedValue({ data: [], total: 0 });
    await service.getProducts({ page: 1, pageSize: 10 });
    expect(mockRepo.getProducts).toHaveBeenCalled();
  });
});

// Example: Controller test (NestJS testing utilities)
describe('ProductController', () => {
  let controller: ProductController;
  let service: jest.Mocked<IProductListService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: 'IProductListService',
          useValue: { getProducts: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get('IProductListService');
  });

  it('should return products', async () => {
    service.getProducts.mockResolvedValue({ data: [], total: 0 });
    const result = await controller.getProducts({ page: 1, pageSize: 10 });
    expect(result).toEqual({ data: [], total: 0 });
  });
});
```

## 📚 Detailed Guidelines

For comprehensive guidelines, reference these files in Copilot Chat:

### Architecture & Structure

- **[Hexagonal Architecture](instructions/hexagonal-architecture.instructions.md)** - Layer principles, boundaries, and responsibilities
- **[Folder Structure](instructions/folder-structure.instructions.md)** - Complete module structure and organization
- **[Naming Conventions](instructions/naming-conventions.instructions.md)** - File and code naming rules

### Layer-Specific Guidelines

- **[Domain Layer](instructions/domain-layer.instructions.md)** - Entities, value objects, interfaces, DTOs, errors
- **[Application Layer](instructions/application-layer.instructions.md)** - Services, DTOs
- **[Infrastructure Layer](instructions/infrastructure-layer.instructions.md)** - Repositories, external services, DI

### Testing

- **[Testing Guidelines](instructions/testing-guidelines.instructions.md)** - Strategy, coverage, domain/application/controller tests

## 🎯 Quick Start Usage

**Apply specific guidelines in Copilot Chat:**

```bash
# Review architecture principles
@github #file:instructions/hexagonal-architecture.instructions.md Review my architecture

# Check folder structure
@github #file:instructions/folder-structure.instructions.md Show me the correct structure

# Create domain entity with validation
@github #file:instructions/domain-layer.instructions.md Create Product entity with price validation

# Create use case
@github #file:instructions/application-layer.instructions.md Create GetProducts use case

# Create infrastructure components
@github #file:instructions/infrastructure-layer.instructions.md Create ProductRepository and controller

# Check naming conventions
@github #file:instructions/naming-conventions.instructions.md Verify my file names

# Write tests
@github #file:instructions/testing-guidelines.instructions.md Write tests for ProductRepository

# Apply multiple guidelines
@github #file:instructions/domain-layer.instructions.md #file:instructions/testing-guidelines.instructions.md

# Use MCP server for library documentation
@github #file:instructions/mcp-context7.instructions.md Get NestJS 11 documentation
```

## MCP Servers

This project uses one Model Context Protocol (MCP) server configured in `.vscode/mcp.json`:

**[Context7 MCP Server](instructions/mcp-context7.instructions.md)** - Library documentation

- For all project layers
- Up-to-date npm package documentation
- Framework-specific examples (NestJS 11, TypeScript)
- Use before integrating external libraries

**Key Rule:** External libraries must be wrapped in shared module interfaces. Use MCP server to understand APIs, then create proper abstractions.

## What Copilot Should NEVER Do

- ❌ Import from infrastructure/controllers into domain/application layers
- ❌ Place NestJS decorators inside domain or application layers
- ❌ Skip writing unit or E2E tests (95%+ coverage required)
- ❌ Comment files excessively; prefer clear, self-explanatory code
- ❌ Add business logic in application use cases or infrastructure
- ❌ Expose domain entities directly (always use DTOs)
- ❌ Forget `I` prefix on interfaces or `DTO` suffix on data transfer objects
- ❌ Create use cases with more than 3 dependencies
- ❌ Test infrastructure services like databases or external APIs in use case tests (always mock)
- ❌ Import external libraries (node_modules) directly in domain/application layers (use interfaces)
- ❌ Use magic numbers for HTTP status codes (ALWAYS use HttpStatus enum)
- ❌ Use HttpException in domain/application layers (use domain errors instead)
- ❌ Forget @HttpCode decorator on controller methods
- ❌ Forget to convert domain errors to HttpException in controllers

---

**For detailed guidelines, reference the instruction files above in Copilot Chat.**

## Active Technologies
- Node.js 22.x, TypeScript 5.x + NestJS 11, class-validator, class-transformer, Jest (001-adyen-payment-integration)
- PostgreSQL 14+ with TypeORM 0.3.x for data persistence (001-adyen-payment-integration)

## Recent Changes
- 001-adyen-payment-integration: Added PostgreSQL with TypeORM for payment transaction persistence
