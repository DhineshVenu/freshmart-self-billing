# Deployment and operations

This guide covers the three app packages (API, web, and mobile), local
configuration, Docker Compose, and the checks available in the repository.
Commands use PowerShell syntax where Windows paths or environment setup matters.

## Requirements

- Node.js and npm compatible with the package lockfiles.
- MongoDB for persistent local data, or Docker Desktop for the container stack.
- Expo Go or an emulator/device for mobile development.

## Local development

Install each package using its committed lockfile:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run dev
```

The API listens on port `5000`. Set a private, random `JWT_SECRET` in
`backend/.env`; the sample value is only a placeholder. `MONGODB_URI` defaults
to local MongoDB. If MongoDB is unavailable, the API attempts to start an
in-memory database for demonstration; that data is temporary and must not be
used as persistent storage.

Set unique `DEMO_ADMIN_PASSWORD` and `DEMO_WORKER_PASSWORD` values in
`backend/.env` if you need the local development seed accounts. The API does
not seed these accounts in production.

In a second terminal, start the web app:

```powershell
cd frontend
npm ci
npm run dev
```

Vite prints the local address. The web API client currently targets
`http://localhost:5000/api/v1`.

For the Expo customer app:

```powershell
cd mobile
npm ci
$env:EXPO_PUBLIC_API_URL = "http://<host-reachable-from-device>:5000"
npm start
```

Use the machine's LAN IP for a physical phone; `localhost` on the phone refers
to the phone itself. The mobile app can also infer the API host from the Expo
development server URI.

## Docker Compose

Compose starts MongoDB, the API, and the NGINX-served web client. The Expo app
is developed/built separately.

From the repository root:

```powershell
Copy-Item .env.example .env
```

Replace the `JWT_SECRET` placeholder in `.env` with a unique random value, then:

```powershell
docker compose up --build
```

The web app is exposed on port `80`, the API on `5000`, and MongoDB is bound to
the local machine only on `127.0.0.1:27017`. The database uses the named volume
`mongo-data`. Use `docker compose down` to stop the services; the named volume
persists. Do not remove the volume when you need to retain data.

The Compose configuration deliberately requires `JWT_SECRET` rather than
providing a repository default. Do not reuse a development value in production.
The Compose stack is a starting point, not a production security review or
deployment recipe.

## Mobile API configuration

`EXPO_PUBLIC_API_URL` accepts an API host or base URL. The client normalizes it
to the `/api` prefix. This value is bundled into the mobile app and is not a
secret; never put credentials in an `EXPO_PUBLIC_*` variable.

The app requests camera access for QR and barcode scanning. Mobile authentication
tokens are stored using Expo SecureStore; web authentication state is stored in
session storage.

## Environment reference

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PORT` | API | HTTP listen port (default `5000`) |
| `MONGODB_URI` | API | MongoDB connection string |
| `JWT_SECRET` | API / Compose | Signs and verifies authentication tokens |
| `CLIENT_URL` | API / Compose | Client-origin configuration |
| `DEFAULT_STORE_NAME`, `DEFAULT_STORE_CITY` | API | Initial demo store values |
| `DEMO_ADMIN_PASSWORD`, `DEMO_WORKER_PASSWORD` | API (development only) | Optional passwords for local demo accounts |
| `EXPO_PUBLIC_API_URL` | Mobile | API host accessible from the device |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | API | Optional email transport |
| `VISION_API_ENABLED`, `VISION_PROVIDER` | API | Vision feature flags; cloud barcode decoding is not implemented |
| `EXPO_PUSH_URL` | API | Expo push endpoint override |

Keep `.env` files out of version control. The root `.gitignore` excludes
environment overrides, dependency folders, generated output, and local Expo
state. Use `.env.example` files only for non-sensitive placeholders.

## Build and test commands

```powershell
cd backend
npm test
npm run build

cd ..\frontend
npm run typecheck
npm run build
npm run lint

cd ..\mobile
npm run typecheck
```

`npm run build:webpack` in `frontend` exercises the alternate Webpack build.
The regular production web build uses Vite.

## Runtime checks and operational notes

- API health endpoint: `GET /api/health`.
- API business routes are mounted under `/api/v1`; some older session,
  product, cart, and auth routes remain mounted for compatibility.
- Checkout creates a pending order and payment record; a worker confirms
  settlement. No external card/UPI payment gateway is configured here.
- Session event streams are held in process memory. They do not synchronize
  across multiple API replicas.
- The nightly report snapshot task runs in the API process. A multi-replica
  deployment needs a single scheduler/leader strategy to avoid duplicate jobs.
- Back up MongoDB data and protect the database network before using real
  customer or store data.
