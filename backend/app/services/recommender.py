import numpy as np
from functools import lru_cache
from pathlib import Path

import joblib


ROOT = Path(__file__).resolve().parents[2]
MODEL_FILE = ROOT / "artifacts" / "content_model.joblib"



def calculate_bayesian_rating(
    average_rating: float,
    rating_count: int,
    global_average: float,
    minimum_votes: int = 20,
) -> float:
    """
    Pull ratings with few votes toward the global average.
    """
    if rating_count <= 0:
        return global_average

    return (
        (rating_count / (rating_count + minimum_votes))
        * average_rating
        + (minimum_votes / (rating_count + minimum_votes))
        * global_average
    )

@lru_cache(maxsize=1)
def load_model():
    """Load the saved model once and reuse it."""
    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            "Model not found. Run: python scripts/build_model.py"
        )

    return joblib.load(MODEL_FILE)


def get_recommendations(title: str, limit: int = 7):
    model = load_model()

    movies = model["movies"]
    similarity_matrix = model["similarity_matrix"]

    matches = movies[
        movies["title"].str.casefold() == title.strip().casefold()
    ]

    if matches.empty:
        raise ValueError(
            f"Movie '{title}' was not found. Try its full dataset title."
        )

    movie_index = matches["rating_count"].idxmax()

    similarity_row = similarity_matrix.getrow(movie_index)

    ranked = sorted(
        zip(similarity_row.indices, similarity_row.data),
        key=lambda item: item[1],
        reverse=True,
    )

    recommendations = []

    for index, score in ranked:
        if index == movie_index:
            continue

        movie = movies.iloc[index]

        recommendations.append({
            "movieId": int(movie["movieId"]),
            "title": str(movie["title"]),
            "genres": str(movie["genres"]),
            "year": (
                int(movie["year"])
                if movie["year"] == movie["year"]
                else None
            ),
            "average_rating": round(float(movie["average_rating"]), 2),
            "rating_count": int(movie["rating_count"]),
            "similarity_score": round(float(score), 4),
        })

        if len(recommendations) >= limit:
            break

    return recommendations


def get_personalized_recommendations(
    liked_titles: list[str],
    disliked_titles: list[str] | None = None,
    favorite_genres: list[str] | None = None,
    disliked_genres: list[str] | None = None,
    watched_titles: list[str] | None = None,
    limit: int = 7,
):
    model = load_model()
    movies = model["movies"]
    similarity_matrix = model["similarity_matrix"]

    disliked_titles = disliked_titles or []
    favorite_genres = favorite_genres or []
    disliked_genres = disliked_genres or []
    watched_titles = watched_titles or []

    rated_movies = movies[movies["rating_count"] > 0]
    
    global_average = (
        (
            rated_movies["average_rating"]
            * rated_movies["rating_count"]
        ).sum()
        / rated_movies["rating_count"].sum()
        if not rated_movies.empty
        else 0.0
    )

    # Match movie titles without case sensitivity.
    title_lookup = {}

    for index, title in enumerate(movies["title"]):
        title_lookup.setdefault(str(title).casefold(), []).append(index)

    def find_indices(titles):
        indices = []

        for title in titles:
            matches = title_lookup.get(title.strip().casefold(), [])

            if not matches:
                raise ValueError(f"Movie not found: '{title}'")

            # Resolve duplicate titles using the most-rated entry.
            best_index = max(
                matches,
                key=lambda i: int(movies.iloc[i]["rating_count"]),
            )
            indices.append(best_index)

        return list(dict.fromkeys(indices))

    liked_indices = find_indices(liked_titles)
    disliked_indices = find_indices(disliked_titles)
    watched_indices = find_indices(watched_titles)

    if not liked_indices:
        raise ValueError("Provide at least one liked movie.")

    # Average similarity to all liked movies.
    
    # 1. Similarity to the user's liked movies.
    positive_scores = np.asarray(
        similarity_matrix[liked_indices].mean(axis=0)
    ).ravel()

    # 2. Similarity to movies the user dislikes.
    negative_scores = np.zeros(len(movies))

    if disliked_indices:
        negative_scores = np.asarray(
            similarity_matrix[disliked_indices].mean(axis=0)
        ).ravel()

    # 3. Calculate a rating baseline weighted by vote counts.
    rated = movies["rating_count"] > 0
    rated_movies = movies.loc[rated]

    global_average = (
        (
            rated_movies["average_rating"]
            * rated_movies["rating_count"]
        ).sum() / rated_movies["rating_count"].sum()
        if not rated_movies.empty
        else 0.0
    )

    bayesian_ratings = np.array([
        calculate_bayesian_rating(
            float(row["average_rating"]),
            int(row["rating_count"]),
            global_average,
        )
        for _, row in movies.iterrows()
    ])

    # Normalize the adjusted rating to a 0–1 scale.
    rating_scores = bayesian_ratings / 5.0

    # 4. Calculate genre matching.
    genre_strings = movies["genres"].fillna("").astype(str)

    favorite_genres_normalized = {
        genre.casefold() for genre in favorite_genres
    }
    disliked_genres_normalized = {
        genre.casefold() for genre in disliked_genres
    }

    genre_scores = np.zeros(len(movies))
    disliked_genre_penalties = np.zeros(len(movies))

    for index, genre_string in enumerate(genre_strings):
        movie_genres = {
            genre.casefold()
            for genre in genre_string.split("|")
        }

        if favorite_genres_normalized:
            matches = movie_genres & favorite_genres_normalized
            genre_scores[index] = (
                len(matches) / len(favorite_genres_normalized)
            )

        if movie_genres & disliked_genres_normalized:
            disliked_genre_penalties[index] = 1.0

    # 5. Combine the normalized signals.
    scores = (
        0.65 * positive_scores
        + 0.15 * rating_scores
        + 0.20 * genre_scores
        - 0.25 * negative_scores
        - 0.25 * disliked_genre_penalties
    )

    # Never recommend titles already liked, disliked, or watched.
    excluded = set(
        liked_indices + disliked_indices + watched_indices
    )

    for index in excluded:
        scores[index] = -np.inf

    


    ranked_indices = np.argsort(scores)[::-1]
    recommendations = []
    selected_indices = []

    # MMR balances relevance against similarity to selected movies.
    diversity_weight = 0.25

    # Consider the best 100 candidates before selecting the final list.
    candidates = [
        int(index)
        for index in ranked_indices
        if np.isfinite(scores[index])
    ][:100]

    while candidates and len(recommendations) < limit:
        best_index = None
        best_mmr_score = -np.inf

        for index in candidates:
            relevance = float(scores[index])

            if selected_indices:
                similarities = similarity_matrix[
                    index, selected_indices
                ].toarray().ravel()

                redundancy = float(np.max(similarities))
            else:
                redundancy = 0.0

            mmr_score = (
                (1 - diversity_weight) * relevance
                - diversity_weight * redundancy
            )

            if mmr_score > best_mmr_score:
                best_mmr_score = mmr_score
                best_index = index

        if best_index is None:
            break

        selected_indices.append(best_index)
        candidates.remove(best_index)

        movie = movies.iloc[best_index]

        recommendations.append({
            "bayesian_rating": round(
                float(bayesian_ratings[best_index]), 2
            ),
            "movieId": int(movie["movieId"]),
            "title": str(movie["title"]),
            "genres": str(movie["genres"]),
            "average_rating": round(
                float(movie["average_rating"]), 2
            ),
            "rating_count": int(movie["rating_count"]),
            "recommendation_score": round(
                float(scores[best_index]), 4
            ),
        })

    return recommendations
