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

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "8px 16px", fontSize: "13px" },
  md: { padding: "12px 24px", fontSize: "15px" },
  lg: { padding: "16px 32px", fontSize: "17px" },
};

function getVariantStyle(variant: ButtonVariant): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    letterSpacing: "-0.2px",
  };

  switch (variant) {
    case "primary":
      return {
        ...base,
        background: "linear-gradient(135deg, #f28900 0%, #ff6b00 100%)",
        color: "white",
        border: "none",
        boxShadow: "0 4px 14px rgba(242, 137, 0, 0.4)",
      };
    case "secondary":
      return {
        ...base,
        backgroundColor: "var(--navy)",
        color: "white",
        border: "none",
        boxShadow: "0 4px 14px rgba(5, 2, 52, 0.2)",
      };
    case "danger":
      return {
        ...base,
        background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
        color: "white",
        border: "none",
        boxShadow: "0 4px 14px rgba(220, 38, 38, 0.3)",
      };
    case "ghost":
      return {
        ...base,
        backgroundColor: "transparent",
        color: "var(--text-muted)",
        border: "none",
        boxShadow: "none",
      };
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
