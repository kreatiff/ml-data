-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.competitors (
  id text NOT NULL,
  name text NOT NULL,
  CONSTRAINT competitors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rounds (
  id text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  name text NOT NULL,
  description text,
  playlist_url text,
  CONSTRAINT rounds_pkey PRIMARY KEY (id)
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
  CONSTRAINT submissions_pkey PRIMARY KEY (round_id, spotify_uri),
  CONSTRAINT submissions_round_fk FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT submissions_submitter_fk FOREIGN KEY (submitter_id) REFERENCES public.competitors(id)
);
CREATE TABLE public.votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  voter_id text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  points_assigned smallint NOT NULL CHECK (points_assigned >= 0 AND points_assigned <= 2),
  comment text,
  CONSTRAINT votes_pkey PRIMARY KEY (round_id, spotify_uri, voter_id),
  CONSTRAINT votes_round_fk FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT votes_voter_fk FOREIGN KEY (voter_id) REFERENCES public.competitors(id),
  CONSTRAINT votes_submission_fk FOREIGN KEY (round_id) REFERENCES public.submissions(round_id),
  CONSTRAINT votes_submission_fk FOREIGN KEY (spotify_uri) REFERENCES public.submissions(round_id),
  CONSTRAINT votes_submission_fk FOREIGN KEY (round_id) REFERENCES public.submissions(spotify_uri),
  CONSTRAINT votes_submission_fk FOREIGN KEY (spotify_uri) REFERENCES public.submissions(spotify_uri)
);