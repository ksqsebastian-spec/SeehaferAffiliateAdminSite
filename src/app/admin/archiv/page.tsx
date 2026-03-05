"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Archive, ArrowLeft } from "lucide-react";
import type { EmpfehlungWithHandwerker } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function ArchivPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
        status: "ausgezahlt",
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/handwerker?view=empfehlungen&${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmpfehlungen(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setEmpfehlungen([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  async function handleMoveBack(emp: EmpfehlungWithHandwerker) {
    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, status: "erledigt" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || data.error || "Fehler");
        return;
      }
      fetchData();
    } catch {
      alert("Netzwerkfehler");
    }
  }

  const totalProvision = empfehlungen.reduce((sum, e) => sum + (e.provision_betrag ?? 0), 0);

  const cellStyle = { padding: "14px 16px" };

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Archive size={28} color="var(--navy)" />
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>Archiv</h1>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard label="Archiviert" value={total} bgColor="#eff6ff" color="#2563eb" />
        <StatCard label="Ausgezahlt gesamt" value={formatCurrency(totalProvision)} bgColor="#f5f3ff" color="#7c3aed" />
      </div>

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px", backgroundColor: "white", border: "2px solid var(--border)", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <Search size={20} color="var(--orange)" />
        <input
          placeholder="Name, Ref-Code suchen..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ border: "none", outline: "none", flex: 1, fontSize: "15px", backgroundColor: "transparent", color: "var(--text)", fontWeight: 500 }}
        />
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "auto", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", tableLayout: "auto" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "linear-gradient(135deg, #050234 0%, #0a0654 100%)" }}>
              {["Affiliate", "Kunde", "Ref", "Betrag", "Provision", "Ausgezahlt am", "Erstellt", "Aktionen"].map((h) => (
                <th key={h} style={{ padding: "16px 16px", fontWeight: 700, color: "rgba(255,255,255,0.8)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>Laden...</td></tr>
            ) : empfehlungen.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>Noch keine archivierten Einträge</td></tr>
            ) : (
              empfehlungen.map((emp, i) => (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: i % 2 === 0 ? "white" : "#f8f7f4",
                  }}
                >
                  {/* Affiliate */}
                  <td style={{ ...cellStyle, fontWeight: 600 }}>
                    {emp.empfehler_name}
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>{emp.empfehler_email}</div>
                  </td>

                  {/* Kunde */}
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 600 }}>{emp.handwerker?.name ?? emp.kunde_name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{emp.handwerker?.email ?? ""}</div>
                    {emp.handwerker?.telefon && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{emp.handwerker.telefon}</div>
                    )}
                  </td>

                  {/* Ref */}
                  <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: "12px", color: "var(--blue)", fontWeight: 700 }}>{emp.ref_code}</td>

                  {/* Betrag */}
                  <td style={{ ...cellStyle, fontWeight: 700 }}>
                    {emp.rechnungsbetrag ? (
                      <span style={{ background: "linear-gradient(135deg, #f28900, #ff6b00)", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "13px" }}>
                        {formatCurrency(emp.rechnungsbetrag)}
                      </span>
                    ) : "–"}
                  </td>

                  {/* Provision */}
                  <td style={{ ...cellStyle, fontWeight: 700, color: "var(--green)" }}>
                    {emp.provision_betrag ? formatCurrency(emp.provision_betrag) : "–"}
                  </td>

                  {/* Ausgezahlt am */}
                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                    {emp.ausgezahlt_am ? (
                      <span style={{ background: "#2563eb", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>
                        {formatDate(emp.ausgezahlt_am)}
                      </span>
                    ) : "–"}
                  </td>

                  {/* Erstellt */}
                  <td style={{ ...cellStyle, whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {formatDate(emp.created_at)}
                  </td>

                  {/* Aktionen */}
                  <td style={cellStyle}>
                    <button
                      onClick={() => handleMoveBack(emp)}
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        border: "none", borderRadius: "10px", padding: "8px 12px", cursor: "pointer",
                        color: "white", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px",
                        boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                      }}
                      title="Zurück zur Auszahlung"
                    >
                      <ArrowLeft size={14} /> Zur Auszahlung
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      {total > 25 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: "12px 24px", border: "none", borderRadius: "24px",
              background: page === 1 ? "var(--border)" : "linear-gradient(135deg, #050234 0%, #0a0654 100%)",
              color: page === 1 ? "var(--text-muted)" : "white",
              cursor: page === 1 ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px",
            }}
          >
            Zurück
          </button>
          <span style={{ padding: "8px 20px", fontSize: "15px", fontWeight: 700, color: "var(--navy)" }}>
            Seite {page} von {Math.ceil(total / 25)}
          </span>
          <button
            disabled={page * 25 >= total}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "12px 24px", border: "none", borderRadius: "24px",
              background: page * 25 >= total ? "var(--border)" : "linear-gradient(135deg, #f28900 0%, #ff6b00 100%)",
              color: page * 25 >= total ? "var(--text-muted)" : "white",
              cursor: page * 25 >= total ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px",
            }}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
