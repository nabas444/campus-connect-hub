import { useState } from "react";
import { z } from "zod";
import { Plus, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SUBJECTS } from "@/lib/projects";

type DraftMilestone = {
  title: string;
  description: string;
  due_date: string;
  price: string;
  requires_approval: boolean;
};

const projectSchema = z.object({
  title: z.string().trim().min(3).max(150),
  brief: z.string().trim().min(10).max(5000),
  subject: z.string().trim().min(1).max(80),
});

export function NewProjectDialog({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [subject, setSubject] = useState("Computer Science");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [postNow, setPostNow] = useState(true);
  const [milestones, setMilestones] = useState<DraftMilestone[]>([
    { title: "", description: "", due_date: "", price: "", requires_approval: true },
  ]);

  const addMilestone = () =>
    setMilestones([...milestones, { title: "", description: "", due_date: "", price: "", requires_approval: true }]);
  const removeMilestone = (i: number) => setMilestones(milestones.filter((_, j) => j !== i));
  const updateMilestone = (i: number, patch: Partial<DraftMilestone>) =>
    setMilestones(milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const reset = () => {
    setTitle(""); setBrief(""); setSubject("Computer Science"); setBudget(""); setDeadline("");
    setPostNow(true);
    setMilestones([{ title: "", description: "", due_date: "", price: "", requires_approval: true }]);
  };

  const submit = async () => {
    if (!user) return;
    const parsed = projectSchema.safeParse({ title, brief, subject });
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    const validMilestones = milestones.filter((m) => m.title.trim().length >= 2);
    if (validMilestones.length === 0) {
      toast({ title: "Add at least one milestone", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          ...parsed.data,
          student_id: user.id,
          status: postNow ? "open" : "draft",
          total_budget: budget ? parseFloat(budget) : null,
          deadline: deadline || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      const rows = validMilestones.map((m, idx) => ({
        project_id: project.id,
        title: m.title.trim(),
        description: m.description.trim() || null,
        due_date: m.due_date || null,
        price: m.price ? parseFloat(m.price) : null,
        requires_approval: m.requires_approval,
        position: idx,
      }));
      const { error: msErr } = await supabase.from("milestones").insert(rows as any);
      if (msErr) throw msErr;

      toast({ title: postNow ? "Project posted" : "Draft saved", description: postNow ? "Experts can now claim it." : "You can publish it from the project page." });
      reset();
      setOpen(false);
      onCreated?.();
    } catch (err: any) {
      toast({ title: "Could not create project", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Post an academic project</DialogTitle>
          <DialogDescription>Describe the work, break it into milestones, and we'll match you with an expert.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Capstone project: ML model for spam detection" maxLength={150} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-1">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-budget">Budget (USD, optional)</Label>
              <Input id="p-budget" type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-deadline">Deadline (optional)</Label>
              <Input id="p-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-brief">Project brief</Label>
            <Textarea id="p-brief" value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} placeholder="Goals, requirements, references, expected output…" maxLength={5000} />
            <p className="text-xs text-muted-foreground">{brief.length}/5000</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Milestones</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMilestone} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add milestone
              </Button>
            </div>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-mono text-muted-foreground">#{i + 1}</span>
                    <Input value={m.title} onChange={(e) => updateMilestone(i, { title: e.target.value })} placeholder="Milestone title" maxLength={150} />
                    {milestones.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMilestone(i)} aria-label="Remove milestone">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea value={m.description} onChange={(e) => updateMilestone(i, { description: e.target.value })} rows={2} placeholder="What needs to be delivered (optional)" maxLength={3000} />
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Due date</Label>
                      <Input type="date" value={m.due_date} onChange={(e) => updateMilestone(i, { due_date: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Price (USD)</Label>
                      <Input type="number" min="0" step="1" value={m.price} onChange={(e) => updateMilestone(i, { price: e.target.value })} placeholder="—" />
                    </div>
                    <label className="flex items-end gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={m.requires_approval} onChange={(e) => updateMilestone(i, { requires_approval: e.target.checked })} className="h-4 w-4 rounded border-border" />
                      <span>Requires my approval</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <input type="checkbox" checked={postNow} onChange={(e) => setPostNow(e.target.checked)} className="h-4 w-4 rounded border-border" />
            <span>Post immediately so experts can claim it (uncheck to save as draft)</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="hero" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {postNow ? "Post project" : "Save draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
