"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, berechneProvision } from "@/lib/utils";

interface CompleteFormProps {
  empfehlungId: string;
  provisionProzent: number;
}

export function CompleteForm({
  empfehlungId,
  provisionProzent,
}: CompleteFormProps) {
  const router = useRouter();
  const [betrag, setBetrag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numericBetrag = parseFloat(betrag) || 0;
  const provision = berechneProvision(numericBetrag, provisionProzent);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (numericBetrag <= 0) {
      setError("Bitte einen gültigen Betrag eingeben");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/referrals/${empfehlungId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rechnungsbetrag: numericBetrag }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Netzwerkfehler — bitte versuche es erneut");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "20px",
          marginTop: "8px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          Job erledigt?
        </h3>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      <Input
        label="Rechnungsbetrag (brutto)"
        type="number"
        step="0.01"
        min="0.01"
        max="999999"
        value={betrag}
        onChange={(e) => setBetrag(e.target.value)}
        placeholder="€"
        required
      />

      {numericBetrag > 0 && (
        <div
          style={{
            fontSize: "14px",
            color: "var(--green)",
            fontWeight: 600,
            textAlign: "center",
          }}
          aria-live="polite"
        >
          Provision: {provisionProzent}% = {formatCurrency(provision)}
        </div>
      )}

      <Button
        type="submit"
        loading={loading}
        size="lg"
        style={{
          backgroundColor: "var(--green)",
        }}
      >
        ✓ Job erledigt
      </Button>
    </form>
  );
}
