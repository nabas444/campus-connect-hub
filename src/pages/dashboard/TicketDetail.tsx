import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Paperclip, Download, Activity, UserPlus, UserMinus } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/tickets/StatusBadge";
import {
  CATEGORY_LABEL, STATUSES, timeAgo, formatBytes,
  type TicketRow, type AttachmentRow, type EventRow, type TicketStatus,
} from "@/lib/tickets";

type Expert = { user_id: string; full_name: string | null; email: string | null };

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [studentName, setStudentName] = useState<string>("");
  const [expertName, setExpertName] = useState<string>("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: t }, { data: atts }, { data: evs }] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", id).maybeSingle(),
      supabase.from("ticket_attachments").select("*").eq("ticket_id", id).order("created_at"),
      supabase.from("ticket_events").select("*").eq("ticket_id", id).order("created_at"),
    ]);
    setTicket(t as TicketRow | null);
    setAttachments((atts ?? []) as AttachmentRow[]);
    setEvents((evs ?? []) as EventRow[]);

    if (t) {
      const ids = [t.student_id, t.assigned_expert_id].filter(Boolean) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        const studentP = profs?.find((p) => p.id === t.student_id);
        const expertP = profs?.find((p) => p.id === t.assigned_expert_id);
        setStudentName(studentP?.full_name || studentP?.email || "Student");
        setExpertName(expertP?.full_name || expertP?.email || "");
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Load expert list for admin
  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "expert");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return;
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      setExperts((profs ?? []).map((p) => ({ user_id: p.id, full_name: p.full_name, email: p.email })));
    })();
  }, [role]);

  if (loading) {
    return <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</Card>;
  }
  if (!ticket) {
    return (
      <Card className="p-12 text-center">
        <p className="font-medium">Ticket not found</p>
        <Button variant="link" asChild><Link to="/dashboard/tickets">Back to tickets</Link></Button>
      </Card>
    );
  }

  const isOwnerStudent = user?.id === ticket.student_id;
  const isAssignedExpert = user?.id === ticket.assigned_expert_id;
  const canChangeStatus = role === "admin" || isAssignedExpert || isOwnerStudent;

  const allowedStatuses: TicketStatus[] =
    role === "admin"
      ? STATUSES.map((s) => s.value)
      : isAssignedExpert
        ? ["assigned", "in_progress", "waiting_on_student", "resolved", "closed"]
        : isOwnerStudent
          ? ticket.status === "resolved" ? ["resolved", "closed"]
          : ticket.status === "waiting_on_student" ? ["waiting_on_student", "in_progress"]
          : []
        : [];

  const updateStatus = async (newStatus: TicketStatus) => {
    setUpdating(true);
    const { error } = await supabase.from("tickets").update({ status: newStatus }).eq("id", ticket.id);
    setUpdating(false);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Status updated" });
    load();
  };

  const claim = async () => {
    setUpdating(true);
    const { error } = await supabase.rpc("claim_ticket", { _ticket_id: ticket.id });
    setUpdating(false);
    if (error) { toast({ title: "Claim failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ticket claimed" });
    load();
  };

  const assign = async (expertId: string | null) => {
    setUpdating(true);
    const { error } = await supabase.rpc("assign_ticket", { _ticket_id: ticket.id, _expert_id: expertId });
    setUpdating(false);
    if (error) { toast({ title: "Assign failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: expertId ? "Expert assigned" : "Ticket unassigned" });
    load();
  };

  const downloadFile = async (a: AttachmentRow) => {
    const { data, error } = await supabase.storage.from("ticket-attachments").createSignedUrl(a.storage_path, 60);
    if (error) { toast({ title: "Download failed", description: error.message, variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/tickets")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold">{ticket.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Opened by {studentName} • {timeAgo(ticket.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>
            <Badge variant="outline" className="mb-4">{CATEGORY_LABEL[ticket.category]}</Badge>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90">
              {ticket.description}
            </div>
          </Card>

          {attachments.length > 0 && (
            <Card className="p-6">
              <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
                <Paperclip className="h-4 w-4" /> Attachments ({attachments.length})
              </h2>
              <ul className="space-y-2">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.file_name}</div>
                      <div className="text-xs text-muted-foreground">{formatBytes(a.file_size)} • {timeAgo(a.created_at)}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => downloadFile(a)} className="gap-1.5">
                      <Download className="h-4 w-4" /> Open
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4" /> Activity
            </h2>
            <ol className="space-y-3 border-l-2 border-border ml-1.5 pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-accent ring-4 ring-background" />
                  <div className="text-sm">
                    <span className="font-medium">{eventLabel(e)}</span>
                    <span className="text-muted-foreground"> • {timeAgo(e.created_at)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-display font-semibold">Details</h3>
            <Field label="Status">
              {canChangeStatus && allowedStatuses.length > 0 ? (
                <Select value={ticket.status} onValueChange={(v) => updateStatus(v as TicketStatus)} disabled={updating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.filter((s) => allowedStatuses.includes(s.value)).map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : <StatusBadge status={ticket.status} />}
            </Field>
            <Field label="Assigned to">
              {role === "admin" ? (
                <Select value={ticket.assigned_expert_id ?? "none"} onValueChange={(v) => assign(v === "none" ? null : v)} disabled={updating}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {experts.map((e) => (
                      <SelectItem key={e.user_id} value={e.user_id}>{e.full_name || e.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{expertName || <span className="text-muted-foreground">Unassigned</span>}</p>
              )}
            </Field>
            <Field label="Priority"><PriorityBadge priority={ticket.priority} /></Field>
            <Field label="Category"><Badge variant="outline">{CATEGORY_LABEL[ticket.category]}</Badge></Field>
            <Field label="Created"><p className="text-sm text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</p></Field>
            {ticket.resolved_at && <Field label="Resolved"><p className="text-sm text-muted-foreground">{new Date(ticket.resolved_at).toLocaleString()}</p></Field>}

            {/* Expert claim button */}
            {role === "expert" && !ticket.assigned_expert_id && ticket.status === "open" && (
              <Button variant="hero" className="w-full gap-2" onClick={claim} disabled={updating}>
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Claim ticket
              </Button>
            )}
            {role === "admin" && ticket.assigned_expert_id && (
              <Button variant="outline" className="w-full gap-2" onClick={() => assign(null)} disabled={updating}>
                <UserMinus className="h-4 w-4" /> Unassign
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function eventLabel(e: EventRow): string {
  switch (e.event_type) {
    case "created": return "Ticket created";
    case "status_changed": return `Status: ${e.from_value} → ${e.to_value}`;
    case "assigned": return "Expert assigned";
    case "claimed": return "Expert claimed the ticket";
    case "unassigned": return "Expert unassigned";
    case "attachment_added": return `File added: ${e.to_value}`;
    case "commented": return e.message ?? "Comment added";
    default: return e.event_type;
  }
}
