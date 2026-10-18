# OffScreen API

The API is built with FastAPI. It stores accounts and user profiles in MongoDB and serves movie recommendations from the prepared MovieLens catalog.

## Run locally

From this directory, create a virtual environment, install `requirements.txt`, and copy `.env.example` to `.env`. Set `MONGODB_URI` and `JWT_SECRET_KEY` in `.env`.

Build the generated recommendation model before starting the API:

```bash
python scripts/build_model.py
uvicorn app.main:app --reload
```

The generated `artifacts/content_model.joblib` is intentionally excluded from Git because it is large. The processed catalog and build script are included in the repository.
