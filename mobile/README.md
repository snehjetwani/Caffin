# Caffin — Mobile App (Expo / React Native)

The Caffin frontend. Expo SDK 58, expo-router, TypeScript. Part of the Caffin
monorepo (`../backend` is the FastAPI API).

## Setup

1. **Install deps** (already done if `node_modules/` exists):
   ```bash
   npm install
   ```

2. **Configure `.env`** (see `.env`). The Supabase URL + anon key are filled in.
   You MUST set `EXPO_PUBLIC_API_URL` to your machine's **Wi-Fi LAN IP** (not
   `localhost`), e.g. `http://192.168.1.42:8000`, so a physical device can reach
   the backend. Find it with `ipconfig` (the active Wi-Fi adapter's IPv4).

3. **Run the backend** (in `../backend`): `uvicorn app.main:app --reload --host 0.0.0.0`
   (bind `0.0.0.0` so the device can connect).

4. **Start Expo**:
   ```bash
   npx expo start -c
   ```
   Scan the QR with Expo Go, or press `a` / `i` for an emulator.

## Supabase Storage (review photos)

Review photo upload targets a public bucket named `review-photos`. Create it once
in the Supabase SQL editor:

```sql
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- Authenticated users may upload into a folder named after their own user id.
create policy "upload own review photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (the bucket is public; this makes it explicit).
create policy "public read review photos"
  on storage.objects for select to public
  using (bucket_id = 'review-photos');
```

Until the bucket exists, submitting a review still works — the photos are just
skipped with a non-blocking notice.

## Structure

```
src/
  app/                 # expo-router routes (file = screen)
    _layout.tsx        # root: providers + auth-gated Stack.Protected
    (auth)/            # login, register, forgot-password, complete-profile
    (tabs)/            # Home, Explore, Study, Friends, Settings
    session/           # active (timer) + review
    profile/[username] # friend/own/locked profile
  components/ui.tsx    # Button, TextField, Avatar, Stars, Card, ...
  lib/                 # supabase, api (axios+JWT), auth context, types, helpers
  theme.ts             # design tokens
```

## Commands

```bash
npx tsc --noEmit     # typecheck
npx expo-doctor      # dependency/config health
npx expo start -c    # run (clear cache)
```
