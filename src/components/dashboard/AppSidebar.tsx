import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  MessagesSquare,
  CreditCard,
  Star,
  Users,
  BarChart3,
  Settings,
  GraduationCap,
  Wallet,
  DollarSign,
  UserCircle,
  Search,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/hooks/useAuth";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const itemsByRole: Record<AppRole, NavItem[]> = {
  student: [
    { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
    { title: "Tech tickets", url: "/dashboard/tickets", icon: Ticket },
    { title: "Assignments", url: "/dashboard/assignments", icon: BookOpen },
    { title: "Find experts", url: "/dashboard/experts", icon: Search },
    { title: "Messages", url: "/dashboard/messages", icon: MessagesSquare },
    { title: "Billing", url: "/dashboard/billing", icon: CreditCard },
    { title: "Reviews", url: "/dashboard/reviews", icon: Star },
  ],
  expert: [
    { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
    { title: "Assigned tickets", url: "/dashboard/tickets", icon: Ticket },
    { title: "Projects", url: "/dashboard/assignments", icon: BookOpen },
    { title: "My profile", url: "/dashboard/profile", icon: UserCircle },
    { title: "Messages", url: "/dashboard/messages", icon: MessagesSquare },
    { title: "Earnings", url: "/dashboard/earnings", icon: Wallet },
    { title: "Performance", url: "/dashboard/reviews", icon: Star },
  ],
  admin: [
    { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
    { title: "All tickets", url: "/dashboard/tickets", icon: Ticket },
    { title: "All projects", url: "/dashboard/assignments", icon: BookOpen },
    { title: "Experts", url: "/dashboard/experts", icon: Users },
    { title: "Payments", url: "/dashboard/payments", icon: DollarSign },
    { title: "Users", url: "/dashboard/users", icon: Users },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const items = itemsByRole[role ?? "student"];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 font-display font-bold">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
            <GraduationCap className="h-5 w-5 text-accent-foreground" />
          </span>
          {!collapsed && <span>Campus</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role ? role.toUpperCase() : "MENU"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
