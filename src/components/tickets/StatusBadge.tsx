import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_BADGE, STATUS_LABEL, PRIORITY_BADGE, PRIORITY_LABEL, type TicketStatus, type TicketPriority } from "@/lib/tickets";

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium border", STATUS_BADGE[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium border capitalize", PRIORITY_BADGE[priority], className)}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
