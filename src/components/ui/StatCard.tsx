"use client";

import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  bgColor?: string;
}

export function StatCard({ label, value, color, bgColor }: StatCardProps) {
  return (
    <Card
      style={{
        textAlign: "center",
        padding: "28px 24px",
        flex: 1,
        minWidth: "150px",
        background: bgColor || "white",
        borderRadius: "20px",
        borderLeft: `4px solid ${color || "var(--navy)"}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          fontSize: "36px",
          fontWeight: 800,
          color: color || "var(--navy)",
          lineHeight: 1.1,
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "13px",
          color: color || "var(--text-muted)",
          marginTop: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
    </Card>
  );
}
