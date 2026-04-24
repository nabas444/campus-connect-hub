import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, BookOpen, MessagesSquare, TrendingUp } from "lucide-react";

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
  admin: [
    { label: "Total users", value: "—", icon: Ticket, hint: "Across roles" },
    { label: "Open tickets", value: "—", icon: BookOpen, hint: "Platform-wide" },
    { label: "Active projects", value: "—", icon: MessagesSquare, hint: "In progress" },
    { label: "Revenue (30d)", value: "—", icon: TrendingUp, hint: "Mock data" },
  ],
} as const;

export default function Overview() {
  const { user, role } = useAuth();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.full_name ?? user.email?.split("@")[0] ?? ""));
  }, [user]);

  const stats = statsByRole[role ?? "student"];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">
          Welcome{name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-1 text-muted-foreground">
          {role === "admin"
            ? "Platform overview and operational health."
            : role === "expert"
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
