# PA AI Email Dashboard foundation

This project runs a PA email workspace built on the Dashboard 2 template and a
separate FastAPI service. The frontend has two demo clients, ownership queues,
read-without-reply flags, editable drafts, escalation, and a client approval view.
The frontend connects to the workflow API: demo login, paginated inbox loading,
draft saving, escalation, approval, editable client rules, and AI email simulation.
Changes are stored in MongoDB and survive refresh within the 24-hour demo session.
The session token stays in browser session storage; provider credentials stay on
the backend. Approval saves a decision and does not send email. VIP view is a demo
toggle, not access control. Real inbox OAuth, email delivery, and voice are future work.

## Copilot panel

Use **Ask Copilot** in the header to toggle the inbox assistant. It docks beside
the inbox on desktop and opens as a full-width sheet on smaller screens. It can
summarize the current client's inbox, list priority and unanswered threads, show
delegation rules and existing draft suggestions, open related emails, and escalate
the selected PA email through the backend. Enter sends a prompt; Shift+Enter adds
a line break. Client switching clears that client's displayed conversation.

Copilot currently uses inbox data and existing triage results. It does not make
open-ended LLM chat requests or voice calls. AI email simulation does call the
configured backend provider, with loading and retryable error states.

The frontend routes `/`, `/dashboard`, and `/mail` open the PA dashboard at
`/dashboard-2`. Unrelated template pages are no longer exposed by the app router.

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

## Hosted frontend and backend

Vercel builds `frontend/` and sets `VITE_API_BASE_URL=/api` for production and
preview deployments. `frontend/vercel.json` proxies `/api/*` to
`https://speedup-api-36zm.onrender.com/api/*`, so browser requests stay on the
frontend origin and do not require cross-origin access on Render. Keep provider
keys and database credentials on Render; Vite environment values are public.
The local Vite proxy still connects to the local backend.

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
- Upstream git history and license are preserved. `upstream` points at the template.
- `origin` points at the private project repository:
  https://github.com/Yasss333/SpeedUp-HF_Asignment
