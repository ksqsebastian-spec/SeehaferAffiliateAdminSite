import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <Card
      style={{
        textAlign: "center",
        padding: "16px 12px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontWeight: 800,
          color: color || "var(--navy)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          marginTop: "4px",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </Card>
  );
}
