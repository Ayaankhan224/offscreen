
from datetime import datetime, timezone

from app.core.database import db
from app.models.user_profile import UserProfile

profiles_collection = db["user_profiles"]



def save_profile(user_id: str, profile: UserProfile) -> dict:
    now = datetime.now(timezone.utc)
    profile_data = profile.model_dump()

    # Keep the original creation time when updating a profile.
    profile_data.pop("created_at", None)
    profile_data["updated_at"] = now

    profiles_collection.update_one(
        {"user_id": user_id},
        {
            "$set": profile_data,
            "$setOnInsert": {
                "user_id": user_id,
                "created_at": profile.created_at,
            },
        },
        upsert=True,
    )

    return get_profile(user_id)



def get_profile(user_id: str) -> dict | None:
    document = profiles_collection.find_one(
        {"user_id": user_id},
        {"_id": 0},
    )
    return document
