from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.api.health import router
from app.core.config import get_settings
from app.core.database import lifespan
from app.workflow.routes import router as workflow_router

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(router, prefix="/api")
app.include_router(workflow_router, prefix="/api")


@app.exception_handler(PyMongoError)
async def database_unavailable(request, exc):
    return JSONResponse(status_code=503, content={"detail": "Database is unavailable"})
