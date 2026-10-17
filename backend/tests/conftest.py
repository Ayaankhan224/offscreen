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
