
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


def toggle_watchlist(user_id: str, movie_title: str) -> dict:
    profile = get_profile(user_id) or {}
    current_watchlist = profile.get("watchlist", [])
    now = datetime.now(timezone.utc)

    if movie_title in current_watchlist:
        profiles_collection.update_one(
            {"user_id": user_id},
            {
                "$pull": {"watchlist": movie_title},
                "$set": {"updated_at": now},
            },
        )
        in_watchlist = False
    else:
        profiles_collection.update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"watchlist": movie_title},
                "$set": {"updated_at": now},
                "$setOnInsert": {
                    "user_id": user_id,
                    "favorite_movies": [],
                    "favorite_genres": [],
                    "disliked_genres": [],
                    "disliked_movies": [],
                    "watched_movies": [],
                    "reviews": [],
                    "discovery_preference": "balanced",
                    "created_at": now,
                },
            },
            upsert=True,
        )
        in_watchlist = True

    return {"movie_title": movie_title, "in_watchlist": in_watchlist}


def toggle_watched(user_id: str, movie_title: str) -> dict:
    profile = get_profile(user_id) or {}
    current_watched = profile.get("watched_movies", [])
    now = datetime.now(timezone.utc)

    if movie_title in current_watched:
        profiles_collection.update_one(
            {"user_id": user_id},
            {
                "$pull": {"watched_movies": movie_title},
                "$set": {"updated_at": now},
            },
        )
        is_watched = False
    else:
        profiles_collection.update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"watched_movies": movie_title},
                "$pull": {"watchlist": movie_title},
                "$set": {"updated_at": now},
                "$setOnInsert": {
                    "user_id": user_id,
                    "favorite_movies": [],
                    "favorite_genres": [],
                    "disliked_genres": [],
                    "disliked_movies": [],
                    "reviews": [],
                    "discovery_preference": "balanced",
                    "created_at": now,
                },
            },
            upsert=True,
        )
        is_watched = True

    return {"movie_title": movie_title, "is_watched": is_watched}


def add_or_update_review(
    user_id: str,
    movie_title: str,
    review_text: str,
    rating: float = 5.0,
) -> dict:
    now = datetime.now(timezone.utc)
    review_item = {
        "movie_title": movie_title,
        "review": review_text.strip(),
        "rating": float(rating),
        "updated_at": now.isoformat(),
    }

    # Remove any existing review for this movie first
    profiles_collection.update_one(
        {"user_id": user_id},
        {"$pull": {"reviews": {"movie_title": movie_title}}},
    )

    # Push the new review, ensure movie is in watched_movies, and remove from watchlist
    profiles_collection.update_one(
        {"user_id": user_id},
        {
            "$push": {"reviews": review_item},
            "$addToSet": {"watched_movies": movie_title},
            "$pull": {"watchlist": movie_title},
            "$set": {"updated_at": now},
            "$setOnInsert": {
                "user_id": user_id,
                "favorite_movies": [],
                "favorite_genres": [],
                "disliked_genres": [],
                "disliked_movies": [],
                "discovery_preference": "balanced",
                "created_at": now,
            },
        },
        upsert=True,
    )

    return review_item

