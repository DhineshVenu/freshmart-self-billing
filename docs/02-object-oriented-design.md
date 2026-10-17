# 02 — Object-Oriented Domain Architecture

## 1. Architectural Overview

The backend service is structured using strict **Object-Oriented Programming (OOP)** principles to maintain high cohesion, low coupling, and enterprise maintainability. The design enforces clear separation between HTTP request orchestration, business rule encapsulation, and data contracts.

---

## 2. Object Class Structure Diagram

![OOP Class Hierarchy](./assets/oop-class-hierarchy.svg)

---

## 3. Core Design Patterns

### 3.1 Template & Strategy Pattern via `BaseController` Inheritance
All Express domain controllers inherit from an abstract `BaseController`. This standardizes JSON response payloads and prevents code duplication across endpoints:

```typescript
export abstract class BaseController {
  protected sendSuccess<T>(
    res: Response,
    data: T,
    statusCode = 200,
    message?: string
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  protected sendError(
    res: Response,
    message: string,
    statusCode = 400
  ): void {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
```

### 3.2 Service Layer Encapsulation
Domain controllers delegate business tasks to dedicated service instances. Controllers handle HTTP validation and response codes, while services encapsulate database transactions and state transitions:

```typescript
export class ProductController extends BaseController {
  private readonly productService: ProductService;

  constructor() {
    super();
    this.productService = new ProductService();
  }

  public getByBarcode = async (req: Request, res: Response): Promise<void> => {
    try {
      const barcode = req.params.barcode;
      const product = await this.productService.getProductByBarcode(barcode);
      this.sendSuccess(res, { product }, 200);
    } catch (error) {
      this.sendError(res, (error as Error).message, 400);
    }
  };
}
```

### 3.3 Data Transfer Objects (DTOs)
Strong TypeScript interfaces enforce structural contracts between presentation layers and domain services:

```typescript
export interface CreateSessionDTO {
  storeName: string;
}

export interface JoinSessionDTO {
  customerName: string;
}

export interface SessionResponseData {
  id: string;
  databaseId?: string;
  storeName: string;
  workerId: string;
  status: string;
  joinedCustomerName: string | null;
  joinedAt: Date | null;
  createdAt: Date;
}
```

---

## 4. Key Architectural Benefits
- **Single Responsibility Principle (SRP)**: Transport logic remains strictly inside controllers; domain rules stay within service classes.
- **High Testability**: Domain services can be unit-tested without mocking Express Request/Response objects.
- **Maintainability**: Modifying response envelopes requires editing a single line in `BaseController`.
