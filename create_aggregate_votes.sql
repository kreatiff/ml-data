-- Create aggregate_votes table to store pre-calculated vote totals.
-- Matches the live MusicLeagueData schema as of 2026-02-11.
CREATE TABLE IF NOT EXISTS public.aggregate_votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  total_votes integer NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
  CONSTRAINT aggregate_votes_pkey PRIMARY KEY (round_id, spotify_uri),
  CONSTRAINT aggregate_votes_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT aggregate_votes_round_id_spotify_uri_fkey FOREIGN KEY (round_id, spotify_uri)
    REFERENCES public.submissions(round_id, spotify_uri)
);

-- Seed the table from existing votes
INSERT INTO public.aggregate_votes (round_id, spotify_uri, total_votes)
SELECT
  v.round_id,
  v.spotify_uri,
  COALESCE(SUM(v.points_assigned), 0) AS total_votes
FROM public.votes v
GROUP BY v.round_id, v.spotify_uri
ON CONFLICT (round_id, spotify_uri)
DO UPDATE SET total_votes = EXCLUDED.total_votes;

-- Trigger function: incrementally maintain total_votes on each vote change
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

-- Trigger fires on point-changing operations only
DROP TRIGGER IF EXISTS votes_aggregate_trigger ON public.votes;
CREATE TRIGGER votes_aggregate_trigger
  AFTER INSERT OR DELETE OR UPDATE OF points_assigned
  ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_aggregate_votes();

-- NOTE: aggregate_votes intentionally has RLS DISABLED
-- (contains only pre-computed totals, no sensitive data)
