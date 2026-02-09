-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.aggregate_votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  total_votes integer NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
  CONSTRAINT aggregate_votes_pkey PRIMARY KEY (round_id, spotify_uri),
  CONSTRAINT aggregate_votes_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT aggregate_votes_round_id_spotify_uri_fkey FOREIGN KEY (round_id) REFERENCES public.submissions(round_id),
  CONSTRAINT aggregate_votes_round_id_spotify_uri_fkey FOREIGN KEY (round_id) REFERENCES public.submissions(spotify_uri),
  CONSTRAINT aggregate_votes_round_id_spotify_uri_fkey FOREIGN KEY (spotify_uri) REFERENCES public.submissions(round_id),
  CONSTRAINT aggregate_votes_round_id_spotify_uri_fkey FOREIGN KEY (spotify_uri) REFERENCES public.submissions(spotify_uri)
);
CREATE TABLE public.competitors (
  id text NOT NULL,
  name text NOT NULL,
  CONSTRAINT competitors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leagues (
  id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  CONSTRAINT leagues_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rounds (
  id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL,
  name text NOT NULL,
  description text,
  playlist_url text,
  league_id text NOT NULL DEFAULT '''fe08d6855f204613b30922e34a7486c6''::text'::text,
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
  search_tsv tsvector DEFAULT ((setweight(to_tsvector('simple'::regconfig, immutable_unaccent(COALESCE(song_name, ''::text))), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, immutable_unaccent(COALESCE(artists, ''::text))), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, immutable_unaccent(COALESCE(album, ''::text))), 'C'::"char")),
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
  CONSTRAINT votes_submission_fk FOREIGN KEY (round_id) REFERENCES public.submissions(round_id),
  CONSTRAINT votes_submission_fk FOREIGN KEY (round_id) REFERENCES public.submissions(spotify_uri),
  CONSTRAINT votes_submission_fk FOREIGN KEY (spotify_uri) REFERENCES public.submissions(round_id),
  CONSTRAINT votes_submission_fk FOREIGN KEY (spotify_uri) REFERENCES public.submissions(spotify_uri)
);