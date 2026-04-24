import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ExpertReview, getExpertProfile, listReviewsForExpert, ExpertProfile } from "@/lib/experts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/components/experts/StarRating";
import { ReviewForm } from "@/components/experts/ReviewForm";
import { Loader2, Star, MessageSquare, Pencil } from "lucide-react";
import { timeAgo } from "@/lib/projects";

type ProfileMeta = { id: string; full_name: string | null; email: string | null; avatar_url: string | null };

interface PendingProject {
  id: string;
  title: string;
  subject: string;
  completed_at: string | null;
  assigned_expert_id: string;
  expert?: ProfileMeta | null;
}

interface DoneReview extends ExpertReview {
  expert?: ProfileMeta | null;
  project?: { id: string; title: string } | null;
}

function initialsOf(name: string) {
  return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

export default function Reviews() {
  const { user, role, loading: authLoading } = useAuth();
  if (authLoading || !user || !role) {
    return <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</Card>;
  }
  if (role === "expert") return <ExpertReviewsView expertId={user.id} />;
  return <StudentReviewsView studentId={user.id} />;
}

/* -------------------- STUDENT VIEW -------------------- */

function StudentReviewsView({ studentId }: { studentId: string }) {
  const [pending, setPending] = useState<PendingProject[]>([]);
  const [done, setDone] = useState<DoneReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ projectId: string; expertId: string; rating?: number; comment?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Completed projects with assigned expert
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title, subject, completed_at, assigned_expert_id")
        .eq("student_id", studentId)
        .eq("status", "completed")
        .not("assigned_expert_id", "is", null)
        .order("completed_at", { ascending: false });

      const projs = (projects ?? []) as PendingProject[];
      const projectIds = projs.map((p) => p.id);

      // My reviews
      const { data: reviews } = projectIds.length
        ? await supabase
            .from("expert_reviews")
            .select("*")
            .eq("reviewer_id", studentId)
            .in("project_id", projectIds)
        : { data: [] as ExpertReview[] };

      const reviewByProject = new Map((reviews ?? []).map((r) => [r.project_id, r as ExpertReview]));

      // Profiles for involved experts
      const expertIds = Array.from(new Set(projs.map((p) => p.assigned_expert_id).filter(Boolean)));
      const { data: profs } = expertIds.length
        ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", expertIds)
        : { data: [] as ProfileMeta[] };
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p as ProfileMeta]));

      const pendingList: PendingProject[] = [];
      const doneList: DoneReview[] = [];
      for (const p of projs) {
        const r = reviewByProject.get(p.id);
        if (r) {
          doneList.push({ ...r, expert: pMap.get(p.assigned_expert_id) ?? null, project: { id: p.id, title: p.title } });
        } else {
          pendingList.push({ ...p, expert: pMap.get(p.assigned_expert_id) ?? null });
        }
      }
      doneList.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
      setPending(pendingList);
      setDone(doneList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground">Rate the experts who have completed your projects.</p>
      </div>

      {loading ? (
        <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</Card>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Awaiting review {pending.length > 0 && <Badge variant="secondary" className="ml-2">{pending.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="done">My reviews {done.length > 0 && <Badge variant="secondary" className="ml-2">{done.length}</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending.length === 0 ? (
              <EmptyState
                icon={<Star className="h-10 w-10 text-muted-foreground/50" />}
                title="Nothing to review yet"
                description="When your projects are completed, you’ll be able to leave a rating for the expert here."
              />
            ) : pending.map((p) => {
              const name = p.expert?.full_name || p.expert?.email || "Expert";
              return (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={p.expert?.avatar_url ?? undefined} />
                      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.subject} • Completed by{" "}
                        <Link to={`/dashboard/experts/${p.assigned_expert_id}`} className="text-foreground hover:underline">{name}</Link>
                        {p.completed_at && <> • {timeAgo(p.completed_at)}</>}
                      </p>
                    </div>
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => setEditing({ projectId: p.id, expertId: p.assigned_expert_id })}
                    >
                      <Star className="h-4 w-4" /> Leave review
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="done" className="mt-4 space-y-3">
            {done.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-10 w-10 text-muted-foreground/50" />}
                title="No reviews yet"
                description="Reviews you submit will appear here for reference."
              />
            ) : done.map((r) => {
              const name = r.expert?.full_name || r.expert?.email || "Expert";
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4 flex-wrap">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={r.expert?.avatar_url ?? undefined} />
                        <AvatarFallback>{initialsOf(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <Link to={`/dashboard/experts/${r.expert_id}`} className="font-medium hover:underline">{name}</Link>
                            {r.project && (
                              <p className="text-xs text-muted-foreground truncate">
                                <Link to={`/dashboard/assignments/${r.project.id}`} className="hover:underline">{r.project.title}</Link>
                                <> • {timeAgo(r.created_at)}</>
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing({ projectId: r.project_id, expertId: r.expert_id, rating: r.rating, comment: r.comment ?? "" })}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </div>
                        <div className="mt-1.5"><StarRating value={r.rating} size="sm" /></div>
                        {r.comment && <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{r.comment}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.rating ? "Update your review" : "Leave a review"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ReviewForm
              expertId={editing.expertId}
              projectId={editing.projectId}
              reviewerId={studentId}
              initialRating={editing.rating ?? 0}
              initialComment={editing.comment ?? ""}
              onSubmitted={() => { setEditing(null); load(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- EXPERT VIEW -------------------- */

function ExpertReviewsView({ expertId }: { expertId: string }) {
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [reviewers, setReviewers] = useState<Record<string, ProfileMeta>>({});
  const [projects, setProjects] = useState<Record<string, { id: string; title: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, rs] = await Promise.all([getExpertProfile(expertId), listReviewsForExpert(expertId)]);
        setProfile(p);
        setReviews(rs);
        const reviewerIds = Array.from(new Set(rs.map((r) => r.reviewer_id)));
        const projectIds = Array.from(new Set(rs.map((r) => r.project_id)));
        const [pf, pj] = await Promise.all([
          reviewerIds.length ? supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", reviewerIds) : Promise.resolve({ data: [] }),
          projectIds.length ? supabase.from("projects").select("id, title").in("id", projectIds) : Promise.resolve({ data: [] }),
        ]);
        const rMap: Record<string, ProfileMeta> = {};
        (pf.data ?? []).forEach((x: any) => { rMap[x.id] = x; });
        setReviewers(rMap);
        const pMap: Record<string, { id: string; title: string }> = {};
        (pj.data ?? []).forEach((x: any) => { pMap[x.id] = x; });
        setProjects(pMap);
      } finally {
        setLoading(false);
      }
    })();
  }, [expertId]);

  const distribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1] += 1; });
    return dist;
  }, [reviews]);

  if (loading) return <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</Card>;

  const total = reviews.length;
  const avg = profile?.rating_avg ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Performance</h1>
        <p className="text-sm text-muted-foreground">What students are saying about your work.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Overall rating</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold">{Number(avg).toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <div className="mt-2"><StarRating value={avg} size="md" /></div>
            <p className="mt-2 text-xs text-muted-foreground">Based on {total} review{total === 1 ? "" : "s"}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Rating distribution</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star - 1];
              const pct = total ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-muted-foreground">{star}★</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-muted-foreground tabular-nums">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All reviews ({total})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {total === 0 ? (
            <EmptyState
              icon={<Star className="h-10 w-10 text-muted-foreground/50" />}
              title="No reviews yet"
              description="Reviews from students will show up here once your completed projects are rated."
            />
          ) : reviews.map((r) => {
            const rev = reviewers[r.reviewer_id];
            const rname = rev?.full_name || rev?.email || "Student";
            const proj = projects[r.project_id];
            return (
              <div key={r.id} className="flex gap-3 border-b border-border last:border-0 pb-4 last:pb-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={rev?.avatar_url ?? undefined} />
                  <AvatarFallback>{initialsOf(rname)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{rname}</p>
                      {proj && (
                        <p className="text-xs text-muted-foreground truncate">
                          <Link to={`/dashboard/assignments/${proj.id}`} className="hover:underline">{proj.title}</Link>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </div>
                  <div className="mt-1"><StarRating value={r.rating} size="sm" /></div>
                  {r.comment && <p className="mt-1.5 text-sm text-foreground/90 whitespace-pre-wrap">{r.comment}</p>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- SHARED -------------------- */

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-10 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
    </Card>
  );
}