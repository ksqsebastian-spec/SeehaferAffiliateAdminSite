"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "background-color: var(--orange); color: white; border: none; hover:background-color: var(--orange-hover);",
  secondary:
    "background-color: white; color: var(--text); border: 1px solid var(--border);",
  danger:
    "background-color: var(--red); color: white; border: none;",
  ghost:
    "background-color: transparent; color: var(--text-muted); border: none;",
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "13px" },
  md: { padding: "10px 20px", fontSize: "14px" },
  lg: { padding: "14px 28px", fontSize: "16px" },
};

function getVariantStyle(variant: ButtonVariant): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  };

  switch (variant) {
    case "primary":
      return { ...base, backgroundColor: "var(--orange)", color: "white", border: "none" };
    case "secondary":
      return { ...base, backgroundColor: "white", color: "var(--text)", border: "1px solid var(--border)" };
    case "danger":
      return { ...base, backgroundColor: "var(--red)", color: "white", border: "none" };
    case "ghost":
      return { ...base, backgroundColor: "transparent", color: "var(--text-muted)", border: "none" };
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading, disabled, children, style, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{
          ...getVariantStyle(variant),
          ...sizeStyles[size],
          opacity: disabled || loading ? 0.6 : 1,
          cursor: disabled || loading ? "not-allowed" : "pointer",
          ...style,
        }}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {children}
      </button>
    );
  }
);
