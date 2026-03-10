# Music League Predictor — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives **Claude** direct access to your Music League Supabase database, enabling it to predict which songs are most likely to score well in upcoming rounds.

## What it does

Claude uses this server to:

1. Analyse every voter's taste fingerprint (favourite genres, artists, eras, moods)
2. Study historical round results to understand which song types win which themes
3. Check a player's submission history so it never suggests a song they've already played
4. Recommend 3–5 songs with specific rationale for WHY each song should score well

## Tools available to Claude

| Tool                          | Purpose                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `get_competitors`             | List all players + their IDs (always call first)                                         |
| `get_rounds`                  | Get all round themes — the `name` field IS the theme                                     |
| `get_voter_profiles`          | Full taste fingerprints per player: artist affinity, top 4-point picks, submission stats |
| `get_voter_genre_preferences` | Last.fm tag preferences (genre, mood, era) per voter                                     |
| `get_round_history`           | Historical results: winning songs, vote tallies, themes                                  |
| `get_submission_history`      | Everything a player has ever submitted (to avoid repeats)                                |
| `get_round_submissions`       | All entries in a specific round, enriched with Last.fm metadata                          |
| `search_song`                 | Fuzzy-search the database — always run before recommending a song                        |
| `get_enrichment_status`       | Diagnostic: check how many songs have Last.fm tags                                       |

## Setup

### 1. Build

```bash
npm install
npm run build
```

### 2. Configure Claude Desktop

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "music-league-predictor": {
      "command": "node",
      "args": ["H:/dev/ml-data/mcp_agent/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://lvgcgqzhwbpjwmhgdcpa.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2Z2NncXpod2JwandtaGdkY3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzM0MjgsImV4cCI6MjA4NTU0OTQyOH0.YmQwW9SKM57gu6xwSypxI0rxonuYLbByDONxW62B7VQ"
      }
    }
  }
}
```

> **Note:** The anon key has public read-only access. This server never writes to the database.

### 3. Restart Claude Desktop

After updating the config, fully quit and reopen Claude Desktop. You should see
`music-league-predictor` listed under the MCP tools icon (🔌) in the chat interface.

## Usage examples

Ask Claude things like:

- _"What should I submit for a round called 'Guilty Pleasures'? My competitor ID is `abc123`."_
- _"Who are the hardest voters to please in my league, and what do they like?"_
- _"What genres tend to win in feel-good rounds based on historical data?"_
- _"Has 'Mr Brightside by The Killers' been played before?"_

## How Claude uses the tools (prediction workflow)

```
1. get_competitors()           → learn who's in the league
2. get_rounds()                → find the target round's theme
3. get_submission_history()    → check what the user has already played
4. get_voter_profiles()        → taste fingerprints for all voters
5. get_voter_genre_preferences() → genre/mood preferences per voter
6. get_round_history()         → what won in similar past rounds
   ── Claude reasons and proposes 3-5 songs ──
7. search_song() × N           → verify none have been played before
```

## Development

```bash
npm run dev    # watch mode (tsc --watch)
npm run build  # production build
npm start      # run built server (requires env vars)
```

## Requirements

- Node.js 18+
- Access to the Music League Supabase project
