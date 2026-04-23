-- Notification types enum
CREATE TYPE public.notification_type AS ENUM (
  'ticket_assigned',
  'project_assigned',
  'milestone_status',
  'new_message',
  'new_review',
  'payout_status'
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  ticket_id UUID,
  project_id UUID,
  thread_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Helper: insert a notification (security definer to bypass RLS for system events)
CREATE OR REPLACE FUNCTION public.notify(
  _user_id UUID,
  _type public.notification_type,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL,
  _ticket_id UUID DEFAULT NULL,
  _project_id UUID DEFAULT NULL,
  _thread_id UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link, ticket_id, project_id, thread_id)
  VALUES (_user_id, _type, _title, _body, _link, _ticket_id, _project_id, _thread_id);
END;
$$;

-- Mark all read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.notifications SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

-- Trigger: ticket assigned
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_expert_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.assigned_expert_id IS DISTINCT FROM OLD.assigned_expert_id) THEN
    PERFORM public.notify(
      NEW.assigned_expert_id, 'ticket_assigned',
      'New ticket assigned', NEW.title,
      '/dashboard/tickets/' || NEW.id::text,
      NEW.id, NULL, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_ticket_assigned
  AFTER INSERT OR UPDATE OF assigned_expert_id ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_assigned();

-- Trigger: project assigned
CREATE OR REPLACE FUNCTION public.notify_project_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_expert_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.assigned_expert_id IS DISTINCT FROM OLD.assigned_expert_id) THEN
    PERFORM public.notify(
      NEW.assigned_expert_id, 'project_assigned',
      'New project assigned', NEW.title,
      '/dashboard/assignments/' || NEW.id::text,
      NULL, NEW.id, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_project_assigned
  AFTER INSERT OR UPDATE OF assigned_expert_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_assigned();

-- Trigger: milestone status changes (notify the project's student)
CREATE OR REPLACE FUNCTION public.notify_milestone_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _student UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT student_id INTO _student FROM public.projects WHERE id = NEW.project_id;
    PERFORM public.notify(
      _student, 'milestone_status',
      'Milestone ' || NEW.status::text,
      NEW.title,
      '/dashboard/assignments/' || NEW.project_id::text,
      NULL, NEW.project_id, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_milestone_status
  AFTER UPDATE OF status ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.notify_milestone_status();

-- Trigger: new chat message (notify other participant)
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _thread public.chat_threads;
  _ticket public.tickets;
  _project public.projects;
  _link TEXT;
  _title TEXT;
BEGIN
  SELECT * INTO _thread FROM public.chat_threads WHERE id = NEW.thread_id;
  IF _thread.ticket_id IS NOT NULL THEN
    SELECT * INTO _ticket FROM public.tickets WHERE id = _thread.ticket_id;
    _link := '/dashboard/tickets/' || _ticket.id::text;
    _title := 'New message on ticket: ' || _ticket.title;
    IF _ticket.student_id IS NOT NULL AND _ticket.student_id <> NEW.sender_id THEN
      PERFORM public.notify(_ticket.student_id, 'new_message', _title, NEW.body, _link, _ticket.id, NULL, _thread.id);
    END IF;
    IF _ticket.assigned_expert_id IS NOT NULL AND _ticket.assigned_expert_id <> NEW.sender_id THEN
      PERFORM public.notify(_ticket.assigned_expert_id, 'new_message', _title, NEW.body, _link, _ticket.id, NULL, _thread.id);
    END IF;
  ELSIF _thread.project_id IS NOT NULL THEN
    SELECT * INTO _project FROM public.projects WHERE id = _thread.project_id;
    _link := '/dashboard/assignments/' || _project.id::text;
    _title := 'New message on project: ' || _project.title;
    IF _project.student_id IS NOT NULL AND _project.student_id <> NEW.sender_id THEN
      PERFORM public.notify(_project.student_id, 'new_message', _title, NEW.body, _link, NULL, _project.id, _thread.id);
    END IF;
    IF _project.assigned_expert_id IS NOT NULL AND _project.assigned_expert_id <> NEW.sender_id THEN
      PERFORM public.notify(_project.assigned_expert_id, 'new_message', _title, NEW.body, _link, NULL, _project.id, _thread.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Trigger: new review (notify expert)
CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify(
    NEW.expert_id, 'new_review',
    'You received a new review',
    NEW.rating::text || '★ — ' || COALESCE(LEFT(NEW.comment, 120), ''),
    '/dashboard/experts/' || NEW.expert_id::text,
    NULL, NEW.project_id, NULL
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_review
  AFTER INSERT ON public.expert_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_review();

-- Trigger: payout status change (notify expert)
CREATE OR REPLACE FUNCTION public.notify_payout_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify(
      NEW.expert_id, 'payout_status',
      'Payout ' || NEW.status::text,
      'Amount: ' || NEW.amount::text || ' ' || upper(NEW.currency),
      '/dashboard/earnings',
      NULL, NULL, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_payout_status
  AFTER UPDATE OF status ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.notify_payout_status();