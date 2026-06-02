# KENUXA ACADEMY — Identity Service API Spec

Base URL: `http://localhost:4001`

All 🔒 endpoints require: `Authorization: Bearer <supabase_access_token>`

The Bearer token is the **Supabase access_token** — the same token issued when a user logs in to KENUXA NETWORK. Cross-app single sign-on is built in.

---

## Auth

All auth routes delegate to the shared Supabase project.

### POST /auth/register

Register a new account. Works for new users only — existing Network users should use `/auth/login`.

**Request**
```json
{
  "email":    "user@example.com",
  "password": "securepassword",
  "fullName": "Ada Lovelace"
}
```

**Response 201**
```json
{
  "accessToken":  "eyJ...",
  "refreshToken": "...",
  "tokenType":    "Bearer",
  "expiresIn":    3600,
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

### POST /auth/login

Sign in with email + password. **Works with KENUXA NETWORK credentials.**

**Request**
```json
{ "email": "user@example.com", "password": "securepassword" }
```

**Response 200** — same shape as register  
**Errors**: `401` Invalid credentials

---

### POST /auth/refresh

Exchange a refresh_token for a new access_token.

**Request**
```json
{ "refreshToken": "..." }
```

**Response 200** — same shape as login

---

### GET /auth/me  🔒

Returns Academy-specific user metadata.

**Response 200**
```json
{
  "id":        "supabase-user-uuid",
  "email":     "user@example.com",
  "role":      "learner",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### POST /auth/provision  🔒

Idempotently creates Academy rows for a user. Called automatically on first login; safe to call multiple times.

**Request** (all optional)
```json
{ "fullName": "Ada Lovelace" }
```

**Response 200**
```json
{ "provisioned": true }
```

---

## Profile

### GET /profile  🔒

**Response 200**
```json
{
  "id":        "uuid",
  "userId":    "supabase-user-uuid",
  "fullName":  "Ada Lovelace",
  "bio":       null,
  "avatarUrl": null,
  "location":  null,
  "interests": [],
  "goals":     [],
  "metadata":  {},
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### PUT /profile  🔒

All fields optional.

**Request**
```json
{
  "fullName":  "Ada Lovelace",
  "bio":       "Mathematician and first programmer",
  "location":  "London, UK",
  "interests": ["mathematics", "computing", "poetry"],
  "goals":     ["master algorithms", "build an OS"]
}
```

**Response 200** — updated Profile object

---

## Identity State

### GET /identity/state  🔒

**Response 200**
```json
{
  "id":              "uuid",
  "userId":          "supabase-user-uuid",
  "cognitiveScore":  0,
  "creativeScore":   0,
  "socialScore":     0,
  "emotionalScore":  0,
  "practicalScore":  0,
  "leadershipScore": 0,
  "economicScore":   0,
  "metadata":        {},
  "updatedAt":       "..."
}
```

---

### PUT /identity/state  🔒

Update one or more scores (0–100).

**Request**
```json
{
  "cognitiveScore":  72,
  "creativeScore":   65,
  "leadershipScore": 50
}
```

**Response 200** — updated IdentityState object

---

## Wallet (proxied to KENUXA CORE)

Wallet data is owned by KENUXA CORE. These endpoints proxy the user's Supabase token to Core.

### GET /wallet/balance  🔒

**Response 200**
```json
{
  "userId":        "uuid",
  "balance":       1250,
  "currency":      "KENUX",
  "lastUpdatedAt": "..."
}
```

### GET /wallet/transactions?limit=10  🔒

**Response 200** — array of transaction objects

---

## Health

### GET /health

```json
{ "status": "ok", "service": "identity-service", "app": "academy" }
```

---

## Error Format

```json
{ "error": "Human-readable message" }
```

Validation errors:
```json
{
  "error":   "Validation error",
  "details": [{ "path": "email", "message": "Invalid email" }]
}
```
