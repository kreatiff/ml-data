# MusicLeague Song Prediction MCP Server — Agent Build Prompt

You are building an MCP (Model Context Protocol) server that connects Claude to a MusicLeague companion app's Supabase database. The server gives Claude the tools it needs to analyse voter preferences, understand round themes, and predict which songs are most likely to score well in upcoming rounds.

This is a **read-only analytics server** — it never writes data. All data flows from Supabase → MCP tools → Claude's reasoning → song recommendations to the user.

---

## 1. ARCHITECTURE OVERVIEW

```
User asks: "What should I submit for a round called 'guilty pleasures'?"
    │
    ▼
Claude (reasoning engine)
    │
    ├── calls get_competitors()          → learns who's in the league
    ├── calls get_voter_profiles()       → taste fingerprints per player
    ├── calls get_voter_genre_preferences() → genre/mood/era preferences per player
    ├── calls get_round_history()        → what themes → what winners historically
    ├── calls get_submission_history()   → what the user has already submitted (avoid repeats)
    ├── calls search_song()             → check if a candidate has been played before
    │
    ▼
Claude cross-references all data + its own music knowledge → suggests 3-5 songs with rationale
```

**Tech stack:**

- TypeScript, ESM modules
- `@modelcontextprotocol/sdk` (MCP server SDK, latest version)
- `@supabase/supabase-js` v2 (database client)
- `zod` (input validation)
- Runs via stdio transport (launched by Claude Desktop)

**Environment variables (provided at runtime by Claude Desktop config):**

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key (read-only access is sufficient; all tables have public SELECT RLS policies)

---

## 2. DATABASE SCHEMA

The Supabase database has the following structure. You do NOT need to create these tables — they already exist. You are building tools that **query** them.

### Core Tables

```sql
-- Leagues (top-level container)
leagues (
  id text PRIMARY KEY,
  name text,
  created_at timestamptz
)

-- Players in the league
competitors (
  id text PRIMARY KEY,
  name text NOT NULL,
  team text,
  avatar_url text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'))
)

-- Rounds within a league, each with a theme
rounds (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL,
  started_at timestamptz,          -- derived from earliest submission
  name text NOT NULL,              -- THE ROUND THEME (e.g. "Songs about cities")
  description text,                -- extended theme description
  playlist_url text,
  league_id text REFERENCES leagues(id)
)

-- One submission per player per round (a Spotify track)
submissions (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,       -- e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
  song_name text NOT NULL,
  album text,
  artists text,                    -- plain text, e.g. "Radiohead" or "Daft Punk, Pharrell Williams"
  submitter_id text NOT NULL REFERENCES competitors(id),
  created_at timestamptz NOT NULL,
  comment text,
  visible_to_voters boolean NOT NULL DEFAULT true,
  PRIMARY KEY (round_id, spotify_uri)
)

-- Individual votes: each voter assigns 0–4 points per submission
votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  voter_id text NOT NULL REFERENCES competitors(id),
  created_at timestamptz NOT NULL,
  points_assigned smallint NOT NULL CHECK (0 <= points_assigned AND points_assigned <= 4),
  comment text,
  PRIMARY KEY (round_id, spotify_uri, voter_id)
)

-- Denormalised total votes per submission (maintained by trigger)
aggregate_votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  total_votes integer NOT NULL DEFAULT 0,
  PRIMARY KEY (round_id, spotify_uri)
)

-- Last.fm enrichment data per track
song_metadata (
  spotify_uri text PRIMARY KEY,
  tags text[] DEFAULT '{}',             -- Last.fm tags: genre, mood, era, activity
  tag_weights jsonb DEFAULT '{}',       -- tag name → weight (position-based: 100, 75, 50, 25, 10)
  tags_source text DEFAULT 'track',     -- 'track', 'artist', or 'none'
  listeners bigint,                     -- Last.fm listener count
  playcount bigint,                     -- Last.fm scrobble count
  duration_ms integer,
  lastfm_url text,
  mbid text,                            -- MusicBrainz ID
  lastfm_found boolean DEFAULT true,    -- false = checked but not on Last.fm
  enriched_at timestamptz
)
```

### Pre-existing Views

```sql
-- Joins submissions + rounds + competitors + aggregate_votes
-- Use this for round-level queries with song details
song_search (
  round_id, round_name, spotify_uri, song_name, album, artists,
  submitter_id, submitted_by, submitter_avatar_url,
  votes_achieved, submitted_at, visible_to_voters
)

-- Same as song_search but with Last.fm enrichment columns joined
song_search_enriched (
  ... all song_search columns ...,
  tags, tag_weights, listeners, playcount, duration_ms,
  lastfm_url, mbid, is_enriched
)
```

### Pre-existing RPC Functions

These are Postgres functions you call via `supabase.rpc()`:

