import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./StarRating";
import { Link } from "react-router-dom";
import { ExpertProfile, getExpertProfile } from "@/lib/experts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ExpertCardProps {
  expertId: string;
  compact?: boolean;
}

export function ExpertCard({ expertId, compact }: ExpertCardProps) {
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <Card><CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading expert…
      </CardContent></Card>
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
            <Link to={`/dashboard/experts/${expertId}`} className="font-medium hover:underline truncate block">{name}</Link>
            {profile?.headline && <p className="text-xs text-muted-foreground line-clamp-1">{profile.headline}</p>}
            <div className="mt-1">
              <StarRating value={profile?.rating_avg ?? 0} count={profile?.rating_count ?? 0} size="sm" />
            </div>
          </div>
        </div>
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