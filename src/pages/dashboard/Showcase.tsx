import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/experts/StarRating";
import { listPublicTestimonials, type PublicTestimonial } from "@/lib/testimonials";
import { Quote, Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/projects";
import { Link } from "react-router-dom";

export default function Showcase() {
  const [items, setItems] = useState<PublicTestimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setItems(await listPublicTestimonials());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-accent" />
            Success showcase
          </h1>
          <p className="mt-1 text-muted-foreground max-w-2xl">
            Real, anonymized testimonials from completed work. Browse problems other students faced
            and see how our experts delivered — building trust across the community.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-16 w-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <Quote className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No testimonials yet</p>
          <p className="text-sm mt-1">Once admins feature completed projects, they'll appear here.</p>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => {
            const initials = t.display_name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
            return (
              <Card key={t.id} className="relative overflow-hidden hover:shadow-elegant transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{t.subject}</Badge>
                    <StarRating value={t.rating} size="sm" />
                  </div>
                  <Quote className="h-5 w-5 text-accent/60" />
                  <p className="text-sm text-foreground/90 line-clamp-5 whitespace-pre-wrap min-h-[5rem]">
                    {t.excerpt || "Great experience working with this expert."}
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.display_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t.completed_at ? `Completed ${timeAgo(t.completed_at)}` : "Completed"}
                        </p>
                      </div>
                    </div>
                    {t.expert_id ? (
                      <Link
                        to={`/dashboard/experts/${t.expert_id}`}
                        className="text-xs text-accent hover:underline truncate max-w-[45%] text-right"
                        title={t.expert_name}
                      >
                        {t.expert_name}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground truncate max-w-[45%] text-right">{t.expert_name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}