import { useState } from "react";
import { z } from "zod";
import { Plus, Upload, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIES, PRIORITIES, MAX_FILE_SIZE, MAX_FILES, formatBytes, type TicketCategory, type TicketPriority } from "@/lib/tickets";

const schema = z.object({
  title: z.string().trim().min(3, "Min 3 characters").max(150, "Max 150 characters"),
  description: z.string().trim().min(10, "Please describe the issue (min 10 chars)").max(5000),
  category: z.enum(["hardware", "software", "network", "account", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export function NewTicketDialog({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("software");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [files, setFiles] = useState<File[]>([]);

  const reset = () => {
    setTitle(""); setDescription(""); setCategory("software"); setPriority("medium"); setFiles([]);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (next.length >= MAX_FILES) {
        toast({ title: "Too many files", description: `Max ${MAX_FILES} files`, variant: "destructive" });
        break;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `${f.name} too large`, description: `Max ${formatBytes(MAX_FILE_SIZE)}`, variant: "destructive" });
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ title, description, category, priority });
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({ ...parsed.data, student_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Upload attachments
      for (const file of files) {
        const path = `${ticket.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("ticket-attachments").upload(path, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (upErr) {
          toast({ title: `Failed to upload ${file.name}`, description: upErr.message, variant: "destructive" });
          continue;
        }
        await supabase.from("ticket_attachments").insert({
          ticket_id: ticket.id,
          uploaded_by: user.id,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
        });
      }

      toast({ title: "Ticket submitted", description: "An expert will pick it up shortly." });
      reset();
      setOpen(false);
      onCreated?.();
    } catch (err: any) {
      toast({ title: "Could not create ticket", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Plus className="h-4 w-4" />
          New ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Submit a tech support ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and an expert will respond. Add screenshots or logs if helpful.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wi-Fi keeps disconnecting in the library" maxLength={150} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="What's happening, when it started, what you've already tried…" maxLength={5000} />
            <p className="text-xs text-muted-foreground">{description.length}/5000</p>
          </div>

          <div className="space-y-2">
            <Label>Attachments <span className="text-muted-foreground font-normal">(optional, up to {MAX_FILES} files, {formatBytes(MAX_FILE_SIZE)} each)</span></Label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
              <Upload className="h-5 w-5" />
              <span>Click or drop files</span>
              <input type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">{formatBytes(f.size)}</span>
                      <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="hero" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
