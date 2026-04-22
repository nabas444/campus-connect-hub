import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Activity, UserPlus, UserMinus, Calendar, DollarSign,
  Upload, Download, CheckCircle2, XCircle, ChevronRight, FileText,
} from "lucide-react";
import { ProjectStatusBadge, MilestoneStatusBadge } from "@/components/projects/StatusBadges";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { MessageSquare } from "lucide-react";
import { ExpertCard } from "@/components/experts/ExpertCard";
import { ReviewForm } from "@/components/experts/ReviewForm";
import { getMyReviewForProject, type ExpertReview } from "@/lib/experts";
import {
  PROJECT_STATUSES, MILESTONE_STATUSES, formatCurrency, formatDate, timeAgo, formatBytes,
  type ProjectRow, type MilestoneRow, type DeliverableRow, type ProjectEventRow,
  type ProjectStatus, type MilestoneStatus,
} from "@/lib/projects";

type Expert = { user_id: string; full_name: string | null; email: string | null };

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [events, setEvents] = useState<ProjectEventRow[]>([]);
  const [studentName, setStudentName] = useState("");
  const [expertName, setExpertName] = useState("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [myReview, setMyReview] = useState<ExpertReview | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, { data: ms }, { data: dv }, { data: ev }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("milestones").select("*").eq("project_id", id).order("position"),
      supabase.from("deliverables").select("*").eq("project_id", id).order("created_at"),
      supabase.from("project_events").select("*").eq("project_id", id).order("created_at"),
    ]);
    setProject(p as ProjectRow | null);
    setMilestones((ms ?? []) as MilestoneRow[]);
    setDeliverables((dv ?? []) as DeliverableRow[]);
    setEvents((ev ?? []) as ProjectEventRow[]);

    if (p) {
      const ids = [p.student_id, p.assigned_expert_id].filter(Boolean) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        const sP = profs?.find((x) => x.id === p.student_id);
        const eP = profs?.find((x) => x.id === p.assigned_expert_id);
        setStudentName(sP?.full_name || sP?.email || "Student");
        setExpertName(eP?.full_name || eP?.email || "");
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!user || !project?.id) return;
    getMyReviewForProject(project.id, user.id).then(setMyReview).catch(() => setMyReview(null));
  }, [user, project?.id, project?.status]);

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

  if (loading) return <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</Card>;
  if (!project) return (
    <Card className="p-12 text-center">
      <p className="font-medium">Project not found</p>
      <Button variant="link" asChild><Link to="/dashboard/assignments">Back to projects</Link></Button>
    </Card>
  );

  const isOwnerStudent = user?.id === project.student_id;
  const isAssignedExpert = user?.id === project.assigned_expert_id;
  const isAdmin = role === "admin";

  const allowedProjectStatuses: ProjectStatus[] =
    isAdmin ? PROJECT_STATUSES.map((s) => s.value)
    : isOwnerStudent ? (["draft","open","cancelled","completed"] as ProjectStatus[]).filter((s) =>
        // can publish from draft, cancel, mark complete from review
        (project.status === "draft" && (s === "draft" || s === "open" || s === "cancelled")) ||
        (project.status === "open" && (s === "open" || s === "cancelled")) ||
        (project.status === "review" && (s === "review" || s === "completed")) ||
        (project.status === s)
      )
    : isAssignedExpert ? ["in_progress","review"] as ProjectStatus[]
    : [];

  const updateProjectStatus = async (s: ProjectStatus) => {
    setBusy(true);
    const { error } = await supabase.from("projects").update({ status: s }).eq("id", project.id);
    setBusy(false);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Status updated" });
    load();
  };

  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("claim_project", { _project_id: project.id });
    setBusy(false);
    if (error) return toast({ title: "Claim failed", description: error.message, variant: "destructive" });
    toast({ title: "Project claimed" });
    load();
  };

  const assign = async (expertId: string | null) => {
    setBusy(true);
    const { error } = await supabase.rpc("assign_project", { _project_id: project.id, _expert_id: expertId });
    setBusy(false);
    if (error) return toast({ title: "Assign failed", description: error.message, variant: "destructive" });
    toast({ title: expertId ? "Expert assigned" : "Project unassigned" });
    load();
  };

  const setMilestoneStatus = async (m: MilestoneRow, s: MilestoneStatus) => {
    setBusy(true);
    const { error } = await supabase.rpc("set_milestone_status", { _milestone_id: m.id, _new_status: s });
    setBusy(false);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  };

  const downloadFile = async (d: DeliverableRow) => {
    const { data, error } = await supabase.storage.from("project-deliverables").createSignedUrl(d.storage_path, 60);
    if (error) return toast({ title: "Download failed", description: error.message, variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const uploadDeliverable = async (m: MilestoneRow, file: File, note: string) => {
    if (!user) return;
    if (file.size > MAX_FILE_SIZE) {
      return toast({ title: "File too large", description: `Max ${formatBytes(MAX_FILE_SIZE)}`, variant: "destructive" });
    }
    const path = `${project.id}/${m.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("project-deliverables").upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (upErr) return toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
    const { error } = await supabase.from("deliverables").insert({
      project_id: project.id, milestone_id: m.id, uploaded_by: user.id,
      storage_path: path, file_name: file.name, file_size: file.size,
      mime_type: file.type || null, note: note || null,
    } as any);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });

    // Auto-bump milestone to submitted if expert uploaded
    if (isAssignedExpert && (m.status === "pending" || m.status === "in_progress")) {
      await supabase.rpc("set_milestone_status", { _milestone_id: m.id, _new_status: "submitted" });
    }
    toast({ title: "Deliverable uploaded" });
    load();
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/assignments")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold">{project.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Posted by {studentName} • {timeAgo(project.created_at)}
                </p>
              </div>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">{project.subject}</Badge>
              {project.deadline && <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />{formatDate(project.deadline)}</Badge>}
              {project.total_budget != null && <Badge variant="outline" className="gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(project.total_budget)}</Badge>}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90">
              {project.brief}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Milestones ({milestones.length})</h2>
            </div>
            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  index={idx}
                  deliverables={deliverables.filter((d) => d.milestone_id === m.id)}
                  isOwnerStudent={isOwnerStudent}
                  isAssignedExpert={isAssignedExpert}
                  isAdmin={isAdmin}
                  busy={busy}
                  onStatus={(s) => setMilestoneStatus(m, s)}
                  onUpload={(f, n) => uploadDeliverable(m, f, n)}
                  onDownload={downloadFile}
                />
              ))}
              {milestones.length === 0 && <p className="text-sm text-muted-foreground">No milestones yet.</p>}
            </div>
          </Card>

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

          {(isOwnerStudent || isAssignedExpert || isAdmin) && (
            <Card className="p-6">
              <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4" /> Chat
              </h2>
              <ChatPanel projectId={project.id} />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-display font-semibold">Details</h3>
            <Field label="Status">
              {allowedProjectStatuses.length > 0 ? (
                <Select value={project.status} onValueChange={(v) => updateProjectStatus(v as ProjectStatus)} disabled={busy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.filter((s) => allowedProjectStatuses.includes(s.value)).map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : <ProjectStatusBadge status={project.status} />}
            </Field>
            <Field label="Assigned expert">
              {isAdmin ? (
                <Select value={project.assigned_expert_id ?? "none"} onValueChange={(v) => assign(v === "none" ? null : v)} disabled={busy}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {experts.map((e) => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name || e.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <p className="text-sm">{expertName || <span className="text-muted-foreground">Unassigned</span>}</p>}
            </Field>
            <Field label="Subject"><Badge variant="outline">{project.subject}</Badge></Field>
            <Field label="Budget"><p className="text-sm">{formatCurrency(project.total_budget as any)}</p></Field>
            <Field label="Deadline"><p className="text-sm">{formatDate(project.deadline)}</p></Field>

            {role === "expert" && !project.assigned_expert_id && project.status === "open" && (
              <Button variant="hero" className="w-full gap-2" onClick={claim} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Claim project
              </Button>
            )}
            {isAdmin && project.assigned_expert_id && (
              <Button variant="outline" className="w-full gap-2" onClick={() => assign(null)} disabled={busy}>
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

function MilestoneCard({
  milestone, index, deliverables, isOwnerStudent, isAssignedExpert, isAdmin, busy,
  onStatus, onUpload, onDownload,
}: {
  milestone: MilestoneRow;
  index: number;
  deliverables: DeliverableRow[];
  isOwnerStudent: boolean;
  isAssignedExpert: boolean;
  isAdmin: boolean;
  busy: boolean;
  onStatus: (s: MilestoneStatus) => void;
  onUpload: (file: File, note: string) => void;
  onDownload: (d: DeliverableRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const canUpload = isAssignedExpert || isAdmin || isOwnerStudent;
  const canApprove = (isOwnerStudent || isAdmin) && milestone.status === "submitted";
  const allowedStatuses: MilestoneStatus[] =
    isAdmin ? MILESTONE_STATUSES.map((s) => s.value)
    : isAssignedExpert ? ["pending","in_progress","submitted"]
    : isOwnerStudent && milestone.status === "submitted" ? ["approved","rejected","submitted"]
    : isOwnerStudent && milestone.status === "rejected" ? ["rejected"]
    : [];

  const handleFile = (f: File | null) => {
    if (!f) return;
    onUpload(f, note);
    setNote("");
  };

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-muted-foreground shrink-0">#{index + 1}</span>
          <span className="font-medium truncate">{milestone.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {milestone.price != null && <span className="text-xs text-muted-foreground hidden sm:inline">{formatCurrency(milestone.price as any)}</span>}
          {milestone.due_date && <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(milestone.due_date)}</span>}
          <MilestoneStatusBadge status={milestone.status} />
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/20">
          {milestone.description && (
            <p className="text-sm whitespace-pre-wrap text-foreground/90">{milestone.description}</p>
          )}

          {/* Deliverables */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Deliverables ({deliverables.length})</p>
            {deliverables.length > 0 ? (
              <ul className="space-y-1.5">
                {deliverables.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate">{d.file_name}</div>
                        {d.note && <div className="text-xs text-muted-foreground truncate">{d.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{formatBytes(d.file_size)}</span>
                      <Button size="sm" variant="ghost" onClick={() => onDownload(d)} className="gap-1.5"><Download className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No files yet.</p>
            )}
          </div>

          {/* Upload */}
          {canUpload && (
            <div className="space-y-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g. 'v2 with feedback applied')"
                maxLength={1000}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted cursor-pointer transition-colors">
                <Upload className="h-4 w-4" /> Upload deliverable
                <input type="file" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </label>
            </div>
          )}

          {/* Status / Approval actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {canApprove && (
              <>
                <Button size="sm" variant="hero" className="gap-1.5" onClick={() => onStatus("approved")} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onStatus("rejected")} disabled={busy}>
                  <XCircle className="h-4 w-4" /> Request changes
                </Button>
              </>
            )}
            {allowedStatuses.length > 0 && (
              <Select value={milestone.status} onValueChange={(v) => onStatus(v as MilestoneStatus)} disabled={busy}>
                <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MILESTONE_STATUSES.filter((s) => allowedStatuses.includes(s.value)).map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function eventLabel(e: ProjectEventRow): string {
  switch (e.event_type) {
    case "created": return "Project created";
    case "status_changed": return `Project: ${e.from_value} → ${e.to_value}`;
    case "assigned": return "Expert assigned";
    case "claimed": return "Expert claimed the project";
    case "unassigned": return "Expert unassigned";
    case "milestone_added": return `Milestone added: ${e.message ?? ""}`;
    case "milestone_status_changed": return `${e.message}: ${e.from_value} → ${e.to_value}`;
    case "milestone_approved": return `Milestone approved: ${e.message ?? ""}`;
    case "milestone_rejected": return `Changes requested: ${e.message ?? ""}`;
    case "deliverable_added": return `File uploaded: ${e.to_value}`;
    case "commented": return e.message ?? "Comment";
    default: return e.event_type;
  }
}
