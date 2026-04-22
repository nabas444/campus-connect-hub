
-- Expert profiles
CREATE TABLE public.expert_profiles (
  expert_id UUID PRIMARY KEY,
  headline TEXT,
  bio TEXT,
  hourly_rate NUMERIC,
  currency TEXT NOT NULL DEFAULT 'usd',
  years_experience INTEGER,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  avatar_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating_avg NUMERIC NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert profiles viewable by anyone authenticated"
  ON public.expert_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Experts manage own profile"
  ON public.expert_profiles FOR ALL TO authenticated
  USING (expert_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (expert_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_expert_profiles_updated
  BEFORE UPDATE ON public.expert_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile when user gets expert role
CREATE OR REPLACE FUNCTION public.create_expert_profile_on_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'expert' THEN
    INSERT INTO public.expert_profiles (expert_id) VALUES (NEW.user_id)
    ON CONFLICT (expert_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_expert_profile
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.create_expert_profile_on_role();

-- Backfill existing experts
INSERT INTO public.expert_profiles (expert_id)
SELECT user_id FROM public.user_roles WHERE role = 'expert'
ON CONFLICT (expert_id) DO NOTHING;

-- Expert reviews
CREATE TABLE public.expert_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL,
  project_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, reviewer_id)
);

ALTER TABLE public.expert_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by anyone authenticated"
  ON public.expert_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reviewers create reviews on completed projects"
  ON public.expert_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = expert_reviews.project_id
        AND p.assigned_expert_id = expert_reviews.expert_id
        AND p.status = 'completed'
        AND (p.student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );

CREATE POLICY "Reviewers update own reviews"
  ON public.expert_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (reviewer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Reviewers delete own reviews"
  ON public.expert_reviews FOR DELETE TO authenticated
  USING (reviewer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_expert_reviews_updated
  BEFORE UPDATE ON public.expert_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recompute aggregates
CREATE OR REPLACE FUNCTION public.recompute_expert_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _eid UUID;
BEGIN
  _eid := COALESCE(NEW.expert_id, OLD.expert_id);
  UPDATE public.expert_profiles ep
    SET rating_avg = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.expert_reviews WHERE expert_id = _eid), 0),
        rating_count = (SELECT COUNT(*) FROM public.expert_reviews WHERE expert_id = _eid)
    WHERE ep.expert_id = _eid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recompute_rating_ins
  AFTER INSERT OR UPDATE OR DELETE ON public.expert_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_expert_rating();

CREATE INDEX idx_expert_reviews_expert ON public.expert_reviews(expert_id);
CREATE INDEX idx_expert_profiles_subjects ON public.expert_profiles USING GIN(subjects);
