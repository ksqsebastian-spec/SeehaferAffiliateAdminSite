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
        padding: "28px 20px",
        flex: 1,
        minWidth: "140px",
        background: bgColor || "white",
        borderRadius: "20px",
      }}
    >
      <div
        style={{
          fontSize: "32px",
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
          color: "var(--text-muted)",
          marginTop: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
    </Card>
  );
}
