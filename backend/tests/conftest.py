import os
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError

os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/offscreen")

from app import main
from app.services import auth_service, profile_repository, survey_service
from app.services import user_repository


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-signing-secret-at-least-32-bytes")
    monkeypatch.setenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")

    users = {}
    profiles = {}
    next_user_id = 1

    def create_user(email: str, password_hash: str) -> dict:
        nonlocal next_user_id
        if email in users:
            raise DuplicateKeyError("duplicate email")
        now = datetime.now(timezone.utc)
        user = {
            "_id": f"user-{next_user_id}",
            "email": email,
            "password_hash": password_hash,
            "created_at": now,
            "updated_at": now,
        }
        next_user_id += 1
        users[email] = user
        return user

    def get_user_by_id(user_id: str) -> dict | None:
        return next(
            (user for user in users.values() if user["_id"] == user_id),
            None,
        )

    def save_profile(user_id: str, profile) -> dict:
        existing = profiles.get(user_id)
        data = profile.model_dump()
        data["user_id"] = user_id
        data["created_at"] = (
            existing.get("created_at", profile.created_at)
            if existing
            else profile.created_at
        )
        data["updated_at"] = datetime.now(timezone.utc)
        profiles[user_id] = data
        return data

    def mock_toggle_watchlist(user_id: str, movie_title: str) -> dict:
        profile = profiles.setdefault(user_id, {
            "user_id": user_id,
            "favorite_movies": [],
            "favorite_genres": [],
            "disliked_genres": [],
            "disliked_movies": [],
            "watched_movies": [],
            "watchlist": [],
            "reviews": [],
        })
        watchlist = profile.setdefault("watchlist", [])
        if movie_title in watchlist:
            watchlist.remove(movie_title)
            in_w = False
        else:
            watchlist.append(movie_title)
            in_w = True
        return {"movie_title": movie_title, "in_watchlist": in_w}

    def mock_toggle_watched(user_id: str, movie_title: str) -> dict:
        profile = profiles.setdefault(user_id, {
            "user_id": user_id,
            "favorite_movies": [],
            "favorite_genres": [],
            "disliked_genres": [],
            "disliked_movies": [],
            "watched_movies": [],
            "watchlist": [],
            "reviews": [],
        })
        watched = profile.setdefault("watched_movies", [])
        watchlist = profile.setdefault("watchlist", [])
        if movie_title in watched:
            watched.remove(movie_title)
            is_w = False
        else:
            watched.append(movie_title)
            if movie_title in watchlist:
                watchlist.remove(movie_title)
            is_w = True
        return {"movie_title": movie_title, "is_watched": is_w}

    def mock_add_or_update_review(user_id: str, movie_title: str, review_text: str, rating: float = 5.0) -> dict:
        profile = profiles.setdefault(user_id, {
            "user_id": user_id,
            "favorite_movies": [],
            "favorite_genres": [],
            "disliked_genres": [],
            "disliked_movies": [],
            "watched_movies": [],
            "watchlist": [],
            "reviews": [],
        })
        reviews = profile.setdefault("reviews", [])
        watched = profile.setdefault("watched_movies", [])
        if movie_title not in watched:
            watched.append(movie_title)
        rev = {"movie_title": movie_title, "review": review_text, "rating": rating}
        reviews.append(rev)
        return rev

    monkeypatch.setattr(user_repository, "create_user", create_user)
    monkeypatch.setattr(
        user_repository,
        "get_user_by_email",
        lambda email: users.get(email),
    )
    monkeypatch.setattr(user_repository, "get_user_by_id", get_user_by_id)
    monkeypatch.setattr(main, "ensure_user_indexes", lambda: None)
    monkeypatch.setattr(main, "get_profile", lambda user_id: profiles.get(user_id))
    monkeypatch.setattr(main, "save_profile", save_profile)
    monkeypatch.setattr(main, "toggle_watchlist", mock_toggle_watchlist)
    monkeypatch.setattr(main, "toggle_watched", mock_toggle_watched)
    monkeypatch.setattr(main, "add_or_update_review", mock_add_or_update_review)
    monkeypatch.setattr(profile_repository, "get_profile", lambda user_id: profiles.get(user_id))
    monkeypatch.setattr(profile_repository, "save_profile", save_profile)
    monkeypatch.setattr(profile_repository, "toggle_watchlist", mock_toggle_watchlist)
    monkeypatch.setattr(profile_repository, "toggle_watched", mock_toggle_watched)
    monkeypatch.setattr(profile_repository, "add_or_update_review", mock_add_or_update_review)
    monkeypatch.setattr(survey_service, "save_profile", save_profile)
    monkeypatch.setattr(
        survey_service,
        "get_personalized_recommendations",
        lambda **kwargs: [
            {"title": "A test recommendation", "movieId": 1, **kwargs}
        ],
    )

    with TestClient(main.app) as test_client:
        yield test_client, users, profiles


def register_user(client: TestClient, email: str, password: str = "correct-horse") -> dict:
    response = client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()


def login_user(client: TestClient, email: str, password: str = "correct-horse") -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]
