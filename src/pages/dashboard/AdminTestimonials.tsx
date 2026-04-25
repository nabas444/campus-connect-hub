import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/components/experts/StarRating";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteFeatured,
  featureProject,
  listEligibleProjects,
  setFeaturedFlag,
  type EligibleProject,
} from "@/lib/testimonials";
import { Loader2, Sparkles, Trash2 } from "lucide-react";

function defaultDisplayName(full: string | null): string {
  if (!full) return "Student";
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

export default function AdminTestimonials() {
  const { user, role } = useAuth();
  const isExpert = role === "expert";
  const [items, setItems] = useState<EligibleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EligibleProject | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [subjectLabel, setSubjectLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listEligibleProjects());
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEditor = (it: EligibleProject) => {
    setEditing(it);
    setDisplayName(defaultDisplayName(it.student_name));
    setExcerpt(it.comment ?? "");
    setSubjectLabel(it.subject);
  };

  const save = async () => {
    if (!editing || !user) return;
    setSaving(true);
    try {
      await featureProject({
        projectId: editing.project_id,
        reviewId: editing.review_id,
        displayName: displayName.trim() || null,
        publicExcerpt: excerpt.trim() || null,
        subjectLabel: subjectLabel.trim() || null,
        createdBy: user.id,
      });
      toast({ title: "Featured in showcase" });
      setEditing(null);
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (it: EligibleProject, next: boolean) => {
    if (!it.featured_id) return openEditor(it);
    try {
      await setFeaturedFlag(it.featured_id, next);
      toast({ title: next ? "Now visible in showcase" : "Hidden from showcase" });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message ?? String(e), variant: "destructive" });
    }
  };

  const remove = async (it: EligibleProject) => {
    if (!it.featured_id) return;
    try {
      await deleteFeatured(it.featured_id);
      toast({ title: "Removed from showcase" });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message ?? String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-accent" />
          {isExpert ? "Publish your testimonials" : "Curate testimonials"}
        </h1>
        <p className="mt-1 text-muted-foreground max-w-2xl">
          {isExpert
            ? "Showcase the projects you delivered successfully. Only your completed, reviewed projects appear here. Student names stay anonymized (e.g. \"Sarah K.\")."
            : "Pick reviewed, completed projects to feature in the public Success Showcase. Student names are anonymized (e.g. \"Sarah K.\") and you control the excerpt shown."}
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No reviewed completed projects yet.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.review_id}>
              <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{it.project_title}</p>
                    <Badge variant="outline">{it.subject}</Badge>
                    {it.featured_id && (
                      <Badge className="bg-accent/15 text-accent border-accent/30" variant="outline">
                        {it.is_featured ? "Live" : "Hidden"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <StarRating value={it.rating} size="sm" />
                    <span>by {it.student_name || "Student"} → {it.expert_name || "Expert"}</span>
                  </div>
                  {it.comment && <p className="text-sm text-foreground/85 line-clamp-2">{it.comment}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {it.featured_id ? (
                    <>
                      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
                        <span className="text-xs text-muted-foreground">Live</span>
                        <Switch checked={it.is_featured} onCheckedChange={(v) => toggle(it, v)} />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openEditor(it)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(it)}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <Button size="sm" variant="hero" onClick={() => openEditor(it)}>Feature</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Feature in showcase</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Card><CardHeader><CardTitle className="text-sm">Original review</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <StarRating value={editing.rating} size="sm" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{editing.comment || "—"}</p>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label htmlFor="dn">Display name (anonymized)</Label>
                <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Sarah K." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sl">Subject label</Label>
                <Input id="sl" value={subjectLabel} onChange={(e) => setSubjectLabel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex">Public excerpt (optional)</Label>
                <Textarea id="ex" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={4} placeholder="Leave blank to use the original review text." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="hero" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}