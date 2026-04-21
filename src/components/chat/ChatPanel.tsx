import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Paperclip, Send, X, Download, Pencil, Trash2, Check } from "lucide-react";
import { type ChatMessage, type ChatThread, dayLabel, formatBytes, timeAgo } from "@/lib/chat";
import { Input } from "@/components/ui/input";

type Props = {
  ticketId?: string;
  projectId?: string;
  className?: string;
};

type ProfileLite = { id: string; full_name: string | null; email: string | null; avatar_url: string | null };

export function ChatPanel({ ticketId, projectId, className }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ensure thread + load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || (!ticketId && !projectId)) return;
      setLoading(true);
      const { data: th, error } = await supabase.rpc("ensure_thread", {
        _ticket_id: ticketId ?? null,
        _project_id: projectId ?? null,
      });
      if (cancelled) return;
      if (error || !th) {
        toast({ title: "Chat unavailable", description: error?.message ?? "No thread", variant: "destructive" });
        setLoading(false);
        return;
      }
      const t = th as unknown as ChatThread;
      setThread(t);
      const { data: msgs } = await supabase
        .from("chat_messages").select("*").eq("thread_id", t.id).order("created_at");
      const list = (msgs ?? []) as ChatMessage[];
      setMessages(list);
      await loadProfiles(list);
      // mark read
      await supabase.from("chat_reads").upsert({
        thread_id: t.id, user_id: user.id, last_read_at: new Date().toISOString(),
      });
      setLoading(false);
      requestAnimationFrame(scrollToBottom);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, projectId, user?.id]);

  // realtime + presence
  useEffect(() => {
    if (!thread || !user) return;
    const ch = supabase
      .channel(`thread:${thread.id}`, { config: { presence: { key: user.id } } })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${thread.id}` },
        async (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          await loadProfiles([m]);
          requestAnimationFrame(scrollToBottom);
          if (m.sender_id !== user.id) {
            supabase.from("chat_reads").upsert({
              thread_id: thread.id, user_id: user.id, last_read_at: new Date().toISOString(),
            });
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => prev.map((x) => x.id === m.id ? m : x));
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          const m = payload.old as ChatMessage;
          setMessages((prev) => prev.filter((x) => x.id !== m.id));
        })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const uid = payload?.user_id as string | undefined;
        if (!uid || uid === user.id) return;
        setTypingUsers((p) => ({ ...p, [uid]: Date.now() }));
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, user?.id]);

  // expire stale typing indicators
  useEffect(() => {
    const t = setInterval(() => {
      setTypingUsers((p) => {
        const next: Record<string, number> = {};
        const now = Date.now();
        for (const [k, v] of Object.entries(p)) if (now - v < 4000) next[k] = v;
        return next;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const loadProfiles = async (msgs: ChatMessage[]) => {
    const ids = Array.from(new Set(msgs.map((m) => m.sender_id))).filter((id) => !profiles[id]);
    if (!ids.length) return;
    const { data } = await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids);
    if (data) {
      setProfiles((p) => {
        const next = { ...p };
        for (const r of data) next[r.id] = r as ProfileLite;
        return next;
      });
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const handleType = () => {
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user?.id } });
  };

  const send = async () => {
    if (!thread || !user) return;
    const text = body.trim();
    if (!text && !pendingFile) return;
    setSending(true);
    let attachment_path: string | null = null;
    let attachment_name: string | null = null;
    let attachment_size: number | null = null;
    let attachment_mime: string | null = null;
    if (pendingFile) {
      if (pendingFile.size > 25 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 25MB.", variant: "destructive" });
        setSending(false); return;
      }
      const path = `${thread.id}/${crypto.randomUUID()}-${pendingFile.name}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, pendingFile);
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        setSending(false); return;
      }
      attachment_path = path;
      attachment_name = pendingFile.name;
      attachment_size = pendingFile.size;
      attachment_mime = pendingFile.type || null;
    }
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: thread.id, sender_id: user.id,
      body: text || null, attachment_path, attachment_name, attachment_size, attachment_mime,
    });
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    setBody(""); setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (m: ChatMessage) => { setEditingId(m.id); setEditingBody(m.body ?? ""); };
  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("chat_messages").update({
      body: editingBody.trim() || null, edited_at: new Date().toISOString(),
    }).eq("id", editingId);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setEditingId(null); setEditingBody("");
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
  };

  const downloadAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60);
    if (error) { toast({ title: "Download failed", description: error.message, variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const grouped = useMemo(() => {
    const groups: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.created_at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(m);
      else groups.push({ day, items: [m] });
    }
    return groups;
  }, [messages]);

  const typingNames = Object.keys(typingUsers)
    .map((id) => profiles[id]?.full_name || profiles[id]?.email || "Someone")
    .slice(0, 2);

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading chat…</div>;
  }

  return (
    <div className={`flex flex-col h-[600px] ${className ?? ""}`}>
      <ScrollArea className="flex-1 pr-4">
        <div ref={scrollRef} className="space-y-4 pb-2">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No messages yet. Start the conversation.</p>
          ) : grouped.map((g) => (
            <div key={g.day} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">{g.day}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {g.items.map((m) => {
                const mine = m.sender_id === user?.id;
                const prof = profiles[m.sender_id];
                const name = prof?.full_name || prof?.email || "User";
                const initials = (name[0] || "U").toUpperCase();
                return (
                  <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${mine ? "flex-row-reverse" : ""}`}>
                        <span className="font-medium text-foreground">{mine ? "You" : name}</span>
                        <span>{timeAgo(m.created_at)}</span>
                        {m.edited_at && <span className="italic">(edited)</span>}
                      </div>
                      <div className={`group relative rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {editingId === m.id ? (
                          <div className="flex items-center gap-2">
                            <Input value={editingBody} onChange={(e) => setEditingBody(e.target.value)}
                              className="h-8 bg-background text-foreground" autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }} />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <>
                            {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                            {m.attachment_path && (
                              <button onClick={() => downloadAttachment(m.attachment_path!)}
                                className={`mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${mine ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-background hover:bg-background/80 border border-border"}`}>
                                <Paperclip className="h-3.5 w-3.5" />
                                <span className="font-medium truncate max-w-[200px]">{m.attachment_name}</span>
                                <span className="opacity-70">({formatBytes(m.attachment_size)})</span>
                                <Download className="h-3.5 w-3.5 ml-1" />
                              </button>
                            )}
                            {mine && (
                              <div className={`absolute -top-3 ${mine ? "left-2" : "right-2"} hidden group-hover:flex gap-1 rounded-md border border-border bg-background p-0.5 shadow-sm`}>
                                {m.body && (
                                  <button onClick={() => startEdit(m)} className="p-1 rounded hover:bg-muted text-foreground" title="Edit">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}
                                <button onClick={() => remove(m.id)} className="p-1 rounded hover:bg-muted text-destructive" title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="h-5 px-1 text-xs text-muted-foreground italic">
        {typingNames.length > 0 && `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`}
      </div>

      {pendingFile && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">{pendingFile.name}</span>
            <span className="text-muted-foreground text-xs shrink-0">{formatBytes(pendingFile.size)}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input ref={fileRef} type="file" className="hidden"
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={sending}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); handleType(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          className="min-h-[44px] max-h-32 resize-none"
          disabled={sending}
        />
        <Button type="button" variant="hero" onClick={send} disabled={sending || (!body.trim() && !pendingFile)} className="gap-1.5">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </div>
    </div>
  );
}