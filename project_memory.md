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
- **`leagues`** & **`competitors`** & **`rounds`**: Foundational taxonomy.
- **`submissions`**: Contains song metadata (`song_name`, `artists`, `album`, `spotify_uri`) and generates a `search_tsv` column for fast text-search. Also uses `pg_trgm` indexes for fuzzy matching.
- **`votes`**: Contains individual votes points (0-4).
- **`aggregate_votes`**: A materialized-style table kept in sync via a Postgres trigger (`update_aggregate_votes`) on the `votes` table to automatically recalculate `total_votes` per submission.
- **`song_search` (View)**: The primary read interface for the frontend, heavily joining all tables together.
- **`search_song_best(q)` (RPC)**: A custom Postgres function that orchestrates fuzzy search matching to retrieve the exact song from string queries like "song by artist".

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
