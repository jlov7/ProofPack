# Docker Deployment

ProofPack can run as a production containerized Next.js service.

## Build

```bash
docker build -t proofpack:local .
```

## Run

```bash
docker run --rm -p 3000:3000 proofpack:local
```

Open `http://localhost:3000`.

## Compose

```bash
docker compose up --build
```

## Healthcheck

The image includes a healthcheck against `/` on port `3000`.

## Notes

- This image is optimized for release serving of the web app.
- The standalone `apps/api` service remains available for local dev workflows.
