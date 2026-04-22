import { useEffect, useMemo, useState } from "react";
import { ExpertDirectoryEntry, listExpertDirectory, SUBJECT_SUGGESTIONS } from "@/lib/experts";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/experts/StarRating";
import { Link } from "react-router-dom";
import { Loader2, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpertDirectory() {
  const [experts, setExperts] = useState<ExpertDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("0");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listExpertDirectory({
          subject: subject === "all" ? undefined : subject,
          minRating: Number(minRating),
        });
        setExperts(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [subject, minRating]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>(SUBJECT_SUGGESTIONS);
    experts.forEach((e) => e.subjects.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [experts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return experts;
    return experts.filter((e) =>
      (e.full_name ?? "").toLowerCase().includes(term) ||
      (e.headline ?? "").toLowerCase().includes(term) ||
      e.subjects.some((s) => s.toLowerCase().includes(term))
    );
  }, [experts, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Find an expert</h1>
        <p className="mt-1 text-muted-foreground">Browse vetted experts by subject and rating.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, headline, or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjectOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={minRating} onValueChange={setMinRating}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any rating</SelectItem>
            <SelectItem value="3">3★ and up</SelectItem>
            <SelectItem value="4">4★ and up</SelectItem>
            <SelectItem value="4.5">4.5★ and up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading experts…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No experts match your filters.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link key={e.expert_id} to={`/dashboard/experts/${e.expert_id}`}>
              <Card className="h-full transition-shadow hover:shadow-elegant">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={e.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(e.full_name || e.email || "E").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{e.full_name || e.email || "Expert"}</p>
                      {e.headline && <p className="text-xs text-muted-foreground line-clamp-1">{e.headline}</p>}
                      <div className="mt-1"><StarRating value={e.rating_avg} count={e.rating_count} size="sm" /></div>
                    </div>
                  </div>
                  {e.bio && <p className="text-sm text-muted-foreground line-clamp-2">{e.bio}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {e.subjects.slice(0, 3).map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                    {e.subjects.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{e.subjects.length - 3}</Badge>
                    )}
                  </div>
                  {e.hourly_rate != null && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">${Number(e.hourly_rate).toFixed(0)}</span>/hr
                      {e.years_experience ? ` • ${e.years_experience}y exp` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}