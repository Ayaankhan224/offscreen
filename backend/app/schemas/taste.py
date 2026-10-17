
from pydantic import BaseModel, Field, field_validator


class TasteSurvey(BaseModel):
    favorite_movies: list[str] = Field(min_length=1, max_length=30)
    favorite_genres: list[str] = Field(default_factory=list, max_length=20)
    disliked_genres: list[str] = Field(default_factory=list, max_length=20)
    disliked_movies: list[str] = Field(default_factory=list, max_length=30)
    watched_movies: list[str] = Field(default_factory=list, max_length=500)
    discovery_preference: str = "balanced"

    @field_validator(
        "favorite_movies",
        "favorite_genres",
        "disliked_genres",
        "disliked_movies",
        "watched_movies",
    )
    @classmethod
    def clean_lists(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value.strip()]
        return list(dict.fromkeys(cleaned))

    @field_validator("discovery_preference")
    @classmethod
    def validate_discovery_preference(cls, value: str) -> str:
        allowed = {"familiar", "balanced", "adventurous"}
        value = value.strip().lower()

        if value not in allowed:
            raise ValueError(
                "discovery_preference must be familiar, balanced, or adventurous"
            )

        return value
