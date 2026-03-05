import type { EmpfehlungStatus } from "@/types";
import { getInitials, getStatusColor } from "@/lib/utils";

interface AvatarProps {
  name: string;
  status: EmpfehlungStatus;
  size?: number;
}

export function Avatar({ name, status, size = 40 }: AvatarProps) {
  const colors = getStatusColor(status);
  const initials = getInitials(name);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: colors.bg,
        color: colors.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
