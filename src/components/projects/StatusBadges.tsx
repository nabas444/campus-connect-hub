import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_BADGE, PROJECT_STATUS_LABEL,
  MILESTONE_STATUS_BADGE, MILESTONE_STATUS_LABEL,
  type ProjectStatus, type MilestoneStatus,
} from "@/lib/projects";

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium border", PROJECT_STATUS_BADGE[status], className)}>
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function MilestoneStatusBadge({ status, className }: { status: MilestoneStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium border", MILESTONE_STATUS_BADGE[status], className)}>
      {MILESTONE_STATUS_LABEL[status]}
    </Badge>
  );
}
