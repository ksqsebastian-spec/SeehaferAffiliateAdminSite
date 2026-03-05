"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function QuickAddForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGeneralError("");

    const formData = new FormData(e.currentTarget);
    const body = {
      kunde_name: formData.get("kunde_name"),
      kunde_kontakt: formData.get("kunde_kontakt") || undefined,
      empfehler_name: formData.get("empfehler_name"),
      empfehler_email: formData.get("empfehler_email"),
      ref_code: formData.get("ref_code") || undefined,
    };

    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrors(
            Object.fromEntries(
              Object.entries(data.details).map(([k, v]) => [
                k,
                Array.isArray(v) ? v[0] : String(v),
              ])
            )
          );
        } else {
          setGeneralError(data.error || "Ein Fehler ist aufgetreten");
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setGeneralError("Netzwerkfehler — bitte versuche es erneut");
    } finally {
      setLoading(false);
    }
  }

  const year = new Date().getFullYear();

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      {generalError && (
        <div
          role="alert"
          style={{
            padding: "12px",
            backgroundColor: "var(--red-bg)",
            color: "var(--red)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
          }}
        >
          {generalError}
        </div>
      )}

      <Input
        label="Kunde"
        name="kunde_name"
        required
        maxLength={120}
        error={errors.kunde_name}
        autoComplete="off"
      />

      <Input
        label="Kontakt (Email/Telefon)"
        name="kunde_kontakt"
        maxLength={200}
        error={errors.kunde_kontakt}
        autoComplete="off"
      />

      <Input
        label="Affiliate Name"
        name="empfehler_name"
        required
        maxLength={120}
        error={errors.empfehler_name}
        autoComplete="off"
      />

      <Input
        label="E-Mail"
        name="empfehler_email"
        type="email"
        required
        maxLength={200}
        error={errors.empfehler_email}
        autoComplete="off"
      />

      <Input
        label="Ref-Code (optional)"
        name="ref_code"
        placeholder={`#SEE-${year}-`}
        maxLength={20}
        error={errors.ref_code}
        autoComplete="off"
      />

      <Button type="submit" loading={loading} size="lg">
        Empfehlung anlegen
      </Button>
    </form>
  );
}
