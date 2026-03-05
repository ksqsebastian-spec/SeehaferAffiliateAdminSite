"use client";

import { useEffect, useState, useCallback } from "react";
import type { EmpfehlungWithHandwerker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PayoutsPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/handwerker?view=empfehlungen&status=erledigt");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmpfehlungen(data.data || []);
    } catch {
      setEmpfehlungen([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === empfehlungen.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(empfehlungen.map((e) => e.id)));
    }
  }

  async function handlePayout() {
    setPaying(true);
    setResult(null);

    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empfehlung_ids: Array.from(selected) }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || "Auszahlung fehlgeschlagen" });
      } else {
        setResult({
          success: true,
          message: `${data.count} Auszahlungen erfolgreich gestartet (Batch: ${data.batchId})`,
        });
        setSelected(new Set());
        fetchData();
      }
    } catch {
      setResult({ success: false, message: "Netzwerkfehler" });
    } finally {
      setPaying(false);
      setConfirmOpen(false);
    }
  }

  const totalAmount = empfehlungen
    .filter((e) => selected.has(e.id))
    .reduce((sum, e) => sum + (e.provision_betrag ?? 0), 0);

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>
          Auszahlungen
        </h1>
        {selected.size > 0 && (
          <Button
            onClick={() => setConfirmOpen(true)}
            style={{ backgroundColor: "var(--green)" }}
          >
            {selected.size} auszahlen ({formatCurrency(totalAmount)})
          </Button>
        )}
      </div>

      {result && (
        <div
          role="alert"
          style={{
            padding: "12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: result.success ? "var(--green-bg)" : "var(--red-bg)",
            color: result.success ? "var(--green)" : "var(--red)",
            fontSize: "13px",
          }}
        >
          {result.message}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <Card
          style={{
            border: "2px solid var(--orange)",
            backgroundColor: "var(--orange-bg)",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 8px" }}>
            Auszahlung bestätigen
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "14px" }}>
            {selected.size} Empfehlungen für insgesamt{" "}
            <strong>{formatCurrency(totalAmount)}</strong> via PayPal auszahlen?
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button onClick={handlePayout} loading={paying}>
              Ja, auszahlen
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={paying}
            >
              Abbrechen
            </Button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "12px 16px" }}>
                <input
                  type="checkbox"
                  checked={selected.size === empfehlungen.length && empfehlungen.length > 0}
                  onChange={toggleAll}
                  aria-label="Alle auswählen"
                />
              </th>
              {["Empfehler", "E-Mail (PayPal)", "Ref", "Handwerker", "Provision", "Erledigt am"].map(
                (h) => (
                  <th
                    key={h}
                    style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Laden...
                </td>
              </tr>
            ) : empfehlungen.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Keine Empfehlungen zur Auszahlung bereit
                </td>
              </tr>
            ) : (
              empfehlungen.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(emp.id)}
                      onChange={() => toggleSelect(emp.id)}
                      aria-label={`${emp.empfehler_name} auswählen`}
                    />
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                    {emp.empfehler_name}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{emp.empfehler_email}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px" }}>
                    {emp.ref_code}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{emp.handwerker?.name ?? "–"}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--green)" }}>
                    {formatCurrency(emp.provision_betrag ?? 0)}
                  </td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    {formatDate(emp.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
