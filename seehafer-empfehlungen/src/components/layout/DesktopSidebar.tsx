"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Users, CreditCard, LogOut } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/handwerker", label: "Handwerker", icon: Users },
  { href: "/admin/payouts", label: "Auszahlungen", icon: CreditCard },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: "240px",
        height: "100vh",
        backgroundColor: "var(--navy)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
      }}
    >
      <div
        style={{
          padding: "24px 20px",
          fontWeight: 800,
          fontSize: "16px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Seehafer Admin
      </div>

      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                color: "white",
                textDecoration: "none",
                backgroundColor: isActive
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
                marginBottom: "2px",
                transition: "background-color 0.2s ease",
              }}
            >
              <Icon size={18} opacity={isActive ? 1 : 0.6} />
              <span style={{ opacity: isActive ? 1 : 0.7 }}>
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "16px 20px",
          border: "none",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "transparent",
          color: "white",
          cursor: "pointer",
          fontSize: "14px",
          opacity: 0.7,
          width: "100%",
          textAlign: "left",
        }}
      >
        <LogOut size={18} />
        Abmelden
      </button>
    </aside>
  );
}
