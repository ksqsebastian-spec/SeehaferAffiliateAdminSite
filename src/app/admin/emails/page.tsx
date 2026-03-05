"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import type { EmpfehlungWithHandwerker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import {
  generateErledigtEmail,
  generateAusgezahltEmail,
  generateMailtoLink,
  type EmailType,
} from "@/lib/email-templates";

export default function EmailConfiguratorPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [emailType, setEmailType] = useState<EmailType>("erledigt");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch empfehlungen that are erledigt or ausgezahlt (need emails for these)
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

  // Generate the email based on selection
  const generatedEmail = selected
    ? emailType === "erledigt"
      ? generateErledigtEmail({
          empfehlerName: selected.empfehler_name,
          refCode: selected.ref_code,
        })
      : generateAusgezahltEmail({
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
      // Fallback for older browsers
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
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>
        E-Mail Konfigurator
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
        Wähle eine Empfehlung und den E-Mail-Typ. Kopiere den generierten Text
        in Outlook oder öffne ihn direkt im Mail-Client.
      </p>

      {/* Selection row */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
        {/* Empfehlung selector */}
        <div style={{ flex: 2, minWidth: "250px" }}>
          <label
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Empfehlung auswählen
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "14px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "white",
            }}
          >
            <option value="">-- Empfehlung wählen --</option>
            {loading ? (
              <option disabled>Laden...</option>
            ) : (
              empfehlungen.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.empfehler_name} → {emp.kunde_name} ({emp.ref_code}) –{" "}
                  {emp.status === "erledigt" ? "Erledigt" : "Ausgezahlt"}
                  {emp.provision_betrag ? ` – ${formatCurrency(emp.provision_betrag)}` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Email type selector */}
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            E-Mail-Typ
          </label>
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as EmailType)}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "14px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "white",
            }}
          >
            <option value="erledigt">Bestätigung (Job erledigt)</option>
            <option value="ausgezahlt">Auszahlung erfolgt</option>
          </select>
        </div>
      </div>

      {/* Selected empfehlung info */}
      {selected && (
        <Card
          style={{
            backgroundColor: "var(--blue-bg)",
            border: "1px solid var(--blue)",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <strong>An:</strong> {selected.empfehler_name} ({selected.empfehler_email})
            </div>
            <Badge status={selected.status} />
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Kunde: {selected.kunde_name} | Ref: {selected.ref_code}
            {selected.provision_betrag && (
              <> | Provision: {formatCurrency(selected.provision_betrag)}</>
            )}
          </div>
        </Card>
      )}

      {/* Generated email */}
      {generatedEmail && selected && (
        <Card style={{ padding: 0 }}>
          {/* Subject */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                BETREFF
              </span>
              <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "2px" }}>
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
          <div style={{ padding: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                NACHRICHT
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
                lineHeight: 1.6,
                color: "var(--text)",
                backgroundColor: "var(--bg)",
                padding: "16px",
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
              gap: "8px",
              padding: "16px 20px",
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
              <Button variant="secondary">
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
            padding: "40px",
            color: "var(--text-muted)",
          }}
        >
          Wähle oben eine Empfehlung aus, um die E-Mail zu generieren.
        </Card>
      )}
    </div>
  );
}
