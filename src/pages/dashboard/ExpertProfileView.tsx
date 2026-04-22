import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExpertProfile, ExpertReview, getExpertProfile, listReviewsForExpert } from "@/lib/experts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/experts/StarRating";
import { ArrowLeft, Loader2, Mail, Briefcase } from "lucide-react";
import { timeAgo } from "@/lib/projects";

type ReviewerMap = Record<string, { full_name: string | null; email: string | null; avatar_url: string | null }>;

export default function ExpertProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [meta, setMeta] = useState<{ full_name: string | null; email: string | null; avatar_url: string | null } | null>(null);
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [p, { data: pf }, rs] = await Promise.all([
          getExpertProfile(id),
          supabase.from("profiles").select("full_name, email, avatar_url").eq("id", id).maybeSingle(),
          listReviewsForExpert(id),
        ]);
        setProfile(p);
        setMeta(pf as any);
        setReviews(rs);
        const ids = Array.from(new Set(rs.map((r) => r.reviewer_id)));
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids);
          const map: ReviewerMap = {};
          (profs ?? []).forEach((x: any) => { map[x.id] = { full_name: x.full_name, email: x.email, avatar_url: x.avatar_url }; });
          setReviewers(map);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</Card>;
  if (!profile) return (
    <Card className="p-12 text-center">
      <p className="font-medium">Expert not found</p>
      <Button variant="link" asChild><Link to="/dashboard/experts">Back to directory</Link></Button>
    </Card>
  );

  const name = meta?.full_name || meta?.email || "Expert";
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={meta?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-bold">{name}</h1>
                  {profile.headline && <p className="mt-1 text-muted-foreground">{profile.headline}</p>}
                  <div className="mt-2"><StarRating value={profile.rating_avg} count={profile.rating_count} /></div>
                </div>
              </div>
              {profile.bio && (
                <div className="mt-5 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90">
                  {profile.bio}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Reviews ({reviews.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : reviews.map((r) => {
                const rev = reviewers[r.reviewer_id];
                const rname = rev?.full_name || rev?.email || "Student";
                const rinit = rname.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={r.id} className="flex gap-3 border-b border-border last:border-0 pb-4 last:pb-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={rev?.avatar_url ?? undefined} />
                      <AvatarFallback>{rinit}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium">{rname}</p>
                        <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                      </div>
                      <StarRating value={r.rating} size="sm" />
                      {r.comment && <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap">{r.comment}</p>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {profile.hourly_rate != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rate</p>
                  <p className="font-medium">${Number(profile.hourly_rate).toFixed(0)}/hr</p>
                </div>
              )}
              {profile.years_experience != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Experience</p>
                  <p className="font-medium flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{profile.years_experience} years</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <Badge variant="outline" className={profile.is_available ? "bg-accent/15 text-accent border-accent/30" : "bg-muted text-muted-foreground"}>
                  {profile.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
              {meta?.email && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
                  <p className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{meta.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {profile.subjects.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Subjects</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {profile.subjects.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}