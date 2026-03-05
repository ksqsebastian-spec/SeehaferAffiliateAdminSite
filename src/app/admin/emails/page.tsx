"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, ExternalLink, Check, Mail } from "lucide-react";
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
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>
          E-Mail Konfigurator
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "15px", margin: "10px 0 0 0", lineHeight: 1.6 }}>
          Wähle eine Empfehlung aus, um die Auszahlungs-E-Mail zu generieren.
          Kopiere den Text in Outlook oder öffne ihn direkt im Mail-Client.
        </p>
      </div>

      {/* Empfehlung selector */}
      <Card style={{ borderRadius: "20px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <label
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--orange)",
            display: "block",
            marginBottom: "10px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Empfehlung auswählen
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: "15px",
            border: "2px solid var(--border)",
            borderRadius: "14px",
            backgroundColor: "white",
            fontWeight: 500,
            color: "var(--text)",
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
      </Card>

      {/* Selected empfehlung info */}
      {selected && (
        <Card
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)",
            borderLeft: "5px solid var(--blue)",
            padding: "20px 24px",
            borderRadius: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--navy)" }}>
              An: {selected.empfehler_name} ({selected.empfehler_email})
            </div>
            <Badge status={selected.status} />
          </div>
          <div style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "8px" }}>
            Kunde: {selected.kunde_name} | Ref:{" "}
            <span style={{ fontFamily: "monospace", color: "var(--blue)", fontWeight: 700 }}>{selected.ref_code}</span>
            {selected.provision_betrag && (
              <> | Provision: <strong style={{ color: "var(--green)" }}>{formatCurrency(selected.provision_betrag)}</strong></>
            )}
          </div>
        </Card>
      )}

      {/* Generated email */}
      {generatedEmail && selected && (
        <Card style={{ padding: 0, borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          {/* Subject */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 24px",
              borderBottom: "1px solid var(--border)",
              background: "linear-gradient(135deg, #050234 0%, #0a0654 100%)",
              borderRadius: "20px 20px 0 0",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                Betreff
              </span>
              <div style={{ fontSize: "16px", fontWeight: 600, marginTop: "4px", color: "white" }}>
                {generatedEmail.subject}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(generatedEmail.subject, "subject")}
              aria-label="Betreff kopieren"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {copied === "subject" ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>

          {/* Body */}
          <div style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--orange)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
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
                fontSize: "15px",
                lineHeight: 1.8,
                color: "var(--text)",
                backgroundColor: "#f8f7f4",
                padding: "24px",
                borderRadius: "14px",
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
              gap: "12px",
              padding: "20px 24px",
              borderTop: "1px solid var(--border)",
              flexWrap: "wrap",
            }}
          >
            <Button
              size="lg"
              onClick={() =>
                copyToClipboard(
                  `Betreff: ${generatedEmail.subject}\n\n${generatedEmail.body}`,
                  "all"
                )
              }
            >
              {copied === "all" ? (
                <>
                  <Check size={18} /> Alles kopiert!
                </>
              ) : (
                <>
                  <Copy size={18} /> Alles kopieren
                </>
              )}
            </Button>
            <a
              href={mailtoLink}
              style={{ textDecoration: "none" }}
            >
              <Button variant="secondary" size="lg">
                <Mail size={18} /> In Mail-App öffnen
              </Button>
            </a>
          </div>
        </Card>
      )}

      {!selectedId && !loading && (
        <Card
          style={{
            textAlign: "center",
            padding: "60px",
            color: "var(--text-muted)",
            fontSize: "16px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #f8f7f4 0%, #eff6ff 100%)",
          }}
        >
          <Mail size={40} color="var(--orange)" style={{ marginBottom: "16px" }} />
          <div>Wähle oben eine Empfehlung aus, um die E-Mail zu generieren.</div>
        </Card>
      )}
    </div>
  );
}
