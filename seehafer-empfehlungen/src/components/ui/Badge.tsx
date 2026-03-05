import type { EmpfehlungStatus } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/utils";

interface BadgeProps {
  status: EmpfehlungStatus;
}

export function Badge({ status }: BadgeProps) {
  const colors = getStatusColor(status);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.5px",
        borderRadius: "6px",
        backgroundColor: colors.bg,
        color: colors.text,
      }}
      role="status"
    >
      {getStatusLabel(status)}
    </span>
  );
}
