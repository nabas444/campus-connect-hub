import type { Database } from "@/integrations/supabase/types";

export type TicketCategory = "hardware" | "software" | "network" | "account" | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "waiting_on_student"
  | "resolved"
  | "closed";

export const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "network", label: "Network" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

export const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_student", label: "Waiting on student" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const STATUS_LABEL: Record<TicketStatus, string> = Object.fromEntries(
  STATUSES.map((s) => [s.value, s.label]),
) as Record<TicketStatus, string>;

export const PRIORITY_LABEL: Record<TicketPriority, string> = Object.fromEntries(
  PRIORITIES.map((p) => [p.value, p.label]),
) as Record<TicketPriority, string>;

export const CATEGORY_LABEL: Record<TicketCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<TicketCategory, string>;

export const STATUS_BADGE: Record<TicketStatus, string> = {
  open: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  assigned: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  waiting_on_student: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

export const PRIORITY_BADGE: Record<TicketPriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
export type AttachmentRow = Database["public"]["Tables"]["ticket_attachments"]["Row"];
export type EventRow = Database["public"]["Tables"]["ticket_events"]["Row"];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_FILES = 10;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
