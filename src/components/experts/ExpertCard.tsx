import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./StarRating";
import { Link } from "react-router-dom";
import { ExpertProfile, getExpertProfile, upsertMyExpertProfile } from "@/lib/experts";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ExpertCardProps {
  expertId: string;
  compact?: boolean;
}

export function ExpertCard({ expertId, compact }: ExpertCardProps) {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updatingAvail, setUpdatingAvail] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, { data: meta }] = await Promise.all([
          getExpertProfile(expertId),
          supabase.from("profiles").select("full_name, email, avatar_url").eq("id", expertId).maybeSingle(),
        ]);
        if (!active) return;
        setProfile(p);
        setName(meta?.full_name || meta?.email || "Expert");
        setEmail(meta?.email || "");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [expertId]);

  // Live updates: reflect any availability/profile change instantly
  useEffect(() => {
    const channel = supabase
      .channel(`expert-profile-${expertId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "expert_profiles", filter: `expert_id=eq.${expertId}` },
        (payload) => setProfile((prev) => ({ ...(prev as ExpertProfile), ...(payload.new as ExpertProfile) }))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [expertId]);

  const canToggleAvailability = !!user && (user.id === expertId || role === "admin");

  const onToggleAvailability = async (next: boolean) => {
    if (!profile) return;
    const prev = profile.is_available;
    setProfile({ ...profile, is_available: next });
    setUpdatingAvail(true);
    try {
      await upsertMyExpertProfile(expertId, { is_available: next });
      toast({ title: next ? "You're now available" : "You're now hidden from the directory" });
    } catch (err: any) {
      setProfile({ ...profile, is_available: prev });
      toast({ title: "Update failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setUpdatingAvail(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className={compact ? "p-4 space-y-3" : "p-5 space-y-3"}>
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const initials = (name || email || "E").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className={compact ? "p-4 space-y-3" : "p-5 space-y-3"}>
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link to={`/dashboard/experts/${expertId}`} className="font-medium hover:underline truncate">{name}</Link>
              <span
                className={`inline-block h-2 w-2 rounded-full ${profile?.is_available ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                aria-label={profile?.is_available ? "Available" : "Unavailable"}
              />
            </div>
            {profile?.headline && <p className="text-xs text-muted-foreground line-clamp-1">{profile.headline}</p>}
            <div className="mt-1">
              <StarRating value={profile?.rating_avg ?? 0} count={profile?.rating_count ?? 0} size="sm" />
            </div>
          </div>
        </div>
        {canToggleAvailability && (
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium">Available for new projects</p>
              <p className="text-[11px] text-muted-foreground">{profile?.is_available ? "Visible in the directory" : "Hidden from the directory"}</p>
            </div>
            <Switch checked={!!profile?.is_available} onCheckedChange={onToggleAvailability} disabled={updatingAvail} />
          </div>
        )}
        {profile?.subjects && profile.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.subjects.slice(0, 4).map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        )}
        {!compact && profile?.bio && (
          <p className="text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
        )}
        {profile?.hourly_rate != null && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">${Number(profile.hourly_rate).toFixed(0)}</span>/hr
            {profile.years_experience ? ` • ${profile.years_experience}y exp` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}