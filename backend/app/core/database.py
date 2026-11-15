from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pymongo import AsyncMongoClient

from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    client = (
        AsyncMongoClient(
            settings.mongodb_uri.get_secret_value(), serverSelectionTimeoutMS=2000
        )
        if settings.mongodb_uri
        else None
    )
    app.state.mongo_client = client
    app.state.database = client[settings.mongodb_database] if client is not None else None
    try:
        yield
    finally:
        if client is not None:
            await client.close()
