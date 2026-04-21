
-- ============ CHAT THREADS ============
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  CONSTRAINT chat_thread_parent_check CHECK (
    (ticket_id IS NOT NULL AND project_id IS NULL) OR
    (ticket_id IS NULL AND project_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX chat_threads_ticket_uniq ON public.chat_threads(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE UNIQUE INDEX chat_threads_project_uniq ON public.chat_threads(project_id) WHERE project_id IS NOT NULL;

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

-- ============ MESSAGES ============
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT,
  attachment_path TEXT,
  attachment_name TEXT,
  attachment_size BIGINT,
  attachment_mime TEXT,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_thread_created_idx ON public.chat_messages(thread_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============ READS ============
CREATE TABLE public.chat_reads (
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;

-- ============ ACCESS HELPER ============
CREATE OR REPLACE FUNCTION public.can_access_thread(_thread_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_threads ct
    LEFT JOIN public.tickets t ON t.id = ct.ticket_id
    LEFT JOIN public.projects p ON p.id = ct.project_id
    WHERE ct.id = _thread_id
      AND (
        public.has_role(_user_id, 'admin')
        OR (t.id IS NOT NULL AND (t.student_id = _user_id OR t.assigned_expert_id = _user_id))
        OR (p.id IS NOT NULL AND (p.student_id = _user_id OR p.assigned_expert_id = _user_id))
      )
  )
$$;

-- ============ RLS POLICIES ============
-- threads
CREATE POLICY "View threads if participant"
  ON public.chat_threads FOR SELECT TO authenticated
  USING (public.can_access_thread(id, auth.uid()));

CREATE POLICY "Insert threads if participant"
  ON public.chat_threads FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (ticket_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
        AND (t.student_id = auth.uid() OR t.assigned_expert_id = auth.uid())
    ))
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id
        AND (p.student_id = auth.uid() OR p.assigned_expert_id = auth.uid())
    ))
  );

-- messages
CREATE POLICY "View messages in accessible threads"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.can_access_thread(thread_id, auth.uid()));

CREATE POLICY "Send messages in accessible threads"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_thread(thread_id, auth.uid()));

CREATE POLICY "Edit own messages"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Delete own messages or admin"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- reads
CREATE POLICY "View own reads"
  ON public.chat_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Upsert own reads"
  ON public.chat_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_thread(thread_id, auth.uid()));

CREATE POLICY "Update own reads"
  ON public.chat_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.bump_thread_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads
    SET last_message_at = NEW.created_at, updated_at = NEW.created_at
    WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_thread AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_thread_on_message();

CREATE TRIGGER trg_chat_threads_updated_at BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ THREAD ENSURE FUNCTION ============
CREATE OR REPLACE FUNCTION public.ensure_thread(_ticket_id UUID, _project_id UUID)
RETURNS public.chat_threads
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _thread public.chat_threads;
  _allowed BOOLEAN := false;
BEGIN
  IF (_ticket_id IS NULL) = (_project_id IS NULL) THEN
    RAISE EXCEPTION 'Provide exactly one of ticket_id or project_id';
  END IF;

  IF _ticket_id IS NOT NULL THEN
    SELECT (t.student_id = auth.uid() OR t.assigned_expert_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
      INTO _allowed FROM public.tickets t WHERE t.id = _ticket_id;
  ELSE
    SELECT (p.student_id = auth.uid() OR p.assigned_expert_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
      INTO _allowed FROM public.projects p WHERE p.id = _project_id;
  END IF;

  IF NOT COALESCE(_allowed, false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _ticket_id IS NOT NULL THEN
    SELECT * INTO _thread FROM public.chat_threads WHERE ticket_id = _ticket_id;
  ELSE
    SELECT * INTO _thread FROM public.chat_threads WHERE project_id = _project_id;
  END IF;

  IF _thread.id IS NULL THEN
    INSERT INTO public.chat_threads (ticket_id, project_id)
      VALUES (_ticket_id, _project_id) RETURNING * INTO _thread;
  END IF;

  RETURN _thread;
END;
$$;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments','chat-attachments', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Chat attachments view by thread participants"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.can_access_thread(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "Chat attachments upload by thread participants"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.can_access_thread(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "Chat attachments delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid());

-- ============ REALTIME ============
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_reads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
