import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Inbox, Loader2, Briefcase, Calendar, DollarSign } from "lucide-react";
import { ProjectStatusBadge } from "@/components/projects/StatusBadges";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import {
  PROJECT_STATUSES, SUBJECTS, formatCurrency, formatDate, timeAgo,
  type ProjectRow, type ProjectStatus,
} from "@/lib/projects";

type FilterStatus = ProjectStatus | "all" | "active";
type Tab = "mine" | "queue" | "all";

export default function Projects() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(role === "admin" ? "all" : "mine");
  const [status, setStatus] = useState<FilterStatus>("active");
  const [subject, setSubject] = useState<string>("all");
  const [q, setQ] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });

    if (role === "student") {
      query = query.eq("student_id", user.id);
    } else if (role === "expert") {
      if (tab === "mine") query = query.eq("assigned_expert_id", user.id);
      else if (tab === "queue") query = query.is("assigned_expert_id", null).eq("status", "open");
    }

    const { data, error } = await query;
    if (error) toast({ title: "Failed to load projects", description: error.message, variant: "destructive" });
    setProjects((data ?? []) as ProjectRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, role, tab]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (status === "active" && (p.status === "completed" || p.status === "cancelled")) return false;
      if (status !== "all" && status !== "active" && p.status !== status) return false;
      if (subject !== "all" && p.subject !== subject) return false;
      if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [projects, status, subject, q]);

  const claim = async (id: string) => {
    setClaiming(id);
    const { error } = await supabase.rpc("claim_project", { _project_id: id });
    setClaiming(null);
    if (error) {
      toast({ title: "Couldn't claim project", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Project claimed", description: "It's now in your queue." });
    load();
  };

  const tabs: { id: Tab; label: string }[] =
    role === "student" ? [{ id: "mine", label: "My projects" }]
    : role === "expert" ? [{ id: "mine", label: "Assigned to me" }, { id: "queue", label: "Open queue" }]
    : [{ id: "all", label: "All projects" }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {role === "student" ? "Academic projects" : role === "expert" ? "Projects" : "All projects"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "student" ? "Post assignments and collaborate with experts on milestones."
             : role === "expert" ? "Browse the open queue or work on projects assigned to you."
             : "Oversee, assign, and review every project on the platform."}
          </p>
        </div>
        {role === "student" && <NewProjectDialog onCreated={load} />}
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {PROJECT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No projects here</p>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "student" ? "Post your first project to get started."
             : tab === "queue" ? "The queue is clear."
             : "Nothing matches your filters."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
            <Card key={p.id} className="p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Link to={`/dashboard/assignments/${p.id}`} className="font-display font-semibold hover:text-accent transition-colors line-clamp-1">
                  {p.title}
                </Link>
                <ProjectStatusBadge status={p.status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.brief}</p>
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-normal flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {p.subject}
                </Badge>
                {p.deadline && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(p.deadline)}</span>
                )}
                {p.total_budget != null && (
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatCurrency(p.total_budget)}</span>
                )}
                <span className="ml-auto">{timeAgo(p.created_at)}</span>
              </div>
              {role === "expert" && tab === "queue" && (
                <Button size="sm" variant="hero" className="mt-3 w-full" onClick={() => claim(p.id)} disabled={claiming === p.id}>
                  {claiming === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Claim project
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
