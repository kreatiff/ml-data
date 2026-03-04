// ============================================================
// Supabase Edge Function: enrich-songs (Last.fm)
//
// Looks up every unique track in submissions via the Last.fm
// API and upserts enriched metadata (tags, listeners, etc.)
// into the song_metadata table.
//
// Last.fm gives us rich user-generated tags covering genre
// ("indie rock"), era ("90s"), mood ("melancholy"), and
// activity ("driving") — much richer than Spotify genres for
// MusicLeague round theme matching.
//
// Required Supabase secret (set via dashboard or CLI):
//   LASTFM_API_KEY
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by the Supabase runtime.
//
// POST body (all optional):
//   force_refresh: boolean  — re-enrich already-enriched songs
//   batch_limit:   number   — max songs per invocation (default 150)
//   offset:        number   — skip this many songs (for force_refresh pagination)
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Config
// ============================================================

const LASTFM_API_BASE     = "https://ws.audioscrobbler.com/2.0/";
const CONCURRENT_REQUESTS = 3;    // parallel requests per batch
const BATCH_DELAY_MS      = 1100; // delay between batches → ~2.7 req/s, well under 200/min limit
const DEFAULT_BATCH_LIMIT = 150;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// Types
// ============================================================

interface Submission {
  spotify_uri: string;
  song_name: string;
  artists: string;
}

interface LastFmTag {
  name: string;
  count: number | string;
  url: string;
}

interface LastFmTrack {
  name: string;
  mbid?: string;
  url: string;
  duration: string;    // milliseconds as string; "0" if unknown
  listeners: string;
  playcount: string;
  toptags?: { tag: LastFmTag | LastFmTag[] };
}

interface SongMetadataRecord {
  spotify_uri:   string;
  tags:          string[];
  tag_weights:   Record<string, number>;
  tag_source:    string;       // "track" | "artist" | "none"
  listeners:     number | null;
  playcount:     number | null;
  duration_ms:   number | null;
  lastfm_url:    string | null;
  mbid:          string | null;
  lastfm_found:  boolean;
  enriched_at:   string;
}

type EnrichResult =
  | { status: "enriched"; record: SongMetadataRecord }
  | { status: "not_found"; record: SongMetadataRecord }  // placeholder written to DB so we skip next time
  | { status: "error"; message: string };

// ============================================================
// Helpers
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Extract the primary artist from a potentially multi-artist string.
// Handles: "Artist1, Artist2", "Artist1 & Artist2", "Artist1 feat. Artist2", etc.
function extractPrimaryArtist(artists: string): string {
  return artists
    .split(/\s*[,;&/]\s*|\s+(?:ft\.?|feat\.?|featuring|with|×|x)\s+/i)[0]
    .trim();
}

// Normalise a Last.fm tag to lowercase, trimmed.
function normaliseTag(name: string): string {
  return name.toLowerCase().trim();
}

// Last.fm sometimes returns a single object instead of an array for toptags.
function normaliseTags(toptags: LastFmTrack["toptags"]): LastFmTag[] {
  if (!toptags) return [];
  const raw = toptags.tag;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

// ============================================================
// Last.fm API
// ============================================================

async function lastfmFetch(
  params: Record<string, string>,
  apiKey: string,
  attempt = 0
): Promise<Response> {
  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString());

  // Retry on 429 (rate limited) or transient 5xx
  if ((response.status === 429 || response.status >= 500) && attempt < 3) {
    const backoff = (attempt + 1) * 2000;
    console.log(`Last.fm ${response.status} — retrying in ${backoff}ms (attempt ${attempt + 1})`);
    await delay(backoff);
    return lastfmFetch(params, apiKey, attempt + 1);
  }

  return response;
}

