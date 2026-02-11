# 🎵 Music League Song Search

A simple web app to browse and search previously submitted songs from Music League games.

## Features

- **Search**: Find songs by name, artist, album, submitter, or round
- **Sort**: Click any column header to sort (ascending/descending)
- **Vote Tracking**: See total votes received for each submission
- **Responsive**: Works on desktop and mobile devices

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Go to your [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to Settings > API
- Copy the "Project URL" and "anon/public" key

### 3. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Database Structure

The app reads from a Supabase (Postgres 17) database. See `schema.sql` for the full DDL.

### Tables
- **`leagues`** — Music League leagues (`id`, `name`, `created_at`)
- **`competitors`** — Players/submitters (`id`, `name`, `team`)
- **`rounds`** — Game rounds (`id`, `name`, `description`, `playlist_url`, `league_id`)
- **`submissions`** — Songs submitted to each round (composite PK `round_id, spotify_uri`; includes `song_name`, `artists`, `album`, `comment`, `visible_to_voters`, generated `search_tsv`)
- **`votes`** — Votes cast on submissions (composite PK `round_id, spotify_uri, voter_id`; `points_assigned` 0–4)
- **`aggregate_votes`** — Pre-computed vote totals per submission, maintained by a trigger on `votes`

### Views
- **`song_search`** — Joins submissions, rounds, competitors, and aggregate_votes into a single query-friendly view used by the frontend

### Custom Domains
- **`ml_id`** — `text` constrained to 32-char hex strings (`^[0-9a-f]{32}$`)
- **`spotify_track_uri`** — `text` constrained to Spotify track URIs (`^spotify:track:[A-Za-z0-9]{22}$`)

### Key Functions
- **`immutable_unaccent(text)`** — Immutable wrapper around `unaccent` for use in indexes and generated columns
- **`search_song_best(song_q, artist_q)`** — Fuzzy song+artist matching using trigram similarity, returns best match
- **`search_song_best(q)`** — Single-string overload that parses "song by artist" or "song - artist" patterns
- **`update_aggregate_votes()`** — Trigger function that keeps `aggregate_votes.total_votes` in sync on INSERT/UPDATE/DELETE of votes

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder, ready to deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## Tech Stack

- **Vite** - Build tool
- **React** - UI framework
- **Supabase** - Database and backend
