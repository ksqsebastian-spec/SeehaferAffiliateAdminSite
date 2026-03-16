"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, ArrowRight, Check, X, Users } from "lucide-react";
import type { EmpfehlungWithHandwerker, EmpfehlungStatus, Handwerker } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_DOT_COLORS: Record<EmpfehlungStatus, string> = {
  offen: "#ea580c",
  erledigt: "#16a34a",
  ausgezahlt: "#2563eb",
};

const STATUS_LABELS: Record<EmpfehlungStatus, string> = {
  offen: "Offen",
  erledigt: "Erledigt",
  ausgezahlt: "Ausgezahlt",
};

const NEXT_STATUS: Record<EmpfehlungStatus, { label: string; target: EmpfehlungStatus; color: string } | null> = {
  offen: { label: "Zur Auszahlung", target: "erledigt", color: "#16a34a" },
  erledigt: { label: "Ausgezahlt", target: "ausgezahlt", color: "#2563eb" },
  ausgezahlt: null,
};

interface KundeGroup {
  handwerker: Pick<Handwerker, "id" | "name" | "email" | "telefon" | "provision_prozent">;
  empfehlungen: EmpfehlungWithHandwerker[];
}

export default function AdminDashboardPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedKunden, setExpandedKunden] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingBetragId, setEditingBetragId] = useState<string | null>(null);
  const [editBetrag, setEditBetrag] = useState("");
  const [editingProvisionId, setEditingProvisionId] = useState<string | null>(null);
  const [editProvision, setEditProvision] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/handwerker?view=empfehlungen&pageSize=200");
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

  // Group empfehlungen by Kunde (handwerker)
  const kundeGroups = useMemo(() => {
    const filtered = search
      ? empfehlungen.filter((e) => {
          const s = search.toLowerCase();
          return (
            e.kunde_name.toLowerCase().includes(s) ||
            e.empfehler_name.toLowerCase().includes(s) ||
            e.ref_code.toLowerCase().includes(s) ||
            (e.handwerker?.name ?? "").toLowerCase().includes(s)
          );
        })
      : empfehlungen;

    const map = new Map<string, KundeGroup>();
    for (const emp of filtered) {
      const key = emp.handwerker?.id ?? emp.handwerker_id;
      const existing = map.get(key);
      if (existing) {
        existing.empfehlungen.push(emp);
      } else {
        map.set(key, {
          handwerker: emp.handwerker ?? { id: key, name: emp.kunde_name, email: "", telefon: null, provision_prozent: 0 },
          empfehlungen: [emp],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.handwerker.name.localeCompare(b.handwerker.name));
  }, [empfehlungen, search]);

  function toggleKunde(id: string) {
    setExpandedKunden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedKunden(new Set(kundeGroups.map((g) => g.handwerker.id)));
  }

  function collapseAll() {
    setExpandedKunden(new Set());
  }

  async function handleMoveStatus(emp: EmpfehlungWithHandwerker) {
    const next = NEXT_STATUS[emp.status];
    if (!next) return;

    if (next.target === "ausgezahlt") {
      if (!confirm(`"${emp.empfehler_name}" als ausgezahlt markieren?`)) return;
    }

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

      // If marking as ausgezahlt, also archive the handwerker
      if (next.target === "ausgezahlt" && emp.handwerker?.id) {
        const archiveRes = await fetch("/api/admin/handwerker", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: emp.handwerker.id, active: false }),
        });
        if (!archiveRes.ok) {
          alert("Auszahlung erfolgreich, aber Kunde konnte nicht archiviert werden.");
        }
      }

      fetchData();
    } catch {
      alert("Netzwerkfehler");
    }
  }

  async function handleUpdateBetrag(emp: EmpfehlungWithHandwerker) {
    const value = parseFloat(editBetrag);
    if (isNaN(value) || value < 0) return;

    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, rechnungsbetrag: value }),
      });
      if (!res.ok) {
        alert("Fehler beim Aktualisieren");
        return;
      }
      setEditingBetragId(null);
      fetchData();
    } catch {
      alert("Netzwerkfehler");
    }
  }

  async function handleUpdateProvision(emp: EmpfehlungWithHandwerker) {
    const value = parseFloat(editProvision);
    if (isNaN(value) || value < 0) return;

    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, provision_betrag: value }),
      });
      if (!res.ok) {
        alert("Fehler beim Aktualisieren");
        return;
      }
      setEditingProvisionId(null);
      fetchData();
    } catch {
      alert("Netzwerkfehler");
    }
  }

  const stats = useMemo(() => {
    let offen = 0, erledigt = 0, provision = 0;
    for (const e of empfehlungen) {
      if (e.status === "offen") offen++;
      else if (e.status === "erledigt") erledigt++;
      provision += e.provision_betrag ?? 0;
    }
    return { total: empfehlungen.length, offen, erledigt, provision };
  }, [empfehlungen]);

  const cellStyle: React.CSSProperties = { padding: "12px 14px" };

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>
        Dashboard
      </h1>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard label="Gesamt" value={stats.total} bgColor="#eff6ff" color="#2563eb" />
        <StatCard label="Offen" value={stats.offen} bgColor="#fff7ed" color="#ea580c" />
        <StatCard label="Erledigt" value={stats.erledigt} bgColor="#f0fdf4" color="#16a34a" />
        <StatCard label="Provision" value={formatCurrency(stats.provision)} bgColor="#f5f3ff" color="#7c3aed" />
      </div>

      {/* Search + Expand/Collapse */}
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
            placeholder="Kunde oder Affiliate suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          <button
            onClick={expandAll}
            style={{
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              border: "2px solid var(--border)",
              backgroundColor: "white",
              color: "var(--navy)",
              cursor: "pointer",
            }}
          >
            Alle öffnen
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              border: "2px solid var(--border)",
              backgroundColor: "white",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            Alle schließen
          </button>
        </div>
      </div>

      {/* Kunde Groups */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)", fontSize: "15px", borderRadius: "20px" }}>
          Laden...
        </Card>
      ) : kundeGroups.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)", fontSize: "15px", borderRadius: "20px" }}>
          Keine Empfehlungen gefunden
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {kundeGroups.map((group) => {
            const isExpanded = expandedKunden.has(group.handwerker.id);
            const affiliateCount = group.empfehlungen.length;
            const statusCounts = {
              offen: group.empfehlungen.filter((e) => e.status === "offen").length,
              erledigt: group.empfehlungen.filter((e) => e.status === "erledigt").length,
              ausgezahlt: group.empfehlungen.filter((e) => e.status === "ausgezahlt").length,
            };

            return (
              <Card
                key={group.handwerker.id}
                style={{
                  padding: 0,
                  borderRadius: "20px",
                  boxShadow: isExpanded ? "0 4px 20px rgba(0,0,0,0.08)" : "0 2px 10px rgba(0,0,0,0.04)",
                  border: isExpanded ? "2px solid var(--orange)" : "2px solid transparent",
                  transition: "all 0.2s ease",
                  overflow: "hidden",
                }}
              >
                {/* Kunde Header */}
                <button
                  onClick={() => toggleKunde(group.handwerker.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px 24px",
                    border: "none",
                    backgroundColor: isExpanded ? "rgba(242,137,0,0.04)" : "white",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {/* Expand icon */}
                  <div style={{ flexShrink: 0, color: "var(--orange)" }}>
                    {isExpanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                  </div>

                  {/* Kunde avatar */}
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #050234, #0a0654)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Users size={20} color="white" />
                  </div>

                  {/* Kunde info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)" }}>
                      {group.handwerker.name}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {group.handwerker.email}
                      {group.handwerker.telefon && ` · ${group.handwerker.telefon}`}
                    </div>
                  </div>

                  {/* Provision % badge */}
                  <span
                    style={{
                      background: "linear-gradient(135deg, #f28900, #ff6b00)",
                      color: "white",
                      padding: "5px 14px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {group.handwerker.provision_prozent}%
                  </span>

                  {/* Status dots summary */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {statusCounts.offen > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700, color: STATUS_DOT_COLORS.offen }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_DOT_COLORS.offen }} />
                        {statusCounts.offen}
                      </span>
                    )}
                    {statusCounts.erledigt > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700, color: STATUS_DOT_COLORS.erledigt }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_DOT_COLORS.erledigt }} />
                        {statusCounts.erledigt}
                      </span>
                    )}
                    {statusCounts.ausgezahlt > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700, color: STATUS_DOT_COLORS.ausgezahlt }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_DOT_COLORS.ausgezahlt }} />
                        {statusCounts.ausgezahlt}
                      </span>
                    )}
                  </div>

                  {/* Affiliate count */}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {affiliateCount} {affiliateCount === 1 ? "Affiliate" : "Affiliates"}
                  </span>
                </button>

                {/* Expanded: Affiliate table */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ background: "linear-gradient(135deg, #050234 0%, #0a0654 100%)" }}>
                          {["Affiliate", "Ref", "Status", "Betrag", "Provision", "Datum", "Aktion"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "12px 14px",
                                fontWeight: 700,
                                color: "rgba(255,255,255,0.8)",
                                fontSize: "11px",
                                textTransform: "uppercase",
                                letterSpacing: "0.8px",
                                whiteSpace: "nowrap",
                                textAlign: "left",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.empfehlungen.map((emp, i) => (
                          <tr
                            key={emp.id}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              backgroundColor: i % 2 === 0 ? "white" : "#f8f7f4",
                            }}
                          >
                            {/* Affiliate name + email */}
                            <td style={{ ...cellStyle, fontWeight: 600 }}>
                              {emp.empfehler_name}
                              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>
                                {emp.empfehler_email}
                              </div>
                            </td>

                            {/* Ref code */}
                            <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: "12px", color: "var(--blue)", fontWeight: 700 }}>
                              {emp.ref_code}
                            </td>

                            {/* Status dot + label */}
                            <td style={cellStyle}>
                              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    backgroundColor: STATUS_DOT_COLORS[emp.status],
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ fontSize: "12px", fontWeight: 600, color: STATUS_DOT_COLORS[emp.status] }}>
                                  {STATUS_LABELS[emp.status]}
                                </span>
                              </span>
                            </td>

                            {/* Betrag (inline editable) */}
                            <td style={cellStyle}>
                              {editingBetragId === emp.id ? (
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editBetrag}
                                    onChange={(e) => setEditBetrag(e.target.value)}
                                    style={{ width: "90px", padding: "6px 8px", border: "2px solid var(--orange)", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleUpdateBetrag(emp);
                                      if (e.key === "Escape") setEditingBetragId(null);
                                    }}
                                    autoFocus
                                  />
                                  <button onClick={() => handleUpdateBetrag(emp)} style={{ background: "#16a34a", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", display: "flex" }}>
                                    <Check size={12} color="white" />
                                  </button>
                                  <button onClick={() => setEditingBetragId(null)} style={{ background: "var(--border)", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", display: "flex" }}>
                                    <X size={12} color="var(--text-muted)" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingBetragId(emp.id);
                                    setEditBetrag(emp.rechnungsbetrag ? String(emp.rechnungsbetrag) : "");
                                  }}
                                  style={{
                                    background: emp.rechnungsbetrag ? "linear-gradient(135deg, #f28900, #ff6b00)" : "var(--border)",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    color: emp.rechnungsbetrag ? "white" : "var(--text-muted)",
                                    padding: "4px 12px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    boxShadow: emp.rechnungsbetrag ? "0 2px 6px rgba(242,137,0,0.3)" : "none",
                                  }}
                                  title="Klicke um Betrag einzutragen"
                                >
                                  {emp.rechnungsbetrag ? formatCurrency(emp.rechnungsbetrag) : "–"}
                                </button>
                              )}
                            </td>

                            {/* Provision (inline editable) */}
                            <td style={cellStyle}>
                              {editingProvisionId === emp.id ? (
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editProvision}
                                    onChange={(e) => setEditProvision(e.target.value)}
                                    style={{ width: "90px", padding: "6px 8px", border: "2px solid var(--green)", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleUpdateProvision(emp);
                                      if (e.key === "Escape") setEditingProvisionId(null);
                                    }}
                                    autoFocus
                                  />
                                  <button onClick={() => handleUpdateProvision(emp)} style={{ background: "#16a34a", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", display: "flex" }}>
                                    <Check size={12} color="white" />
                                  </button>
                                  <button onClick={() => setEditingProvisionId(null)} style={{ background: "var(--border)", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer", display: "flex" }}>
                                    <X size={12} color="var(--text-muted)" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingProvisionId(emp.id);
                                    setEditProvision(emp.provision_betrag ? String(emp.provision_betrag) : "");
                                  }}
                                  style={{
                                    background: emp.provision_betrag ? "#16a34a" : "var(--border)",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    color: emp.provision_betrag ? "white" : "var(--text-muted)",
                                    padding: "4px 12px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    boxShadow: emp.provision_betrag ? "0 2px 6px rgba(22,163,74,0.3)" : "none",
                                  }}
                                  title="Klicke um Provision anzupassen"
                                >
                                  {emp.provision_betrag ? formatCurrency(emp.provision_betrag) : "–"}
                                </button>
                              )}
                            </td>

                            {/* Datum */}
                            <td style={{ ...cellStyle, whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "13px" }}>
                              {formatDate(emp.created_at)}
                            </td>

                            {/* Aktion */}
                            <td style={cellStyle}>
                              {(() => {
                                const next = NEXT_STATUS[emp.status];
                                if (!next) return null;
                                return (
                                  <button
                                    onClick={() => handleMoveStatus(emp)}
                                    style={{
                                      background: `linear-gradient(135deg, ${next.color}, ${next.color}dd)`,
                                      border: "none",
                                      borderRadius: "8px",
                                      padding: "6px 12px",
                                      cursor: "pointer",
                                      color: "white",
                                      fontWeight: 700,
                                      fontSize: "11px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      whiteSpace: "nowrap",
                                      boxShadow: `0 2px 6px ${next.color}40`,
                                    }}
                                  >
                                    <ArrowRight size={12} /> {next.label}
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
