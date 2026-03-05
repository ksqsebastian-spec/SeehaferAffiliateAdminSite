"use client";

import { useEffect, useState, useCallback } from "react";
import type { EmpfehlungWithHandwerker, EmpfehlungStatus } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatDate, formatCurrency } from "@/lib/utils";

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
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>
        Alle Empfehlungen
      </h1>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <StatCard label="Gesamt" value={stats.total} />
        <StatCard label="Offen" value={stats.offen} color="var(--orange)" />
        <StatCard label="Erledigt" value={stats.erledigt} color="var(--green)" />
        <StatCard
          label="Provision"
          value={formatCurrency(stats.provision)}
          color="var(--navy)"
        />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <Input
            label="Suche"
            placeholder="Name, Ref-Code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label
            style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}
          >
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as EmpfehlungStatus | "");
              setPage(1);
            }}
            style={{
              padding: "10px 14px",
              fontSize: "14px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "white",
            }}
          >
            <option value="">Alle</option>
            <option value="offen">Offen</option>
            <option value="erledigt">Erledigt</option>
            <option value="ausgezahlt">Ausgezahlt</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                textAlign: "left",
              }}
            >
              {["Kunde", "Empfehler", "Handwerker", "Ref", "Status", "Betrag", "Provision", "Datum"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      fontWeight: 600,
                      color: "var(--text-muted)",
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
                  style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}
                >
                  Laden...
                </td>
              </tr>
            ) : empfehlungen.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}
                >
                  Keine Empfehlungen gefunden
                </td>
              </tr>
            ) : (
              empfehlungen.map((emp) => (
                <tr
                  key={emp.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                    {emp.kunde_name}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{emp.empfehler_name}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {emp.handwerker?.name ?? "–"}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {emp.ref_code}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge status={emp.status} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {emp.rechnungsbetrag ? formatCurrency(emp.rechnungsbetrag) : "–"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {emp.provision_betrag ? formatCurrency(emp.provision_betrag) : "–"}
                  </td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
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
        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "white",
              cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            Zurück
          </button>
          <span style={{ padding: "8px 16px", fontSize: "13px", color: "var(--text-muted)" }}>
            Seite {page} von {Math.ceil(total / 25)}
          </span>
          <button
            disabled={page * 25 >= total}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "white",
              cursor: page * 25 >= total ? "not-allowed" : "pointer",
              opacity: page * 25 >= total ? 0.5 : 1,
            }}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
