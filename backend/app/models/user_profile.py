
from datetime import datetime, timezone

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    favorite_movies: list[str] = Field(default_factory=list)
    favorite_genres: list[str] = Field(default_factory=list)
    disliked_genres: list[str] = Field(default_factory=list)
    disliked_movies: list[str] = Field(default_factory=list)
    watched_movies: list[str] = Field(default_factory=list)
    discovery_preference: str = "balanced"
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
