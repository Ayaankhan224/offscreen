from datetime import datetime, timedelta, timezone

import jwt
from pymongo.errors import DuplicateKeyError

from app.models.user_profile import UserProfile
from app.services import auth_service, profile_repository, user_repository

from conftest import login_user, register_user


def test_passwords_use_argon2_and_verify():
    password_hash = auth_service.hash_password("correct-horse")

    assert password_hash.startswith("$argon2id$")
    assert password_hash != "correct-horse"
    assert auth_service.verify_password("correct-horse", password_hash)
    assert not auth_service.verify_password("wrong-password", password_hash)


def test_registration_returns_safe_account_and_normalizes_email(api):
    client, users, _ = api

    response = client.post(
        "/auth/register",
        json={"email": "  MOVIE.FAN@example.com ", "password": "correct-horse"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "movie.fan@example.com"
    assert data["id"] == "user-1"
    assert "password" not in data
    assert "password_hash" not in data
    assert users["movie.fan@example.com"]["password_hash"].startswith("$argon2id$")


def test_registration_rejects_short_password(api):
    client, _, _ = api

    response = client.post(
        "/auth/register",
        json={"email": "fan@example.com", "password": "tiny"},
    )

    assert response.status_code == 422
    assert "tiny" not in response.text


def test_user_email_index_is_unique(monkeypatch):
    calls = []
    monkeypatch.setattr(
        user_repository.users_collection,
        "create_index",
        lambda *args, **kwargs: calls.append((args, kwargs)),
    )

    user_repository.ensure_user_indexes()

    assert calls[0][0] == ([("email", 1)],)
    assert calls[0][1]["unique"] is True
    assert calls[0][1]["name"] == "users_email_unique"


def test_duplicate_email_registration_returns_conflict(api):
    client, _, _ = api
    register_user(client, "fan@example.com")

    response = client.post(
        "/auth/register",
        json={"email": "FAN@example.com", "password": "another-password"},
    )

    assert response.status_code == 409


def test_registration_translates_duplicate_key_error(monkeypatch, api):
    client, _, _ = api
    monkeypatch.setattr(
        user_repository,
        "create_user",
        lambda *_: (_ for _ in ()).throw(DuplicateKeyError("duplicate email")),
    )

    response = client.post(
        "/auth/register",
        json={"email": "race@example.com", "password": "correct-horse"},
    )

    assert response.status_code == 409


def test_login_returns_expiring_signed_token(api):
    client, _, _ = api
    register_user(client, "fan@example.com")

    response = client.post(
        "/auth/login",
        json={"email": "FAN@example.com", "password": "correct-horse"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 3600
    assert data["user"]["email"] == "fan@example.com"
    assert "password_hash" not in data
    claims = jwt.decode(
        data["access_token"],
        "test-only-signing-secret-at-least-32-bytes",
        algorithms=["HS256"],
    )
    assert claims["sub"] == "user-1"
    assert claims["token_type"] == "access"


def test_login_uses_generic_invalid_credentials_response(api):
    client, _, _ = api
    register_user(client, "fan@example.com")

    known_email = client.post(
        "/auth/login",
        json={"email": "fan@example.com", "password": "wrong-password"},
    )
    unknown_email = client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
    )

    assert known_email.status_code == unknown_email.status_code == 401
    assert known_email.json() == unknown_email.json()


def test_login_fails_safely_without_jwt_secret(monkeypatch, api):
    client, _, _ = api
    register_user(client, "fan@example.com")
    monkeypatch.delenv("JWT_SECRET_KEY")

    response = client.post(
        "/auth/login",
        json={"email": "fan@example.com", "password": "correct-horse"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Authentication is not configured."


def test_protected_endpoints_reject_missing_and_invalid_tokens(api):
    client, _, _ = api

    missing = client.get("/users/me")
    invalid = client.get(
        "/users/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    survey = client.post("/survey/recommendations", json={"favorite_movies": ["Alien"]})
    profile = client.get("/users/me/profile")
    profile_update = client.put(
        "/users/me/profile",
        json={"favorite_movies": ["Alien"]},
    )

    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert survey.status_code == 401
    assert profile.status_code == 401
    assert profile_update.status_code == 401


def test_expired_token_is_rejected(api):
    client, _, _ = api
    expired_token = jwt.encode(
        {
            "sub": "user-1",
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "token_type": "access",
        },
        "test-only-signing-secret-at-least-32-bytes",
        algorithm="HS256",
    )

    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401


def test_users_me_returns_safe_current_account(api):
    client, _, _ = api
    register_user(client, "fan@example.com")
    token = login_user(client, "fan@example.com")

    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == "user-1"
    assert response.json()["email"] == "fan@example.com"
    assert "password_hash" not in response.json()
    assert "access_token" not in response.json()


def test_survey_persists_preferences_for_authenticated_user(api, monkeypatch):
    client, _, profiles = api
    register_user(client, "fan@example.com")
    token = login_user(client, "fan@example.com")
    recommendations_call = {}

    def recommendations(**kwargs):
        recommendations_call.update(kwargs)
        return [{"title": "A test recommendation"}]

    from app.services import survey_service

    monkeypatch.setattr(
        survey_service,
        "get_personalized_recommendations",
        recommendations,
    )
    response = client.post(
        "/survey/recommendations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "favorite_movies": ["Alien"],
            "disliked_movies": ["Movie to avoid"],
            "watched_movies": ["Already seen"],
            "favorite_genres": ["Sci-Fi"],
            "disliked_genres": ["Romance"],
        },
    )

    assert response.status_code == 200
    assert response.json()["user_id"] == "user-1"
    assert profiles["user-1"]["favorite_movies"] == ["Alien"]
    assert recommendations_call["watched_titles"] == ["Already seen"]
    assert recommendations_call["disliked_titles"] == ["Movie to avoid"]
    assert recommendations_call["disliked_genres"] == ["Romance"]
    assert recommendations_call["limit"] == 7


def test_users_can_only_read_their_own_profile(api):
    client, _, profiles = api
    register_user(client, "first@example.com")
    first_token = login_user(client, "first@example.com")
    register_user(client, "second@example.com")
    second_token = login_user(client, "second@example.com")
    profiles["user-1"] = {"user_id": "user-1", "favorite_movies": ["First"]}
    profiles["user-2"] = {"user_id": "user-2", "favorite_movies": ["Second"]}

    response = client.get(
        "/users/me/profile?user_id=user-2",
        headers={"Authorization": f"Bearer {first_token}"},
    )
    second_response = client.get(
        "/users/me/profile",
        headers={"Authorization": f"Bearer {second_token}"},
    )
    update_response = client.put(
        "/users/me/profile?user_id=user-2",
        headers={"Authorization": f"Bearer {first_token}"},
        json={"favorite_movies": ["Changed first profile"], "user_id": "user-2"},
    )

    assert response.status_code == 200
    assert response.json()["favorite_movies"] == ["First"]
    assert second_response.json()["favorite_movies"] == ["Second"]
    assert update_response.status_code == 200
    assert profiles["user-1"]["favorite_movies"] == ["Changed first profile"]
    assert profiles["user-2"]["favorite_movies"] == ["Second"]


def test_profile_not_found_has_consistent_response(api):
    client, _, _ = api
    register_user(client, "fan@example.com")
    token = login_user(client, "fan@example.com")

    response = client.get(
        "/users/me/profile",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found."


def test_put_profile_updates_only_authenticated_user(api):
    client, _, profiles = api
    register_user(client, "fan@example.com")
    token = login_user(client, "fan@example.com")
    original_created_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
    profiles["user-1"] = {
        "user_id": "user-1",
        "favorite_movies": ["Old favorite"],
        "created_at": original_created_at,
        "updated_at": original_created_at,
    }

    response = client.put(
        "/users/me/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "favorite_movies": ["New favorite"],
            "watched_movies": ["Seen movie"],
        },
    )

    assert response.status_code == 200
    assert response.json()["favorite_movies"] == ["New favorite"]
    assert profiles["user-1"]["created_at"] == original_created_at
    assert profiles["user-1"]["updated_at"] >= original_created_at


def test_profile_repository_preserves_created_at(monkeypatch):
    class MemoryProfileCollection:
        def __init__(self):
            self.documents = {}

        def update_one(self, selector, update, upsert):
            user_id = selector["user_id"]
            document = self.documents.get(user_id)
            if document is None:
                document = update["$setOnInsert"].copy()
            document.update(update["$set"])
            self.documents[user_id] = document

        def find_one(self, selector, projection):
            return self.documents.get(selector["user_id"])

    collection = MemoryProfileCollection()
    monkeypatch.setattr(profile_repository, "profiles_collection", collection)
    created_at = datetime(2020, 1, 1, tzinfo=timezone.utc)

    first = UserProfile(favorite_movies=["First"], created_at=created_at)
    initial = profile_repository.save_profile("user-1", first)

    second = UserProfile(favorite_movies=["Second"])
    updated = profile_repository.save_profile("user-1", second)

    assert updated["created_at"] == initial["created_at"] == created_at
    assert updated["updated_at"] >= initial["updated_at"]


def test_swagger_documents_bearer_auth(api):
    client, _, _ = api

    schema = client.get("/openapi.json").json()

    assert schema["components"]["securitySchemes"]["HTTPBearer"]["scheme"] == "bearer"
    assert schema["paths"]["/users/me"]["get"]["security"]
    assert schema["paths"]["/survey/recommendations"]["post"]["security"]


def test_existing_recommendation_route_still_works(api):
    client, _, _ = api

    response = client.get(
        "/recommendations",
        params={"title": "Toy Story (1995)", "limit": 3},
    )

    assert response.status_code == 200
    assert response.json()["query"] == "Toy Story (1995)"
    assert response.json()["count"] <= 3
    assert all(
        movie["title"] != "Toy Story (1995)"
        for movie in response.json()["recommendations"]
    )
