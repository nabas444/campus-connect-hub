import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: AppRole[];
};

export async function listAllUsers(): Promise<AdminUser[]> {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url, created_at").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  const byUser = new Map<string, AppRole[]>();
  (roles ?? []).forEach((r) => {
    const arr = byUser.get(r.user_id) ?? [];
    arr.push(r.role as AppRole);
    byUser.set(r.user_id, arr);
  });
  return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
}

export async function setUserRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_role", { _user_id: userId, _role: role });
  if (error) throw error;
}

export type PlatformSettings = {
  general: { platform_name: string; support_email: string; default_currency: string };
  marketplace: { allow_expert_signup: boolean; auto_assign: boolean; min_project_budget: number; platform_fee_percent: number };
  notifications: { email_on_assignment: boolean; email_on_message: boolean };
};

export async function getSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase.from("platform_settings").select("key, value");
  if (error) throw error;
  const out: any = {};
  (data ?? []).forEach((row) => { out[row.key] = row.value; });
  return out as PlatformSettings;
}

export async function saveSetting(key: keyof PlatformSettings, value: unknown): Promise<void> {
  const { error } = await supabase.from("platform_settings").upsert({ key, value: value as never });
  if (error) throw error;
}

export type AnalyticsSnapshot = {
  totals: {
    users: number;
    students: number;
    experts: number;
    admins: number;
    tickets: number;
    openTickets: number;
    projects: number;
    activeProjects: number;
    completedProjects: number;
    revenue: number;
    pendingRevenue: number;
  };
  ticketsByStatus: { name: string; value: number }[];
  projectsByStatus: { name: string; value: number }[];
  revenueByDay: { date: string; revenue: number }[];
  signupsByDay: { date: string; users: number }[];
  topExperts: { expert_id: string; rating_avg: number; rating_count: number; full_name: string | null }[];
};

export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: roles },
    { data: tickets },
    { data: projects },
    { data: payments },
    { data: profilesRecent },
    { data: experts },
  ] = await Promise.all([
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("tickets").select("id, status, created_at"),
    supabase.from("projects").select("id, status, created_at"),
    supabase.from("payments").select("amount, status, paid_at, created_at").gte("created_at", since),
    supabase.from("profiles").select("id, created_at").gte("created_at", since),
    supabase.from("expert_profiles").select("expert_id, rating_avg, rating_count").order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }).limit(5),
  ]);

  const userIds = new Set<string>();
  let students = 0, expertsCount = 0, admins = 0;
  (roles ?? []).forEach((r) => {
    userIds.add(r.user_id);
    if (r.role === "student") students++;
    if (r.role === "expert") expertsCount++;
    if (r.role === "admin") admins++;
  });

  const ticketsByStatusMap = new Map<string, number>();
  let openTickets = 0;
  (tickets ?? []).forEach((t) => {
    ticketsByStatusMap.set(t.status, (ticketsByStatusMap.get(t.status) ?? 0) + 1);
    if (t.status === "open" || t.status === "assigned" || t.status === "in_progress") openTickets++;
  });

  const projectsByStatusMap = new Map<string, number>();
  let activeProjects = 0, completedProjects = 0;
  (projects ?? []).forEach((p) => {
    projectsByStatusMap.set(p.status, (projectsByStatusMap.get(p.status) ?? 0) + 1);
    if (p.status === "in_progress" || p.status === "review" || p.status === "open") activeProjects++;
    if (p.status === "completed") completedProjects++;
  });

  const revenueByDayMap = new Map<string, number>();
  let revenue = 0, pendingRevenue = 0;
  (payments ?? []).forEach((p) => {
    const amt = Number(p.amount);
    if (p.status === "paid") {
      revenue += amt;
      const d = (p.paid_at ?? p.created_at).slice(0, 10);
      revenueByDayMap.set(d, (revenueByDayMap.get(d) ?? 0) + amt);
    } else if (p.status === "pending") {
      pendingRevenue += amt;
    }
  });

  const signupsByDayMap = new Map<string, number>();
  (profilesRecent ?? []).forEach((p) => {
    const d = p.created_at.slice(0, 10);
    signupsByDayMap.set(d, (signupsByDayMap.get(d) ?? 0) + 1);
  });

  // Build a contiguous 30-day series
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push(d);
  }

  // Hydrate top expert names
  let topExperts: AnalyticsSnapshot["topExperts"] = [];
  if (experts && experts.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", experts.map((e) => e.expert_id));
    const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    topExperts = experts.map((e) => ({
      expert_id: e.expert_id,
      rating_avg: Number(e.rating_avg),
      rating_count: e.rating_count,
      full_name: nameMap.get(e.expert_id) ?? null,
    }));
  }

  return {
    totals: {
      users: userIds.size,
      students,
      experts: expertsCount,
      admins,
      tickets: tickets?.length ?? 0,
      openTickets,
      projects: projects?.length ?? 0,
      activeProjects,
      completedProjects,
      revenue,
      pendingRevenue,
    },
    ticketsByStatus: Array.from(ticketsByStatusMap, ([name, value]) => ({ name, value })),
    projectsByStatus: Array.from(projectsByStatusMap, ([name, value]) => ({ name, value })),
    revenueByDay: days.map((date) => ({ date: date.slice(5), revenue: revenueByDayMap.get(date) ?? 0 })),
    signupsByDay: days.map((date) => ({ date: date.slice(5), users: signupsByDayMap.get(date) ?? 0 })),
    topExperts,
  };
}