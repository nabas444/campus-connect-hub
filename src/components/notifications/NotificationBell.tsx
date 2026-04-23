import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NOTIFICATION_LABELS, Notification } from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = async (n: Notification) => {
    if (!n.read_at) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-accent" />
            <span className="font-medium text-sm">Notifications</span>
            {unread > 0 && <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-accent/40 text-accent">{unread} new</Badge>}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">You're all caught up.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y divide-border">
              {items.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3",
                      !n.read_at && "bg-accent/5",
                    )}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", !n.read_at ? "bg-accent" : "bg-transparent")} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px] uppercase">{NOTIFICATION_LABELS[n.type]}</Badge>
                        <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="mt-1 text-sm font-medium truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <div className="border-t border-border px-4 py-2">
          <Link
            to="/dashboard/notifications"
            className="block text-center text-xs text-muted-foreground hover:text-foreground py-1"
          >
            View all notifications →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}