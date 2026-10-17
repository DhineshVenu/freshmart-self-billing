# System architecture

Fresh Mart is a multi-client retail system backed by one Express API and
MongoDB. The web and mobile apps are separate user experiences; the backend is
the authority for business state.

## Component view

```mermaid
flowchart TB
    subgraph Clients["Client applications"]
        Web["React web SPA<br/>Customer, worker, admin"]
        Mobile["Expo / React Native<br/>Customer"]
    end

    subgraph Edge["Web delivery"]
        Vite["Vite development server"]
        Nginx["NGINX production container<br/>Static assets + /api proxy"]
    end

    subgraph API["Express / TypeScript API"]
        Routes["Routes and middleware"]
        Controllers["HTTP controllers"]
        Services["Domain services"]
        Models["Mongoose models"]
    end

    Mongo[("MongoDB")]
    Email["SMTP or development mail transport"]
    Push["Expo Push API"]

    Web --> Vite
    Web --> Nginx
    Mobile --> Routes
    Nginx --> Routes
    Routes --> Controllers --> Services --> Models --> Mongo
    Services --> Email
    Services --> Push
```

## Responsibilities

| Layer | Responsibilities |
| --- | --- |
| Web client | Browser navigation, staff/admin pages, customer shopping, camera barcode capture, bill display and print |
| Mobile client | Customer sign-in, session QR joining, native camera scanning, cart, receipt, and history |
| API routes/controllers | HTTP mapping, request/response behavior, authentication and role middleware |
| Services | Session, catalog/cart, checkout, inventory, store, report, email, push, and vision workflows |
| Models | MongoDB schemas for users, products, sessions, carts, orders, payments, stores, and operational records |

## Request and checkout flow

```mermaid
sequenceDiagram
    actor Shopper
    participant Client as Web/mobile
    participant API as Express API
    participant Domain as Service layer
    participant DB as MongoDB
    Shopper->>Client: Join session and scan item
    Client->>API: Send session code and barcode
    API->>Domain: Validate identity, product, session, and stock
    Domain->>DB: Read/write session, product, and cart
    DB-->>Domain: Current persisted values
    Domain-->>API: Recalculated cart
    API-->>Client: Cart response
    Shopper->>Client: Request checkout
    Client->>API: Checkout request
    API->>Domain: Revalidate catalog and stock
    Domain->>DB: Store order snapshot and pending payment
    API-->>Client: Pending bill
    API-->>Client: Session updates are available over SSE
```

## Deployment shape

Docker Compose runs MongoDB, the backend container, and an NGINX container that
serves the Vite build and proxies `/api/` to Express. The mobile app runs
separately and must be configured with an API address reachable from the
device. A local in-memory MongoDB fallback exists for demonstrations; it is
not durable storage. Session event streams and the nightly snapshot schedule
are process-local, so horizontal scaling requires shared coordination.

For a whole-system report, including data relationships, security and
limitations, see [PROJECT_REPORT.md](./PROJECT_REPORT.md).
