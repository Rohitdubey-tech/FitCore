# FITCORE — AI-Powered Gym Management & Fitness Ecosystem (MERN Stack)

**Tagline:** Your Gym. Your Goals. Your Progress.

## Architecture & Tech Stack

FITCORE is built on the **MERN Stack** (MongoDB, Express.js, React.js, Node.js in JavaScript) paired with a React Native Expo mobile app and a Python FastAPI AI microservice.

```
FITCORE/
  apps/
    web/          # React + Vite + Tailwind CSS + TanStack Query + Zustand (JSX)
    mobile/       # React Native + Expo Router + SecureStore (JSX)
  server/         # Node.js + Express.js + Mongoose + Zod + JWT (JS)
  ai-service/     # Python + FastAPI + Pydantic AI microservice
  packages/
    shared-types/ # Shared constants, roles, and design tokens (JS/CJS)
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
npm install --legacy-peer-deps
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
