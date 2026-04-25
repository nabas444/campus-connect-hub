import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAnalytics, type AnalyticsSnapshot } from "@/lib/admin";
import { formatMoney } from "@/lib/payments";
import {
  Ticket, BookOpen, MessagesSquare, TrendingUp, Users, DollarSign,
  CheckCircle2, AlertCircle, BarChart3, Settings, Star,
} from "lucide-react";

const statsByRole = {
  student: [
    { label: "Open tickets", value: "0", icon: Ticket, hint: "All resolved" },
    { label: "Active assignments", value: "0", icon: BookOpen, hint: "No deadlines" },
    { label: "Unread messages", value: "0", icon: MessagesSquare, hint: "Inbox zero" },
    { label: "Avg. response", value: "—", icon: TrendingUp, hint: "From experts" },
  ],
  expert: [
    { label: "Assigned to me", value: "0", icon: Ticket, hint: "Queue clear" },
    { label: "In progress", value: "0", icon: BookOpen, hint: "Active work" },
    { label: "Unread messages", value: "0", icon: MessagesSquare, hint: "Stay responsive" },
    { label: "Rating", value: "—", icon: TrendingUp, hint: "From students" },
  ],
} as const;

export default function Overview() {
  const { user, role } = useAuth();
  const [name, setName] = useState<string>("");
  const [snap, setSnap] = useState<AnalyticsSnapshot | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.full_name ?? user.email?.split("@")[0] ?? ""));
  }, [user]);

  useEffect(() => {
    if (role !== "admin") return;
    setLoadingSnap(true);
    getAnalytics()
      .then(setSnap)
      .catch(() => setSnap(null))
      .finally(() => setLoadingSnap(false));
  }, [role]);

  if (role === "admin") {
    return <AdminOverview name={name} snap={snap} loading={loadingSnap} />;
  }

  const stats = statsByRole[role ?? "student"];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">
          Welcome{name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-1 text-muted-foreground">
          {role === "expert"
            ? "Your active queue and impact at a glance."
            : "Your support requests, assignments, and conversations."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent shadow-sm">
                <s.icon className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
            <div className="mt-4 font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-3 text-xs text-muted-foreground/80">{s.hint}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminOverview({ name, snap, loading }: { name: string; snap: AnalyticsSnapshot | null; loading: boolean }) {
  const t = snap?.totals;
  const cards = [
    { label: "Total users", value: t?.users, icon: Users, hint: `${t?.students ?? 0} students • ${t?.experts ?? 0} experts` },
    { label: "Open tickets", value: t?.openTickets, icon: AlertCircle, hint: `${t?.tickets ?? 0} total` },
    { label: "Active projects", value: t?.activeProjects, icon: BookOpen, hint: `${t?.completedProjects ?? 0} completed` },
    { label: "Revenue (30d)", value: t ? formatMoney(t.revenue) : undefined, icon: DollarSign, hint: t ? `${formatMoney(t.pendingRevenue)} pending` : "" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">
            Welcome{name ? `, ${name}` : ""}.
          </h1>
          <p className="mt-1 text-muted-foreground">Platform overview and operational health.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5"><Link to="/dashboard/users"><Users className="h-4 w-4" />Manage users</Link></Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5"><Link to="/dashboard/payments"><DollarSign className="h-4 w-4" />Payments</Link></Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5"><Link to="/dashboard/analytics"><BarChart3 className="h-4 w-4" />Analytics</Link></Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5"><Link to="/dashboard/settings"><Settings className="h-4 w-4" />Settings</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent shadow-sm">
              <c.icon className="h-5 w-5 text-accent-foreground" />
            </div>
            {loading || c.value === undefined ? (
              <Skeleton className="mt-4 h-9 w-20" />
            ) : (
              <div className="mt-4 font-display text-3xl font-bold">{c.value}</div>
            )}
            <div className="mt-1 text-sm text-muted-foreground">{c.label}</div>
            <div className="mt-3 text-xs text-muted-foreground/80">{loading ? <Skeleton className="h-3 w-32" /> : c.hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Star className="h-4 w-4 text-accent" /> Top experts</h3>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : snap?.topExperts.length ? (
            <ul className="space-y-2">
              {snap.topExperts.map((e) => (
                <li key={e.expert_id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Link to={`/dashboard/experts/${e.expert_id}`} className="text-sm font-medium hover:underline truncate">
                    {e.full_name ?? "Expert"}
                  </Link>
                  <span className="text-sm text-muted-foreground">{e.rating_avg.toFixed(2)} ★ ({e.rating_count})</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No reviewed experts yet.</p>}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><CheckCircle2 className="h-4 w-4 text-accent" /> Operational health</h3>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : t ? (
            <ul className="space-y-2 text-sm">
              <Row label="Admins" value={t.admins} />
              <Row label="Tickets in progress / waiting" value={t.openTickets} />
              <Row label="Projects in progress / review / open" value={t.activeProjects} />
              <Row label="Revenue collected (30d)" value={formatMoney(t.revenue)} />
              <Row label="Revenue pending (30d)" value={formatMoney(t.pendingRevenue)} />
            </ul>
          ) : <p className="text-sm text-muted-foreground">Unable to load metrics.</p>}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between border-b border-border/60 last:border-0 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </li>
  );
}
