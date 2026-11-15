from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.config import get_settings
from app.workflow.auth import UserDependency, token_hash
from app.workflow.demo import seed_demo
from app.workflow.limits import check_limit
from app.workflow.models import (
    Client,
    DraftInput,
    Email,
    EmailPage,
    Owner,
    Priority,
    RulesInput,
    Session,
    SimulateInput,
    Status,
)
from app.workflow.store import StoreDependency

router = APIRouter()


def public(document):
    return {
        **{
            key: value
            for key, value in document.items()
            if key
            not in ("_id", "tenant_id", "token_hash", "priority_rank", "expires_at")
        },
        "id": document["_id"],
    }


async def owned(store, collection, item_id, user_id):
    row = await store.find_one(collection, {"_id": item_id, "tenant_id": user_id})
    if row is None:
        raise HTTPException(404, "Not found")
    return row


async def change_email(store, row, **changes):
    result = await store.update(
        "emails",
        {
            "_id": row["_id"],
            "tenant_id": row["tenant_id"],
            "version": row["version"],
        },
        {**changes, "updated_at": datetime.now(UTC), "version": row["version"] + 1},
    )
    if result is None:
        raise HTTPException(409, "Email changed; refresh and retry")
    return public(result)


@router.post("/auth/demo-login", response_model=Session, status_code=201, tags=["Auth"])
async def demo_login(request: Request, store: StoreDependency):
    if not get_settings().demo_enabled:
        raise HTTPException(403, "Demo login is disabled")
    check_limit("login", request.client.host if request.client else "unknown", 10)
    user_id, token = str(uuid4()), token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    await store.prepare()
    await seed_demo(store, user_id, expires_at)
    await store.insert(
        "users",
        {
            "_id": user_id,
            "token_hash": token_hash(token),
            "expires_at": expires_at,
        },
    )
    return Session(access_token=token, user_id=user_id, expires_at=expires_at)


@router.get("/clients", response_model=list[Client], tags=["Clients"])
async def clients(user_id: UserDependency, store: StoreDependency):
    return [public(row) for row in await store.find("clients", {"tenant_id": user_id})]


@router.patch("/clients/{client_id}/rules", response_model=Client, tags=["Clients"])
async def rules(
    client_id: str, data: RulesInput, user_id: UserDependency, store: StoreDependency
):
    await owned(store, "clients", client_id, user_id)
    row = await store.update(
        "clients", {"_id": client_id, "tenant_id": user_id}, {"rules": data.rules}
    )
    return public(row)


@router.get("/emails", response_model=EmailPage, tags=["Emails"])
async def emails(
    user_id: UserDependency,
    store: StoreDependency,
    client_id: str | None = None,
    owner: Owner | None = None,
    priority: Priority | None = None,
    status: Status | None = None,
    read_no_reply: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    query = {"tenant_id": user_id}
    for key, value in {
        "client_id": client_id,
        "owner": owner,
        "priority": priority,
        "status": status,
        "read_no_reply": read_no_reply,
    }.items():
        if value is not None:
            query[key] = value
    start = (page - 1) * page_size
    rows, total = await store.page(query, start, page_size)
    return {
        "items": [public(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/emails/simulate", response_model=Email, status_code=201, tags=["Emails"])
async def simulate(
    data: SimulateInput, user_id: UserDependency, store: StoreDependency
):
    from app.workflow.triage import triage_email

    client = await owned(store, "clients", data.client_id, user_id)
    check_limit("triage", user_id, 10)
    triage = await triage_email(data, client["rules"])
    now = datetime.now(UTC)
    row = {
        "_id": str(uuid4()),
        "tenant_id": user_id,
        **data.model_dump(),
        **triage.model_dump(),
        "triage_source": "AI",
        "status": "PENDING",
        "read_no_reply": data.is_read and not data.has_reply,
        "created_at": now,
        "updated_at": now,
        "approved_at": None,
        "sent_at": None,
        "version": 1,
        "expires_at": client["expires_at"],
        "priority_rank": {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[triage.priority],
    }
    await store.insert("emails", row)
    return public(row)


@router.get("/emails/{email_id}", response_model=Email, tags=["Emails"])
async def email(email_id: str, user_id: UserDependency, store: StoreDependency):
    return public(await owned(store, "emails", email_id, user_id))


@router.post("/emails/{email_id}/escalate", response_model=Email, tags=["Emails"])
async def escalate(email_id: str, user_id: UserDependency, store: StoreDependency):
    row = await owned(store, "emails", email_id, user_id)
    if row["status"] != "PENDING":
        raise HTTPException(409, "Approved email cannot be escalated")
    if row["owner"] == "CLIENT":
        return public(row)
    return await change_email(
        store, row, owner="CLIENT", reasoning="Escalated to the client by the PA."
    )


@router.patch("/emails/{email_id}/draft", response_model=Email, tags=["Emails"])
async def draft(
    email_id: str, data: DraftInput, user_id: UserDependency, store: StoreDependency
):
    row = await owned(store, "emails", email_id, user_id)
    if row["status"] != "PENDING":
        raise HTTPException(409, "Approved draft cannot be edited")
    return await change_email(store, row, suggested_draft=data.draft)


@router.post("/emails/{email_id}/approve", response_model=Email, tags=["Emails"])
async def approve(email_id: str, user_id: UserDependency, store: StoreDependency):
    row = await owned(store, "emails", email_id, user_id)
    if row["status"] == "APPROVED":
        return public(row)
    if row["owner"] != "CLIENT" or not row["suggested_draft"].strip():
        raise HTTPException(
            409, "Only client-owned emails with a draft can be approved"
        )
    return await change_email(
        store, row, status="APPROVED", approved_at=datetime.now(UTC)
    )
