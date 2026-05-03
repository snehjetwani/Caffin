CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE location_type AS ENUM ('library', 'cafe', 'academic_building', 'other');
CREATE TYPE outlet_availability AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- Users (auth managed by Supabase, this mirrors the profile)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    VARCHAR(50) NOT NULL,
  last_name     VARCHAR(50) NOT NULL,
  email         VARCHAR(30) NOT NULL UNIQUE CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

-- Locations
CREATE TABLE locations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id     TEXT NOT NULL UNIQUE,
  name                VARCHAR(100) NOT NULL,
  type                location_type NOT NULL,
  outlet_availability outlet_availability NOT NULL DEFAULT 'NONE'
);

-- Sessions
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ,
  CHECK (end_time IS NULL OR end_time > start_time)
);

-- Reviews
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
  location_id   UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  source        TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'google')),
  stars         INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  opinion       VARCHAR(300),
  time_posted   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review photos
CREATE TABLE review_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url           TEXT NOT NULL
);

-- Friends
CREATE TABLE friends (
  user_1            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_2            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_established  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_1, user_2),
  CHECK (user_1 < user_2)
);