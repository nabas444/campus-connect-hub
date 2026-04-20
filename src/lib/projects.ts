import type { Database } from "@/integrations/supabase/types";
import { formatBytes, timeAgo } from "@/lib/tickets";
export { formatBytes, timeAgo };

export type ProjectStatus = "draft" | "open" | "in_progress" | "review" | "completed" | "cancelled";
export type MilestoneStatus = "pending" | "in_progress" | "submitted" | "approved" | "rejected";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "review", label: "In review" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const MILESTONE_STATUSES: { value: MilestoneStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const PROJECT_STATUS_LABEL = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label]),
) as Record<ProjectStatus, string>;

export const MILESTONE_STATUS_LABEL = Object.fromEntries(
  MILESTONE_STATUSES.map((s) => [s.value, s.label]),
) as Record<MilestoneStatus, string>;

export const PROJECT_STATUS_BADGE: Record<ProjectStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  open: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  review: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
};

export const MILESTONE_STATUS_BADGE: Record<MilestoneStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  submitted: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
export type DeliverableRow = Database["public"]["Tables"]["deliverables"]["Row"];
export type ProjectEventRow = Database["public"]["Tables"]["project_events"]["Row"];

export const SUBJECTS = [
  "Mathematics", "Computer Science", "Physics", "Chemistry", "Biology",
  "Engineering", "Business", "Economics", "Literature", "History",
  "Psychology", "Design", "Other",
];

export function formatCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
