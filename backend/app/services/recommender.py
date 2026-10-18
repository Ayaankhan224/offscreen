import json
import re
import urllib.parse
import urllib.request
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


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
    tfidf_matrix = model["tfidf_matrix"]

    matches = movies[
        movies["title"].str.casefold() == title.strip().casefold()
    ]

    if matches.empty:
        raise ValueError(
            f"Movie '{title}' was not found. Try its full dataset title."
        )

    movie_index = matches["rating_count"].idxmax()

    similarity_row = cosine_similarity(
        tfidf_matrix[movie_index],
        tfidf_matrix,
        dense_output=False,
    ).getrow(0)

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
    tfidf_matrix = model["tfidf_matrix"]

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

    def find_indices(titles, strict=False):
        indices = []

        for title in titles:
            if not title or not str(title).strip():
                continue
            q = str(title).strip().casefold()
            matches = title_lookup.get(q, [])

            if not matches:
                # Substring/prefix fallback matching
                fallback = [
                    i for i, t in enumerate(movies["title"])
                    if q in str(t).casefold()
                ]
                if fallback:
                    best_index = max(
                        fallback,
                        key=lambda i: int(movies.iloc[i]["rating_count"]),
                    )
                    indices.append(best_index)
                    continue

                if strict:
                    raise ValueError(f"Movie not found: '{title}'")
                continue

            # Resolve duplicate titles using the most-rated entry.
            best_index = max(
                matches,
                key=lambda i: int(movies.iloc[i]["rating_count"]),
            )
            indices.append(best_index)

        return list(dict.fromkeys(indices))

    liked_indices = find_indices(liked_titles, strict=True)
    disliked_indices = find_indices(disliked_titles, strict=False)
    watched_indices = find_indices(watched_titles, strict=False)

    if not liked_indices:
        raise ValueError("Provide at least one liked movie.")

    # Average similarity to all liked movies.
    
    # 1. Similarity to the user's liked movies.
    positive_scores = np.asarray(
        cosine_similarity(
            tfidf_matrix[liked_indices], tfidf_matrix, dense_output=False
        ).mean(axis=0)
    ).ravel()

    # 2. Similarity to movies the user dislikes.
    negative_scores = np.zeros(len(movies))

    if disliked_indices:
        negative_scores = np.asarray(
            cosine_similarity(
                tfidf_matrix[disliked_indices],
                tfidf_matrix,
                dense_output=False,
            ).mean(axis=0)
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
        redundancy_scores = None

        if selected_indices:
            candidate_matrix = tfidf_matrix[candidates]
            selected_matrix = tfidf_matrix[selected_indices]
            redundancy_scores = cosine_similarity(
                candidate_matrix,
                selected_matrix,
                dense_output=True,
            ).max(axis=1)

        for candidate_position, index in enumerate(candidates):
            relevance = float(scores[index])

            redundancy = (
                float(redundancy_scores[candidate_position])
                if redundancy_scores is not None
                else 0.0
            )

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


def get_all_genres() -> list[str]:
    return [
        "Action", "Adventure", "Animation", "Children", "Comedy", "Crime",
        "Documentary", "Drama", "Fantasy", "Film-Noir", "Horror", "IMAX",
        "Musical", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western",
    ]


def search_movies(query: str, limit: int = 10) -> list[dict]:
    if not query or not query.strip():
        return []
    model = load_model()
    movies = model["movies"]
    q = query.strip()
    matches = movies[movies["title"].str.contains(q, case=False, na=False)]
    if matches.empty:
        return []
    sorted_matches = matches.sort_values("rating_count", ascending=False).head(limit)
    results = []
    for _, movie in sorted_matches.iterrows():
        results.append({
            "movieId": int(movie["movieId"]),
            "title": str(movie["title"]),
            "genres": str(movie["genres"]),
            "year": int(movie["year"]) if movie["year"] == movie["year"] else None,
            "average_rating": round(float(movie["average_rating"]), 2),
            "rating_count": int(movie["rating_count"]),
        })
    return results


def get_popular_movies(limit: int = 30, genre: str | None = None) -> list[dict]:
    model = load_model()
    movies = model["movies"]
    subset = movies
    if genre:
        subset = movies[movies["genres"].str.contains(genre, case=False, na=False)]
    sorted_movies = subset.sort_values(
        by=["rating_count", "average_rating"],
        ascending=[False, False],
    ).head(limit)
    results = []
    for _, movie in sorted_movies.iterrows():
        results.append({
            "movieId": int(movie["movieId"]),
            "title": str(movie["title"]),
            "genres": str(movie["genres"]),
            "year": int(movie["year"]) if movie["year"] == movie["year"] else None,
            "average_rating": round(float(movie["average_rating"]), 2),
            "rating_count": int(movie["rating_count"]),
        })
    return results


@lru_cache(maxsize=2048)
def get_movie_poster(raw_title: str, year: int | None = None) -> str | None:
    if not raw_title or not raw_title.strip():
        return None
    title = raw_title.strip()
    year_match = re.search(r'\((\d{4})\)', title)
    y = year or (year_match.group(1) if year_match else None)

    # Clean base title e.g. "Matrix, The (1999)" -> "The Matrix"
    base = re.sub(r'\(.*?\)', '', title).strip()
    if ', The' in base:
        base = 'The ' + base.replace(', The', '')
    elif ', A' in base:
        base = 'A ' + base.replace(', A', '')
    elif ', An' in base:
        base = 'An ' + base.replace(', An', '')
    base = base.strip()

    # 1. OMDB direct title
    for query in [base, title]:
        try:
            params = {'t': query, 'apikey': 'trilogy'}
            if y:
                params['y'] = y
            url = f'http://www.omdbapi.com/?{urllib.parse.urlencode(params)}'
            req = urllib.request.Request(url, headers={'User-Agent': 'OffScreen/1.0'})
            with urllib.request.urlopen(req, timeout=2.5) as r:
                data = json.loads(r.read().decode())
                if data.get('Response') == 'True' and data.get('Poster') and data['Poster'] != 'N/A':
                    return data['Poster']
        except Exception:
            pass

    # 2. OMDB search query fallback
    try:
        url = f'http://www.omdbapi.com/?s={urllib.parse.quote(base)}&apikey=trilogy'
        req = urllib.request.Request(url, headers={'User-Agent': 'OffScreen/1.0'})
        with urllib.request.urlopen(req, timeout=2.5) as r:
            data = json.loads(r.read().decode())
            search = data.get('Search', [])
            for item in search:
                p = item.get('Poster')
                if p and p != 'N/A':
                    return p
    except Exception:
        pass

    # 3. Wikipedia summary fallback
    for name in [base, f'{base} (film)']:
        slug = urllib.parse.quote(name.replace(' ', '_'))
        url = f'https://en.wikipedia.org/api/rest_v1/page/summary/{slug}'
        req = urllib.request.Request(url, headers={'User-Agent': 'OffScreen/1.0 (movie-discovery)'})
        try:
            with urllib.request.urlopen(req, timeout=2) as r:
                w_data = json.loads(r.read().decode())
                thumb = w_data.get('thumbnail', {}).get('source')
                if thumb:
                    return thumb
        except Exception:
            pass

    return None


def get_movie_details(title: str) -> dict | None:
    model = load_model()
    movies = model["movies"]
    q = title.strip().casefold()
    matches = movies[movies["title"].str.casefold() == q]
    if matches.empty:
        matches = movies[movies["title"].str.contains(title.strip(), case=False, na=False)]
    if matches.empty:
        return {
            "title": title,
            "genres": "Drama",
            "year": None,
            "average_rating": 4.0,
            "rating_count": 50,
            "summary": f"A compelling film titled {title}.",
            "poster_url": get_movie_poster(title),
        }
    best = matches.sort_values("rating_count", ascending=False).iloc[0]
    tags = str(best.get("tags_text", "")) if "tags_text" in best else ""
    summary = tags if tags else f"Rated {best['average_rating']:.1f}/5 across {int(best['rating_count'])} reviews."
    movie_year = int(best["year"]) if best["year"] == best["year"] else None
    return {
        "movieId": int(best["movieId"]),
        "title": str(best["title"]),
        "genres": str(best["genres"]),
        "year": movie_year,
        "average_rating": round(float(best["average_rating"]), 2),
        "rating_count": int(best["rating_count"]),
        "summary": summary,
        "poster_url": get_movie_poster(str(best["title"]), movie_year),
    }


def get_recommendations_for_user(
    user_id: str,
    limit: int = 7,
    refresh_offset: int = 0,
) -> list[dict]:
    from app.services.profile_repository import get_profile

    profile = get_profile(user_id) or {}
    favorite_movies = list(profile.get("favorite_movies", []))
    disliked_movies = list(profile.get("disliked_movies", []))
    favorite_genres = list(profile.get("favorite_genres", []))
    disliked_genres = list(profile.get("disliked_genres", []))
    watched_movies = list(profile.get("watched_movies", []))
    reviews = list(profile.get("reviews", []))

    # Incorporate user reviews into recommendation signals
    for r in reviews:
        title = r.get("movie_title")
        rating = float(r.get("rating", 4.0))
        if not title:
            continue
        watched_movies.append(title)
        if rating >= 3.0:
            if title not in favorite_movies:
                favorite_movies.append(title)
        else:
            if title not in disliked_movies:
                disliked_movies.append(title)

    # Ensure uniqueness
    watched_movies = list(dict.fromkeys(watched_movies))
    favorite_movies = list(dict.fromkeys(favorite_movies))
    disliked_movies = list(dict.fromkeys(disliked_movies))

    # If user has no liked titles, fallback to popular movies matching favorite genres
    if not favorite_movies:
        popular = get_popular_movies(limit=limit + 14, genre=favorite_genres[0] if favorite_genres else None)
        filtered = [m for m in popular if m["title"] not in watched_movies]
        start = (refresh_offset * limit) % max(1, len(filtered) - limit + 1) if len(filtered) > limit else 0
        page = filtered[start:start + limit]
        for item in page:
            item["poster_url"] = get_movie_poster(item["title"], item.get("year"))
        return page

    # Fetch larger pool to allow refresh pagination
    pool_limit = min(50, limit * (refresh_offset + 3))
    try:
        recommendations = get_personalized_recommendations(
            liked_titles=favorite_movies,
            disliked_titles=disliked_movies,
            favorite_genres=favorite_genres,
            disliked_genres=disliked_genres,
            watched_titles=watched_movies,
            limit=pool_limit,
        )
    except Exception:
        # Graceful fallback if personalized fails
        recommendations = get_popular_movies(limit=pool_limit)

    if not recommendations:
        recommendations = get_popular_movies(limit=limit)

    # Paginate / offset for refresh
    start_idx = (refresh_offset * limit) % max(1, len(recommendations))
    page = recommendations[start_idx:start_idx + limit]
    if len(page) < limit:
        page = (recommendations + get_popular_movies(limit=limit))[:limit]

    # Fetch and attach matching posters
    for item in page:
        item["poster_url"] = get_movie_poster(item["title"], item.get("year"))

    return page


