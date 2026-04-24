-- Re-attach the rating recompute trigger and backfill ratings.
DROP TRIGGER IF EXISTS trg_recompute_expert_rating ON public.expert_reviews;

CREATE TRIGGER trg_recompute_expert_rating
AFTER INSERT OR UPDATE OR DELETE ON public.expert_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_expert_rating();

-- Backfill any existing data so cached values match reviews.
UPDATE public.expert_profiles ep
SET rating_avg = COALESCE(sub.avg, 0),
    rating_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT expert_id,
         AVG(rating)::numeric(3,2) AS avg,
         COUNT(*)::int AS cnt
  FROM public.expert_reviews
  GROUP BY expert_id
) sub
WHERE ep.expert_id = sub.expert_id;