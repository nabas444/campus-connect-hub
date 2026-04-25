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
import { Search, Ticket as TicketIcon, Inbox, Loader2 } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/tickets/StatusBadge";
import { NewTicketDialog } from "@/components/tickets/NewTicketDialog";
import {
  CATEGORIES, STATUSES, CATEGORY_LABEL, timeAgo,
  type TicketRow, type TicketStatus, type TicketCategory,
} from "@/lib/tickets";

type FilterStatus = TicketStatus | "all" | "active";
type FilterCategory = TicketCategory | "all";
type Tab = "mine" | "queue" | "all";

export default function Tickets() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(role === "student" ? "mine" : role === "expert" ? "mine" : "all");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [category, setCategory] = useState<FilterCategory>("all");
  const [q, setQ] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("tickets").select("*").order("created_at", { ascending: false });

    if (role === "student") {
      query = query.eq("student_id", user.id);
    } else if (role === "expert") {
      if (tab === "mine") query = query.eq("assigned_expert_id", user.id);
      else if (tab === "queue") query = query.is("assigned_expert_id", null).eq("status", "open");
    }
    // admin sees everything

    const { data, error } = await query;
    if (error) toast({ title: "Failed to load tickets", description: error.message, variant: "destructive" });
    setTickets((data ?? []) as TicketRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, role, tab]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (status === "active" && (t.status === "resolved" || t.status === "closed")) return false;
      if (status !== "all" && status !== "active" && t.status !== status) return false;
      if (category !== "all" && t.category !== category) return false;
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [tickets, status, category, q]);

  const claim = async (id: string) => {
    setClaiming(id);
    const { error } = await supabase.rpc("claim_ticket", { _ticket_id: id });
    setClaiming(null);
    if (error) {
      toast({ title: "Couldn't claim ticket", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ticket claimed", description: "You're now assigned." });
    load();
  };

  const tabs: { id: Tab; label: string }[] =
    role === "student" ? [{ id: "mine", label: "My tickets" }]
    : role === "expert" ? [{ id: "mine", label: "Assigned to me" }, { id: "queue", label: "Open queue" }]
    : [{ id: "all", label: "All tickets" }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {role === "student" ? "Tech support" : role === "expert" ? "Tickets" : "All tickets"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "student" ? "Submit and track your support requests." :
             role === "expert" ? "Claim from the queue or work on assigned tickets." :
             "Oversee, assign, and resolve every ticket on the platform."}
          </p>
        </div>
        {role === "student" && <NewTicketDialog onCreated={load} />}
      </div>

      {/* Tabs */}
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active only (hide resolved & closed)</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => setCategory(v as FilterCategory)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <Card className="p-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No tickets here</p>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "student" ? "Submit your first ticket to get help."
             : tab === "queue" ? "The queue is clear. Great work."
             : "Nothing matches your filters."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/dashboard/tickets/${t.id}`} className="font-medium hover:text-accent transition-colors line-clamp-1">
                    {t.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-normal">{CATEGORY_LABEL[t.category]}</Badge>
                    <span>•</span>
                    <span>{timeAgo(t.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                  {role === "expert" && tab === "queue" && (
                    <Button size="sm" variant="hero" onClick={() => claim(t.id)} disabled={claiming === t.id}>
                      {claiming === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketIcon className="h-4 w-4" />}
                      Claim
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
