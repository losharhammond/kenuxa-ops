# KENUXA ACADEMY — Identity Service API Spec

Base URL: `http://localhost:4001`

All authenticated endpoints require: `Authorization: Bearer <token>`

---

## Auth

### POST /auth/register

Register a new user. Automatically creates a Profile and IdentityState.

**Request**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "Ada Lovelace",
  "role": "learner"
}
```
`role` is optional — defaults to `"learner"`. Values: `learner | mentor | creator | admin`

**Response 201**
```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "learner",
    "createdAt": "2026-06-02T00:00:00.000Z",
    "updatedAt": "2026-06-02T00:00:00.000Z"
  }
}
```

**Errors**
- `409` — Email already registered
- `400` — Validation error (invalid email, password < 8 chars)

---

### POST /auth/login

**Request**
```json
{ "email": "user@example.com", "password": "securepassword" }
```

**Response 200** — same shape as register response

**Errors**
- `401` — Invalid credentials
- `400` — Validation error

---

### GET /auth/me  🔒

Returns the currently authenticated user.

**Response 200**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "learner",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## Profile

### GET /profile  🔒

Returns the authenticated user's profile.

**Response 200**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "fullName": "Ada Lovelace",
  "bio": null,
  "avatarUrl": null,
  "location": null,
  "interests": [],
  "goals": [],
  "metadata": {},
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### PUT /profile  🔒

Update the authenticated user's profile. All fields optional.

**Request**
```json
{
  "fullName": "Ada Lovelace",
  "bio": "Mathematician and first programmer",
  "location": "London, UK",
  "interests": ["mathematics", "computing", "poetry"],
  "goals": ["master algorithms", "build an OS"]
}
```

**Response 200** — updated Profile object

---

## Identity State

### GET /identity/state  🔒

Returns the authenticated user's seven-dimension identity scores.

**Response 200**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "cognitiveScore": 0,
  "creativeScore": 0,
  "socialScore": 0,
  "emotionalScore": 0,
  "practicalScore": 0,
  "leadershipScore": 0,
  "economicScore": 0,
  "metadata": {},
  "updatedAt": "..."
}
```

---

### PUT /identity/state  🔒

Update one or more dimension scores (0–100). All fields optional.

**Request**
```json
{
  "cognitiveScore": 72,
  "creativeScore": 65,
  "leadershipScore": 50
}
```

**Response 200** — updated IdentityState object

**Errors**
- `400` — Score outside 0–100 range

---

## Health

### GET /health

```json
{ "status": "ok", "service": "identity-service", "app": "academy" }
```

---

## Error Format

All errors return:
```json
{ "error": "Human-readable message" }
```

Validation errors additionally return:
```json
{
  "error": "Validation error",
  "details": [{ "path": "email", "message": "Invalid email" }]
}
```
