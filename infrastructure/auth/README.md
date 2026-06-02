# KENUXA — Auth Infrastructure

## How ecosystem auth works

All KENUXA apps share **one Supabase project** for authentication. This means:

- A user who signs up in **KENUXA NETWORK** can log in to **KENUXA ACADEMY** with the same credentials
- One JWT secret (`SUPABASE_JWT_SECRET`) validates tokens across all apps
- No SSO middleware required — Supabase handles token issuance

```
User signs up / logs in
        │
        ▼
  Supabase Auth (shared project)
        │
        ├── Issues access_token (JWT, HS256, SUPABASE_JWT_SECRET)
        ├── Issues refresh_token
        │
        ▼
  Any KENUXA app verifies the access_token locally
  using the same SUPABASE_JWT_SECRET
```

## Supabase JWT payload structure

```json
{
  "sub":   "<user UUID>",
  "email": "user@example.com",
  "role":  "authenticated",
  "iss":   "https://your-project.supabase.co/auth/v1",
  "iat":   1234567890,
  "exp":   1234571490
}
```

`sub` is the Supabase user ID — used as the cross-app foreign key in all Academy tables.

## Environment variables required per app

| Variable               | Where to get it                                   |
|------------------------|---------------------------------------------------|
| `SUPABASE_URL`         | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY`    | Supabase Dashboard → Settings → API → anon key    |
| `SUPABASE_JWT_SECRET`  | Supabase Dashboard → Settings → API → JWT Secret  |

Use the **same values** in every KENUXA app.

## Cross-app user provisioning

Each app may have its own app-specific metadata tables linked via `supabase_user_id`.  
When a user logs into an app for the first time, that app auto-creates its rows:

- **NETWORK**: `user_profiles`, `kenux_wallets`, `rewards_accounts`
- **ACADEMY**: `academy_user_meta`, `academy_profiles`, `academy_identity_states`

This is handled by the `POST /auth/provision` endpoint in the identity-service.

## Adding a new KENUXA app

1. Use the same `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_JWT_SECRET`
2. Verify tokens with `jwtVerify(token, SUPABASE_JWT_SECRET)` using [jose](https://github.com/panva/jose)
3. Extract `sub` as the user ID
4. Create app-specific rows on first login (check-and-create pattern)
