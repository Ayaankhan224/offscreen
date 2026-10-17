
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" 
PROCESSED_DIR = ROOT / "data" / "processed"

MOVIES_FILE = RAW_DIR / "movies.csv"
RATINGS_FILE = RAW_DIR / "ratings.csv"
TAGS_FILE = RAW_DIR / "tags.csv"


def prepare_movies():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    movies = pd.read_csv(MOVIES_FILE)
    ratings = pd.read_csv(RATINGS_FILE)

    movies = movies.drop_duplicates(subset="movieId")
    movies = movies.dropna(subset=["title", "genres"])

    movies["genres_list"] = movies["genres"].apply(
        lambda value: [
            genre for genre in str(value).split("|")
            if genre and genre != "(no genres listed)"
        ]
    )

    movies["year"] = pd.to_numeric(
        movies["title"].str.extract(r"\((\d{4})\)\s*$")[0],
        errors="coerce",
    ).astype("Int64")

    rating_stats = ratings.groupby("movieId")["rating"].agg(
        average_rating="mean",
        rating_count="count",
    ).reset_index()

    movies = movies.merge(
        rating_stats,
        on="movieId",
        how="left",
    )

    movies["average_rating"] = movies["average_rating"].fillna(0.0)
    movies["rating_count"] = movies["rating_count"].fillna(0).astype(int)

    if TAGS_FILE.exists():
        tags = pd.read_csv(TAGS_FILE)
        tags = tags.dropna(subset=["tag"])

        tag_text = (
            tags.groupby("movieId")["tag"]
            .apply(lambda values: " ".join(values.astype(str)))
            .rename("tags_text")
            .reset_index()
        )

        movies = movies.merge(tag_text, on="movieId", how="left")

    if "tags_text" not in movies.columns:
        movies["tags_text"] = ""

    movies["tags_text"] = movies["tags_text"].fillna("")

    movies["content_text"] = (
        movies["genres"].fillna("").str.replace("|", " ", regex=False)
        + " "
        + movies["tags_text"]
    ).str.strip()

    output = PROCESSED_DIR / "movies_processed.csv"
    movies.to_csv(output, index=False)

    print(f"Movies processed: {len(movies)}")
    print(f"Movies with ratings: {(movies['rating_count'] > 0).sum()}")
    print(f"Output saved to: {output}")


if __name__ == "__main__":
    prepare_movies()
