"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Check, X, Pencil, ArrowRight } from "lucide-react";
import type { EmpfehlungWithHandwerker, Handwerker } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function EmpfehlungenPage() {
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungWithHandwerker[]>([]);
  const [handwerker, setHandwerker] = useState<Handwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showBankdaten, setShowBankdaten] = useState(false);
  const [formData, setFormData] = useState({
    handwerker_id: "",
    kunde_kontakt: "",
    empfehler_name: "",
    empfehler_email: "",
  });
  const [bankFormData, setBankFormData] = useState({
    iban: "",
    bic: "",
    kontoinhaber: "",
    bank_name: "",
  });

  const [editingEmp, setEditingEmp] = useState<EmpfehlungWithHandwerker | null>(null);
  const [editFormData, setEditFormData] = useState({
    handwerker_id: "",
    kunde_kontakt: "",
    empfehler_name: "",
    empfehler_email: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [editingBetragId, setEditingBetragId] = useState<string | null>(null);
  const [editBetrag, setEditBetrag] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
        status: "offen",
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

    const selectedPartner = handwerker.find((h) => h.id === formData.handwerker_id);
    if (!selectedPartner) {
      setFormError("Bitte Kunde auswählen");
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kunde_name: selectedPartner.name,
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

      // If bankdaten were provided, update them
      if (showBankdaten && (bankFormData.iban || bankFormData.bic || bankFormData.kontoinhaber || bankFormData.bank_name)) {
        const created = await res.json().catch(() => null);
        if (created?.id) {
          await fetch("/api/admin/empfehlungen", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: created.id,
              iban: bankFormData.iban || null,
              bic: bankFormData.bic || null,
              kontoinhaber: bankFormData.kontoinhaber || null,
              bank_name: bankFormData.bank_name || null,
            }),
          });
        }
      }

      setShowForm(false);
      setFormData({ handwerker_id: "", kunde_kontakt: "", empfehler_name: "", empfehler_email: "" });
      setBankFormData({ iban: "", bic: "", kontoinhaber: "", bank_name: "" });
      setShowBankdaten(false);
      fetchData();
    } catch {
      setFormError("Netzwerkfehler");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleMoveToAuszahlung(emp: EmpfehlungWithHandwerker) {
    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, status: "erledigt" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || data.error || "Fehler beim Verschieben");
        return;
      }
      fetchData();
    } catch {
      alert("Netzwerkfehler");
    }
  }

  async function handleDelete(emp: EmpfehlungWithHandwerker) {
    if (!confirm(`"${emp.empfehler_name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/admin/empfehlungen?id=${emp.id}`, { method: "DELETE" });
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
    if (isNaN(value) || value < 0) return;

    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, rechnungsbetrag: value }),
      });
      if (!res.ok) {
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

  function startEditing(emp: EmpfehlungWithHandwerker) {
    setEditingEmp(emp);
    setEditFormData({
      handwerker_id: emp.handwerker?.id ?? "",
      kunde_kontakt: emp.kunde_kontakt ?? "",
      empfehler_name: emp.empfehler_name,
      empfehler_email: emp.empfehler_email,
    });
    setEditError("");
    setShowForm(false);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEmp) return;
    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch("/api/admin/empfehlungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEmp.id,
          empfehler_name: editFormData.empfehler_name,
          empfehler_email: editFormData.empfehler_email,
          handwerker_id: editFormData.handwerker_id,
          kunde_kontakt: editFormData.kunde_kontakt || undefined,
          kunde_name: handwerker.find((h) => h.id === editFormData.handwerker_id)?.name ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Fehler beim Speichern");
        return;
      }

      setEditingEmp(null);
      fetchData();
    } catch {
      setEditError("Netzwerkfehler");
    } finally {
      setEditLoading(false);
    }
  }

  const stats = {
    total: total,
    provision: empfehlungen
      .filter((e) => e.provision_betrag)
      .reduce((sum, e) => sum + (e.provision_betrag ?? 0), 0),
  };

  const cellStyle = { padding: "14px 16px" };

  function renderForm(
    mode: "create" | "edit",
    data: typeof formData,
    setData: (d: typeof formData) => void,
    onSubmit: (e: React.FormEvent) => void,
    isLoading: boolean,
    error: string,
    bankdaten: boolean,
    setBankdaten: (v: boolean) => void,
    onCancel: () => void,
  ) {
    return (
      <Card style={{ borderLeft: "5px solid var(--orange)", borderRadius: "20px", boxShadow: "0 4px 20px rgba(242,137,0,0.1)" }}>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--navy)" }}>
            {mode === "create" ? "Neuen Affiliate erstellen" : "Affiliate bearbeiten"}
          </h2>
          {error && (
            <div role="alert" style={{ color: "var(--red)", fontSize: "14px", fontWeight: 600, backgroundColor: "var(--red-bg)", padding: "12px 16px", borderRadius: "12px" }}>
              {error}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--navy)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Kunde
              </label>
              <select
                value={data.handwerker_id}
                onChange={(e) => setData({ ...data, handwerker_id: e.target.value })}
                required
                style={{ width: "100%", padding: "14px 18px", border: "2px solid var(--border)", borderRadius: "14px", fontSize: "15px", fontWeight: 500, backgroundColor: "white", color: "var(--text)", cursor: "pointer" }}
              >
                <option value="">Kunde auswählen...</option>
                {handwerker.map((hw) => (
                  <option key={hw.id} value={hw.id}>{hw.name} ({hw.provision_prozent}%)</option>
                ))}
              </select>
            </div>
            <Input label="Kontakt (optional)" value={data.kunde_kontakt} onChange={(e) => setData({ ...data, kunde_kontakt: e.target.value })} placeholder="E-Mail oder Telefon" />
            <Input label="Affiliate Name" value={data.empfehler_name} onChange={(e) => setData({ ...data, empfehler_name: e.target.value })} required />
            <Input label="Affiliate E-Mail (PayPal)" type="email" value={data.empfehler_email} onChange={(e) => setData({ ...data, empfehler_email: e.target.value })} required />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "var(--navy)" }}>
            <input type="checkbox" checked={bankdaten} onChange={(e) => setBankdaten(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: "var(--orange)", cursor: "pointer" }} />
            Bankdaten hinzufügen
          </label>

          {bankdaten && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", padding: "18px", backgroundColor: "#f8f7f4", borderRadius: "14px", border: "2px solid var(--border)" }}>
              <Input label="IBAN" placeholder="DE89 3704 0044 0532 0130 00" value={bankFormData.iban} onChange={(e) => setBankFormData({ ...bankFormData, iban: e.target.value })} />
              <Input label="BIC" placeholder="COBADEFFXXX" value={bankFormData.bic} onChange={(e) => setBankFormData({ ...bankFormData, bic: e.target.value })} />
              <Input label="Kontoinhaber" placeholder="Name des Kontoinhabers" value={bankFormData.kontoinhaber} onChange={(e) => setBankFormData({ ...bankFormData, kontoinhaber: e.target.value })} />
              <Input label="Bank" placeholder="Name der Bank" value={bankFormData.bank_name} onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })} />
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <Button type="submit" loading={isLoading} size="lg" style={{ flex: 1 }}>
              {mode === "create" ? "Affiliate erstellen" : "Änderungen speichern"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={onCancel}>Abbrechen</Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>Affiliate</h1>
        {!editingEmp && (
          <Button onClick={() => { setShowForm(!showForm); setEditingEmp(null); }} size="lg">
            {showForm ? "Abbrechen" : "+ Neuer Affiliate"}
          </Button>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard label="Offen" value={stats.total} bgColor="#fff7ed" color="#ea580c" />
        <StatCard label="Provision (offen)" value={formatCurrency(stats.provision)} bgColor="#f5f3ff" color="#7c3aed" />
      </div>

      {showForm && !editingEmp &&
        renderForm("create", formData, setFormData, handleCreate, formLoading, formError, showBankdaten, setShowBankdaten, () => setShowForm(false))
      }
      {editingEmp &&
        renderForm("edit", editFormData, setEditFormData, handleSaveEdit, editLoading, editError, showBankdaten, setShowBankdaten, () => setEditingEmp(null))
      }

      {/* Search */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "220px", display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px", backgroundColor: "white", border: "2px solid var(--border)", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Search size={20} color="var(--orange)" />
          <input
            placeholder="Name, Ref-Code suchen..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ border: "none", outline: "none", flex: 1, fontSize: "15px", backgroundColor: "transparent", color: "var(--text)", fontWeight: 500 }}
          />
        </div>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "auto", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", tableLayout: "auto" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "linear-gradient(135deg, #050234 0%, #0a0654 100%)" }}>
              {["Affiliate", "Kunde", "Provision %", "Ref", "Betrag", "Provision", "Datum", "Aktionen"].map((h) => (
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
              <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>Keine offenen Einträge</td></tr>
            ) : (
              empfehlungen.map((emp, i) => (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: editingEmp?.id === emp.id ? "rgba(242,137,0,0.06)" : i % 2 === 0 ? "white" : "#f8f7f4",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <td style={{ ...cellStyle, fontWeight: 600 }}>
                    {emp.empfehler_name}
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>{emp.empfehler_email}</div>
                  </td>
                  <td style={cellStyle}>{emp.handwerker?.name ?? "–"}</td>
                  <td style={cellStyle}>
                    <span style={{ background: "linear-gradient(135deg, #f28900, #ff6b00)", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: 700 }}>
                      {emp.handwerker?.provision_prozent ?? "–"}%
                    </span>
                  </td>
                  <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: "12px", color: "var(--blue)", fontWeight: 700 }}>{emp.ref_code}</td>

                  {/* Betrag */}
                  <td style={cellStyle}>
                    {editingBetragId === emp.id ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="number" step="0.01" min="0" value={editBetrag}
                          onChange={(e) => setEditBetrag(e.target.value)}
                          style={{ width: "90px", padding: "8px 10px", border: "2px solid var(--orange)", borderRadius: "10px", fontSize: "14px", fontWeight: 700 }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleUpdateBetrag(emp); if (e.key === "Escape") setEditingBetragId(null); }}
                          autoFocus
                        />
                        <button onClick={() => handleUpdateBetrag(emp)} style={{ background: "#16a34a", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Check size={14} color="white" />
                        </button>
                        <button onClick={() => setEditingBetragId(null)} style={{ background: "var(--border)", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <X size={14} color="var(--text-muted)" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingBetragId(emp.id); setEditBetrag(emp.rechnungsbetrag ? String(emp.rechnungsbetrag) : ""); }}
                        style={{
                          background: emp.rechnungsbetrag ? "linear-gradient(135deg, #f28900, #ff6b00)" : "var(--border)",
                          border: "none", cursor: "pointer", fontWeight: 700,
                          color: emp.rechnungsbetrag ? "white" : "var(--text-muted)",
                          padding: "6px 16px", borderRadius: "16px", fontSize: "13px",
                          boxShadow: emp.rechnungsbetrag ? "0 2px 8px rgba(242,137,0,0.3)" : "none",
                        }}
                        title="Klicke um Betrag einzutragen"
                      >
                        {emp.rechnungsbetrag ? formatCurrency(emp.rechnungsbetrag) : "–"}
                      </button>
                    )}
                  </td>

                  <td style={{ ...cellStyle, fontWeight: 700, color: "var(--green)" }}>
                    {emp.provision_betrag ? formatCurrency(emp.provision_betrag) : "–"}
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap", color: "var(--text-muted)" }}>{formatDate(emp.created_at)}</td>

                  {/* Aktionen */}
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => startEditing(emp)}
                        style={{
                          background: editingEmp?.id === emp.id ? "var(--orange)" : "linear-gradient(135deg, #050234, #0a0654)",
                          border: "none", borderRadius: "10px", padding: "8px 14px", cursor: "pointer",
                          color: "white", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px",
                        }}
                      >
                        <Pencil size={14} /> Bearbeiten
                      </button>
                      <button
                        onClick={() => handleMoveToAuszahlung(emp)}
                        style={{
                          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                          border: "none", borderRadius: "10px", padding: "8px 14px", cursor: "pointer",
                          color: "white", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px",
                          boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                        }}
                      >
                        <ArrowRight size={14} /> Zur Auszahlung
                      </button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(emp)}>Löschen</Button>
                    </div>
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
