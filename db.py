import logging
import os

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "devops")

client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=2000)
db = client[MONGO_DB]

INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "index_status": [IndexModel([("repository_id", ASCENDING)], name="repository_id", unique=True)],
    "repository_files": [
        IndexModel([("repository_id", ASCENDING), ("path", ASCENDING)], name="repository_path", unique=True),
    ],
    "chat_messages": [
        IndexModel(
            [("repository_id", ASCENDING), ("session_id", ASCENDING), ("created_at", DESCENDING)],
            name="chat_session_created",
        )
    ],
}


async def ensure_indexes() -> None:
    """Create collection indexes when MongoDB is available."""
    try:
        for collection_name, indexes in INDEXES.items():
            collection = db[collection_name]
            for index in indexes:
                await collection.create_index(
                    index.document["key"],
                    name=index.document.get("name"),
                    unique=index.document.get("unique", False),
                )
    except Exception as exc:  # pragma: no cover - gracefully handles missing MongoDB
        logger.warning("MongoDB indexes could not be initialized: %s", exc)
