-- Curated, anonymized testimonials
CREATE TABLE public.featured_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE,
  review_id UUID NOT NULL UNIQUE,
  display_name TEXT,           -- e.g. "Sarah K." (anonymized)
  public_excerpt TEXT,         -- optional admin-edited excerpt of the review
  subject_label TEXT,          -- optional override; falls back to project.subject
  position INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_featured_testimonials_featured ON public.featured_testimonials(is_featured, position);

ALTER TABLE public.featured_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage featured testimonials"
  ON public.featured_testimonials FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- No direct SELECT for non-admins; they read the anonymized view instead.

CREATE TRIGGER trg_featured_testimonials_updated
  BEFORE UPDATE ON public.featured_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anonymized public view: only safe fields, no titles/briefs/files.
CREATE OR REPLACE VIEW public.testimonials_public
WITH (security_invoker = on) AS
SELECT
  ft.id,
  ft.position,
  COALESCE(ft.subject_label, p.subject)                   AS subject,
  COALESCE(
    ft.display_name,
    NULLIF(split_part(COALESCE(sp.full_name, ''), ' ', 1), '') ||
      CASE
        WHEN COALESCE(sp.full_name, '') ~ ' '
        THEN ' ' || left(split_part(sp.full_name, ' ', 2), 1) || '.'
        ELSE ''
      END,
    'Student'
  )                                                       AS display_name,
  COALESCE(NULLIF(ft.public_excerpt, ''), r.comment)      AS excerpt,
  r.rating                                                AS rating,
  COALESCE(ep_profile.full_name, 'Expert')                AS expert_name,
  ep.expert_id                                            AS expert_id,
  ep.rating_avg                                           AS expert_rating_avg,
  ep.rating_count                                         AS expert_rating_count,
  p.completed_at                                          AS completed_at,
  ft.created_at                                           AS featured_at
FROM public.featured_testimonials ft
JOIN public.projects p             ON p.id = ft.project_id
JOIN public.expert_reviews r       ON r.id = ft.review_id
LEFT JOIN public.profiles sp       ON sp.id = p.student_id
LEFT JOIN public.expert_profiles ep ON ep.expert_id = p.assigned_expert_id
LEFT JOIN public.profiles ep_profile ON ep_profile.id = p.assigned_expert_id
WHERE ft.is_featured = true
  AND p.status = 'completed';

GRANT SELECT ON public.testimonials_public TO authenticated;