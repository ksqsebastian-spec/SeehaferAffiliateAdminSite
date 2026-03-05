"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: "14px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  backgroundColor: "white",
  color: "var(--text)",
  outline: "none",
  transition: "border-color 0.2s ease",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, id, style, ...props }, ref) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-muted)",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          style={{
            ...inputStyle,
            borderColor: error ? "var(--red)" : "var(--border)",
            ...style,
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            style={{ fontSize: "12px", color: "var(--red)", margin: 0 }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
