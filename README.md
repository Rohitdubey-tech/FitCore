# FITCORE — AI-Powered Gym Management & Fitness Ecosystem

**Tagline:** Your Gym. Your Goals. Your Progress.

## Architecture Overview

FITCORE uses a modular-monolith core backend (`server/`) paired with a dedicated Python FastAPI AI microservice (`ai-service/`), a React + Vite web application (`apps/web/`), an Expo React Native mobile app (`apps/mobile/`), and shared TypeScript contracts (`packages/shared-types/`).

```
FITCORE/
  apps/
    web/          # React + TypeScript + Vite + Tailwind + TanStack Query + Zustand
    mobile/       # React Native + Expo + Expo Router + SecureStore
  server/         # Node.js + Express + TypeScript + Mongoose + Zod + JWT
  ai-service/     # Python + FastAPI + Pydantic AI microservice
  packages/
    shared-types/ # Shared DTOs, Roles, and Design Tokens
  infrastructure/
    docker/       # Dockerfiles & docker-compose.yml
```

## Quick Start (Local Development)

### 1. Environment Variables
Copy `.env.example` to `.env` at the repository root and update secrets as needed:
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
npm install
npm run build:shared
```

### 3. Start MongoDB
Either via Docker Compose:
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d mongodb redis
```
Or using local `mongod`:
```bash
mongod --dbpath ./.mongodb-data
```

### 4. Seed Development Data (Optional)
```bash
npm run seed --workspace=server
```

### 5. Run Backend & Web Frontend
```bash
npm run dev:server
npm run dev:web
```
- API Health Check: `http://localhost:5001/api/v1/health`
- Swagger OpenAPI Docs: `http://localhost:5001/api/v1/docs`
- Web App: `http://localhost:5173`

### 6. Run Tests
```bash
npm run test:server
```

## Development Checklist

- [x] **Phase 1:** Monorepo, shared types, Dockerfiles, FastAPI AI service scaffold, health check
- [x] **Phase 2:** MongoDB core schemas (`users`, `refreshTokens`, `auditLogs`, `gyms`, `gymMembers`), JWT access + rotating refresh tokens with reuse detection, RBAC & tenant-isolation middleware, Web Auth UI (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard`), Mobile Auth foundation, Jest + Supertest integration tests
- [x] **Phase 3:** Gym & Member Management (multi-branch CRUD, member search/filter, tenant isolation tests)
- [x] **Phase 4:** Trainer & Membership Plan Management
- [x] **Phase 5:** Razorpay Payment Integration & Webhook Verification
- [x] **Phase 6:** Workout Tracking Engine & Exercise Library
- [x] **Phase 7:** Full React Native Mobile Screens & Offline Sync
- [x] **Phase 8:** Nutrition Tracking & Verified Food Database
- [x] **Phase 9:** AI Diet Planner, AI Workout Planner, Meal Analyzer & Fitness Assistant
- [x] **Phase 10:** Analytics & Reporting (Web + Mobile)
- [x] **Phase 11:** Notifications (BullMQ, FCM, Email, In-App) & QR Attendance
- [x] **Phase 12:** E2E Testing (Playwright/Maestro), k6 Load Tests, Security Audit & CI/CD

