# Authentication and user profiles

## Configuration

Copy `backend/.env.example` to `backend/.env` and set:

- `MONGODB_URI`: the connection URI for the `offscreen` database.
- `JWT_SECRET_KEY`: a private signing key containing at least 32 bytes. Generate a
  unique random value and keep it out of source control.
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`: optional access-token lifetime in minutes;
  defaults to 60 and must be between 1 and 1440.

The API creates a unique index on `users.email` during startup. Account records
are stored separately from movie preferences in `user_profiles`.

## Register and log in

Send `POST /auth/register` with a valid email address and a password of 8–128
characters. Email addresses are trimmed and case-normalized. A successful
registration returns the user's ID, email, and timestamps; an already-registered
email returns HTTP 409.

Send `POST /auth/login` with the same email and password. On success the API
returns a signed, expiring access token and safe user information. Incorrect
credentials return the same HTTP 401 response whether the account exists or not.
Neither endpoint returns password hashes.

For protected endpoints, send the token in the standard header:

```http
Authorization: Bearer <access_token>
```

## Authenticated endpoints

- `GET /users/me` returns the account identified by the bearer token.
- `GET /users/me/profile` returns that account's preferences, or HTTP 404 when
  no profile has been saved yet.
- `PUT /users/me/profile` replaces that account's preferences. The request body
  uses the same fields and validation as the taste survey.
- `POST /survey/recommendations` saves the submitted preferences to the
  authenticated account and returns recommendations. It continues to exclude
  watched movies and uses the existing personalized ranking and diversity
  selection.

Profile ownership always comes from the validated token, not a request parameter.
Successful profile writes preserve the original `created_at` timestamp and
refresh `updated_at`.

The interactive OpenAPI documentation is available at `/docs`.
