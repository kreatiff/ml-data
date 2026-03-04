import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// ============================================================
// Supabase client setup
// ============================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required."
  );
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// Response helpers
// ============================================================

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string): { content: [{ type: "text"; text: string }]; isError: true } {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// ============================================================
// MCP Server
// ============================================================

const server = new McpServer({
  name: "music-league-predictor",
  version: "1.0.0",
});

// ============================================================
// Tool 1: get_competitors
// ============================================================

server.tool(
  "get_competitors",
  `Returns all players currently registered in Music League. 
Call this first in any prediction or analysis workflow — you need competitor IDs to pass to other tools 
like get_voter_profiles, get_submission_history, and get_voter_genre_preferences. 
Each record contains: id (use this in other tools), name, team, avatar_url.`,
  {},
  async () => {
    const { data, error } = await supabase
      .from("competitors")
      .select("id, name, team, avatar_url")
      .order("name");

    if (error) return err(error.message);
    return ok(data);
  }
);

// ============================================================
// Tool 2: get_rounds
// ============================================================

server.tool(
  "get_rounds",
  `Returns all Music League rounds ordered by most recent first.
The round 'name' field IS the theme (e.g. "Songs about cities", "Guilty pleasures", "One-hit wonders").
The 'description' field has the full extended theme prompt that was given to players.
'started_at' is the canonical round date (derived from the earliest submission).
Use this to:
- Identify the current round and its theme before making song predictions
- Find similar past rounds to understand what types of songs win for a given theme
- Get round IDs needed by get_round_submissions`,
  {
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe("Maximum number of rounds to return (default 50)"),
  },
  async ({ limit }) => {
    const { data, error } = await supabase
      .from("rounds")
      .select(
        "id, name, description, started_at, created_at, playlist_url, league_id"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return err(error.message);
    return ok(data);
  }
);

// ============================================================
// Tool 3: get_voter_profiles
// ============================================================

server.tool(
  "get_voter_profiles",
  `Returns detailed taste fingerprints for one or all voters — the core analytical tool for song prediction.
Each profile is built from historical vote data and contains:
- overall_stats: total rounds participated, average points given, points distribution (0-4), consistency score
- artist_affinity: artists they've given the most points to (strong genre/style signal)
- submitter_affinity: which players' submissions they tend to reward (collaboration signal)
- top_rewarded_songs: songs they gave 4 points (maximum) — the strongest signal of their taste
- top_submitted_songs: their own best-performing submissions
- round_performance: which round themes correlated with them giving/receiving high votes

Omit voter_id to get all voter profiles in one call (recommended for prediction tasks).
Provide a voter_id to get a single profile (from get_competitors).

Use this to understand WHO you're trying to impress, then cross-reference with get_voter_genre_preferences 
for the Last.fm genre/mood/era dimension of their taste.`,
  {
    voter_id: z
      .string()
      .optional()
      .describe(
        "Competitor ID of the voter to profile. Omit to get all voters."
      ),
  },
  async ({ voter_id }) => {
    // If a specific voter is requested, build their profile
    if (voter_id) {
      return await buildVoterProfile(voter_id);
    }

    // Otherwise build profiles for all voters
    const { data: competitors, error: compErr } = await supabase
      .from("competitors")
      .select("id, name")
      .order("name");

    if (compErr) return err(compErr.message);
    if (!competitors?.length) return ok([]);

    const profiles = await Promise.all(
      competitors.map(async (c) => {
        const result = await buildVoterProfile(c.id);
        return {
          voter_id: c.id,
          voter_name: c.name,
          profile:
            "isError" in result
              ? null
              : JSON.parse((result.content[0] as { text: string }).text),
        };
      })
    );

    return ok(profiles);
  }
);

async function buildVoterProfile(voterId: string) {
  // Get competitor info
  const { data: competitor, error: compErr } = await supabase
    .from("competitors")
    .select("id, name, team")
    .eq("id", voterId)
    .single();

  if (compErr) return err(`Competitor not found: ${compErr.message}`);

  // Get all votes cast BY this voter
  const { data: votesGiven, error: vgErr } = await supabase
    .from("votes")
    .select(
      "round_id, spotify_uri, points_assigned, comment, submissions!inner(song_name, artists, submitter_id)"
    )
    .eq("voter_id", voterId)
    .gt("points_assigned", 0);

  if (vgErr) return err(`Failed to fetch votes given: ${vgErr.message}`);

  // Get all submissions BY this voter and their vote totals
  const { data: submissionsData, error: subErr } = await supabase
    .from("song_search")
    .select(
      "round_id, round_name, spotify_uri, song_name, artists, votes_achieved, submitted_at"
    )
    .eq("submitter_id", voterId)
    .order("votes_achieved", { ascending: false });

  if (subErr) return err(`Failed to fetch submissions: ${subErr.message}`);

  // Get all votes RECEIVED on this voter's submissions
  const { data: votesReceived, error: vrErr } = await supabase
    .from("votes")
    .select("round_id, spotify_uri, points_assigned, voter_id")
    .in(
      "spotify_uri",
      (submissionsData ?? []).map((s) => s.spotify_uri)
    );

  if (vrErr) return err(`Failed to fetch votes received: ${vrErr.message}`);

  const votes = votesGiven ?? [];
  const submissions = submissionsData ?? [];

  // Overall stats
  const totalVotesGiven = votes.length;
  const avgPointsGiven =
    totalVotesGiven > 0
      ? votes.reduce((s, v) => s + v.points_assigned, 0) / totalVotesGiven
      : 0;

  const pointsDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const v of votes) {
    if (v.points_assigned in pointsDist)
      pointsDist[v.points_assigned as keyof typeof pointsDist]++;
  }

  // Artist affinity — aggregate points by artist
  type SubJoin = { song_name: string; artists: string; submitter_id: string };
  const artistPoints: Record<string, { total: number; count: number }> = {};
  for (const v of votes) {
    const sub = (v.submissions as unknown) as SubJoin | null;
    const artists = sub?.artists ?? "Unknown";
    if (!artistPoints[artists]) artistPoints[artists] = { total: 0, count: 0 };
    artistPoints[artists].total += v.points_assigned;
    artistPoints[artists].count++;
  }
  const artistAffinity = Object.entries(artistPoints)
    .map(([artist, { total, count }]) => ({
      artist,
      total_points: total,
      vote_count: count,
      avg_points: Number((total / count).toFixed(2)),
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 20);

  // Submitter affinity — which players does this voter reward most?
  const submitterPoints: Record<string, { total: number; count: number }> = {};
  for (const v of votes) {
    const sub = (v.submissions as unknown) as SubJoin | null;
    const sid = sub?.submitter_id ?? "unknown";
    if (!submitterPoints[sid]) submitterPoints[sid] = { total: 0, count: 0 };
    submitterPoints[sid].total += v.points_assigned;
    submitterPoints[sid].count++;
  }
  const submitterAffinity = Object.entries(submitterPoints)
    .map(([sid, { total, count }]) => ({
      submitter_id: sid,
      total_points: total,
      vote_count: count,
      avg_points: Number((total / count).toFixed(2)),
    }))
    .sort((a, b) => b.avg_points - a.avg_points)
    .slice(0, 10);

  // Top rewarded songs (4-point picks)
  const topRewarded = votes
    .filter((v) => v.points_assigned === 4)
    .map((v) => {
      const sub = (v.submissions as unknown) as SubJoin | null;
      return {
        song_name: sub?.song_name ?? "Unknown",
        artists: sub?.artists ?? "Unknown",
        spotify_uri: v.spotify_uri,
        round_id: v.round_id,
      };
    });

  // Own submission performance
  const totalVotesReceived = (votesReceived ?? []).reduce(
    (s, v) => s + v.points_assigned,
    0
  );
  const avgVotesPerSubmission =
    submissions.length > 0
      ? Number((totalVotesReceived / submissions.length).toFixed(2))
      : 0;

  return ok({
    competitor,
    overall_stats: {
      rounds_with_votes_given: new Set(votes.map((v) => v.round_id)).size,
      total_votes_given: totalVotesGiven,
      avg_points_given: Number(avgPointsGiven.toFixed(2)),
      points_distribution: pointsDist,
      total_submissions: submissions.length,
      total_votes_received: totalVotesReceived,
      avg_votes_per_submission: avgVotesPerSubmission,
    },
    artist_affinity: artistAffinity,
    submitter_affinity: submitterAffinity,
    top_rewarded_songs: topRewarded,
    top_own_submissions: submissions.slice(0, 10),
  });
}

// ============================================================
// Tool 4: get_voter_genre_preferences
// ============================================================

server.tool(
  "get_voter_genre_preferences",
  `Returns which Last.fm tags (genre, mood, era, activity) each voter tends to reward with high points.
Requires Last.fm enrichment data to be present in song_metadata (check with get_enrichment_status).

Tags include things like: 'indie rock', '90s', 'melancholy', 'road trip', 'female vocalists', 
'electronic', 'classic rock', 'sad', 'upbeat', 'australian'.

Returned columns per tag: tag, times_voted, avg_points, total_points.
Higher avg_points (closer to 4.0) = stronger positive signal for that tag.

Omit voter_id to get preferences for ALL voters in one call.
Combine with get_voter_profiles for a complete taste picture before making song predictions.`,
  {
    voter_id: z
      .string()
      .optional()
      .describe(
        "Competitor ID to get genre preferences for. Omit to get all voters."
      ),
  },
  async ({ voter_id }) => {
    if (voter_id) {
      const { data, error } = await supabase.rpc(
        "get_voter_genre_preferences",
        { p_voter_id: voter_id }
      );
      if (error) return err(error.message);
      return ok(data);
    } else {
      const { data, error } = await supabase.rpc(
        "get_all_voter_genre_preferences"
      );
      if (error) return err(error.message);
      return ok(data);
    }
  }
);

// ============================================================
// Tool 5: get_round_history
// ============================================================

server.tool(
  "get_round_history",
  `Returns historical round results including the winning song and vote statistics per round.
Use this to identify patterns: what types of songs win for feel-good themes? Do deep cuts win niche 
themes? Do crowd-pleasers dominate vs obscure picks?

Each record contains: round name (theme), round description, started_at, total submissions, 
total votes cast, winning song name and artist, winner's total votes, all submissions with their vote totals.

Ordered by most recent round first. Use limit to control how many rounds to retrieve.`,
  {
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(30)
      .describe("Number of past rounds to return (default 30)"),
  },
  async ({ limit }) => {
    // Get rounds with basic info
    const { data: rounds, error: roundsErr } = await supabase
      .from("rounds")
      .select("id, name, description, started_at, league_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (roundsErr) return err(roundsErr.message);
    if (!rounds?.length) return ok([]);

    // For each round, get submission results with vote totals
    const roundResults = await Promise.all(
      rounds.map(async (round) => {
        const { data: submissions } = await supabase
          .from("song_search")
          .select(
            "song_name, artists, submitted_by, votes_achieved, spotify_uri"
          )
          .eq("round_id", round.id)
          .order("votes_achieved", { ascending: false });

        const subs = submissions ?? [];
        const winner = subs[0] ?? null;
        const totalVotes = subs.reduce((s, sub) => s + (sub.votes_achieved ?? 0), 0);
        const avgVotes = subs.length > 0 ? Number((totalVotes / subs.length).toFixed(2)) : 0;

        return {
          round_id: round.id,
          round_name: round.name,
          description: round.description,
          started_at: round.started_at,
          league_id: round.league_id,
          total_submissions: subs.length,
          total_votes_cast: totalVotes,
          avg_votes_per_song: avgVotes,
          winner: winner
            ? {
                song_name: winner.song_name,
                artists: winner.artists,
                submitted_by: winner.submitted_by,
                votes: winner.votes_achieved,
                spotify_uri: winner.spotify_uri,
              }
            : null,
          all_submissions: subs,
        };
      })
    );

    return ok(roundResults);
  }
);

// ============================================================
// Tool 6: get_submission_history
// ============================================================

server.tool(
  "get_submission_history",
  `Returns every song a specific competitor has ever submitted, along with how many votes they received.
Requires a competitor_id from get_competitors.

Three key uses:
1. AVOID REPEATS — before recommending a song, check it hasn't already been submitted by this player
2. TASTE PROFILE — understand their personal submission style (do they go obscure or mainstream?)
3. PERFORMANCE ANALYSIS — which of their past picks scored highest and why?

Returns: song_name, artists, round_name (the theme they submitted it for), votes_achieved, 
submitted_at, comment (their submission note), spotify_uri.
Ordered by votes received descending (best performing first).`,
  {
    competitor_id: z
      .string()
      .describe("The competitor ID whose submission history to retrieve"),
  },
  async ({ competitor_id }) => {
    const { data, error } = await supabase
      .from("song_search")
      .select(
        "song_name, artists, album, round_id, round_name, votes_achieved, submitted_at, spotify_uri, visible_to_voters"
      )
      .eq("submitter_id", competitor_id)
      .order("votes_achieved", { ascending: false });

    if (error) return err(error.message);

    // Also get their comments from submissions directly
    const { data: comments } = await supabase
      .from("submissions")
      .select("spotify_uri, round_id, comment")
      .eq("submitter_id", competitor_id);

    const commentMap = new Map(
      (comments ?? []).map((c) => [`${c.round_id}:${c.spotify_uri}`, c.comment])
    );

    const enriched = (data ?? []).map((sub) => ({
      ...sub,
      submission_comment: commentMap.get(`${sub.round_id}:${sub.spotify_uri}`) ?? null,
    }));

    return ok(enriched);
  }
);

// ============================================================
// Tool 7: get_round_submissions
// ============================================================

server.tool(
  "get_round_submissions",
  `Returns all songs submitted in a specific round, enriched with Last.fm metadata (tags, listeners, playcount).
Requires a round_id from get_rounds.

Use this to:
- See everything already submitted in the current round (check for duplicate Spotify URIs before suggesting)
- Understand the competitive landscape: what genres/moods are already covered?
- Analyse past rounds: what tags did the winning songs have?

Results include: song_name, artists, submitted_by, votes_achieved (0 if round not yet complete), 
spotify_uri, Last.fm tags (genre/mood/era), listeners, playcount.
Ordered by votes received descending.`,
  {
    round_id: z.string().describe("The round ID to fetch submissions for"),
  },
  async ({ round_id }) => {
    const { data, error } = await supabase
      .from("song_search_enriched")
      .select("*")
      .eq("round_id", round_id)
      .order("votes_achieved", { ascending: false });

    if (error) return err(error.message);
    return ok(data);
  }
);

// ============================================================
// Tool 8: search_song
// ============================================================

server.tool(
  "search_song",
  `Fuzzy searches the Music League submission database for a song by name and/or artist.
Uses trigram similarity matching — handles typos, partial names, and alternate spellings.

Supported query formats:
- "Song Name by Artist Name" (e.g. "Creep by Radiohead")
- "Song Name - Artist Name" (e.g. "Creep - Radiohead")

Returns: song_name, artists, submitted_by (who played it), round_name (the theme it was submitted for), 
votes_achieved (how many points it received), spotify_uri, round_id, match_score (0–27 similarity score).

CRITICAL USE: Always run this for each song you plan to recommend to verify it hasn't already been 
played in the league. An empty result means the song is safe to suggest.`,
  {
    query: z
      .string()
      .min(5)
      .describe(
        `Natural language song search. Use "Song Name by Artist" or "Song - Artist" format. 
        Minimum 5 characters. Example: "Mr Brightside by The Killers"`
      ),
  },
  async ({ query }) => {
    const { data, error } = await supabase.rpc("search_song_best", {
      q: query,
    });
    if (error) return err(error.message);
    return ok(data ?? []);
  }
);

// ============================================================
// Tool 9: get_enrichment_status
// ============================================================

server.tool(
  "get_enrichment_status",
  `Diagnostic tool — shows how many songs in the database have Last.fm metadata (tags, listeners, playcount).

Returns: total_unique_songs, enriched count, found_on_lastfm, not_on_lastfm, pending (not yet enriched), enrichment_pct.

Use this if get_voter_genre_preferences returns sparse or empty data — it indicates enrichment 
hasn't been run yet. Genre-based recommendations require enrichment to be complete.
Full enrichment is triggered from the admin panel of the Music League companion app.`,
  {},
  async () => {
    const { data, error } = await supabase.rpc("get_enrichment_status");
    if (error) return err(error.message);
    return ok(data);
  }
);

// ============================================================
// Start server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Music League Predictor MCP server running on stdio");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
