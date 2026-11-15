# Email workflow API

The backend now implements isolated demo inboxes, persisted MongoDB state,
structured AI triage, ownership escalation, draft editing, and approval.
Start from the backend directory using `uv sync --locked` and
`uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
Swagger documentation is available at `/docs` after restarting the backend.

## Session and data

`POST /api/auth/demo-login` takes no body. It returns `access_token`, `token_type`,
`expires_at`, `user_id`, and `mode: "DEMO"`. Each call creates a separate workspace
with two clients and twelve pre-triaged synthetic emails. Seeded rows use
`triage_source: "DEMO"`; simulated emails use `triage_source: "AI"`.
This route is not retry-idempotent: each successful call creates a new session.

Send `Authorization: Bearer <access_token>` on every workflow request below.
Tokens are stored only as SHA-256 hashes. Sessions expire after 24 hours; TTL
indexes remove users and associated demo clients/emails after expiry, with MongoDB's
normal asynchronous cleanup delay. All reads and updates are scoped by session.
The client-view toggle uses the same PA demo session; it is not separate executive
authentication. Set `DEMO_ENABLED=false` before production exposure.

## Routes

| Method and path | Behavior |
| --- | --- |
| `GET /api/clients` | List this session's clients and delegation rules |
| `PATCH /api/clients/{id}/rules` | Replace rules using `{"rules":"..."}` |
| `GET /api/emails` | Paginated, priority-sorted inbox |
| `GET /api/emails/{id}` | Read one owned email |
| `POST /api/emails/simulate` | Triage and persist a synthetic incoming email |
| `PATCH /api/emails/{id}/draft` | Edit a pending email with `{"draft":"..."}` |
| `POST /api/emails/{id}/escalate` | Move a pending email to `CLIENT` |
| `POST /api/emails/{id}/approve` | Mark a client-owned drafted email `APPROVED` |

Inbox query parameters: `client_id`, `owner` (`PA`, `CLIENT`, `FYI`), `priority`
(`HIGH`, `MEDIUM`, `LOW`), `status` (`PENDING`, `APPROVED`), `read_no_reply`,
`page` (default 1), and `page_size` (default 25, maximum 100).
Response: `{"items": [...], "total": 12, "page": 1, "page_size": 25}`.
For the executive queue, filter `owner=CLIENT&status=PENDING&client_id=...`.

Simulation body:

```json
{
  "client_id": "id-from-clients-response",
  "sender": "investor@example.com",
  "subject": "Term sheet decision",
  "body": "Please personally approve the investment terms.",
  "is_read": true,
  "has_reply": false
}
```

The result includes `owner`, `priority`, `category`, `summary`, `reasoning`,
`suggested_draft`, `read_no_reply`, `status`, timestamps, and `version`.
`read_no_reply` is computed by the server as `is_read && !has_reply`.
Simulation calls are not retry-idempotent: retrying a successful call creates another
email and can incur another model charge. No record is created on AI failure.

Escalation and approval are idempotent after success. Atomic version checks prevent
concurrent writes from silently overwriting each other. Approved drafts are immutable.
Approval records consent only: `sent_at` remains null. Gmail sending, inbox sync,
production authentication, and Vapi webhooks are not implemented in this slice.

Errors follow FastAPI's `detail` envelope: 401 invalid/expired token, 404 inaccessible
resource, 409 invalid transition or concurrent edit, 422 invalid input, 429 rate limit,
502 failed or invalid AI result, 503 missing configuration/unavailable MongoDB,
504 AI timeout. Demo login is limited to 10 requests per IP per minute; simulation
is limited to 10 per session per minute. Limits are process-local for single-worker
development; use a shared limiter before deploying multiple workers.

## Configuration and checks

Set `MONGODB_URI`, `MONGODB_DATABASE`, and `OPENROUTER_API_KEY` in `backend/.env`.
`OPENROUTER_MODEL` defaults to `openai/gpt-4o-mini`. Simulation sends the supplied
email and this client's rules to OpenRouter; use synthetic inputs for the demo.
Provider errors never expose raw credentials to API callers. AI has no sending
tools, and model output is validated against a bounded Pydantic schema.

`uv run pytest` uses an isolated in-memory repository and stubbed provider for
repeatable tests; it does not write to Atlas or spend model credits.
`uv run ruff check app tests` checks source quality.

Implementation sources:
- https://docs.agno.com/models/providers/gateways/openrouter/overview
- https://docs.agno.com/input-output/structured-output/agent
