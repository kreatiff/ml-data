-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Generated from live Supabase MusicLeagueData project on 2026-03-04.

-- ============================================================
-- Custom Domains
-- ============================================================
CREATE DOMAIN public.ml_id AS text
  CHECK (VALUE ~ '^[0-9a-f]{32}$');

CREATE DOMAIN public.spotify_track_uri AS text
  CHECK (VALUE ~ '^spotify:track:[A-Za-z0-9]{22}$');

-- ============================================================
-- Tables
-- ============================================================
CREATE TABLE public.leagues (
  id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  CONSTRAINT leagues_pkey PRIMARY KEY (id)
);

CREATE TABLE public.competitors (
  id text NOT NULL,
  name text NOT NULL,
  team text,
  avatar_url text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'user' CHECK (role = ANY (ARRAY['admin', 'user'])),
  CONSTRAINT competitors_pkey PRIMARY KEY (id)
);

CREATE TABLE public.rounds (
  id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL,
  started_at timestamp with time zone,
  name text NOT NULL,
  description text,
  playlist_url text,
  league_id text NOT NULL DEFAULT '''fe08d6855f204613b30922e34a7486c6''::text'::text,
  imported_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'aest'::text),
  CONSTRAINT rounds_pkey PRIMARY KEY (id),
  CONSTRAINT rounds_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id)
);

CREATE TABLE public.submissions (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  song_name text NOT NULL,
  album text,
  artists text,
  submitter_id text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  comment text,
  visible_to_voters boolean NOT NULL DEFAULT true,
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, immutable_unaccent(COALESCE(song_name, ''::text))), 'A'::"char")
    || setweight(to_tsvector('simple'::regconfig, immutable_unaccent(COALESCE(artists, ''::text))), 'B'::"char")
    || setweight(to_tsvector('simple'::regconfig, immutable_unaccent(COALESCE(album, ''::text))), 'C'::"char")
  ) STORED,
  imported_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'aest'::text),
  CONSTRAINT submissions_pkey PRIMARY KEY (round_id, spotify_uri),
  CONSTRAINT submissions_round_fk FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT submissions_submitter_fk FOREIGN KEY (submitter_id) REFERENCES public.competitors(id)
);

CREATE TABLE public.votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  voter_id text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  points_assigned smallint NOT NULL CHECK (points_assigned >= 0 AND points_assigned <= 4),
  comment text,
  imported_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'aest'::text),
  CONSTRAINT votes_pkey PRIMARY KEY (round_id, spotify_uri, voter_id),
  CONSTRAINT votes_round_fk FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT votes_voter_fk FOREIGN KEY (voter_id) REFERENCES public.competitors(id),
  CONSTRAINT votes_submission_fk FOREIGN KEY (round_id, spotify_uri)
    REFERENCES public.submissions(round_id, spotify_uri)
);

CREATE TABLE public.aggregate_votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  total_votes integer NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
  CONSTRAINT aggregate_votes_pkey PRIMARY KEY (round_id, spotify_uri),
  CONSTRAINT aggregate_votes_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT aggregate_votes_round_id_spotify_uri_fkey FOREIGN KEY (round_id, spotify_uri)
    REFERENCES public.submissions(round_id, spotify_uri)
);

CREATE TABLE public.created_playlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  playlist_key text NOT NULL,
  league_id text,
  spotify_url text NOT NULL,
  spotify_playlist_id text,
  playlist_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  track_hash text,
  CONSTRAINT created_playlists_pkey PRIMARY KEY (id)
);

CREATE TABLE public.song_metadata (
  spotify_uri text NOT NULL,
  tags text[] DEFAULT '{}',
  tag_weights jsonb DEFAULT '{}',
  tag_source text DEFAULT 'none',            -- 'track', 'artist', or 'none'
  listeners bigint,
  playcount bigint,
  duration_ms integer,
  lastfm_url text,
  mbid text,
  lastfm_found boolean DEFAULT false,
  enriched_at timestamp with time zone,
  CONSTRAINT song_metadata_pkey PRIMARY KEY (spotify_uri)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE UNIQUE INDEX competitors_auth_user_id_key ON public.competitors USING btree (auth_user_id);
CREATE UNIQUE INDEX created_playlists_key_league ON public.created_playlists USING btree (playlist_key, league_id);
CREATE UNIQUE INDEX created_playlists_key_league_unique ON public.created_playlists USING btree (playlist_key, league_id) NULLS NOT DISTINCT;
CREATE INDEX idx_submissions_round_id ON public.submissions USING btree (round_id);
CREATE INDEX idx_submissions_submitter_id ON public.submissions USING btree (submitter_id);
CREATE INDEX idx_submissions_search_tsv ON public.submissions USING gin (search_tsv);
CREATE INDEX idx_submissions_title_trgm ON public.submissions USING gin (immutable_unaccent(song_name) gin_trgm_ops);
CREATE INDEX idx_submissions_artists_trgm ON public.submissions USING gin (immutable_unaccent(artists) gin_trgm_ops);
CREATE INDEX idx_submissions_album_trgm ON public.submissions USING gin (immutable_unaccent(album) gin_trgm_ops);
CREATE INDEX idx_votes_round_id ON public.votes USING btree (round_id);
CREATE INDEX idx_votes_voter_id ON public.votes USING btree (voter_id);
CREATE INDEX idx_song_metadata_tags ON public.song_metadata USING gin (tags);

-- ============================================================
-- Views
-- ============================================================
CREATE OR REPLACE VIEW public.song_search AS
SELECT
  s.round_id,
  r.name        AS round_name,
  s.spotify_uri,
  s.song_name,
  s.album,
  s.artists,
  s.submitter_id,
  c.name        AS submitted_by,
  c.avatar_url  AS submitter_avatar_url,
  COALESCE(av.total_votes, 0)::bigint AS votes_achieved,
  s.created_at  AS submitted_at,
  s.visible_to_voters
FROM public.submissions s
JOIN public.rounds r ON r.id = s.round_id
JOIN public.competitors c ON c.id = s.submitter_id
LEFT JOIN public.aggregate_votes av
  ON av.round_id = s.round_id AND av.spotify_uri = s.spotify_uri;

-- ============================================================
-- Functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.immutable_unaccent(input text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT public.unaccent(input);
$$;

CREATE OR REPLACE FUNCTION public.update_aggregate_votes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO public.aggregate_votes (round_id, spotify_uri, total_votes)
    VALUES (NEW.round_id, NEW.spotify_uri, NEW.points_assigned)
    ON CONFLICT (round_id, spotify_uri)
    DO UPDATE SET total_votes = public.aggregate_votes.total_votes + EXCLUDED.total_votes;
    RETURN NEW;
  END IF;

  IF tg_op = 'UPDATE' THEN
    UPDATE public.aggregate_votes
    SET total_votes = total_votes - OLD.points_assigned + NEW.points_assigned
    WHERE round_id = NEW.round_id AND spotify_uri = NEW.spotify_uri;
    RETURN NEW;
  END IF;

  IF tg_op = 'DELETE' THEN
    UPDATE public.aggregate_votes
    SET total_votes = total_votes - OLD.points_assigned
    WHERE round_id = OLD.round_id AND spotify_uri = OLD.spotify_uri;

    DELETE FROM public.aggregate_votes
    WHERE round_id = OLD.round_id AND spotify_uri = OLD.spotify_uri
      AND total_votes <= 0;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_round_started_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.rounds
  SET started_at = NEW.created_at
  WHERE id = NEW.round_id
    AND (started_at IS NULL OR NEW.created_at < started_at);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.competitors
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_song_best(song_q text, artist_q text)
RETURNS TABLE (
  song_name text, artists text, submitted_by text, round_name text,
  votes_achieved bigint, spotify_uri spotify_track_uri, round_id ml_id,
  match_score real
) LANGUAGE sql STABLE AS $$
WITH params AS (
  SELECT
    public.immutable_unaccent(lower(trim(song_q)))   AS song_norm_q,
    public.immutable_unaccent(lower(trim(artist_q)))  AS artist_norm_q,
    0.85::real AS song_sim_min,
    0.70::real AS artist_sim_min
),
base AS (
  SELECT ss.song_name, ss.artists, ss.submitted_by, ss.round_name,
         ss.votes_achieved, ss.spotify_uri, ss.round_id, ss.submitted_at,
         public.immutable_unaccent(lower(ss.song_name))            AS song_norm,
         public.immutable_unaccent(lower(COALESCE(ss.artists,''))) AS artists_norm
  FROM public.song_search ss
  WHERE length(trim(COALESCE(song_q, ''))) >= 3
    AND length(trim(COALESCE(artist_q, ''))) >= 3
),
scored AS (
  SELECT b.*, p.song_norm_q, p.artist_norm_q,
    similarity(b.song_norm, p.song_norm_q)::real     AS song_sim,
    similarity(b.artists_norm, p.artist_norm_q)::real AS artist_sim,
    (b.song_norm = p.song_norm_q)                     AS song_exact,
    (b.artists_norm = p.artist_norm_q)                AS artist_exact,
    (b.song_norm LIKE ('%' || p.song_norm_q || '%'))   AS song_substring,
    (b.artists_norm LIKE ('%' || p.artist_norm_q || '%')) AS artist_substring,
    p.song_sim_min, p.artist_sim_min
  FROM base b CROSS JOIN params p
)
SELECT song_name, artists, submitted_by, round_name, votes_achieved,
       spotify_uri, round_id,
       (
         (CASE WHEN song_exact THEN 5.0 ELSE 0.0 END) +
         (CASE WHEN artist_exact THEN 3.0 ELSE 0.0 END) +
         (song_sim * 10.0) + (artist_sim * 8.0) +
         (CASE WHEN song_substring THEN 1.0 ELSE 0.0 END) +
         (CASE WHEN artist_substring THEN 0.5 ELSE 0.0 END)
       )::real AS match_score
FROM scored
WHERE (song_exact OR song_sim >= song_sim_min OR song_substring)
  AND (artist_exact OR artist_sim >= artist_sim_min OR artist_substring)
ORDER BY song_exact DESC, song_substring DESC, song_sim DESC,
         artist_exact DESC, artist_substring DESC, artist_sim DESC,
         match_score DESC, submitted_at DESC
LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_song_best(q text)
RETURNS TABLE (
  song_name text, artists text, submitted_by text, round_name text,
  votes_achieved bigint, spotify_uri spotify_track_uri, round_id ml_id,
  match_score real
) LANGUAGE sql STABLE AS $$
WITH cleaned AS (
  SELECT trim(COALESCE(q,'')) AS q
),
parts AS (
  SELECT
    CASE
      WHEN q ~* '\s+by\s+' THEN trim(regexp_replace(q, '\s+by\s+.*$', '', 'i'))
      WHEN position(' - ' IN q) > 0 THEN trim(split_part(q, ' - ', 1))
      ELSE NULL
    END AS song_q,
    CASE
      WHEN q ~* '\s+by\s+' THEN trim(regexp_replace(q, '^.*\s+by\s+', '', 'i'))
      WHEN position(' - ' IN q) > 0 THEN trim(split_part(q, ' - ', 2))
      ELSE NULL
    END AS artist_q
  FROM cleaned
)
SELECT * FROM public.search_song_best(
  (SELECT song_q FROM parts),
  (SELECT artist_q FROM parts)
)
WHERE (SELECT song_q FROM parts) IS NOT NULL
  AND (SELECT artist_q FROM parts) IS NOT NULL;
$$;

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER votes_aggregate_trigger
  AFTER INSERT OR DELETE OR UPDATE OF points_assigned
  ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_aggregate_votes();

CREATE TRIGGER trg_update_round_started_at
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_round_started_at();

CREATE TRIGGER check_role_escalation
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.created_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregate_votes ENABLE ROW LEVEL SECURITY;

-- LEAGUES: Public read
CREATE POLICY "Allow anonymous read access" ON public.leagues FOR SELECT USING (true);

-- COMPETITORS: Public read profile, user update own
CREATE POLICY "Allow public read access" ON public.competitors FOR SELECT USING (true);
CREATE POLICY "Users can update their own competitor profile" ON public.competitors
  FOR UPDATE USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- ROUNDS: Public read
CREATE POLICY "Allow public read access" ON public.rounds FOR SELECT USING (true);

-- SUBMISSIONS: Public read
CREATE POLICY "Allow public read access" ON public.submissions FOR SELECT USING (true);

-- VOTES: Only authenticated users can see votes (protects privacy)
CREATE POLICY "Allow authenticated read access" ON public.votes FOR SELECT USING (auth.uid() IS NOT NULL);

-- AGGREGATE_VOTES: Public read (totals are less sensitive than individual votes)
CREATE POLICY "Allow public read access" ON public.aggregate_votes FOR SELECT USING (true);

-- CREATED_PLAYLISTS: Public read, but only authenticated users can create/update
CREATE POLICY "Allow public read" ON public.created_playlists FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.created_playlists FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update" ON public.created_playlists FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- SONG_METADATA: Only authenticated users can read (prevents mass scraping of enriched data)
CREATE POLICY "Allow authenticated read" ON public.song_metadata FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Edge Functions
-- ============================================================
-- enrich-songs (Last.fm):
--   POST /functions/v1/enrich-songs
--   Enriches submissions with Last.fm metadata (tags, listeners, playcount).
--   Falls back to artist.getTopTags when track tags are unavailable.
--   Stores results in song_metadata with tag_source indicating origin.
--   Supports batched invocation via: { force_refresh, batch_limit, offset }
--
-- create-playlist:
--   POST /functions/v1/create-playlist
--   Creates Spotify playlists from selected rounds/leagues.
--
-- verify-password:
--   POST /functions/v1/verify-password
--   Validates the site-wide access password.