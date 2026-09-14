import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from .routers.books import router as books_router

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("anirory")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Vercel has no release command, so initialize the database when a new
    # serverless instance starts. The seed operation is idempotent.
    from seed import seed

    seed()
    yield


app = FastAPI(
    title="Anirory Library API",
    version="1.0.0",
    description="Administrative catalog services for Anirory.",
    lifespan=lifespan,
)

origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,https://anirology.github.io"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("Database failure while handling %s", request.url.path)
    return JSONResponse(status_code=503, content={"detail": "The database is temporarily unavailable"})


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "anirory-api"}


app.include_router(books_router)
