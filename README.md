# Tobiira API

Backend for the **Tobiira spatial data and AI platform**.

- Framework: NestJS
- Database: MongoDB (Mongoose)
- API style: REST
- Global prefix: `API_PREFIX` (default `api/v1`)

## Getting started

```bash
npm install
```

## Environment variables

Copy the example and update values as needed:

```bash
cp .env.example .env
```

Mongo connections (4):

- `MONGODB_URI_CORE` (core / default connection)
- `MONGODB_URI_SPATIAL` (named connection: `spatialDB`)
- `MONGODB_URI_PERSTA` (named connection: `persta`)
- `MONGODB_URI_TESTA` (named connection: `testa`)

JWT + refresh:

- `JWT_ACCESS_SECRET` (falls back to `JWT_SECRET`)
- `JWT_ACCESS_EXPIRES_IN` (falls back to `JWT_EXPIRES_IN`)
- `REFRESH_TOKEN_TTL_DAYS`

OTP:

- `OTP_LENGTH`
- `OTP_TTL_MINUTES`

## Run

```bash
npm run start
npm run start:dev

npm run start:prod
```

On startup you should see logs like:

- `server running at port:XXXX`
- `database connected (core)`
- `database connected (persta)`
- `database connected (testa)`

## What works today

Core auth (OTP + JWT + refresh tokens):

- `POST /api/v1/auth/request-otp`
- `POST /api/v1/auth/verify-otp` → returns `{ accessToken, refreshToken }`
- `POST /api/v1/auth/refresh` → rotates refresh token
- `GET  /api/v1/auth/session` → expects `Authorization: Bearer <accessToken>`

In `NODE_ENV=development`, OTP codes are printed to the server logs.

## Manual API test (curl)

Assumes `PORT=7171` and `API_PREFIX=api/v1` (adjust to your `.env`).

Request OTP:

```bash
curl -s -X POST http://localhost:7171/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

Check logs for `DEV OTP for you@example.com: XXXXXX`, then verify:

```bash
curl -s -X POST http://localhost:7171/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","code":"XXXXXX"}'
```

Use the access token:

```bash
curl -s http://localhost:7171/api/v1/auth/session \
  -H "Authorization: Bearer <accessToken>"
```

Refresh:

```bash
curl -s -X POST http://localhost:7171/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

## Tests

```bash
npm test
```
