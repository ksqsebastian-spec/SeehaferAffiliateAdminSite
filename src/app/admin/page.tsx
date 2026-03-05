"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import type { EmpfehlungWithHandwerker, EmpfehlungStatus } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_FILTERS: { label: string; value: EmpfehlungStatus | ""; color: string; bg: string }[] = [
  { label: "Alle", value: "", color: "var(--navy)", bg: "white" },
  { label: "Offen", value: "offen", color: "var(--orange)", bg: "var(--orange-bg)" },
  { label: "Erledigt", value: "erledigt", color: "var(--green)", bg: "var(--green-bg)" },
  { label: "Ausgezahlt", value: "ausgezahlt", color: "var(--blue)", bg: "var(--blue-bg)" },
];

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
      <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>
        Alle Empfehlungen
      </h1>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard label="Gesamt" value={stats.total} bgColor="var(--blue-bg)" color="var(--blue)" />
        <StatCard label="Offen" value={stats.offen} bgColor="var(--orange-bg)" color="var(--orange)" />
        <StatCard label="Erledigt" value={stats.erledigt} bgColor="var(--green-bg)" color="var(--green)" />
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
            padding: "12px 16px",
            backgroundColor: "white",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Search size={18} color="var(--text-muted)" />
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
              fontSize: "14px",
              backgroundColor: "transparent",
              color: "var(--text)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 600,
                border: statusFilter === f.value ? `2px solid ${f.color}` : "2px solid transparent",
                backgroundColor: statusFilter === f.value ? f.bg : "white",
                color: statusFilter === f.value ? f.color : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "auto", borderRadius: "var(--radius)" }}>
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
                backgroundColor: "#fafaf8",
              }}
            >
              {["Kunde", "Empfehler", "Partner", "Ref", "Status", "Betrag", "Provision", "Datum"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 18px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
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
                  colSpan={8}
                  style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}
                >
                  Laden...
                </td>
              </tr>
            ) : empfehlungen.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
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
                    backgroundColor: i % 2 === 0 ? "white" : "#fafaf8",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>
                    {emp.kunde_name}
                  </td>
                  <td style={{ padding: "14px 18px" }}>{emp.empfehler_name}</td>
                  <td style={{ padding: "14px 18px" }}>
                    {emp.handwerker?.name ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "14px 18px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      color: "var(--navy-light)",
                      fontWeight: 600,
                    }}
                  >
                    {emp.ref_code}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <Badge status={emp.status} />
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    {emp.rechnungsbetrag ? formatCurrency(emp.rechnungsbetrag) : "–"}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>
                    {emp.provision_betrag ? formatCurrency(emp.provision_betrag) : "–"}
                  </td>
                  <td style={{ padding: "14px 18px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {formatDate(emp.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      {total > 25 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "20px",
              backgroundColor: page === 1 ? "var(--border)" : "var(--navy)",
              color: page === 1 ? "var(--text-muted)" : "white",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
              transition: "all 0.2s ease",
            }}
          >
            Zurück
          </button>
          <span style={{ padding: "8px 16px", fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>
            Seite {page} von {Math.ceil(total / 25)}
          </span>
          <button
            disabled={page * 25 >= total}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "20px",
              backgroundColor: page * 25 >= total ? "var(--border)" : "var(--navy)",
              color: page * 25 >= total ? "var(--text-muted)" : "white",
              cursor: page * 25 >= total ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
              transition: "all 0.2s ease",
            }}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
