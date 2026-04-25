-- Allow experts to feature their own delivered work in the success showcase.
-- Admins keep blanket access (existing policy remains).

-- Experts can view featured rows for projects assigned to them
CREATE POLICY "Experts view featured for own projects"
ON public.featured_testimonials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = featured_testimonials.project_id
      AND p.assigned_expert_id = auth.uid()
  )
);

-- Experts can insert featured rows for projects assigned to them,
-- but only if the project is completed AND has a review.
CREATE POLICY "Experts feature own delivered projects"
ON public.featured_testimonials
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.expert_reviews r
      ON r.project_id = p.id
     AND r.id = featured_testimonials.review_id
    WHERE p.id = featured_testimonials.project_id
      AND p.assigned_expert_id = auth.uid()
      AND p.status = 'completed'::project_status
  )
);

-- Experts can update / unfeature their own featured rows
CREATE POLICY "Experts update own featured"
ON public.featured_testimonials
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = featured_testimonials.project_id
      AND p.assigned_expert_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = featured_testimonials.project_id
      AND p.assigned_expert_id = auth.uid()
  )
);

-- Experts can delete their own featured rows
CREATE POLICY "Experts delete own featured"
ON public.featured_testimonials
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = featured_testimonials.project_id
      AND p.assigned_expert_id = auth.uid()
  )
);