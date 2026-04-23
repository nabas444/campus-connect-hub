import { useEffect, useState } from "react";
import { AnalyticsSnapshot, getAnalytics } from "@/lib/admin";
import { formatMoney } from "@/lib/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Users, Ticket, BookOpen, DollarSign, Star, TrendingUp, GraduationCap, UserCog } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))", "hsl(var(--secondary-foreground))", "hsl(var(--ring))"];

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await getAnalytics());
      } catch (err) {
        toast({ title: "Failed to load analytics", description: String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }
  if (!data) return null;
  const t = data.totals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Platform-wide insights from the last 30 days.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Total users" value={t.users.toString()} sub={`${t.students} students · ${t.experts} experts`} />
        <Kpi icon={<Ticket className="h-5 w-5" />} label="Tickets" value={t.tickets.toString()} sub={`${t.openTickets} open / in progress`} />
        <Kpi icon={<BookOpen className="h-5 w-5" />} label="Projects" value={t.projects.toString()} sub={`${t.activeProjects} active · ${t.completedProjects} completed`} />
        <Kpi icon={<DollarSign className="h-5 w-5" />} label="Revenue (30d)" value={formatMoney(t.revenue)} sub={`${formatMoney(t.pendingRevenue)} pending`} accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Revenue (last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart data={data.revenueByDay}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> New signups (last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.signupsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="users" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4 text-accent" /> Tickets by status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.ticketsByStatus.length === 0 ? <Empty /> : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.ticketsByStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                    {data.ticketsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /> Projects by status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.projectsByStatus.length === 0 ? <Empty /> : (
              <ResponsiveContainer>
                <BarChart data={data.projectsByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-accent" /> Top experts by rating</CardTitle></CardHeader>
        <CardContent>
          {data.topExperts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rated experts yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.topExperts.map((e, i) => (
                <li key={e.expert_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-mono text-xs">{i + 1}</span>
                    <span className="font-medium">{e.full_name ?? `Expert ${e.expert_id.slice(0, 8)}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 text-accent fill-accent" />
                    <span className="font-medium text-foreground">{e.rating_avg.toFixed(2)}</span>
                    <span>({e.rating_count} reviews)</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <RoleCount icon={<GraduationCap className="h-5 w-5" />} label="Students" value={t.students} />
        <RoleCount icon={<UserCog className="h-5 w-5" />} label="Experts" value={t.experts} />
        <RoleCount icon={<Users className="h-5 w-5" />} label="Admins" value={t.admins} />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-accent/40" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function RoleCount({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="font-display text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet.</p>;
}