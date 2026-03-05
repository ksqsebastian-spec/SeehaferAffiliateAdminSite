"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import type { EmpfehlungWithHandwerker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import {
  generateAusgezahltEmail,
  generateMailtoLink,
} from "@/lib/email-templates";

export default function EmailConfiguratorPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/handwerker?view=empfehlungen&pageSize=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmpfehlungen(
        (data.data || []).filter(
          (e: EmpfehlungWithHandwerker) => e.status === "erledigt" || e.status === "ausgezahlt"
        )
      );
    } catch {
      setEmpfehlungen([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selected = empfehlungen.find((e) => e.id === selectedId);

  const generatedEmail = selected
    ? generateAusgezahltEmail({
        empfehlerName: selected.empfehler_name,
        empfehlerEmail: selected.empfehler_email,
        refCode: selected.ref_code,
        provisionBetrag: selected.provision_betrag ?? 0,
      })
    : null;

  async function copyToClipboard(text: string, type: "subject" | "body" | "all") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  const mailtoLink =
    selected && generatedEmail
      ? generateMailtoLink(selected.empfehler_email, generatedEmail.subject, generatedEmail.body)
      : "";

  return (
    <div
      className="animate-fadeIn"
      style={{ display: "flex", flexDirection: "column", gap: "32px" }}
    >
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>
          E-Mail Konfigurator
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "8px 0 0 0" }}>
          Wähle eine Empfehlung aus, um die Auszahlungs-E-Mail zu generieren. Kopiere den Text in Outlook oder öffne ihn direkt im Mail-Client.
        </p>
      </div>

      {/* Empfehlung selector */}
      <div style={{ maxWidth: "500px" }}>
        <label
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Empfehlung auswählen
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "2px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "white",
            fontWeight: 500,
          }}
        >
          <option value="">-- Empfehlung wählen --</option>
          {loading ? (
            <option disabled>Laden...</option>
          ) : (
            empfehlungen.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.empfehler_name} → {emp.kunde_name} ({emp.ref_code})
                {emp.provision_betrag ? ` – ${formatCurrency(emp.provision_betrag)}` : ""}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Selected empfehlung info */}
      {selected && (
        <Card
          style={{
            backgroundColor: "var(--blue-bg)",
            borderLeft: "4px solid var(--blue)",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ fontWeight: 600 }}>
              An: {selected.empfehler_name} ({selected.empfehler_email})
            </div>
            <Badge status={selected.status} />
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            Kunde: {selected.kunde_name} | Ref: {selected.ref_code}
            {selected.provision_betrag && (
              <> | Provision: <strong>{formatCurrency(selected.provision_betrag)}</strong></>
            )}
          </div>
        </Card>
      )}

      {/* Generated email */}
      {generatedEmail && selected && (
        <Card style={{ padding: 0, borderRadius: "var(--radius)" }}>
          {/* Subject */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px 22px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "#fafaf8",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Betreff
              </span>
              <div style={{ fontSize: "15px", fontWeight: 600, marginTop: "4px" }}>
                {generatedEmail.subject}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(generatedEmail.subject, "subject")}
              aria-label="Betreff kopieren"
            >
              {copied === "subject" ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>

          {/* Body */}
          <div style={{ padding: "22px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Nachricht
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(generatedEmail.body, "body")}
                aria-label="Nachricht kopieren"
              >
                {copied === "body" ? (
                  <>
                    <Check size={14} /> Kopiert
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Kopieren
                  </>
                )}
              </Button>
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                lineHeight: 1.7,
                color: "var(--text)",
                backgroundColor: "var(--bg)",
                padding: "20px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                margin: 0,
              }}
            >
              {generatedEmail.body}
            </pre>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              padding: "18px 22px",
              borderTop: "1px solid var(--border)",
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={() =>
                copyToClipboard(
                  `Betreff: ${generatedEmail.subject}\n\n${generatedEmail.body}`,
                  "all"
                )
              }
              style={{ borderRadius: "20px" }}
            >
              {copied === "all" ? (
                <>
                  <Check size={16} /> Alles kopiert!
                </>
              ) : (
                <>
                  <Copy size={16} /> Alles kopieren
                </>
              )}
            </Button>
            <a
              href={mailtoLink}
              style={{ textDecoration: "none" }}
            >
              <Button variant="secondary" style={{ borderRadius: "20px" }}>
                <ExternalLink size={16} /> In Mail-App öffnen
              </Button>
            </a>
          </div>
        </Card>
      )}

      {!selectedId && !loading && (
        <Card
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-muted)",
            fontSize: "15px",
          }}
        >
          Wähle oben eine Empfehlung aus, um die E-Mail zu generieren.
        </Card>
      )}
    </div>
  );
}
