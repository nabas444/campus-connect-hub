import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Notification,
  countUnread,
  listMyNotifications,
  markAllRead as markAllReadApi,
  markRead as markReadApi,
  removeNotification as removeApi,
} from "@/lib/notifications";

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [list, n] = await Promise.all([listMyNotifications(50), countUnread()]);
      setItems(list);
      setUnread(n);
    } catch (err) {
      console.error("notifications refresh", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      return;
    }
    refresh();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try { await markReadApi(id); } catch { refresh(); }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnread(0);
    try { await markAllReadApi(); } catch { refresh(); }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try { await removeApi(id); } catch { refresh(); } finally { refresh(); }
  }, [refresh]);

  return { items, unread, loading, refresh, markRead, markAllRead, remove };
}