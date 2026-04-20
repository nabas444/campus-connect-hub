-- ============ ENUMS ============
CREATE TYPE public.ticket_category AS ENUM ('hardware', 'software', 'network', 'account', 'other');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'waiting_on_student', 'resolved', 'closed');
CREATE TYPE public.ticket_event_type AS ENUM ('created', 'status_changed', 'assigned', 'unassigned', 'claimed', 'commented', 'attachment_added');

-- ============ TICKETS ============
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_expert_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
  category public.ticket_category NOT NULL,
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  status public.ticket_status NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_student ON public.tickets(student_id);
CREATE INDEX idx_tickets_expert ON public.tickets(assigned_expert_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created ON public.tickets(created_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TICKET HELPERS ============
-- Visibility predicate (used by RLS on tickets and dependents)
CREATE OR REPLACE FUNCTION public.can_view_ticket(_ticket_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = _ticket_id
      AND (
        t.student_id = _user_id
        OR t.assigned_expert_id = _user_id
        OR (public.has_role(_user_id, 'expert') AND t.assigned_expert_id IS NULL AND t.status = 'open')
        OR public.has_role(_user_id, 'admin')
      )
  )
$$;

-- ============ TICKET RLS ============
CREATE POLICY "Students create own tickets"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "View tickets by role"
ON public.tickets FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR assigned_expert_id = auth.uid()
  OR (public.has_role(auth.uid(), 'expert') AND assigned_expert_id IS NULL AND status = 'open')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Update tickets by role"
ON public.tickets FOR UPDATE TO authenticated
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

CREATE POLICY "Admins delete tickets"
ON public.tickets FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ ATTACHMENTS ============
CREATE TABLE public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 26214400),
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_ticket ON public.ticket_attachments(ticket_id);
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View attachments via ticket"
ON public.ticket_attachments FOR SELECT TO authenticated
USING (public.can_view_ticket(ticket_id, auth.uid()));

CREATE POLICY "Upload attachments to viewable ticket"
ON public.ticket_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.can_view_ticket(ticket_id, auth.uid())
);

CREATE POLICY "Delete own attachments or admin"
ON public.ticket_attachments FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ EVENTS (audit timeline) ============
CREATE TABLE public.ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type public.ticket_event_type NOT NULL,
  from_value TEXT,
  to_value TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_ticket ON public.ticket_events(ticket_id, created_at DESC);
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View events via ticket"
ON public.ticket_events FOR SELECT TO authenticated
USING (public.can_view_ticket(ticket_id, auth.uid()));

CREATE POLICY "Insert events on viewable ticket"
ON public.ticket_events FOR INSERT TO authenticated
WITH CHECK (
  (actor_id IS NULL OR actor_id = auth.uid())
  AND public.can_view_ticket(ticket_id, auth.uid())
);

-- ============ AUTO-LOG TRIGGERS ============
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, to_value)
    VALUES (NEW.id, NEW.student_id, 'created', NEW.status::TEXT);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::TEXT, NEW.status::TEXT);
      IF NEW.status = 'resolved' AND NEW.resolved_at IS NULL THEN
        NEW.resolved_at = now();
      END IF;
      IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN
        NEW.closed_at = now();
      END IF;
    END IF;
    IF NEW.assigned_expert_id IS DISTINCT FROM OLD.assigned_expert_id THEN
      IF NEW.assigned_expert_id IS NULL THEN
        INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, from_value)
        VALUES (NEW.id, auth.uid(), 'unassigned', OLD.assigned_expert_id::TEXT);
      ELSE
        INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, from_value, to_value)
        VALUES (NEW.id, auth.uid(),
          CASE WHEN auth.uid() = NEW.assigned_expert_id THEN 'claimed' ELSE 'assigned' END,
          OLD.assigned_expert_id::TEXT, NEW.assigned_expert_id::TEXT);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tickets_log_insert
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_changes();

CREATE TRIGGER trg_tickets_log_update
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_changes();

-- Log attachments automatically
CREATE OR REPLACE FUNCTION public.log_attachment_added()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, to_value, message)
  VALUES (NEW.ticket_id, NEW.uploaded_by, 'attachment_added', NEW.file_name, NEW.mime_type);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attachment_log
AFTER INSERT ON public.ticket_attachments
FOR EACH ROW EXECUTE FUNCTION public.log_attachment_added();

-- ============ CLAIM / ASSIGN HELPERS ============
CREATE OR REPLACE FUNCTION public.claim_ticket(_ticket_id UUID)
RETURNS public.tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ticket public.tickets;
BEGIN
  IF NOT public.has_role(auth.uid(), 'expert') AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only experts can claim tickets';
  END IF;

  UPDATE public.tickets
  SET assigned_expert_id = auth.uid(),
      status = CASE WHEN status = 'open' THEN 'assigned'::ticket_status ELSE status END
  WHERE id = _ticket_id
    AND assigned_expert_id IS NULL
    AND status = 'open'
  RETURNING * INTO _ticket;

  IF _ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket not available to claim';
  END IF;

  RETURN _ticket;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_ticket(_ticket_id UUID, _expert_id UUID)
RETURNS public.tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ticket public.tickets;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign tickets';
  END IF;
  IF _expert_id IS NOT NULL AND NOT public.has_role(_expert_id, 'expert') THEN
    RAISE EXCEPTION 'Target user is not an expert';
  END IF;

  UPDATE public.tickets
  SET assigned_expert_id = _expert_id,
      status = CASE
        WHEN _expert_id IS NULL THEN 'open'::ticket_status
        WHEN status = 'open' THEN 'assigned'::ticket_status
        ELSE status
      END
  WHERE id = _ticket_id
  RETURNING * INTO _ticket;

  RETURN _ticket;
END;
$$;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Storage path convention: {ticket_id}/{filename}
CREATE POLICY "Read ticket files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND public.can_view_ticket(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Upload ticket files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND public.can_view_ticket(((storage.foldername(name))[1])::uuid, auth.uid())
  AND owner = auth.uid()
);

CREATE POLICY "Delete own ticket files or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);