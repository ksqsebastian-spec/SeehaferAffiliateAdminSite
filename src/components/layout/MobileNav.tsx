"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, LogOut } from "lucide-react";

export function MobileNav({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        backgroundColor: "var(--navy)",
        color: "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <LayoutDashboard size={20} />
        <span style={{ fontWeight: 700, fontSize: "16px" }}>
          Seehafer Affiliate
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "13px", opacity: 0.8 }}>{userName}</span>
        <button
          onClick={handleLogout}
          aria-label="Abmelden"
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "4px",
            opacity: 0.8,
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
