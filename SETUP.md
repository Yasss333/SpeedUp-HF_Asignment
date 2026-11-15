# PA AI Email Dashboard foundation

This project prepares local development for the execution plan. It runs the
upstream Dashboard 2 template and a separate FastAPI service. Email ingestion,
authentication, triage, demo seeding, sending, and voice workflows are future work.
Template authentication screens and email data are demos, not backend integrations.

## Layout

- `frontend/`: React, TypeScript, Vite, Tailwind, shadcn UI, and Zustand template.
- `backend/app/`: FastAPI entrypoint, API router, validated settings, MongoDB lifespan.
- `backend/tests/`: health, OpenAPI, and CORS smoke tests.
- `nextjs-version/` and `docs/`: retained upstream reference files; not used locally.

## Install

Requires Node 22.12+ (Node 24 LTS recommended), Python 3.13+, and uv.
From `frontend`, run `npm.cmd ci` (first setup uses `npm.cmd install`).
From `backend`, run `uv sync --locked` and copy `.env.example` to `.env`.
Never commit credentials. Frontend environment variables are public browser data.

## Run

Open two PowerShell terminals at the project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-frontend.ps1
```

Frontend: http://localhost:5173/dashboard-2
Backend API docs: http://127.0.0.1:8000/docs
Liveness: http://127.0.0.1:8000/api/health
The Vite proxy forwards `/api` to the backend; test at http://localhost:5173/api/health.
Stop each server with Ctrl+C.

## Optional MongoDB

With Docker Desktop running, execute `docker compose up -d mongodb` at the root.
Set `MONGODB_URI=mongodb://127.0.0.1:27017` in `backend/.env`, then restart the API.
`/api/ready` returns 503 until MongoDB is configured and reachable.
The database is prepared for future `users`, `clients`, and `emails` collections;
this foundation does not seed or write data. `docker compose stop` preserves data.

## Checks

```powershell
cd backend
uv run pytest
uv run ruff check .
cd ../frontend
npm.cmd run build
npm.cmd run lint
```

## Sources and choices

- Template source and MIT license: https://github.com/shadcnstore/shadcn-dashboard-landing-template
- FastAPI router structure: https://fastapi.tiangolo.com/tutorial/bigger-applications/
- MongoDB recommends PyMongo Async to replace deprecated Motor:
  https://www.mongodb.com/docs/languages/python/pymongo-driver/current/reference/migration/
- Upstream git history and license are preserved. `origin` points at the template;
  no project repository has been published to GitHub.
