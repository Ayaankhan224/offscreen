import os
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from pymongo.errors import DuplicateKeyError

from app.services import user_repository


JWT_ALGORITHM = "HS256"
DEFAULT_TOKEN_EXPIRE_MINUTES = 60
MAX_TOKEN_EXPIRE_MINUTES = 1440
password_hasher = PasswordHasher(type=Type.ID)


class AuthenticationConfigurationError(Exception):
    pass


class DuplicateEmailError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def _jwt_settings() -> tuple[str, int]:
    secret = os.getenv("JWT_SECRET_KEY", "").strip()
    if len(secret.encode("utf-8")) < 32:
        raise AuthenticationConfigurationError(
            "JWT_SECRET_KEY must contain at least 32 bytes."
        )

    raw_expiration = os.getenv(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        str(DEFAULT_TOKEN_EXPIRE_MINUTES),
    )
    try:
        expiration_minutes = int(raw_expiration)
    except ValueError as exc:
        raise AuthenticationConfigurationError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 1440."
        ) from exc
    if not 1 <= expiration_minutes <= MAX_TOKEN_EXPIRE_MINUTES:
        raise AuthenticationConfigurationError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 1440."
        )

    return secret, expiration_minutes


def register_user(email: str, password: str) -> dict:
    normalized_email = normalize_email(email)
    password_hash = hash_password(password)
    try:
        return user_repository.create_user(normalized_email, password_hash)
    except DuplicateKeyError as exc:
        raise DuplicateEmailError from exc


def authenticate_user(email: str, password: str) -> tuple[dict, str, int]:
    user = user_repository.get_user_by_email(normalize_email(email))
    if user is None or not verify_password(password, user["password_hash"]):
        raise InvalidCredentialsError

    secret, expiration_minutes = _jwt_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expiration_minutes)
    token = jwt.encode(
        {
            "sub": str(user["_id"]),
            "iat": now,
            "exp": expires_at,
            "token_type": "access",
        },
        secret,
        algorithm=JWT_ALGORITHM,
    )
    return user, token, expiration_minutes * 60


def decode_access_token(token: str) -> dict:
    secret, _ = _jwt_settings()
    claims = jwt.decode(
        token,
        secret,
        algorithms=[JWT_ALGORITHM],
        options={"require": ["sub", "iat", "exp", "token_type"]},
    )
    if claims["token_type"] != "access" or not claims["sub"]:
        raise jwt.InvalidTokenError("Invalid access token claims.")
    return claims
