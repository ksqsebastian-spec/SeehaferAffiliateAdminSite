"use client";

import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, style, children, ...props }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-card)",
        padding: "20px",
        transition: "all 0.2s ease",
        ...(hover
          ? { cursor: "pointer" }
          : {}),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = "var(--shadow-hover)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = "var(--shadow-card)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
}
