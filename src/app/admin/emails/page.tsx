"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Check, Mail, User, ArrowRight, FileDown } from "lucide-react";
import type { EmpfehlungWithHandwerker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import {
  generateAusgezahltEmail,
  generateMailtoLink,
} from "@/lib/email-templates";
import { generateReceipt } from "@/lib/pdf-receipt";

export default function EmailConfiguratorPage() {
  const [empfehlungen, setAffiliateen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/handwerker?view=empfehlungen&pageSize=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAffiliateen(data.data || []);
    } catch {
      setAffiliateen([]);
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
          Wähle eine Affiliate, um die Auszahlungs-E-Mail zu generieren.
        </p>
      </div>

      {/* Affiliate cards */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--orange)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
          Affiliate auswählen
        </div>

        {loading ? (
          <Card style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", borderRadius: "20px" }}>
            Laden...
          </Card>
        ) : empfehlungen.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", borderRadius: "20px" }}>
            Keine Affiliateen vorhanden.
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {empfehlungen.map((emp) => {
              const isSelected = selectedId === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedId(emp.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px 20px",
                    borderRadius: "16px",
                    border: isSelected ? "2px solid var(--orange)" : "2px solid var(--border)",
                    backgroundColor: isSelected ? "var(--orange-bg)" : "white",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 4px 16px rgba(242,137,0,0.15)" : "0 2px 8px rgba(0,0,0,0.03)",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: isSelected ? "linear-gradient(135deg, #f28900, #ff6b00)" : "#f0eff8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <User size={20} color={isSelected ? "white" : "var(--navy)"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--navy)" }}>
                        {emp.empfehler_name}
                      </span>
                      <ArrowRight size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                        {emp.kunde_name}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--blue)", fontWeight: 700, background: "var(--blue-bg)", padding: "2px 8px", borderRadius: "6px" }}>
                        {emp.ref_code}
                      </span>
                      {emp.provision_betrag && (
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)" }}>
                          {formatCurrency(emp.provision_betrag)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
            <Button
              variant="secondary"
              size="lg"
              onClick={async () => {
                try {
                  await generateReceipt({
                    empfehlung: selected,
                    emailSubject: generatedEmail.subject,
                    emailBody: generatedEmail.body,
                  });
                } catch {
                  alert("Fehler beim Erstellen des Belegs");
                }
              }}
            >
              <FileDown size={18} /> Beleg herunterladen
            </Button>
          </div>
        </Card>
      )}

      {!selectedId && !loading && empfehlungen.length > 0 && (
        <Card
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-muted)",
            fontSize: "16px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #f8f7f4 0%, #eff6ff 100%)",
          }}
        >
          <Mail size={40} color="var(--orange)" style={{ marginBottom: "16px" }} />
          <div>Wähle oben eine Affiliate aus, um die E-Mail zu generieren.</div>
        </Card>
      )}
    </div>
  );
}