| Function                                       | Params                 | Returns                                                                 | Purpose                                                                                                                             |
| ---------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `get_voter_profile(p_voter_id text)`           | voter ID               | jsonb                                                                   | Full preference profile for one voter: overall stats, artist affinities, submitter affinities, top 4-point songs, best round themes |
| `get_all_voter_profiles()`                     | none                   | table(voter_id, voter_name, profile jsonb)                              | All voter profiles in one call                                                                                                      |
| `get_round_history(p_limit int)`               | limit (default 30)     | table                                                                   | Completed rounds with winning song, winner, vote tallies, submission count                                                          |
| `get_submission_history(p_competitor_id text)` | competitor ID          | table                                                                   | All songs a competitor submitted + votes received                                                                                   |
| `get_voter_genre_preferences(p_voter_id text)` | voter ID               | table(tag, times_voted, avg_points, total_points)                       | Which Last.fm tags a voter rewards                                                                                                  |
| `get_all_voter_genre_preferences()`            | none                   | table(voter_id, voter_name, tag, times_voted, avg_points, total_points) | Genre preferences for ALL voters                                                                                                    |
| `get_enrichment_status()`                      | none                   | table                                                                   | How many songs are enriched vs pending                                                                                              |
| `search_song_best(q text)`                     | natural language query | table                                                                   | Fuzzy song search. Supports "Song by Artist" and "Song - Artist" format                                                             |

---

## 3. MCP TOOLS TO IMPLEMENT

Build exactly these tools. **Tool descriptions are critical** — they are the instructions Claude reads to know when and how to use each tool. Write them carefully and specifically for the MusicLeague prediction use case.

### Tool 1: `get_competitors`

- **Purpose:** Establish who's in the league. Must be called first to get player IDs.
- **Params:** None
- **Implementation:** `supabase.from("competitors").select("id, name, team, avatar_url").order("name")`
- **Description guidance:** Mention that this must be called first to learn player IDs needed by other tools.

### Tool 2: `get_rounds`

- **Purpose:** See all round themes (current + historical). The round name IS the theme.
- **Params:** `limit` (optional, default 50)
- **Implementation:** `supabase.from("rounds").select("id, name, description, started_at, created_at, playlist_url").order("created_at", { ascending: false }).limit(limit)`
- **Description guidance:** Emphasise that the round `name` field is the theme (e.g. "Songs about cities"), and `description` has the extended prompt. Mention using this to identify the current round you're trying to win.

### Tool 3: `get_voter_profiles`

- **Purpose:** The core analytical tool. Builds taste fingerprints per player.
- **Params:** `voter_id` (optional — omit to get all profiles at once)
- **Implementation:** Calls `supabase.rpc("get_voter_profile", { p_voter_id })` or `supabase.rpc("get_all_voter_profiles")`
- **Description guidance:** List what each profile contains: overall stats (avg points, rounds participated, points distribution), artist affinity, submitter affinity, top songs rewarded (4-point picks = strongest taste signal), best round themes. Recommend calling without voter_id for prediction tasks.
- **IMPORTANT:** Each voter profile is a jsonb blob. The `get_all_voter_profiles` variant returns one row per voter with columns `(voter_id, voter_name, profile)`.

### Tool 4: `get_voter_genre_preferences`

- **Purpose:** Which Last.fm tags/genres each voter rewards with high points.
- **Params:** `voter_id` (optional — omit for all voters)
- **Implementation:** Calls `supabase.rpc("get_voter_genre_preferences", { p_voter_id })` or `supabase.rpc("get_all_voter_genre_preferences")`
- **Description guidance:** Explain that tags include genre (indie rock), era (90s), mood (melancholy), and activity (driving). Mention that this requires song enrichment to have run. Recommend using alongside voter profiles for genre-aware recommendations.

### Tool 5: `get_round_history`

- **Purpose:** Historical results — correlate round themes with winning song types.
- **Params:** `limit` (optional, default 30)
- **Implementation:** `supabase.rpc("get_round_history", { p_limit: limit })`
- **Description guidance:** Explain this helps identify patterns: do anthemic songs win feel-good rounds? Do deep cuts win niche themes? Returns winning song, winner name, vote count, total submissions, and avg votes per song.

### Tool 6: `get_submission_history`

- **Purpose:** What a specific player has submitted before and how they scored.
- **Params:** `competitor_id` (required)
- **Implementation:** `supabase.rpc("get_submission_history", { p_competitor_id })`
- **Description guidance:** Three uses: (1) avoid suggesting songs they already played, (2) understand their personal taste/strategy, (3) see which past picks scored well.

### Tool 7: `get_round_submissions`

- **Purpose:** See everything submitted in a specific round (current or past).
- **Params:** `round_id` (required)
- **Implementation:** Query `song_search_enriched` view filtered by round_id, ordered by votes_achieved DESC. Select all useful columns including tags, listeners, etc.
- **Description guidance:** Use to see what's already been played in the current round (avoid duplicates) and understand the competitive landscape. Returns enriched data including Last.fm tags.

### Tool 8: `search_song`

- **Purpose:** Check if a candidate song has been submitted before.
- **Params:** `query` (string, natural language)
- **Implementation:** `supabase.rpc("search_song_best", { q: query })`
- **Description guidance:** Explain it supports "Song Name by Artist" and "Song - Artist" format. Uses fuzzy matching (trigram similarity). Use this to verify a recommendation hasn't already been played.

