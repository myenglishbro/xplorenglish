import { Tag, type TagTone } from "@/components/ui/core/Tag";
import type { SessionStatus } from "@/server/scheduling/types";

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

const STATUS_TONE: Record<SessionStatus, TagTone> = {
  scheduled: "brand",
  completed: "success",
  cancelled: "danger",
  rescheduled: "warning",
};

export function SessionStatusTag({ status, size = "md" }: { status: SessionStatus; size?: "sm" | "md" }) {
  return (
    <Tag tone={STATUS_TONE[status]} size={size}>
      {STATUS_LABEL[status]}
    </Tag>
  );
}
