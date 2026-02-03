-- Create aggregate_votes table to store pre-calculated vote totals
CREATE TABLE IF NOT EXISTS public.aggregate_votes (
  round_id text NOT NULL,
  spotify_uri text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  vote_count integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT NOW(),
  CONSTRAINT aggregate_votes_pkey PRIMARY KEY (round_id, spotify_uri),
  CONSTRAINT aggregate_votes_round_fk FOREIGN KEY (round_id) REFERENCES public.rounds(id),
  CONSTRAINT aggregate_votes_submission_fk FOREIGN KEY (round_id, spotify_uri) REFERENCES public.submissions(round_id, spotify_uri)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS aggregate_votes_round_id_idx ON public.aggregate_votes(round_id);
CREATE INDEX IF NOT EXISTS aggregate_votes_spotify_uri_idx ON public.aggregate_votes(spotify_uri);

-- Populate the table with aggregated data from votes
INSERT INTO public.aggregate_votes (round_id, spotify_uri, total_points, vote_count)
SELECT 
  v.round_id,
  v.spotify_uri,
  COALESCE(SUM(v.points_assigned), 0) as total_points,
  COUNT(*) as vote_count
FROM public.votes v
GROUP BY v.round_id, v.spotify_uri
ON CONFLICT (round_id, spotify_uri) 
DO UPDATE SET
  total_points = EXCLUDED.total_points,
  vote_count = EXCLUDED.vote_count,
  last_updated = NOW();

-- Optional: Create a function to keep aggregate_votes updated automatically
CREATE OR REPLACE FUNCTION update_aggregate_votes()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    INSERT INTO public.aggregate_votes (round_id, spotify_uri, total_points, vote_count)
    SELECT 
      NEW.round_id,
      NEW.spotify_uri,
      COALESCE(SUM(points_assigned), 0),
      COUNT(*)
    FROM public.votes
    WHERE round_id = NEW.round_id AND spotify_uri = NEW.spotify_uri
    GROUP BY round_id, spotify_uri
    ON CONFLICT (round_id, spotify_uri) 
    DO UPDATE SET
      total_points = EXCLUDED.total_points,
      vote_count = EXCLUDED.vote_count,
      last_updated = NOW();
  END IF;
  
  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.aggregate_votes (round_id, spotify_uri, total_points, vote_count)
    SELECT 
      OLD.round_id,
      OLD.spotify_uri,
      COALESCE(SUM(points_assigned), 0),
      COUNT(*)
    FROM public.votes
    WHERE round_id = OLD.round_id AND spotify_uri = OLD.spotify_uri
    GROUP BY round_id, spotify_uri
    ON CONFLICT (round_id, spotify_uri) 
    DO UPDATE SET
      total_points = EXCLUDED.total_points,
      vote_count = EXCLUDED.vote_count,
      last_updated = NOW();
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update aggregate_votes when votes change
DROP TRIGGER IF EXISTS votes_aggregate_trigger ON public.votes;
CREATE TRIGGER votes_aggregate_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION update_aggregate_votes();

-- Grant necessary permissions (adjust as needed for your setup)
-- ALTER TABLE public.aggregate_votes ENABLE ROW LEVEL SECURITY;
