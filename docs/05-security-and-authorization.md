# Security and authorization

This guide summarizes the implemented controls and the operational safeguards
still required before deploying with real users or data. It is not a security
certification.

## Authentication

- Customer passwords are hashed with `bcryptjs`.
- The API issues JWTs that expire after 24 hours.
- `JWT_SECRET` must be supplied by the environment. Token generation and
  verification fail if it is absent; the application no longer has a
  hard-coded signing-key fallback.
- The web client currently stores its token in `sessionStorage` and sends it as
  a bearer token. The mobile client stores its token using Expo SecureStore and
  sends it as a bearer token.
- The API can also read the token from a cookie; do not assume that browser
  authentication is cookie-only or protected from JavaScript access.

## Authorization

`authenticateToken` verifies the presented token and `requireRole` enforces
route-level roles. The primary roles include customer, worker, administrator,
and store manager. Route files under `backend/src/routes/` define which roles
may access each operation; refer to those files when checking a specific
permission.

The API is the authority for product pricing, stock checks, session state,
order totals, and settlement. Client-side validation is for usability, not a
security boundary.

## Other controls

- Helmet sets HTTP security headers.
- Login/register routes use an IP-based rate limiter.
- Passwords are hashed rather than stored in plaintext.
- Administrative and operational changes can create audit records.
- Docker Compose requires an explicit JWT secret and binds the MongoDB host
  port to loopback for local development.
- Local `.env` files, node_modules, build output, and Expo state are ignored by
  Git.

## Safe configuration checklist

1. Set a unique, high-entropy `JWT_SECRET` through a secret manager or an
   untracked environment file. Rotate it if it has ever been exposed.
2. Do not commit real API keys, SMTP credentials, tokens, production database
   URIs, or customer data. `.env.example` files are placeholders only.
3. Development seed accounts require local `DEMO_ADMIN_PASSWORD` and
   `DEMO_WORKER_PASSWORD` values. Production startup skips them; provision an
   administrator through a controlled process.
4. Terminate HTTPS at a trusted edge and configure CORS to allow only the
   intended application origins.
5. Review cookie flags, token storage, account lifecycle, audit-log retention,
   and request validation for the deployment's threat model.
6. Keep MongoDB private, enable authenticated database access, and verify
   backups and restore procedures.
7. Configure rate limiting and monitoring appropriate for the deployment
   topology; the current authentication limiter is process-local.

## Important implementation limits

The application is intended for development/demo use until production
configuration is reviewed. In particular, the current backend CORS setup
reflects request origins, and JWT bearer tokens are stored in web
`sessionStorage`. HTTPS, strict
production CORS, secure account provisioning, and a deployment-specific
security review are required before public operation.
