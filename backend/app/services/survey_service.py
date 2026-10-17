
from app.schemas.taste import TasteSurvey
from app.models.user_profile import UserProfile
from app.services.profile_repository import save_profile
from app.services.recommender import get_personalized_recommendations


def get_survey_recommendations(
    survey: TasteSurvey,
    user_id: str,
) -> dict:
    profile = UserProfile(
        favorite_movies=survey.favorite_movies,
        favorite_genres=survey.favorite_genres,
        disliked_genres=survey.disliked_genres,
        disliked_movies=survey.disliked_movies,
        watched_movies=survey.watched_movies,
        discovery_preference=survey.discovery_preference,
    )

    save_profile(user_id, profile)

    recommendations = get_personalized_recommendations(
        liked_titles=profile.favorite_movies,
        disliked_titles=profile.disliked_movies,
        favorite_genres=profile.favorite_genres,
        disliked_genres=profile.disliked_genres,
        watched_titles=profile.watched_movies,
        limit=7,
    )

    return {
        "user_id": user_id,
        "count": len(recommendations),
        "discovery_preference": profile.discovery_preference,
        "recommendations": recommendations,
    }
