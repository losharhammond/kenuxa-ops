-- KENUXA ACADEMY — Database initialisation
-- This file runs once on first container start.
-- Prisma migrations create all tables; this just ensures the DB + extensions exist.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: Prisma will create all tables via `prisma migrate deploy`.
-- This init script only provisions the database-level prerequisites.