async function getTrackInfo(
  artist: string,
  track: string,
  apiKey: string
): Promise<LastFmTrack | null> {
  const response = await lastfmFetch(
    {
      method: "track.getInfo",
      artist,
      track,
      autocorrect: "1", // allow Last.fm to correct minor typos
    },
    apiKey
  );

  if (!response.ok) {
    throw new Error(`Last.fm HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    // Error 6 = track not found — not a failure, just no data
    if (data.error === 6) return null;
    throw new Error(`Last.fm error ${data.error}: ${data.message}`);
  }

  return data.track as LastFmTrack;
}

// Fetch top tags for an artist (fallback when track lookup fails or has no tags)
async function getArtistTopTags(
  artist: string,
  apiKey: string
): Promise<LastFmTag[]> {
  const response = await lastfmFetch(
    {
      method: "artist.getTopTags",
      artist,
      autocorrect: "1",
    },
    apiKey
  );

  if (!response.ok) return [];

  const data = await response.json();
  if (data.error) return [];

  const toptags = data.toptags?.tag;
  if (!toptags) return [];
  const tagArray = Array.isArray(toptags) ? toptags : [toptags];
  // Last.fm returns many artist tags — take the top 5 most relevant
  return tagArray.slice(0, 5);
}

// ============================================================
// Build a metadata record from a Last.fm response
// ============================================================

function buildRecord(
  submission: Submission,
  trackInfo: LastFmTrack
): SongMetadataRecord {
  const rawTags = normaliseTags(trackInfo.toptags);
  const tags    = rawTags.map((t) => normaliseTag(t.name));

  // track.getInfo always returns count=0 for toptags — proper weights
  // require a separate track.getTopTags call. Instead, assign position-based
  // weights since Last.fm returns tags in descending relevance order.
  const POSITION_WEIGHTS = [100, 75, 50, 25, 10];
  const tagWeights = Object.fromEntries(
    rawTags.map((t, i) => [normaliseTag(t.name), POSITION_WEIGHTS[i] ?? 5])
  );

  const listeners   = parseInt(trackInfo.listeners, 10) || null;
  const playcount   = parseInt(trackInfo.playcount, 10) || null;
  const durationRaw = parseInt(trackInfo.duration, 10);
  // Last.fm returns duration in milliseconds; "0" means unknown
  const duration_ms = durationRaw > 0 ? durationRaw : null;

  return {
    spotify_uri:  submission.spotify_uri,
    tags,
    tag_weights:  tagWeights,
    tag_source:   "track",
    listeners,
    playcount,
    duration_ms,
    lastfm_url:   trackInfo.url ?? null,
    mbid:         trackInfo.mbid || null,
    lastfm_found: true,
    enriched_at:  new Date().toISOString(),
  };
}

// Build a placeholder record for tracks not found on Last.fm.
// Writing this to the DB marks the track as "checked" so we
// don't waste API calls retrying it on every subsequent run.
function buildNotFoundRecord(submission: Submission): SongMetadataRecord {
  return {
    spotify_uri:  submission.spotify_uri,
    tags:         [],
    tag_weights:  {},
    tag_source:   "none",
    listeners:    null,
    playcount:    null,
    duration_ms:  null,
    lastfm_url:   null,
    mbid:         null,
    lastfm_found: false,
    enriched_at:  new Date().toISOString(),
  };
}

// Build a record using artist-level tags as fallback
function buildArtistFallbackRecord(
  submission: Submission,
  artistTags: LastFmTag[],
  trackInfo?: LastFmTrack
): SongMetadataRecord {
  const tags = artistTags.map((t) => normaliseTag(t.name));
  const POSITION_WEIGHTS = [100, 75, 50, 25, 10];
  const tagWeights = Object.fromEntries(
    artistTags.map((t, i) => [normaliseTag(t.name), POSITION_WEIGHTS[i] ?? 5])
  );

  const listeners   = trackInfo ? (parseInt(trackInfo.listeners, 10) || null) : null;
  const playcount   = trackInfo ? (parseInt(trackInfo.playcount, 10) || null) : null;
  const durationRaw = trackInfo ? parseInt(trackInfo.duration, 10) : 0;
  const duration_ms = durationRaw > 0 ? durationRaw : null;

  return {
    spotify_uri:  submission.spotify_uri,
    tags,
    tag_weights:  tagWeights,
    tag_source:   "artist",
    listeners,
    playcount,
    duration_ms,
    lastfm_url:   trackInfo?.url ?? null,
    mbid:         trackInfo?.mbid || null,
    lastfm_found: !!trackInfo,
    enriched_at:  new Date().toISOString(),
  };
}

// ============================================================
// Enrich a single submission
// ============================================================

async function enrichSubmission(
  submission: Submission,
  apiKey: string
): Promise<EnrichResult> {
  const artist = extractPrimaryArtist(submission.artists);

  try {
    const trackInfo = await getTrackInfo(artist, submission.song_name, apiKey);

    if (trackInfo) {
      // Track found — check if it has tags
      const trackTags = normaliseTags(trackInfo.toptags);
      if (trackTags.length > 0) {
        return { status: "enriched", record: buildRecord(submission, trackInfo) };
      }
      // Track found but no tags — fall back to artist tags
      console.log(`Track found but no tags: "${submission.song_name}" by "${artist}" — trying artist tags`);
      const artistTags = await getArtistTopTags(artist, apiKey);
      if (artistTags.length > 0) {
        return { status: "enriched", record: buildArtistFallbackRecord(submission, artistTags, trackInfo) };
      }
      // Track found, no track tags, no artist tags either
      return { status: "enriched", record: buildRecord(submission, trackInfo) };
    }

    // Track not found — try artist tags as fallback
    console.log(`Not found on Last.fm: "${submission.song_name}" by "${artist}" — trying artist tags`);
    const artistTags = await getArtistTopTags(artist, apiKey);
    if (artistTags.length > 0) {
      return { status: "enriched", record: buildArtistFallbackRecord(submission, artistTags) };
    }

    // Neither track nor artist found
    console.log(`No data at all for: "${submission.song_name}" by "${artist}" — writing placeholder`);
    return { status: "not_found", record: buildNotFoundRecord(submission) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`Error enriching "${submission.song_name}" by "${artist}": ${message}`);
    return { status: "error", message };
  }
}

// ============================================================
// Process items with bounded concurrency
// ============================================================

async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  batchDelayMs: number
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(fn));

    for (const s of settled) {
      // Fulfilled results are passed through; rejections are mapped to an error-shaped object.
      // (Individual errors are already caught inside enrichSubmission so this is a safety net.)
      if (s.status === "fulfilled") {
        results.push(s.value);
      }
    }

    if (i + concurrency < items.length) {
      await delay(batchDelayMs);
    }
  }

  return results;
}

// ============================================================
// Main handler
// ============================================================

serve(async (req: Request) => {
  // Handle CORS preflight requests
  // This is required when invoking the function from a browser-based frontend
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: { force_refresh?: boolean; batch_limit?: number; offset?: number } =
      await req.json().catch(() => ({}));

    const forceRefresh = body.force_refresh === true;
    const batchLimit   = Math.min(body.batch_limit ?? DEFAULT_BATCH_LIMIT, 500);
    const offset       = Math.max(body.offset ?? 0, 0);

    const apiKey = Deno.env.get("LASTFM_API_KEY");
    if (!apiKey) throw new Error("LASTFM_API_KEY secret is not set.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --------------------------------------------------------
    // 1. Get unique (spotify_uri, song_name, artists) combos.
    //    We need song_name + artists for the Last.fm lookup.
    // --------------------------------------------------------
    const { data: allSubmissions, error: subErr } = await supabase
      .from("submissions")
      .select("spotify_uri, song_name, artists");

    if (subErr) throw new Error(`Failed to fetch submissions: ${subErr.message}`);

    // Deduplicate by spotify_uri (same song may appear in multiple rounds)
    const seen = new Set<string>();
    const uniqueSubmissions: Submission[] = [];
    for (const s of allSubmissions ?? []) {
      if (!seen.has(s.spotify_uri)) {
        seen.add(s.spotify_uri);
        uniqueSubmissions.push(s as Submission);
      }
    }

    // --------------------------------------------------------
    // 2. Filter to only unenriched songs (unless force_refresh)
    // --------------------------------------------------------
    let toProcess: Submission[];

    if (forceRefresh) {
      toProcess = uniqueSubmissions.slice(offset, offset + batchLimit);
    } else {
      const { data: enriched, error: enrichErr } = await supabase
        .from("song_metadata")
        .select("spotify_uri");

      if (enrichErr) throw new Error(`Failed to fetch song_metadata: ${enrichErr.message}`);

      const enrichedSet = new Set((enriched ?? []).map((r) => r.spotify_uri as string));
      toProcess = uniqueSubmissions
        .filter((s) => !enrichedSet.has(s.spotify_uri))
        .slice(0, batchLimit);
    }

    if (toProcess.length === 0) {
      return jsonResponse({
        message:    "All songs already enriched. Use force_refresh: true to re-enrich.",
        processed:  0,
        total:      uniqueSubmissions.length,
        elapsed_ms: Date.now() - startTime,
      });
    }

    console.log(
      `Enriching ${toProcess.length}/${uniqueSubmissions.length} tracks ` +
      `(force_refresh=${forceRefresh}, concurrency=${CONCURRENT_REQUESTS})`
    );

    // --------------------------------------------------------
    // 3. Enrich with bounded concurrency
    // --------------------------------------------------------
    const results = await processWithConcurrency(
      toProcess,
      CONCURRENT_REQUESTS,
      (submission) => enrichSubmission(submission, apiKey),
      BATCH_DELAY_MS
    );

    // --------------------------------------------------------
    // 4. Upsert all records (enriched + not-found placeholders)
    //    Both are written so that future runs skip them.
    // --------------------------------------------------------
    const enrichedRecords  = results
      .filter((r): r is { status: "enriched"; record: SongMetadataRecord } =>
        r.status === "enriched"
      )
      .map((r) => r.record);

    const notFoundRecords  = results
      .filter((r): r is { status: "not_found"; record: SongMetadataRecord } =>
        r.status === "not_found"
      )
      .map((r) => r.record);

    const errors = results.filter((r) => r.status === "error").length;

    const allRecords = [...enrichedRecords, ...notFoundRecords];

    if (allRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from("song_metadata")
        .upsert(allRecords, { onConflict: "spotify_uri" });

      if (upsertError) {
        throw new Error(`Upsert failed: ${upsertError.message}`);
      }
    }

    // --------------------------------------------------------
    // 5. Return summary
    // --------------------------------------------------------
    return jsonResponse({
      message:         "Enrichment complete",
      enriched:        enrichedRecords.length,
      not_found:       notFoundRecords.length,  // checked but not on Last.fm — now marked as processed
      errors,                                   // transient failures — will be retried next run
      total_processed: allRecords.length,
      total:           uniqueSubmissions.length,
      offset,
      elapsed_ms:      Date.now() - startTime,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fatal error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
