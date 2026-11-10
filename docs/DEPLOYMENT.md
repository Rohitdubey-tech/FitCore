# FITCORE Production Deployment, Monitoring & Backup Runbook

## 1. Deployment Topology
- **Web Frontend (`apps/web`)**: Deploy static Vite bundle to **Vercel** or **AWS S3 + CloudFront**, or run `infrastructure/docker/Dockerfile.web` behind ALB/Nginx.
- **Core Backend (`server`) & AI Service (`ai-service`)**: Deploy to **AWS ECS Fargate** using `infrastructure/deployment/aws-ecs-task-definition.json`, storing secrets in AWS Secrets Manager.
- **Database**: **MongoDB Atlas** (M10+ replica set with automated continuous cloud backups and IP allowlist / VPC peering).
- **Queue & Cache**: Managed **Redis** (AWS ElastiCache or Upstash) with `ENABLE_BULLMQ=true`.
- **Media Storage**: **AWS S3** or **Cloudinary** via signed upload URLs.

## 2. Production Environment Checklist
Ensure all placeholder secrets from `.env.example` are replaced:
- `NODE_ENV=production`
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET` (64+ char cryptographically random strings)
- `MONGODB_URI` (Atlas SRV connection string with TLS)
- `CORS_ORIGINS` (strict allowlist of production web & mobile origins)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

## 3. Observability & Error Tracking
- Core backend logs structured JSON via `pino` with automatic redaction of `authorization`, `cookie`, `password`, and `refreshToken` fields.
- Attach **Sentry** DSN and **OpenTelemetry** OTLP exporter environment variables in ECS task definitions for distributed tracing across `server` and `ai-service`.

## 4. Database Backup & Restoration Procedures
- **Automated Backups**: Enable MongoDB Atlas continuous backups with 7-day point-in-time recovery.
- **Manual Snapshot**:
  ```bash
  mongodump --uri="$MONGODB_URI" --archive=fitcore-backup-$(date +%F).gz --gzip
  ```
- **Restoration Verification**:
  ```bash
  mongorestore --uri="$STAGING_MONGODB_URI" --archive=fitcore-backup-YYYY-MM-DD.gz --gzip --drop
  ```

