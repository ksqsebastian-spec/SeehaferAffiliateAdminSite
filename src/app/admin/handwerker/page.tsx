"use client";

import { useEffect, useState, useCallback } from "react";
import type { Handwerker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function KundePage() {
  const [handwerker, setHandwerker] = useState<Handwerker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProvision, setEditProvision] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", provision_prozent: "5" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/handwerker");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHandwerker(data.data || []);
    } catch {
      setHandwerker([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/handwerker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          provision_prozent: parseFloat(formData.provision_prozent),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.detail
          ? `${data.error}: ${data.detail}`
          : data.error || "Fehler beim Anlegen";
        setFormError(msg);
        return;
      }

      setShowForm(false);
      setFormData({ name: "", email: "", provision_prozent: "5" });
      fetchData();
    } catch {
      setFormError("Netzwerkfehler");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdateProvision(id: string) {
    const value = parseFloat(editProvision);
    if (isNaN(value) || value < 0 || value > 50) return;

    try {
      await fetch("/api/admin/handwerker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, provision_prozent: value }),
      });
      setEditingId(null);
      fetchData();
    } catch {
      // silent fail — user can retry
    }
  }

  async function handleToggleStatus(hw: Handwerker) {
    try {
      await fetch("/api/admin/handwerker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: hw.id, active: !hw.active }),
      });
      fetchData();
    } catch {
      // silent fail
    }
  }

  async function handleDelete(hw: Handwerker) {
    if (!confirm(`Kunde "${hw.name}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/handwerker?id=${hw.id}`, {
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

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--navy)" }}>
          Kunde verwalten
        </h1>
        <Button onClick={() => setShowForm(!showForm)} size="lg">
          {showForm ? "Abbrechen" : "+ Neuer Kunde"}
        </Button>
      </div>

      {showForm && (
        <Card style={{ borderLeft: "5px solid var(--orange)", borderRadius: "20px", boxShadow: "0 4px 20px rgba(242,137,0,0.1)" }}>
          <form
            onSubmit={handleCreate}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--navy)" }}>
              Neuen Kunde anlegen
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
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="E-Mail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Provision (%)"
              type="number"
              step="0.01"
              min="0"
              max="50"
              value={formData.provision_prozent}
              onChange={(e) =>
                setFormData({ ...formData, provision_prozent: e.target.value })
              }
              required
            />
            <Button type="submit" loading={formLoading} size="lg">
              Kunde anlegen
            </Button>
          </form>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "auto", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                background: "linear-gradient(135deg, #050234 0%, #0a0654 100%)",
              }}
            >
              {["Name", "E-Mail", "Provision %", "Status", "Erstellt", "Aktionen"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "16px 18px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>
                  Laden...
                </td>
              </tr>
            ) : handwerker.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>
                  Noch keine Kunde angelegt
                </td>
              </tr>
            ) : (
              handwerker.map((hw, i) => (
                <tr
                  key={hw.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: i % 2 === 0 ? "white" : "#f8f7f4",
                  }}
                >
                  <td style={{ padding: "16px 18px", fontWeight: 600 }}>{hw.name}</td>
                  <td style={{ padding: "16px 18px" }}>{hw.email}</td>
                  <td style={{ padding: "16px 18px" }}>
                    {editingId === hw.id ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="50"
                          value={editProvision}
                          onChange={(e) => setEditProvision(e.target.value)}
                          style={{
                            width: "70px",
                            padding: "8px 10px",
                            border: "2px solid var(--orange)",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 700,
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateProvision(hw.id)}
                        >
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          X
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(hw.id);
                          setEditProvision(String(hw.provision_prozent));
                        }}
                        style={{
                          background: "linear-gradient(135deg, #f28900, #ff6b00)",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          color: "white",
                          padding: "6px 16px",
                          borderRadius: "16px",
                          fontSize: "14px",
                          boxShadow: "0 2px 8px rgba(242,137,0,0.3)",
                        }}
                        title="Klicke zum Bearbeiten"
                      >
                        {hw.provision_prozent}%
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <button
                      onClick={() => handleToggleStatus(hw)}
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "white",
                        backgroundColor: hw.active ? "#16a34a" : "#dc2626",
                        padding: "6px 14px",
                        borderRadius: "16px",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: hw.active ? "0 2px 8px rgba(22,163,74,0.3)" : "0 2px 8px rgba(220,38,38,0.3)",
                      }}
                      title={hw.active ? "Klicke um zu deaktivieren" : "Klicke um zu aktivieren"}
                    >
                      {hw.active ? "AKTIV" : "INAKTIV"}
                    </button>
                  </td>
                  <td style={{ padding: "16px 18px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {new Date(hw.created_at).toLocaleDateString("de-DE")}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(hw)}
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
    </div>
  );
}
