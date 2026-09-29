import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from lib.db import client, db, ensure_indexes
from routers.devops import router as devops_router

load_dotenv()

logger = logging.getLogger(__name__)
api_router = APIRouter(prefix="/api")
api_router.include_router(devops_router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ensure_indexes()
    except Exception:
        logger.exception("Failed to initialize MongoDB indexes")
    yield
    if client is not None:
        client.close()


app = FastAPI(title="DevOps Pipeline Agent", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, object]:
    return {"ok": True, "database": "ready" if db is not None else "unavailable"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
