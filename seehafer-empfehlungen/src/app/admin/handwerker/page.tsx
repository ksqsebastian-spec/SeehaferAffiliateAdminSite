"use client";

import { useEffect, useState, useCallback } from "react";
import type { Handwerker } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HandwerkerPage() {
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
        setFormError(data.error || "Fehler beim Anlegen");
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

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>
          Handwerker verwalten
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Abbrechen" : "Neuer Handwerker"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form
            onSubmit={handleCreate}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
              Neuen Handwerker anlegen
            </h2>
            {formError && (
              <div role="alert" style={{ color: "var(--red)", fontSize: "13px" }}>
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
            <Button type="submit" loading={formLoading}>
              Anlegen
            </Button>
          </form>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              {["Name", "E-Mail", "Provision %", "Status", "Erstellt"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
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
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Laden...
                </td>
              </tr>
            ) : handwerker.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Noch keine Handwerker angelegt
                </td>
              </tr>
            ) : (
              handwerker.map((hw) => (
                <tr key={hw.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{hw.name}</td>
                  <td style={{ padding: "12px 16px" }}>{hw.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {editingId === hw.id ? (
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="50"
                          value={editProvision}
                          onChange={(e) => setEditProvision(e.target.value)}
                          style={{
                            width: "70px",
                            padding: "4px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
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
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          color: "var(--navy)",
                          textDecoration: "underline dotted",
                        }}
                        title="Klicke zum Bearbeiten"
                      >
                        {hw.provision_prozent}%
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: hw.active ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {hw.active ? "AKTIV" : "INAKTIV"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    {new Date(hw.created_at).toLocaleDateString("de-DE")}
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
