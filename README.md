# Caffin

Caffin is a mobile app that lets you log study sessions at places,
review them with study specific details (rating, outlets, opinion, photos),
follow friends, and get personalized study spot recommendations!

## Tech stack

- Backend: FastAPI, async SQLAlchemy, Supabase (Postgres, Auth, Storage), pgvector
- Mobile: React Native via Expo, expo-router, Supabase JS, axios
- Auth: Supabase Auth (ES256 JWT), verified server side via JWKS
- Maps and places: Google Places API
- Recommendations: sentence-transformers embeddings ranked by pgvector cosine distance

## Completed

### Backend
- Auth: Supabase JWT verification, two step user registration, user search
- Locations: Google Places search, create or get by place id, cold start seeding
- Sessions: start, end with duration, list, fetch
- Reviews: create with photos, list per location, outlet availability updates
- Friends and feed: add, remove, list, combined session feed
- Recommendations: location and user embeddings, `/recommendations` ranking gated by 3 reviews, reindex

### Mobile
- Auth flow: login, register, forgot password, profile recovery, auth gated routing
- Five tabs: Home feed, Explore (Near You and For You), Study, Friends, Settings
- Study: place search, live timer, background auto end, post session review
- Review: stars, outlets, opinion, photo upload to Supabase Storage
- Profiles: own, friend, and locked views

## Coming next (scheduled for December)

- App Polishing (UI/UX improvements, bug fixes, performance optimizations)
- Scheduled embedding reindex instead of on request
- Push notifications when a friend starts a session
- Public profiles and a follower model
- Editing a review for a previously skipped session
- Cursor based pagination for the feed

## Local development

Backend:
```
cd backend
venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0
```

Mobile:
```
cd mobile
npx expo start -c
```

Set `mobile/.env` `EXPO_PUBLIC_API_URL` to your machine's Wi-Fi LAN IP so a
physical device can reach the backend.
