"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ArrowRight } from "lucide-react";
import type { EmpfehlungWithHandwerker, EmpfehlungStatus } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_FILTERS: { label: string; value: EmpfehlungStatus | ""; color: string; bg: string }[] = [
  { label: "Alle", value: "", color: "#050234", bg: "#f0eff8" },
  { label: "Offen", value: "offen", color: "#ea580c", bg: "#fff7ed" },
  { label: "Erledigt", value: "erledigt", color: "#16a34a", bg: "#f0fdf4" },
  { label: "Ausgezahlt", value: "ausgezahlt", color: "#2563eb", bg: "#eff6ff" },
];

const NEXT_STATUS: Record<EmpfehlungStatus, { label: string; target: EmpfehlungStatus; color: string } | null> = {
  offen: { label: "Zur Auszahlung", target: "erledigt", color: "#16a34a" },
  erledigt: { label: "Ausgezahlt", target: "ausgezahlt", color: "#2563eb" },
  ausgezahlt: null,
};

export default function AdminDashboardPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmpfehlungStatus | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      });
      if (statusFilter) params.set("status", statusFilter);
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
  }, [page, statusFilter, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  async function handleMoveStatus(emp: EmpfehlungWithHandwerker) {
    const next = NEXT_STATUS[emp.status];
    if (!next) return;

    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, status: next.target }),
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

  const stats = {
    total: total,
    offen: empfehlungen.filter((e) => e.status === "offen").length,
    erledigt: empfehlungen.filter((e) => e.status === "erledigt").length,
    provision: empfehlungen
      .filter((e) => e.provision_betrag)
      .reduce((sum, e) => sum + (e.provision_betrag ?? 0), 0),
  };

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>
        Alle Empfehlungen
      </h1>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard label="Gesamt" value={stats.total} bgColor="#eff6ff" color="#2563eb" />
        <StatCard label="Offen" value={stats.offen} bgColor="#fff7ed" color="#ea580c" />
        <StatCard label="Erledigt" value={stats.erledigt} bgColor="#f0fdf4" color="#16a34a" />
        <StatCard
          label="Provision"
          value={formatCurrency(stats.provision)}
          bgColor="#f5f3ff"
          color="#7c3aed"
        />
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: "220px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 18px",
            backgroundColor: "white",
            border: "2px solid var(--border)",
            borderRadius: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <Search size={20} color="var(--orange)" />
          <input
            placeholder="Name, Ref-Code suchen..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              fontSize: "15px",
              backgroundColor: "transparent",
              color: "var(--text)",
              fontWeight: 500,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                style={{
                  padding: "10px 22px",
                  borderRadius: "24px",
                  fontSize: "14px",
                  fontWeight: 700,
                  border: "none",
                  backgroundColor: active ? f.color : "white",
                  color: active ? "white" : f.color,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: active ? `0 4px 12px ${f.color}40` : "0 2px 6px rgba(0,0,0,0.06)",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "auto", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid var(--border)",
                textAlign: "left",
                background: "linear-gradient(135deg, #050234 0%, #0a0654 100%)",
              }}
            >
              {["Kunde", "Affiliate", "Partner", "Ref", "Status", "Betrag", "Provision", "Datum", "Aktionen"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "16px 18px",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      whiteSpace: "nowrap",
                    }}
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
                <td
                  colSpan={9}
                  style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}
                >
                  Laden...
                </td>
              </tr>
            ) : empfehlungen.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}
                >
                  Keine Empfehlungen gefunden
                </td>
              </tr>
            ) : (
              empfehlungen.map((emp, i) => (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: i % 2 === 0 ? "white" : "#f8f7f4",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <td style={{ padding: "16px 18px", fontWeight: 600 }}>
                    {emp.kunde_name}
                  </td>
                  <td style={{ padding: "16px 18px" }}>{emp.empfehler_name}</td>
                  <td style={{ padding: "16px 18px" }}>
                    {emp.handwerker?.name ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "16px 18px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      color: "var(--blue)",
                      fontWeight: 700,
                      backgroundColor: "#eff6ff",
                      borderRadius: "6px",
                    }}
                  >
                    {emp.ref_code}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <Badge status={emp.status} />
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    {emp.rechnungsbetrag ? formatCurrency(emp.rechnungsbetrag) : "–"}
                  </td>
                  <td style={{ padding: "16px 18px", fontWeight: 700, color: "var(--green)" }}>
                    {emp.provision_betrag ? formatCurrency(emp.provision_betrag) : "–"}
                  </td>
                  <td style={{ padding: "16px 18px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {formatDate(emp.created_at)}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    {NEXT_STATUS[emp.status] && (
                      <button
                        onClick={() => handleMoveStatus(emp)}
                        style={{
                          background: `linear-gradient(135deg, ${NEXT_STATUS[emp.status]!.color}, ${NEXT_STATUS[emp.status]!.color}dd)`,
                          border: "none",
                          borderRadius: "10px",
                          padding: "8px 14px",
                          cursor: "pointer",
                          color: "white",
                          fontWeight: 700,
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                          boxShadow: `0 2px 8px ${NEXT_STATUS[emp.status]!.color}40`,
                        }}
                      >
                        <ArrowRight size={14} /> {NEXT_STATUS[emp.status]!.label}
                      </button>
                    )}
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
              padding: "12px 24px",
              border: "none",
              borderRadius: "24px",
              background: page === 1 ? "var(--border)" : "linear-gradient(135deg, #050234 0%, #0a0654 100%)",
              color: page === 1 ? "var(--text-muted)" : "white",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "14px",
              transition: "all 0.2s ease",
              boxShadow: page === 1 ? "none" : "0 4px 12px rgba(5,2,52,0.2)",
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
              padding: "12px 24px",
              border: "none",
              borderRadius: "24px",
              background: page * 25 >= total ? "var(--border)" : "linear-gradient(135deg, #f28900 0%, #ff6b00 100%)",
              color: page * 25 >= total ? "var(--text-muted)" : "white",
              cursor: page * 25 >= total ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "14px",
              transition: "all 0.2s ease",
              boxShadow: page * 25 >= total ? "none" : "0 4px 12px rgba(242,137,0,0.3)",
            }}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
