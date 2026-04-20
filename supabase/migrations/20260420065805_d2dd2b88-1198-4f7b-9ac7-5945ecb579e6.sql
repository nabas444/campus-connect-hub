-- ============ ENUMS ============
CREATE TYPE public.project_status AS ENUM ('draft', 'open', 'in_progress', 'review', 'completed', 'cancelled');
CREATE TYPE public.milestone_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected');
CREATE TYPE public.project_event_type AS ENUM (
  'created', 'status_changed', 'assigned', 'unassigned', 'claimed',
  'milestone_added', 'milestone_status_changed', 'milestone_approved', 'milestone_rejected',
  'deliverable_added', 'commented'
);

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_expert_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  brief TEXT NOT NULL CHECK (char_length(brief) BETWEEN 10 AND 5000),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 80),
  status public.project_status NOT NULL DEFAULT 'draft',
  total_budget NUMERIC(10,2) CHECK (total_budget IS NULL OR total_budget >= 0),
  deadline DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_student ON public.projects(student_id);
CREATE INDEX idx_projects_expert ON public.projects(assigned_expert_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created ON public.projects(created_at DESC);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Visibility predicate
CREATE OR REPLACE FUNCTION public.can_view_project(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (
        p.student_id = _user_id
        OR p.assigned_expert_id = _user_id
        OR (public.has_role(_user_id, 'expert') AND p.assigned_expert_id IS NULL AND p.status = 'open')
        OR public.has_role(_user_id, 'admin')
      )
  )
$$;

-- ============ PROJECT RLS ============
CREATE POLICY "Students create own projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "View projects by role"
ON public.projects FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR assigned_expert_id = auth.uid()
  OR (public.has_role(auth.uid(), 'expert') AND assigned_expert_id IS NULL AND status = 'open')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Update projects by role"
ON public.projects FOR UPDATE TO authenticated
USING (
  student_id = auth.uid()
  OR assigned_expert_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  student_id = auth.uid()
  OR assigned_expert_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins delete projects"
ON public.projects FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ MILESTONES ============
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 150),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 3000),
  due_date DATE,
  price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
  status public.milestone_status NOT NULL DEFAULT 'pending',
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_milestones_project ON public.milestones(project_id, position);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "View milestones via project"
ON public.milestones FOR SELECT TO authenticated
USING (public.can_view_project(project_id, auth.uid()));

CREATE POLICY "Insert milestones on viewable project"
ON public.milestones FOR INSERT TO authenticated
WITH CHECK (
  public.can_view_project(project_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND (
      p.student_id = auth.uid() OR p.assigned_expert_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Update milestones on editable project"
ON public.milestones FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND (
      p.student_id = auth.uid() OR p.assigned_expert_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Delete milestones by student or admin"
ON public.milestones FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND (
      p.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    )
  )
);

-- ============ DELIVERABLES ============
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 26214400),
  mime_type TEXT,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliverables_milestone ON public.deliverables(milestone_id);
CREATE INDEX idx_deliverables_project ON public.deliverables(project_id);
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View deliverables via project"
ON public.deliverables FOR SELECT TO authenticated
USING (public.can_view_project(project_id, auth.uid()));

CREATE POLICY "Upload deliverables on viewable project"
ON public.deliverables FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.can_view_project(project_id, auth.uid())
);

CREATE POLICY "Delete own deliverables or admin"
ON public.deliverables FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ EVENTS (audit timeline) ============
CREATE TABLE public.project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type public.project_event_type NOT NULL,
  from_value TEXT,
  to_value TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pevents_project ON public.project_events(project_id, created_at DESC);
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View project events"
ON public.project_events FOR SELECT TO authenticated
USING (public.can_view_project(project_id, auth.uid()));

CREATE POLICY "Insert project events"
ON public.project_events FOR INSERT TO authenticated
WITH CHECK (
  (actor_id IS NULL OR actor_id = auth.uid())
  AND public.can_view_project(project_id, auth.uid())
);

-- ============ AUTO-LOG TRIGGERS ============
CREATE OR REPLACE FUNCTION public.log_project_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_events (project_id, actor_id, event_type, to_value)
    VALUES (NEW.id, NEW.student_id, 'created', NEW.status::TEXT);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.project_events (project_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::TEXT, NEW.status::TEXT);
      IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
        NEW.completed_at = now();
      END IF;
    END IF;
    IF NEW.assigned_expert_id IS DISTINCT FROM OLD.assigned_expert_id THEN
      IF NEW.assigned_expert_id IS NULL THEN
        INSERT INTO public.project_events (project_id, actor_id, event_type, from_value)
        VALUES (NEW.id, auth.uid(), 'unassigned', OLD.assigned_expert_id::TEXT);
      ELSE
        INSERT INTO public.project_events (project_id, actor_id, event_type, from_value, to_value)
        VALUES (NEW.id, auth.uid(),
          CASE WHEN auth.uid() = NEW.assigned_expert_id THEN 'claimed' ELSE 'assigned' END,
          OLD.assigned_expert_id::TEXT, NEW.assigned_expert_id::TEXT);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_log_insert
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_changes();

