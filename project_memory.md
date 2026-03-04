# Project Knowledge: Music League Search (Dupleighcates)

## Overview

This is a web application designed to browse, search, and parse analytics on previously submitted songs from Music League games.
The application supports multiple leagues/teams (e.g. dux, platties, funkies) and provides deep insights through various pages (Songs, Analytics, Badges, Playlists).

## Tech Stack

- **Frontend**: React (v19), React Router DOM, Vite
- **Data Visualization**: Recharts
- **Backend / Database**: Supabase (PostgreSQL 17)
- **Styling**: Vanilla CSS with a CSS-variable theming system (e.g., `Default` vs `Cyber-Brutalist`).

## Database Architecture

The application uses a robust relational model in PostgreSQL, accessed directly via `@supabase/supabase-js`.

- **`leagues`**: League taxonomy (id, name, created_at).
- **`competitors`**: Player profiles with `name`, `team`, `avatar_url`, `auth_user_id` (linked to Supabase Auth), and `role` (admin/user with check constraint). Protected by a `prevent_role_escalation` trigger.
- **`rounds`**: Round metadata with `created_at` (bulk-creation timestamp, not reliable for ordering), `started_at` (derived from earliest submission — the canonical round date for sorting/analytics), `name`, `description`, `playlist_url`, `league_id`, `imported_at`. The `started_at` column is auto-updated by a trigger (`trg_update_round_started_at`) on new submissions.
- **`submissions`**: Song metadata (`song_name`, `artists`, `album`, `spotify_uri`, `comment`, `visible_to_voters`) with a `search_tsv` generated column for fast text-search and `pg_trgm` indexes for fuzzy matching.
- **`votes`**: Individual vote records with `points_assigned` (0-4), `comment`, and `imported_at`.
- **`aggregate_votes`**: A materialized-style table kept in sync via a Postgres trigger (`update_aggregate_votes`) on the `votes` table to automatically recalculate `total_votes` per submission. Does NOT have RLS enabled.
- **`created_playlists`**: Tracks Spotify playlists created by the app, with `playlist_key`, `league_id`, `spotify_url`, `spotify_playlist_id`, `playlist_name`, `track_hash`, unique on `(playlist_key, league_id)`.
- **`song_search` (View)**: The primary read interface joining submissions, rounds, competitors, and aggregate_votes. Includes `submitter_avatar_url`.
- **`search_song_best(q)` (RPC)**: A custom Postgres function that orchestrates fuzzy search matching to retrieve the exact song from string queries like "song by artist".
- **`song_metadata`**: Enriched song data from Last.fm, keyed by `spotify_uri`. Stores `tags` (text[]), `tag_weights` (jsonb), `tag_source` ("track", "artist", or "none"), `listeners`, `playcount`, `duration_ms`, `lastfm_url`, `mbid`, `lastfm_found`, `enriched_at`. Populated by the `enrich-songs` edge function.

## Edge Functions (Supabase)

- **`enrich-songs`**: Enriches submissions with Last.fm metadata. Tries `track.getInfo` first; if the track has no tags or is not found, falls back to `artist.getTopTags`. Records `tag_source` to indicate where tags came from. Supports batched invocation via `{ force_refresh: bool, batch_limit: number, offset: number }`. Invoked from the admin profile page.
- **`create-playlist`**: Creates Spotify playlists from selected rounds/leagues.
- **`verify-password`**: Validates the site-wide access password.

## Frontend Architecture

- **Entry Points**:
  - `main.jsx` sets up the `<BrowserRouter>`, `<AuthProvider>`, and a custom `<PasswordGate>` for access control.
  - `App.jsx` controls the global theming (`CyberTheme` vs `Default`) and routing.
- **Routing**:
  - `/` -> `SongsPage`
  - `/analytics/:year?` -> `AnalyticsPage`
  - `/badges/:year?` -> `BadgesPage`
  - `/playlists/:year?` -> `PlaylistsPage`
- **Data Fetching Strategy (`useSongs`, `useIndexedDB`)**:
  - The app aggressively caches data using IndexedDB (`useIndexedDB.js`).
  - On mount, `useSongs.js` immediately loads from the local DB for instant render, and quietly fetches fresh data from `submissions` and `aggregate_votes` in the background, updating the UI and cache once complete.
- **Styling (`CyberTheme.css`)**:
  - The default aesthetic relies on CSS variables (e.g., `--spotify-green`). The `CyberTheme` overrides UI elements applying harsh, brutalist monospace typography and neon colors.
  - **Easter Egg**: `useSalmonMode.js` overrides themes dynamically changing the palette to coral/salmon tones when searching the word "salmon".

## Development Workflow

- **Run Locally**: `npm run dev` (currently running on port 5173).
- **Environment config**: Requires a `.env` file containing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Deployment

There are specific deployment guides included:

- `DEPLOYMENT.md` / `PORTAINER_DEPLOYMENT.md`
- Containerized deployment supported via `Dockerfile` and `docker-compose.yml`.
