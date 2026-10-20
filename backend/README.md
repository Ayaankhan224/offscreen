# OffScreen API

The API is built with FastAPI. It stores accounts and user profiles in MongoDB and serves movie recommendations from the prepared MovieLens catalog.

## Run locally

From this directory, create a virtual environment, install `requirements.txt`, and copy `.env.example` to `.env`. Set `MONGODB_URI` and `JWT_SECRET_KEY` in `.env`.

The compact recommendation model is checked in at `artifacts/content_model.joblib` as a regular Git file so serverless deployments include the model binary. To rebuild it after changing the processed catalog, run:

```bash
python scripts/build_model.py
uvicorn app.main:app --reload
```

The model stores the TF-IDF matrix and calculates cosine similarities on demand, avoiding a large precomputed movie-to-movie similarity table.
