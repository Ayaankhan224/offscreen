
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = Path(__file__).resolve().parents[1]

DATA_FILE = ROOT / "data" / "processed" / "movies_processed.csv"
ARTIFACT_DIR = ROOT / "artifacts"


def build_model():
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Processed dataset not found: {DATA_FILE}"
        )

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    movies = pd.read_csv(DATA_FILE)

    movies["content_text"] = (
        movies["content_text"].fillna("").astype(str)
    )

    movies = movies[
        movies["content_text"].str.strip().ne("")
    ].reset_index(drop=True)

    if movies.empty:
        raise ValueError("No movies have usable content text.")

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_features=20000,
    )

    tfidf_matrix = vectorizer.fit_transform(
        movies["content_text"]
    )

    similarity_matrix = cosine_similarity(
        tfidf_matrix,
        dense_output=False,
    )

    joblib.dump(
        {
            "movies": movies,
            "vectorizer": vectorizer,
            "tfidf_matrix": tfidf_matrix,
            "similarity_matrix": similarity_matrix,
        },
        ARTIFACT_DIR / "content_model.joblib",
    )

    print("CineMatch content model built successfully!")
    print(f"Movies indexed: {len(movies)}")
    print(f"TF-IDF features: {len(vectorizer.get_feature_names_out())}")
    print(f"TF-IDF matrix shape: {tfidf_matrix.shape}")
    print(f"Saved model: {ARTIFACT_DIR / 'content_model.joblib'}")


if __name__ == "__main__":
    build_model()
