from contextlib import asynccontextmanager

from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.services.recommender import (
    get_recommendations,
    get_personalized_recommendations,
    get_recommendations_for_user,
    get_all_genres,
    get_popular_movies,
    search_movies,
    get_movie_details,
)
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models.user_profile import UserProfile
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
)
from app.schemas.taste import TasteSurvey
from app.services import auth_service
from app.services.profile_repository import (
    get_profile,
    save_profile,
    toggle_watchlist,
    toggle_watched,
    add_or_update_review,
)
from app.services.survey_service import get_survey_recommendations
from app.services.user_repository import ensure_user_indexes


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_user_indexes()
    yield


app = FastAPI(
    title="CineMatch API",
    description="Personalized movie discovery and recommendation engine",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_response(
    _request: Request,
    exception: RequestValidationError,
):
    errors = [
        {
            key: value
            for key, value in error.items()
            if key not in {"input", "ctx"}
        }
        for error in exception.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


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


@app.post("/survey/recommendations")
def survey_recommendations(
    survey: TasteSurvey,
    current_user: dict = Depends(get_current_user),
):
    try:
        return get_survey_recommendations(
            survey=survey,
            user_id=str(current_user["_id"]),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(request: RegisterRequest):
    try:
        user = auth_service.register_user(request.email, request.password)
    except auth_service.DuplicateEmailError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        ) from exc

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
    }


@app.post("/auth/login", response_model=LoginResponse)
def login(request: LoginRequest):
    try:
        user, token, expires_in = auth_service.authenticate_user(
            request.email,
            request.password,
        )
    except auth_service.InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except auth_service.AuthenticationConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        ) from exc

    return {
        "access_token": token,
        "expires_in": expires_in,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "created_at": user["created_at"],
            "updated_at": user["updated_at"],
        },
    }


@app.get("/users/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "created_at": current_user["created_at"],
        "updated_at": current_user["updated_at"],
    }


@app.get(
    "/users/me/profile",
    response_model=UserProfile,
    responses={404: {"description": "No profile has been saved for this user."}},
)
def get_my_profile(current_user: dict = Depends(get_current_user)):
    profile = get_profile(str(current_user["_id"]))
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )
    return profile


@app.put("/users/me/profile", response_model=UserProfile)
def update_my_profile(
    survey: TasteSurvey,
    current_user: dict = Depends(get_current_user),
):
    profile = UserProfile(
        favorite_movies=survey.favorite_movies,
        favorite_genres=survey.favorite_genres,
        disliked_genres=survey.disliked_genres,
        disliked_movies=survey.disliked_movies,
        watched_movies=survey.watched_movies,
        discovery_preference=survey.discovery_preference,
    )
    return save_profile(str(current_user["_id"]), profile)


class MovieActionRequest(BaseModel):
    movie_title: str


class ReviewRequest(BaseModel):
    movie_title: str
    review: str
    rating: float = 5.0


@app.get("/movies/search")
def api_search_movies(
    q: str = Query(default="", min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
):
    return search_movies(query=q, limit=limit)


@app.get("/movies/popular")
def api_popular_movies(
    limit: int = Query(default=30, ge=1, le=100),
    genre: str | None = None,
):
    return get_popular_movies(limit=limit, genre=genre)


@app.get("/movies/genres")
def api_genres():
    return get_all_genres()


@app.get("/recommendations/user")
def api_user_recommendations(
    refresh: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    recommendations = get_recommendations_for_user(
        user_id=str(current_user["_id"]),
        limit=7,
        refresh_offset=refresh,
    )
    profile = get_profile(str(current_user["_id"])) or {}
    watchlist_set = set(profile.get("watchlist", []))
    watched_set = set(profile.get("watched_movies", []))

    palette = ["#8b5cf6", "#0ea5e9", "#f43f5e", "#ffffff", "#f59e0b", "#10b981", "#6366f1"]
    enriched = []
    for idx, movie in enumerate(recommendations):
        title = movie["title"]
        movie_dict = dict(movie)
        movie_dict["color"] = palette[idx % len(palette)]
        movie_dict["in_watchlist"] = title in watchlist_set
        movie_dict["is_watched"] = title in watched_set
        if not movie_dict.get("summary"):
            movie_dict["summary"] = (
                f"{movie_dict.get('genres', 'Drama')} • Rating: {movie_dict.get('average_rating', 4.0)}/5"
            )
        enriched.append(movie_dict)

    return {
        "count": len(enriched),
        "recommendations": enriched,
    }


@app.post("/users/me/watchlist")
def api_toggle_watchlist(
    request: MovieActionRequest,
    current_user: dict = Depends(get_current_user),
):
    return toggle_watchlist(str(current_user["_id"]), request.movie_title)


@app.post("/users/me/watched")
def api_toggle_watched(
    request: MovieActionRequest,
    current_user: dict = Depends(get_current_user),
):
    return toggle_watched(str(current_user["_id"]), request.movie_title)


@app.post("/users/me/reviews")
def api_add_review(
    request: ReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    result = add_or_update_review(
        user_id=str(current_user["_id"]),
        movie_title=request.movie_title,
        review_text=request.review,
        rating=request.rating,
    )
    return {"status": "success", "review": result}


@app.get("/users/me/library")
def api_get_library(current_user: dict = Depends(get_current_user)):
    profile = get_profile(str(current_user["_id"])) or {}
    watched_titles = profile.get("watched_movies", [])
    watchlist_titles = profile.get("watchlist", [])
    reviews = profile.get("reviews", [])

    reviews_by_title = {r["movie_title"]: r for r in reviews if "movie_title" in r}

    watched_enriched = []
    for title in watched_titles:
        details = get_movie_details(title) or {"title": title, "genres": "Drama", "average_rating": 4.0}
        details["is_watched"] = True
        details["in_watchlist"] = False
        details["review"] = reviews_by_title.get(title)
        watched_enriched.append(details)

    watchlist_enriched = []
    for title in watchlist_titles:
        details = get_movie_details(title) or {"title": title, "genres": "Drama", "average_rating": 4.0}
        details["is_watched"] = False
        details["in_watchlist"] = True
        watchlist_enriched.append(details)

    return {
        "watched": watched_enriched,
        "watchlist": watchlist_enriched,
        "reviews": reviews,
    }

