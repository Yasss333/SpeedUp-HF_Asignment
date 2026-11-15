from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from pymongo.errors import PyMongoError

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "pa-ai-email-backend"


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness check; does not require MongoDB or AI credentials."""
    return HealthResponse()


@router.get("/ready", response_model=HealthResponse)
async def ready(request: Request) -> HealthResponse:
    """Readiness requires a configured, reachable MongoDB server."""
    client = request.app.state.mongo_client
    if client is None:
        raise HTTPException(status_code=503, detail="MongoDB is not configured")
    try:
        await client.admin.command("ping")
    except PyMongoError:
        raise HTTPException(status_code=503, detail="MongoDB is unavailable") from None
    return HealthResponse()
