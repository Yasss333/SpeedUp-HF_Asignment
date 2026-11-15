from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.workflow.store import get_store


class MemoryStore:
    def __init__(self):
        self.collections = {name: {} for name in ("users", "clients", "emails")}

    async def insert(self, name, document):
        self.collections[name][document["_id"]] = deepcopy(document)

    async def prepare(self):
        pass

    async def page(self, query, skip, limit):
        rows = await self.find("emails", query)
        rows.sort(
            key=lambda row: (
                row["priority_rank"],
                -row["created_at"].timestamp(),
                row["_id"],
            )
        )
        return rows[skip : skip + limit], len(rows)

    async def find_one(self, name, query):
        rows = await self.find(name, query)
        return rows[0] if rows else None

    async def find(self, name, query):
        return [
            deepcopy(row)
            for row in self.collections[name].values()
            if all(row.get(key) == value for key, value in query.items())
        ]

    async def update(self, name, query, values):
        row = await self.find_one(name, query)
        if row is None:
            return None
        row.update(values)
        self.collections[name][row["_id"]] = deepcopy(row)
        return row


@pytest.fixture
def api():
    from app.workflow.limits import _windows

    _windows.clear()
    store = MemoryStore()
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.pop(get_store, None)


def login(api):
    response = api.post("/api/auth/demo-login")
    assert response.status_code == 201, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_demo_has_four_distinct_inboxes(api):
    headers = login(api)
    clients = api.get("/api/clients", headers=headers).json()
    assert len(clients) == 4
    emails = api.get("/api/emails?page_size=100", headers=headers).json()
    assert emails["total"] == 40
    assert len({row["subject"] for row in emails["items"]}) == 40
    for client in clients:
        rows = [row for row in emails["items"] if row["client_id"] == client["id"]]
        assert len(rows) == 10
        assert {row["owner"] for row in rows} == {"PA", "CLIENT", "FYI"}
        assert {row["owner"] for row in rows if row["priority"] == "HIGH"} == {
            "PA",
            "CLIENT",
        }
        assert any(row["read_no_reply"] for row in rows)


def test_authentication_and_tenant_isolation(api):
    assert api.get("/api/emails").status_code == 401
    alice = login(api)
    bob = login(api)
    email = api.get("/api/emails", headers=alice).json()["items"][0]
    assert api.get("/api/emails/" + email["id"], headers=bob).status_code == 404
    assert (
        api.post("/api/emails/" + email["id"] + "/escalate", headers=bob).status_code
        == 404
    )


def test_escalation_draft_and_approval_transitions(api):
    headers = login(api)
    email = api.get("/api/emails?owner=PA", headers=headers).json()["items"][0]
    url = "/api/emails/" + email["id"]
    assert api.post(url + "/approve", headers=headers).status_code == 409
    result = api.post(url + "/escalate", headers=headers)
    assert result.status_code == 200
    assert result.json()["owner"] == "CLIENT"
    result = api.patch(
        url + "/draft", headers=headers, json={"draft": "Approved response."}
    )
    assert result.json()["suggested_draft"] == "Approved response."
    approved = api.post(url + "/approve", headers=headers)
    assert approved.status_code == 200
    assert approved.json()["status"] == "APPROVED"
    assert approved.json()["sent_at"] is None
    assert api.post(url + "/approve", headers=headers).status_code == 200
    assert api.post(url + "/escalate", headers=headers).status_code == 409
    assert (
        api.patch(
            url + "/draft", headers=headers, json={"draft": "Changed"}
        ).status_code
        == 409
    )


def test_filters_pagination_and_validation(api):
    headers = login(api)
    clients = api.get("/api/clients", headers=headers).json()
    response = api.get(
        "/api/emails",
        headers=headers,
        params={"client_id": clients[0]["id"], "page_size": 2},
    )
    result = response.json()
    assert len(result["items"]) == 2
    assert result["total"] == 10
    assert all(row["client_id"] == clients[0]["id"] for row in result["items"])
    assert api.get("/api/emails?page_size=0", headers=headers).status_code == 422
    assert api.get("/api/emails?owner=INVALID", headers=headers).status_code == 422