### Tool 9: `get_enrichment_status`

- **Purpose:** Diagnostic tool — check how many songs have Last.fm metadata.
- **Params:** None
- **Implementation:** `supabase.rpc("get_enrichment_status")`
- **Description guidance:** Returns total songs, enriched count, found on Last.fm, not on Last.fm, and percentage. Use if genre preferences seem sparse.

---

## 4. CODE STRUCTURE

```
ml-predictor-mcp/
├── src/
│   └── index.ts        ← Single file. All tools + server setup.
├── package.json
├── tsconfig.json
└── .env.example
```

### `package.json`

```json
{
  "name": "music-league-predictor-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `src/index.ts` structure

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// 1. Validate env vars and create Supabase client
// 2. Create helper functions: ok(data) and err(message) for consistent MCP responses
// 3. Create McpServer instance
// 4. Register all 9 tools using server.tool(name, description, schema, handler)
// 5. Start server with StdioServerTransport
```

**Response format convention:**

- Success: `{ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }`
- Error: `{ content: [{ type: "text", text: "Error: {message}" }], isError: true }`

---

## 5. CLAUDE DESKTOP CONFIGURATION

After building, the user will add this to their Claude Desktop config:

```json
{
  "mcpServers": {
    "music-league-predictor": {
      "command": "node",
      "args": ["/absolute/path/to/ml-predictor-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

---

## 6. PREDICTION WORKFLOW (How Claude Uses the Tools)

When a user asks "What should I submit for round X?", Claude should follow this workflow:

### Step 1: Gather context

1. `get_competitors()` — learn who's in the league (10-20 people typically)
2. `get_rounds()` — find the current round's theme and description
3. `get_submission_history(user's competitor_id)` — what have they already played?

### Step 2: Analyse voter preferences

4. `get_voter_profiles()` — full taste fingerprints for all voters
5. `get_voter_genre_preferences()` — genre/tag preferences for all voters

### Step 3: Analyse historical patterns

6. `get_round_history()` — look for similar past themes and what won

### Step 4: Reason and recommend

Claude uses its music knowledge + the voter data to:

- Identify genres/moods/eras that the most voters reward highly
- Map those to the current round theme
- Suggest 3-5 specific songs with Spotify URIs
- Explain WHY each song should score well (which voters it targets)
- Flag any risks (e.g. "Player X hates this genre")

### Step 5: Validate

7. `search_song(candidate)` — check each suggestion hasn't been played before
8. If it has, suggest an alternative

---

## 7. KEY DESIGN DECISIONS

- **Read-only:** The MCP server never writes to the database. Supabase anon key with public SELECT policies is sufficient.
- **All reasoning in Claude:** The MCP tools are pure data retrieval. Claude does ALL the taste analysis, theme interpretation, and song recommendation logic. Do not try to build prediction logic in SQL or TypeScript.
- **Tool descriptions matter most:** The tool descriptions are what Claude reads to decide how and when to use each tool. They should be specific, actionable, and tied to the MusicLeague prediction use case. Don't write generic descriptions.
- **JSON.stringify with null, 2:** All data returned to Claude should be pretty-printed JSON so Claude can read it easily.
- **No authentication flow:** The server connects directly to Supabase with an anon key. No user login, no session management.
- **Votes are 0–4 points:** Not binary up/down. A 4-point vote is a much stronger signal than a 1-point vote. The voter profile functions already account for this in their averages.
- **`song_search_enriched` over `song_search`:** For `get_round_submissions`, use the enriched view so Claude can see Last.fm tags alongside vote data.
- **The `artists` field is plain text**, not a foreign key. It might contain multiple artists separated by commas. This is fine — Claude can parse it.

---

## 8. TESTING

After building, verify:

1. `npm run build` succeeds with no errors
2. The server starts without crashing: `SUPABASE_URL=x SUPABASE_ANON_KEY=y node dist/index.js` (it will hang waiting for stdio input — that's correct)
3. Each tool can be called and returns data (test with MCP Inspector or Claude Desktop)
4. `get_all_voter_profiles()` returns profiles with non-empty `artist_affinity` and `top_songs_rewarded` arrays
5. `get_voter_genre_preferences()` returns tags with avg_points (requires enrichment to have run)
6. `search_song("Creep by Radiohead")` returns a result or empty array (depending on league history)

---

## 9. EDGE CASES TO HANDLE

- **Empty data:** Some functions may return null/empty arrays for new leagues. Return the empty result — don't throw.
- **Large leagues:** `get_all_voter_profiles()` calls `get_voter_profile()` per-player. For 20 players this is fine. For 50+ it could be slow. Not a concern for now.
- **Missing enrichment:** If `song_metadata` is empty, `get_voter_genre_preferences` returns empty. The `get_enrichment_status` tool helps diagnose this.
- **Supabase errors:** Always check the `error` field on Supabase responses and return it via the `err()` helper so Claude can report the issue.
