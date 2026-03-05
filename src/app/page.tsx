"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError("Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte prüfe die Konfiguration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "var(--navy)",
            marginBottom: "8px",
          }}
        >
          Seehafer Empfehlungen
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
          Melde dich an, um dein Dashboard zu sehen
        </p>
      </div>

      {sent ? (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            backgroundColor: "var(--green-bg)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <p
            style={{
              color: "var(--green)",
              fontWeight: 600,
              fontSize: "14px",
              margin: 0,
            }}
          >
            Magic Link gesendet!
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "13px",
              marginTop: "8px",
              marginBottom: 0,
            }}
          >
            Prüfe deine E-Mail ({email}) und klicke auf den Link.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {error && (
            <div
              role="alert"
              style={{
                padding: "12px",
                backgroundColor: "var(--red-bg)",
                color: "var(--red)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <Input
            label="E-Mail-Adresse"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.de"
            required
            autoComplete="email"
          />

          <Button type="submit" loading={loading} size="lg">
            Magic Link senden
          </Button>
        </form>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Card style={{ maxWidth: "400px", width: "100%", padding: "40px" }}>
        <Suspense
          fallback={
            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
              Laden...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
