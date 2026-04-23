import { useEffect, useMemo, useState } from "react";
import { AdminUser, AppRole, listAllUsers, setUserRole } from "@/lib/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, Users, UserCog, Shield, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const roleColor: Record<AppRole, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  expert: "bg-accent/15 text-accent border-accent/30",
  student: "bg-primary/15 text-primary border-primary/30",
};

const roleIcon: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  expert: UserCog,
  student: GraduationCap,
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | AppRole>("all");

  const refresh = async () => {
    setLoading(true);
    try {
      setUsers(await listAllUsers());
    } catch (err) {
      toast({ title: "Failed to load users", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "all" && !u.roles.includes(filter)) return false;
      if (!needle) return true;
      return (u.full_name?.toLowerCase().includes(needle) || u.email?.toLowerCase().includes(needle));
    });
  }, [users, q, filter]);

  const counts = useMemo(() => ({
    total: users.length,
    students: users.filter((u) => u.roles.includes("student")).length,
    experts: users.filter((u) => u.roles.includes("expert")).length,
    admins: users.filter((u) => u.roles.includes("admin")).length,
  }), [users]);

  const handleRoleChange = async (userId: string, role: AppRole) => {
    setBusy(userId);
    try {
      await setUserRole(userId, role);
      toast({ title: "Role updated", description: `User is now ${role}.` });
      await refresh();
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="mt-1 text-muted-foreground">Manage every account on the platform and change roles.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat icon={<Users className="h-4 w-4" />} label="Total" value={counts.total} />
        <Stat icon={<GraduationCap className="h-4 w-4" />} label="Students" value={counts.students} />
        <Stat icon={<UserCog className="h-4 w-4" />} label="Experts" value={counts.experts} />
        <Stat icon={<Shield className="h-4 w-4" />} label="Admins" value={counts.admins} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="expert">Experts</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users match your filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Change role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const primary = (u.roles[0] ?? "student") as AppRole;
                  const Icon = roleIcon[primary];
                  const initials = (u.full_name ?? u.email ?? "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                  const isMe = me?.id === u.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{u.full_name ?? "Unnamed"}{isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColor[primary]}>
                          <Icon className="h-3 w-3 mr-1" />{primary}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {busy === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                        ) : (
                          <Select
                            value={primary}
                            onValueChange={(v) => handleRoleChange(u.id, v as AppRole)}
                            disabled={isMe}
                          >
                            <SelectTrigger className="w-36 ml-auto"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="expert">Expert</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}