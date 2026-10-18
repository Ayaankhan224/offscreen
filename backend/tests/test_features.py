import pytest
from conftest import register_user, login_user


def test_movie_endpoints(api):
    client, _, _ = api

    # Search
    search_res = client.get("/movies/search?q=Matrix")
    assert search_res.status_code == 200
    movies = search_res.json()
    assert len(movies) > 0
    assert any("Matrix" in m["title"] for m in movies)

    # Popular
    popular_res = client.get("/movies/popular?limit=5")
    assert popular_res.status_code == 200
    assert len(popular_res.json()) == 5

    # Genres
    genres_res = client.get("/movies/genres")
    assert genres_res.status_code == 200
    assert "Sci-Fi" in genres_res.json()


def test_user_watchlist_watched_review_and_library(api, monkeypatch):
    client, _, profiles = api
    register_user(client, "cinephile@example.com")
    token = login_user(client, "cinephile@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # First test toggle watchlist
    res = client.post(
        "/users/me/watchlist",
        headers=headers,
        json={"movie_title": "Matrix, The (1999)"},
    )
    assert res.status_code == 200
    assert res.json()["in_watchlist"] is True

    # Library should now have Matrix in watchlist
    lib = client.get("/users/me/library", headers=headers).json()
    assert any(m["title"] == "Matrix, The (1999)" for m in lib["watchlist"])

    # Toggle again -> should remove from watchlist
    res_toggle = client.post(
        "/users/me/watchlist",
        headers=headers,
        json={"movie_title": "Matrix, The (1999)"},
    )
    assert res_toggle.status_code == 200
    assert res_toggle.json()["in_watchlist"] is False

    # Toggle watched
    res_watched = client.post(
        "/users/me/watched",
        headers=headers,
        json={"movie_title": "Toy Story (1995)"},
    )
    assert res_watched.status_code == 200
    assert res_watched.json()["is_watched"] is True

    # Add review
    res_review = client.post(
        "/users/me/reviews",
        headers=headers,
        json={
            "movie_title": "Toy Story (1995)",
            "review": "A timeless masterpiece of animation and heart.",
            "rating": 5.0,
        },
    )
    assert res_review.status_code == 200
    assert res_review.json()["status"] == "success"

    # Check library shows watched with review
    lib2 = client.get("/users/me/library", headers=headers).json()
    assert any(m["title"] == "Toy Story (1995)" for m in lib2["watched"])
    assert len(lib2["reviews"]) == 1
    assert lib2["reviews"][0]["movie_title"] == "Toy Story (1995)"

    # Recommendations for user
    user_recs = client.get("/recommendations/user", headers=headers)
    assert user_recs.status_code == 200
    recs_data = user_recs.json()
    assert recs_data["count"] == 7
    assert len(recs_data["recommendations"]) == 7
