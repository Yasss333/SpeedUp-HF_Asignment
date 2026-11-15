from datetime import UTC, datetime
from hashlib import sha256
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.workflow.store import StoreDependency

bearer = HTTPBearer(auto_error=False)


def token_hash(token: str) -> str:
    return sha256(token.encode()).hexdigest()


async def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    store: StoreDependency,
):
    user = None
    if credentials and len(credentials.credentials) <= 256:
        user = await store.find_one(
            "users",
            {
                "token_hash": token_hash(credentials.credentials),
            },
        )
    if not user or user["expires_at"].replace(tzinfo=UTC) <= datetime.now(UTC):
        raise HTTPException(
            401, "Invalid or expired session", headers={"WWW-Authenticate": "Bearer"}
        )
    return user["_id"]


UserDependency = Annotated[str, Depends(current_user)]
