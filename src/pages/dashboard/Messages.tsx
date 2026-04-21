import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MessageSquare, Search, Ticket as TicketIcon, GraduationCap } from "lucide-react";
import { timeAgo, type ChatThread } from "@/lib/chat";

type ThreadRow = ChatThread & {
  ticket?: { id: string; title: string; student_id: string; assigned_expert_id: string | null } | null;
  project?: { id: string; title: string; student_id: string; assigned_expert_id: string | null } | null;
  lastMessage?: { body: string | null; created_at: string; sender_id: string } | null;
  unread: number;
  counterpartName: string;
};

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: thRaw } = await supabase
        .from("chat_threads").select("*").order("last_message_at", { ascending: false, nullsFirst: false });
      const ths = (thRaw ?? []) as ChatThread[];
      if (!ths.length) { if (active) { setThreads([]); setLoading(false); } return; }

      const ticketIds = ths.map((t) => t.ticket_id).filter(Boolean) as string[];
      const projectIds = ths.map((t) => t.project_id).filter(Boolean) as string[];
      const threadIds = ths.map((t) => t.id);

      const [{ data: tickets }, { data: projects }, { data: reads }, { data: lastMsgs }] = await Promise.all([
        ticketIds.length
          ? supabase.from("tickets").select("id, title, student_id, assigned_expert_id").in("id", ticketIds)
          : Promise.resolve({ data: [] as any[] }),
        projectIds.length
          ? supabase.from("projects").select("id, title, student_id, assigned_expert_id").in("id", projectIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("chat_reads").select("*").eq("user_id", user.id).in("thread_id", threadIds),
        supabase.from("chat_messages").select("thread_id, body, created_at, sender_id")
          .in("thread_id", threadIds).order("created_at", { ascending: false }),
      ]);

      // last message per thread
      const lastByThread: Record<string, { body: string | null; created_at: string; sender_id: string }> = {};
      for (const m of (lastMsgs ?? [])) {
        if (!lastByThread[m.thread_id]) lastByThread[m.thread_id] = { body: m.body, created_at: m.created_at, sender_id: m.sender_id };
      }
      const readByThread: Record<string, string> = {};
      for (const r of (reads ?? [])) readByThread[r.thread_id] = r.last_read_at;

      // counterpart profiles
      const counterpartIds = new Set<string>();
      for (const t of ths) {
        const ticket = tickets?.find((x: any) => x.id === t.ticket_id);
        const project = projects?.find((x: any) => x.id === t.project_id);
        const ref = ticket || project;
        if (!ref) continue;
        const other = ref.student_id === user.id ? ref.assigned_expert_id : ref.student_id;
        if (other) counterpartIds.add(other);
      }
      const { data: profs } = counterpartIds.size
        ? await supabase.from("profiles").select("id, full_name, email").in("id", Array.from(counterpartIds))
        : { data: [] as any[] };
      const profMap: Record<string, { full_name: string | null; email: string | null }> = {};
      for (const p of (profs ?? [])) profMap[p.id] = p;

      // unread counts
      const unreadCounts: Record<string, number> = {};
      await Promise.all(ths.map(async (t) => {
        const after = readByThread[t.id] ?? "1970-01-01";
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", t.id).gt("created_at", after).neq("sender_id", user.id);
        unreadCounts[t.id] = count ?? 0;
      }));

      const rows: ThreadRow[] = ths.map((t) => {
        const ticket = tickets?.find((x: any) => x.id === t.ticket_id) ?? null;
        const project = projects?.find((x: any) => x.id === t.project_id) ?? null;
        const ref = ticket || project;
        const otherId = ref ? (ref.student_id === user.id ? ref.assigned_expert_id : ref.student_id) : null;
        const cp = otherId ? profMap[otherId] : null;
        return {
          ...t,
          ticket, project,
          lastMessage: lastByThread[t.id] ?? null,
          unread: unreadCounts[t.id] ?? 0,
          counterpartName: cp?.full_name || cp?.email || "Unassigned",
        };
      });
      if (active) { setThreads(rows); setLoading(false); }
    };
    load();

    // realtime: refresh on new messages
    const ch = supabase.channel("messages-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const title = t.ticket?.title || t.project?.title || "";
      return title.toLowerCase().includes(q) || t.counterpartName.toLowerCase().includes(q);
    });
  }, [threads, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">All your conversations across tickets and projects.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" className="pl-9" />
      </div>

      {loading ? (
        <Card className="p-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-foreground">No conversations yet</p>
          <p className="text-sm mt-1">Open a ticket or project to start chatting.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((t) => {
            const isTicket = !!t.ticket_id;
            const href = isTicket ? `/dashboard/tickets/${t.ticket_id}` : `/dashboard/assignments/${t.project_id}`;
            const title = t.ticket?.title || t.project?.title || "(deleted)";
            const initials = (t.counterpartName[0] || "?").toUpperCase();
            return (
              <Link key={t.id} to={href}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                <Avatar className="h-11 w-11 shrink-0"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="gap-1 text-[10px] py-0 h-5">
                      {isTicket ? <TicketIcon className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                      {isTicket ? "Ticket" : "Project"}
                    </Badge>
                    <span className="font-medium truncate">{title}</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    <span className="font-medium text-foreground/80">{t.counterpartName}:</span>{" "}
                    {t.lastMessage?.body || (t.lastMessage ? "📎 Attachment" : "No messages yet")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {t.lastMessage ? timeAgo(t.lastMessage.created_at) : ""}
                  </span>
                  {t.unread > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-accent text-accent-foreground">{t.unread}</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}