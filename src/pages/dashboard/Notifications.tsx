import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { NOTIFICATION_LABELS, Notification, NotificationType } from "@/lib/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { items, unread, loading, markRead, markAllRead, remove } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread" | NotificationType>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read_at);
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const handleClick = async (n: Notification) => {
    if (!n.read_at) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Everything that happened across your tickets, projects, messages and payouts.</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread {unread > 0 && <span className="ml-1 text-accent">({unread})</span>}</TabsTrigger>
          <TabsTrigger value="new_message">Messages</TabsTrigger>
          <TabsTrigger value="ticket_assigned">Tickets</TabsTrigger>
          <TabsTrigger value="project_assigned">Projects</TabsTrigger>
          <TabsTrigger value="milestone_status">Milestones</TabsTrigger>
          <TabsTrigger value="new_review">Reviews</TabsTrigger>
          <TabsTrigger value="payout_status">Payouts</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((n) => (
                <li key={n.id} className={cn("group flex gap-3 px-4 py-4 hover:bg-muted/40 transition-colors", !n.read_at && "bg-accent/5")}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", !n.read_at ? "bg-accent" : "bg-transparent")} aria-hidden />
                  <button onClick={() => handleClick(n)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase">{NOTIFICATION_LABELS[n.type]}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="mt-1 font-medium">{n.title}</div>
                    {n.body && <div className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{n.body}</div>}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={() => remove(n.id)}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 && !loading && (
        <p className="text-center text-xs text-muted-foreground inline-flex items-center gap-1.5 mx-auto justify-center w-full">
          <Bell className="h-3 w-3" /> Notifications appear here in real time.
        </p>
      )}
    </div>
  );
}