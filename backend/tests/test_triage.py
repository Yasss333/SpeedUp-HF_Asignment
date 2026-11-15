import asyncio
from types import SimpleNamespace

import pytest
from agno.exceptions import ModelProviderError
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.workflow import triage
from app.workflow.models import SimulateInput, Triage

EMAIL = SimulateInput(
    client_id="client",
    sender="investor@example.com",
    subject="Term sheet decision",
    body="Please confirm the term sheet personally.",
    is_read=True,
)
RESULT = Triage(
    owner="CLIENT",
    priority="HIGH",
    category="Investor",
    summary="Investor needs a decision.",
    reasoning="Personal approval required.",
    suggested_draft="Thank you. I will review the terms.",
)


class FakeAgent:
    async def arun(self, prompt):
        return SimpleNamespace(content=RESULT)


def test_triage_requires_credentials(monkeypatch):
    monkeypatch.setattr(triage, "get_settings", lambda: Settings(_env_file=None))
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            triage.triage_email(EMAIL, "Investor decisions require client approval.")
        )
    assert error.value.status_code == 503


def test_validated_structured_triage(monkeypatch):
    monkeypatch.setattr(
        triage,
        "get_settings",
        lambda: Settings(
            _env_file=None,
            openrouter_api_key=SecretStr("test-only"),
        ),
    )
    monkeypatch.setattr(triage, "make_agent", lambda settings: FakeAgent())
    result = asyncio.run(
        triage.triage_email(EMAIL, "Investor decisions require client approval.")
    )
    assert result == RESULT


def test_provider_failure_is_sanitized(monkeypatch):
    class BrokenAgent:
        async def arun(self, prompt):
            raise ModelProviderError(
                "Sensitive provider credential must never be returned"
            )

    monkeypatch.setattr(
        triage,
        "get_settings",
        lambda: Settings(
            _env_file=None,
            openrouter_api_key=SecretStr("test-only"),
        ),
    )
    monkeypatch.setattr(triage, "make_agent", lambda settings: BrokenAgent())
    with pytest.raises(HTTPException) as error:
        asyncio.run(triage.triage_email(EMAIL, "Rules"))
    assert error.value.status_code == 502
    assert "Sensitive" not in error.value.detail


def test_malformed_model_response_is_rejected(monkeypatch):
    class InvalidAgent:
        async def arun(self, prompt):
            return SimpleNamespace(content="not structured output")

    monkeypatch.setattr(
        triage,
        "get_settings",
        lambda: Settings(
            _env_file=None,
            openrouter_api_key=SecretStr("test-only"),
        ),
    )
    monkeypatch.setattr(triage, "make_agent", lambda settings: InvalidAgent())
    with pytest.raises(HTTPException) as error:
        asyncio.run(triage.triage_email(EMAIL, "Rules"))
    assert error.value.status_code == 502


def test_provider_timeout_returns_504(monkeypatch):
    class SlowAgent:
        async def arun(self, prompt):
            raise TimeoutError

    monkeypatch.setattr(
        triage,
        "get_settings",
        lambda: Settings(
            _env_file=None,
            openrouter_api_key=SecretStr("test-only"),
        ),
    )
    monkeypatch.setattr(triage, "make_agent", lambda settings: SlowAgent())
    with pytest.raises(HTTPException) as error:
        asyncio.run(triage.triage_email(EMAIL, "Rules"))
    assert error.value.status_code == 504