CREATE TRIGGER trg_projects_log_update
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_changes();

CREATE OR REPLACE FUNCTION public.log_milestone_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_events (project_id, milestone_id, actor_id, event_type, to_value, message)
    VALUES (NEW.project_id, NEW.id, auth.uid(), 'milestone_added', NEW.status::TEXT, NEW.title);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_events (project_id, milestone_id, actor_id, event_type, from_value, to_value, message)
    VALUES (NEW.project_id, NEW.id, auth.uid(),
      CASE NEW.status
        WHEN 'approved' THEN 'milestone_approved'::project_event_type
        WHEN 'rejected' THEN 'milestone_rejected'::project_event_type
        ELSE 'milestone_status_changed'::project_event_type
      END,
      OLD.status::TEXT, NEW.status::TEXT, NEW.title);
    IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_milestones_log_insert
AFTER INSERT ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.log_milestone_changes();

CREATE TRIGGER trg_milestones_log_update
BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.log_milestone_changes();

CREATE OR REPLACE FUNCTION public.log_deliverable_added()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.project_events (project_id, milestone_id, actor_id, event_type, to_value, message)
  VALUES (NEW.project_id, NEW.milestone_id, NEW.uploaded_by, 'deliverable_added', NEW.file_name, NEW.note);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deliverable_log
AFTER INSERT ON public.deliverables
FOR EACH ROW EXECUTE FUNCTION public.log_deliverable_added();

-- ============ CLAIM / ASSIGN / APPROVAL HELPERS ============
CREATE OR REPLACE FUNCTION public.claim_project(_project_id UUID)
RETURNS public.projects LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project public.projects;
BEGIN
  IF NOT public.has_role(auth.uid(), 'expert') AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only experts can claim projects';
  END IF;

  UPDATE public.projects
  SET assigned_expert_id = auth.uid(),
      status = 'in_progress'::project_status
  WHERE id = _project_id
    AND assigned_expert_id IS NULL
    AND status = 'open'
  RETURNING * INTO _project;

  IF _project.id IS NULL THEN
    RAISE EXCEPTION 'Project not available to claim';
  END IF;

  RETURN _project;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_project(_project_id UUID, _expert_id UUID)
RETURNS public.projects LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project public.projects;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign projects';
  END IF;
  IF _expert_id IS NOT NULL AND NOT public.has_role(_expert_id, 'expert') THEN
    RAISE EXCEPTION 'Target user is not an expert';
  END IF;

  UPDATE public.projects
  SET assigned_expert_id = _expert_id,
      status = CASE
        WHEN _expert_id IS NULL THEN 'open'::project_status
        WHEN status IN ('draft','open') THEN 'in_progress'::project_status
        ELSE status
      END
  WHERE id = _project_id
  RETURNING * INTO _project;

  RETURN _project;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_milestone_status(_milestone_id UUID, _new_status public.milestone_status)
RETURNS public.milestones LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ms public.milestones;
  _project public.projects;
BEGIN
  SELECT * INTO _ms FROM public.milestones WHERE id = _milestone_id;
  IF _ms.id IS NULL THEN RAISE EXCEPTION 'Milestone not found'; END IF;
  SELECT * INTO _project FROM public.projects WHERE id = _ms.project_id;

  -- Approval/rejection: only student or admin
  IF _new_status IN ('approved','rejected') THEN
    IF auth.uid() <> _project.student_id AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only the student or an admin can approve or reject milestones';
    END IF;
  ELSE
    -- in_progress / submitted / pending: assigned expert, student, or admin
    IF auth.uid() <> _project.student_id
       AND auth.uid() <> _project.assigned_expert_id
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Not authorized to change milestone status';
    END IF;
  END IF;

  UPDATE public.milestones SET status = _new_status WHERE id = _milestone_id RETURNING * INTO _ms;
  RETURN _ms;
END;
$$;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-deliverables', 'project-deliverables', false);

-- Path convention: {project_id}/{milestone_id}/{filename}
CREATE POLICY "Read deliverable files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-deliverables'
  AND public.can_view_project(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Upload deliverable files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-deliverables'
  AND public.can_view_project(((storage.foldername(name))[1])::uuid, auth.uid())
  AND owner = auth.uid()
);

CREATE POLICY "Delete own deliverable files or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-deliverables'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);