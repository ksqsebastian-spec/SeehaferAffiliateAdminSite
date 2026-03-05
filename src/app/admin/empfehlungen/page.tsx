"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import type { EmpfehlungWithHandwerker, EmpfehlungStatus, Handwerker } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatCurrency, berechneProvision } from "@/lib/utils";

const STATUS_FILTERS: { label: string; value: EmpfehlungStatus | ""; color: string }[] = [
  { label: "Alle", value: "", color: "#050234" },
  { label: "Offen", value: "offen", color: "#ea580c" },
  { label: "Erledigt", value: "erledigt", color: "#16a34a" },
  { label: "Ausgezahlt", value: "ausgezahlt", color: "#2563eb" },
];

const STATUS_OPTIONS: { value: EmpfehlungStatus; label: string; bg: string }[] = [
  { value: "offen", label: "Offen", bg: "#ea580c" },
  { value: "erledigt", label: "Erledigt", bg: "#16a34a" },
  { value: "ausgezahlt", label: "Ausgezahlt", bg: "#2563eb" },
];

export default function EmpfehlungenPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [handwerker, setHandwerker] = useState<Handwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmpfehlungStatus | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    kunde_name: "",
    kunde_kontakt: "",
    empfehler_name: "",
    empfehler_email: "",
    handwerker_id: "",
  });

  // Inline editing for Rechnungsbetrag
  const [editingBetragId, setEditingBetragId] = useState<string | null>(null);
  const [editBetrag, setEditBetrag] = useState("");

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

  const fetchHandwerker = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/handwerker");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHandwerker((data.data || []).filter((h: Handwerker) => h.active));
    } catch {
      setHandwerker([]);
    }
  }, []);

  useEffect(() => {
    fetchHandwerker();
  }, [fetchHandwerker]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kunde_name: formData.kunde_name,
          kunde_kontakt: formData.kunde_kontakt || undefined,
          empfehler_name: formData.empfehler_name,
          empfehler_email: formData.empfehler_email,
          handwerker_id: formData.handwerker_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.detail || data.error || "Fehler beim Erstellen");
        return;
      }

      setShowForm(false);
      setFormData({
        kunde_name: "",
        kunde_kontakt: "",
        empfehler_name: "",
        empfehler_email: "",
        handwerker_id: "",
      });
      fetchData();
    } catch {
      setFormError("Netzwerkfehler");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: EmpfehlungStatus) {
    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Fehler beim Statuswechsel");
        return;
      }
      fetchData();
    } catch {
      alert("Netzwerkfehler");
    }
  }

  async function handleDelete(emp: EmpfehlungWithHandwerker) {
    if (!confirm(`Empfehlung von "${emp.kunde_name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/admin/empfehlungen?id=${emp.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Fehler beim Löschen");
        return;
      }
      fetchData();
    } catch {
      alert("Netzwerkfehler");
    }
  }

  async function handleUpdateBetrag(emp: EmpfehlungWithHandwerker) {
    const value = parseFloat(editBetrag);
    if (isNaN(value) || value <= 0) return;

    const provisionProzent = emp.handwerker?.provision_prozent ?? 5;
    const provisionBetrag = berechneProvision(value, provisionProzent);

    try {
      // Use the complete endpoint to set betrag + status
      const res = await fetch(`/api/referrals/${emp.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rechnungsbetrag: value }),
      });

      if (!res.ok) {
        // If already completed, try direct PATCH approach
        // For now, just alert
        const data = await res.json();
        alert(data.error || "Fehler beim Aktualisieren");
        return;
      }

      setEditingBetragId(null);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>
          Empfehlungen
        </h1>
        <Button onClick={() => setShowForm(!showForm)} size="lg">
          {showForm ? "Abbrechen" : "+ Neue Empfehlung"}
        </Button>
      </div>

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

      {/* Create Form */}
      {showForm && (
        <Card style={{ borderLeft: "5px solid var(--orange)", borderRadius: "20px", boxShadow: "0 4px 20px rgba(242,137,0,0.1)" }}>
          <form
            onSubmit={handleCreate}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--navy)" }}>
              Neue Empfehlung erstellen
            </h2>
            {formError && (
              <div
                role="alert"
                style={{
                  color: "var(--red)",
                  fontSize: "14px",
                  fontWeight: 600,
                  backgroundColor: "var(--red-bg)",
                  padding: "12px 16px",
                  borderRadius: "12px",
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <Input
                label="Kunde Name"
                value={formData.kunde_name}
                onChange={(e) => setFormData({ ...formData, kunde_name: e.target.value })}
                required
              />
              <Input
                label="Kunde Kontakt (optional)"
                value={formData.kunde_kontakt}
                onChange={(e) => setFormData({ ...formData, kunde_kontakt: e.target.value })}
                placeholder="E-Mail oder Telefon"
              />
              <Input
                label="Affiliate Name"
                value={formData.empfehler_name}
                onChange={(e) => setFormData({ ...formData, empfehler_name: e.target.value })}
                required
              />
              <Input
                label="Affiliate E-Mail (PayPal)"
                type="email"
                value={formData.empfehler_email}
                onChange={(e) => setFormData({ ...formData, empfehler_email: e.target.value })}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--navy)",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Partner
              </label>
              <select
                value={formData.handwerker_id}
                onChange={(e) => setFormData({ ...formData, handwerker_id: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  border: "2px solid var(--border)",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 500,
                  backgroundColor: "white",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <option value="">Partner auswählen...</option>
                {handwerker.map((hw) => (
                  <option key={hw.id} value={hw.id}>
                    {hw.name} ({hw.provision_prozent}%)
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" loading={formLoading} size="lg">
              Empfehlung erstellen
            </Button>
          </form>
        </Card>
      )}

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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                background: "linear-gradient(135deg, #050234 0%, #0a0654 100%)",
              }}
            >
              {["Kunde", "Affiliate", "Partner", "Provision %", "Ref", "Status", "Betrag", "Provision", "Datum", "Aktionen"].map(
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
                  colSpan={10}
                  style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}
                >
                  Laden...
                </td>
              </tr>
            ) : empfehlungen.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
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
                    {emp.kunde_kontakt && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>
                        {emp.kunde_kontakt}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    {emp.empfehler_name}
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {emp.empfehler_email}
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    {emp.handwerker?.name ?? "–"}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        background: "linear-gradient(135deg, #f28900, #ff6b00)",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {emp.handwerker?.provision_prozent ?? "–"}%
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "16px 18px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      color: "var(--blue)",
                      fontWeight: 700,
                    }}
                  >
                    {emp.ref_code}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <select
                      value={emp.status}
                      onChange={(e) => handleStatusChange(emp.id, e.target.value as EmpfehlungStatus)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        borderRadius: "16px",
                        border: "2px solid transparent",
                        cursor: "pointer",
                        backgroundColor: STATUS_OPTIONS.find((s) => s.value === emp.status)?.bg ?? "#ea580c",
                        color: "white",
                        appearance: "none",
                        WebkitAppearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                        paddingRight: "28px",
                      }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    {editingBetragId === emp.id ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editBetrag}
                          onChange={(e) => setEditBetrag(e.target.value)}
                          style={{
                            width: "90px",
                            padding: "8px 10px",
                            border: "2px solid var(--orange)",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 700,
                          }}
                        />
                        <Button size="sm" onClick={() => handleUpdateBetrag(emp)}>
                          OK
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingBetragId(null)}>
                          X
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (emp.status !== "offen") return;
                          setEditingBetragId(emp.id);
                          setEditBetrag(emp.rechnungsbetrag ? String(emp.rechnungsbetrag) : "");
                        }}
                        style={{
                          background: emp.rechnungsbetrag
                            ? "linear-gradient(135deg, #f28900, #ff6b00)"
                            : "var(--border)",
                          border: "none",
                          cursor: emp.status === "offen" ? "pointer" : "default",
                          fontWeight: 700,
                          color: emp.rechnungsbetrag ? "white" : "var(--text-muted)",
                          padding: "6px 16px",
                          borderRadius: "16px",
                          fontSize: "13px",
                          boxShadow: emp.rechnungsbetrag ? "0 2px 8px rgba(242,137,0,0.3)" : "none",
                        }}
                        title={emp.status === "offen" ? "Klicke um Betrag einzutragen" : ""}
                      >
                        {emp.rechnungsbetrag ? formatCurrency(emp.rechnungsbetrag) : "–"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "16px 18px", fontWeight: 700, color: "var(--green)" }}>
                    {emp.provision_betrag ? formatCurrency(emp.provision_betrag) : "–"}
                  </td>
                  <td style={{ padding: "16px 18px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {formatDate(emp.created_at)}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(emp)}
                    >
                      Löschen
                    </Button>
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
