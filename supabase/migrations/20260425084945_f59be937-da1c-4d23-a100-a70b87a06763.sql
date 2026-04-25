CREATE OR REPLACE FUNCTION public.log_ticket_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, to_value)
    VALUES (NEW.id, NEW.student_id, 'created'::ticket_event_type, NEW.status::TEXT);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed'::ticket_event_type, OLD.status::TEXT, NEW.status::TEXT);
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
        VALUES (NEW.id, auth.uid(), 'unassigned'::ticket_event_type, OLD.assigned_expert_id::TEXT);
      ELSE
        INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, from_value, to_value)
        VALUES (NEW.id, auth.uid(),
          (CASE WHEN auth.uid() = NEW.assigned_expert_id THEN 'claimed' ELSE 'assigned' END)::ticket_event_type,
          OLD.assigned_expert_id::TEXT, NEW.assigned_expert_id::TEXT);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_attachment_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, to_value, message)
  VALUES (NEW.ticket_id, NEW.uploaded_by, 'attachment_added'::ticket_event_type, NEW.file_name, NEW.mime_type);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_project_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_events (project_id, actor_id, event_type, to_value)
    VALUES (NEW.id, NEW.student_id, 'created'::project_event_type, NEW.status::TEXT);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.project_events (project_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed'::project_event_type, OLD.status::TEXT, NEW.status::TEXT);
      IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
        NEW.completed_at = now();
      END IF;
    END IF;
    IF NEW.assigned_expert_id IS DISTINCT FROM OLD.assigned_expert_id THEN
      IF NEW.assigned_expert_id IS NULL THEN
        INSERT INTO public.project_events (project_id, actor_id, event_type, from_value)
        VALUES (NEW.id, auth.uid(), 'unassigned'::project_event_type, OLD.assigned_expert_id::TEXT);
      ELSE
        INSERT INTO public.project_events (project_id, actor_id, event_type, from_value, to_value)
        VALUES (NEW.id, auth.uid(),
          (CASE WHEN auth.uid() = NEW.assigned_expert_id THEN 'claimed' ELSE 'assigned' END)::project_event_type,
          OLD.assigned_expert_id::TEXT, NEW.assigned_expert_id::TEXT);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_milestone_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_events (project_id, milestone_id, actor_id, event_type, to_value, message)
    VALUES (NEW.project_id, NEW.id, auth.uid(), 'milestone_added'::project_event_type, NEW.status::TEXT, NEW.title);
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
$function$;

CREATE OR REPLACE FUNCTION public.log_deliverable_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.project_events (project_id, milestone_id, actor_id, event_type, to_value, message)
  VALUES (NEW.project_id, NEW.milestone_id, NEW.uploaded_by, 'deliverable_added'::project_event_type, NEW.file_name, NEW.note);
  RETURN NEW;
END;
$function$;