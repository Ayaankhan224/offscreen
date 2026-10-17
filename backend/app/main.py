from pydantic import BaseModel, Field

from app.services.recommender import (
    get_recommendations,
    get_personalized_recommendations,
)
from fastapi import FastAPI, HTTPException, Query


app = FastAPI(
    title="CineMatch API",
    description="Personalized movie discovery and recommendation engine",
    version="0.2.0",
)


@app.get("/")
def root():
    return {
        "message": "Welcome to CineMatch API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "cinematch-api",
    }


@app.get("/recommendations")
def recommend_movies(
    title: str = Query(min_length=1, description="Full movie title"),
    limit: int = Query(default=7, ge=1, le=50),
):
    try:
        recommendations = get_recommendations(title, limit)
        return {
            "query": title,
            "count": len(recommendations),
            "recommendations": recommendations,
        }

    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))

    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error))


class PersonalizedRequest(BaseModel):
    liked_titles: list[str] = Field(min_length=1, max_length=30)
    disliked_titles: list[str] = Field(default_factory=list, max_length=30)
    favorite_genres: list[str] = Field(default_factory=list, max_length=20)
    disliked_genres: list[str] = Field(default_factory=list, max_length=20)
    watched_titles: list[str] = Field(default_factory=list, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)


@app.post("/recommendations/personalized")
def personalized_recommendations(request: PersonalizedRequest):
    try:
        results = get_personalized_recommendations(
            liked_titles=request.liked_titles,
            disliked_titles=request.disliked_titles,
            favorite_genres=request.favorite_genres,
            disliked_genres=request.disliked_genres,
            watched_titles=request.watched_titles,
            limit=request.limit,
        )

        return {
            "count": len(results),
            "recommendations": results,
        }

    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))

    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error))
