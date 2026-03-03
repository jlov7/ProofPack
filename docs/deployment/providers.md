# Deployment Provider Examples

This document provides practical deployment examples for common hosts.

## Vercel (Web-first deployment)

1. Import repository in Vercel.
2. Set root to repository root.
3. Configure build command:
   - `pnpm --filter @proofpack/web build`
4. Configure output/start command:
   - `pnpm --filter @proofpack/web start`
5. Set environment:
   - `NODE_ENV=production`
   - `PORT=3000`

## Render (container deployment)

1. Use the included root `Dockerfile`.
2. Create a Web Service from the repo.
3. Runtime:
   - Docker
4. Port:
   - `3000`
5. Health check path:
   - `/`

## Netlify (static-hosting not recommended)

ProofPack includes dynamic verify/redact APIs, so Netlify static-only mode is not sufficient.
If using Netlify, deploy through a Node-compatible runtime and ensure API routes execute server-side.

## Self-hosted Docker

Use:

```bash
docker compose up --build
```

This serves the production web app on `http://localhost:3000`.