def test_simulate_rejects_invalid_and_foreign_client_before_ai(api):
    headers = login(api)
    response = api.post("/api/emails/simulate", headers=headers, json={})
    assert response.status_code == 422
    response = api.post(
        "/api/emails/simulate",
        headers=headers,
        json={
            "client_id": "foreign",
            "sender": "demo@example.com",
            "subject": "Invoice",
            "body": "Please process the invoice.",
        },
    )
    assert response.status_code == 404


def test_simulation_persists_validated_ai_and_read_no_reply(api, monkeypatch):
    from app.workflow import triage
    from app.workflow.models import Triage

    async def fake_triage(email, rules):
        return Triage(
            owner="CLIENT",
            priority="HIGH",
            category="Investor",
            summary="Decision required.",
            reasoning="Client personal approval.",
            suggested_draft="I will review the terms.",
        )

    monkeypatch.setattr(triage, "triage_email", fake_triage)
    headers = login(api)
    client_id = api.get("/api/clients", headers=headers).json()[0]["id"]
    result = api.post(
        "/api/emails/simulate",
        headers=headers,
        json={
            "client_id": client_id,
            "sender": "investor@example.com",
            "subject": "Term sheet",
            "body": "Please personally approve the terms.",
            "is_read": True,
        },
    )
    assert result.status_code == 201, result.text
    email = result.json()
    assert email["read_no_reply"] is True
    assert email["owner"] == "CLIENT"
    assert email["triage_source"] == "AI"
    assert api.get("/api/emails/" + email["id"], headers=headers).json() == email
    assert api.get("/api/emails", headers=headers).json()["total"] == 41


def test_simulation_failure_does_not_save_partial_email(api, monkeypatch):
    from fastapi import HTTPException

    from app.workflow import triage

    async def broken_triage(email, rules):
        raise HTTPException(502, "AI unavailable")

    monkeypatch.setattr(triage, "triage_email", broken_triage)
    headers = login(api)
    client_id = api.get("/api/clients", headers=headers).json()[0]["id"]
    result = api.post(
        "/api/emails/simulate",
        headers=headers,
        json={
            "client_id": client_id,
            "sender": "investor@example.com",
            "subject": "Term sheet",
            "body": "Please review.",
        },
    )
    assert result.status_code == 502
    assert api.get("/api/emails", headers=headers).json()["total"] == 40


def test_client_rules_are_scoped_and_editable(api):
    alice, bob = login(api), login(api)
    client_id = api.get("/api/clients", headers=alice).json()[0]["id"]
    url = "/api/clients/" + client_id + "/rules"
    assert api.patch(url, headers=bob, json={"rules": "Changed"}).status_code == 404
    result = api.patch(
        url, headers=alice, json={"rules": "All legal matters go to CLIENT."}
    )
    assert result.status_code == 200
    assert result.json()["rules"] == "All legal matters go to CLIENT."


def test_expired_token_is_rejected(api):
    from datetime import UTC, datetime, timedelta

    headers = login(api)
    store = app.dependency_overrides[get_store]()
    for user in store.collections["users"].values():
        user["expires_at"] = datetime.now(UTC) - timedelta(minutes=1)
    assert api.get("/api/emails", headers=headers).status_code == 401


def test_conflicting_update_is_not_silently_overwritten(api, monkeypatch):
    headers = login(api)
    email = api.get("/api/emails?owner=PA", headers=headers).json()["items"][0]
    store = app.dependency_overrides[get_store]()

    async def competing_edit(name, query, values):
        return None

    monkeypatch.setattr(store, "update", competing_edit)
    assert (
        api.post(
            "/api/emails/" + email["id"] + "/escalate", headers=headers
        ).status_code
        == 409
    )


def test_demo_login_has_a_rate_limit(api):
    for _ in range(10):
        assert api.post("/api/auth/demo-login").status_code == 201
    response = api.post("/api/auth/demo-login")
    assert response.status_code == 429
    assert response.headers["retry-after"] == "60"


def test_demo_can_be_disabled(api, monkeypatch):
    from app.core.config import Settings
    from app.workflow import routes

    monkeypatch.setattr(
        routes, "get_settings", lambda: Settings(_env_file=None, demo_enabled=False)
    )
    assert api.post("/api/auth/demo-login").status_code == 403
