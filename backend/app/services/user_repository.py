from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING
from pymongo.collection import Collection

from app.core.database import db


users_collection: Collection = db["users"]


def ensure_user_indexes() -> None:
    users_collection.create_index(
        [("email", ASCENDING)],
        unique=True,
        name="users_email_unique",
    )


def create_user(email: str, password_hash: str) -> dict:
    now = datetime.now(timezone.utc)
    document = {
        "email": email,
        "password_hash": password_hash,
        "created_at": now,
        "updated_at": now,
    }
    result = users_collection.insert_one(document)
    document["_id"] = result.inserted_id
    return document


def get_user_by_email(email: str) -> dict | None:
    return users_collection.find_one({"email": email})


def get_user_by_id(user_id: str) -> dict | None:
    try:
        object_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        return None
    return users_collection.find_one({"_id": object_id})
