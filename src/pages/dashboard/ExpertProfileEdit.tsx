import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ExpertProfile, getExpertProfile, upsertMyExpertProfile, SUBJECT_SUGGESTIONS } from "@/lib/experts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, X, Plus, Save } from "lucide-react";
import { StarRating } from "@/components/experts/StarRating";

export default function ExpertProfileEdit() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [years, setYears] = useState("");
  const [available, setAvailable] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const p = await getExpertProfile(user.id);
        if (p) {
          setProfile(p);
          setHeadline(p.headline ?? "");
          setBio(p.bio ?? "");
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : "");
          setYears(p.years_experience != null ? String(p.years_experience) : "");
          setAvailable(p.is_available);
          setSubjects(p.subjects ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const addSubject = (s: string) => {
    const v = s.trim();
    if (!v || subjects.includes(v)) return;
    setSubjects([...subjects, v]);
    setSubjectInput("");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await upsertMyExpertProfile(user.id, {
        headline: headline || null,
        bio: bio || null,
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        years_experience: years ? Number(years) : null,
        is_available: available,
        subjects,
      });
      toast({ title: "Profile saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</Card>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">My expert profile</h1>
          <p className="mt-1 text-muted-foreground">Showcase your expertise to attract project assignments.</p>
        </div>
        {profile && (
          <div className="text-right">
            <StarRating value={profile.rating_avg} count={profile.rating_count} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Public profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="PhD in Statistics — research methods & data analysis" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={5} placeholder="Tell students about your background, teaching style, and what you can help with." />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rate">Hourly rate (USD)</Label>
              <Input id="rate" type="number" min="0" step="1" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="50" />
            </div>
            <div>
              <Label htmlFor="years">Years of experience</Label>
              <Input id="years" type="number" min="0" step="1" value={years} onChange={(e) => setYears(e.target.value)} placeholder="5" />
            </div>
          </div>

          <div>
            <Label>Subjects</Label>
            <div className="mt-1 flex flex-wrap gap-1.5 mb-2">
              {subjects.map((s) => (
                <Badge key={s} variant="outline" className="gap-1 pr-1">
                  {s}
                  <button onClick={() => setSubjects(subjects.filter((x) => x !== s))} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {subjects.length === 0 && <span className="text-xs text-muted-foreground">No subjects yet.</span>}
            </div>
            <div className="flex gap-2">
              <Input
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(subjectInput); } }}
                placeholder="Add a subject and press Enter"
              />
              <Button type="button" variant="outline" onClick={() => addSubject(subjectInput)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUBJECT_SUGGESTIONS.filter((s) => !subjects.includes(s)).slice(0, 8).map((s) => (
                <button key={s} onClick={() => addSubject(s)} className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:bg-muted">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Available for new projects</p>
              <p className="text-xs text-muted-foreground">When off, you're hidden from the directory.</p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>

          <Button onClick={save} disabled={saving} variant="hero">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}