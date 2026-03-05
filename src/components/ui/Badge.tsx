import type { EmpfehlungStatus } from "@/types";
import { getStatusLabel } from "@/lib/utils";

interface BadgeProps {
  status: EmpfehlungStatus;
}

const statusStyles: Record<EmpfehlungStatus, { bg: string; color: string; shadow: string }> = {
  offen: { bg: "#ea580c", color: "white", shadow: "rgba(234,88,12,0.3)" },
  erledigt: { bg: "#16a34a", color: "white", shadow: "rgba(22,163,74,0.3)" },
  ausgezahlt: { bg: "#2563eb", color: "white", shadow: "rgba(37,99,235,0.3)" },
};

export function Badge({ status }: BadgeProps) {
  const s = statusStyles[status] || statusStyles.offen;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 14px",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.3px",
        borderRadius: "16px",
        backgroundColor: s.bg,
        color: s.color,
        boxShadow: `0 2px 8px ${s.shadow}`,
      }}
      role="status"
    >
      {getStatusLabel(status)}
    </span>
  );
}
