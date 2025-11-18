# Trackeame API

NestJS 11 + Prisma backend that powers the Trackeame habit tracker. The service exposes:

- JWT-based email/password authentication
- Google & GitHub OAuth flows (via Passport)
- Habit CRUD operations + timer endpoints

Use this package together with the Next.js client in `trackeame-front/`.

## Getting started

```bash
cd trackeame-back
npm install
npx prisma migrate deploy   # or prisma migrate dev when iterating locally
npm run start:dev
```

The API runs on `http://localhost:3000` by default. The Next.js app expects the backend at that origin when running locally.

## Environment variables

Copy `.env.example` if you have one, or duplicate `.env` and update the secrets. The most relevant variables are:

| Name | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/trackeame` |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Secret + TTL for issued API tokens | `super-secret`, `7d` |
| `BETTER_AUTH_SECRET` | Shared secret used by the Better Auth-powered frontend client | `random-long-string` |
| `BETTER_AUTH_URL` | Public URL for this Nest backend (used to build OAuth callbacks) | `http://localhost:3000` |
| `FRONTEND_URL` | Public base URL for the Next.js client | `http://localhost:3001` |
| `FRONTEND_OAUTH_CALLBACK` | Path on the frontend that stores the JWT from OAuth | `/oauth` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials | obtained from Google Cloud Console |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials | obtained from GitHub Developer Settings |

> **Why keep the `BETTER_AUTH_*` vars?** The frontend uses Better Auth utilities for its OAuth buttons, so we keep the same naming convention for secrets/URLs to avoid confusion. `BETTER_AUTH_URL` simply needs to point at this Nest API because that is where the Passport strategies live.

## OAuth redirect URLs

The backend exposes the following Passport-powered endpoints:

- `GET /auth/google` → starts Google OAuth
- `GET /auth/google/callback` → issues a JWT and redirects to `${FRONTEND_URL}${FRONTEND_OAUTH_CALLBACK}?token=...`
- `GET /auth/github` → starts GitHub OAuth
- `GET /auth/github/callback` → issues a JWT and redirects back to the frontend

Make sure your providers allow those same callback URLs.

### Google Cloud Console

1. Visit **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Authorized JavaScript origins: `http://localhost:3000` (backend) and `http://localhost:3001` (frontend) if Google asks for them.
4. Authorized redirect URIs: `http://localhost:3000/auth/google/callback`.
5. Save the generated Client ID / Client secret into `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

### GitHub OAuth App

1. Go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL: `http://localhost:3001` (or your deployed frontend URL).
3. Authorization callback URL: `http://localhost:3000/auth/github/callback`.
4. After registering, copy the **Client ID** and generate a **Client Secret**, then store them in `.env`.

With both providers configured, the frontend `/login` and `/register` pages render "Continue with Google/GitHub" buttons that hit these endpoints. Successful logins land on `/oauth`, which stores the JWT and redirects users to the dashboard.

## Available scripts

```bash
npm run start        # production
npm run start:dev    # watch mode for local work
npm run test         # unit tests
npm run test:e2e     # e2e tests
```

Additional Nest CLI scripts are available in `package.json` if you need linting or coverage commands.
