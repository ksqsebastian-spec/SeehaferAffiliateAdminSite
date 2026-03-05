"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Empfehlung, DashboardStats, EmpfehlungStatus } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { EmpfehlungCard } from "@/components/dashboard/EmpfehlungCard";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { formatCurrency } from "@/lib/utils";

type FilterOption = "alle" | EmpfehlungStatus;

export default function DashboardPage() {
  const router = useRouter();
  const [empfehlungen, setEmpfehlungen] = useState<Empfehlung[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    offen: 0,
    erledigt: 0,
    total_provision: 0,
  });
  const [filter, setFilter] = useState<FilterOption>("alle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const statusParam = filter === "alle" ? "" : `&status=${filter}`;
      const res = await fetch(`/api/referrals?page=1&pageSize=50${statusParam}`);
      if (!res.ok) throw new Error("Laden fehlgeschlagen");
      const data = await res.json();
      setEmpfehlungen(data.data);
      setStats(data.stats);
    } catch {
      setError("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const counts = {
    alle: stats.offen + stats.erledigt + (empfehlungen.filter((e) => e.status === "ausgezahlt").length),
    offen: stats.offen,
    erledigt: stats.erledigt,
    ausgezahlt: empfehlungen.filter((e) => e.status === "ausgezahlt").length,
  };

  const monthName = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
          Empfehlungen
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: "4px 0 0" }}>
          {monthName}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: "12px" }}>
        <StatCard label="Offen" value={stats.offen} color="var(--orange)" />
        <StatCard label="Erledigt" value={stats.erledigt} color="var(--green)" />
        <StatCard
          label="Provision"
          value={formatCurrency(stats.total_provision)}
          color="var(--navy)"
        />
      </div>

      {/* Filter */}
      <FilterTabs active={filter} counts={counts} onChange={setFilter} />

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          Laden...
        </div>
      ) : error ? (
        <div
          role="alert"
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--red)",
          }}
        >
          {error}
        </div>
      ) : empfehlungen.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          Keine Empfehlungen gefunden
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {empfehlungen.map((emp) => (
            <EmpfehlungCard
              key={emp.id}
              empfehlung={emp}
              onClick={() => router.push(`/dashboard/${emp.id}`)}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => router.push("/dashboard/add")}
        aria-label="Neue Empfehlung erfassen"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "var(--orange)",
          color: "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(242, 137, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s ease",
        }}
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
