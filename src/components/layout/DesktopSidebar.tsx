"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Mail } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/handwerker", label: "Partner", icon: Users },
  { href: "/admin/emails", label: "E-Mails", icon: Mail },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        background: "linear-gradient(180deg, #050234 0%, #0a0654 100%)",
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
          padding: "32px 24px",
          fontWeight: 800,
          fontSize: "18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          letterSpacing: "-0.3px",
        }}
      >
        Seehafer Admin
      </div>

      <nav style={{ flex: 1, padding: "24px 12px" }}>
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
                gap: "12px",
                padding: "14px 16px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: isActive ? 600 : 400,
                color: "white",
                textDecoration: "none",
                backgroundColor: isActive ? "rgba(242,137,0,0.15)" : "transparent",
                marginBottom: "6px",
                transition: "all 0.2s ease",
                borderLeft: isActive ? "3px solid var(--orange)" : "3px solid transparent",
              }}
            >
              <Icon size={20} style={{ color: isActive ? "var(--orange)" : "rgba(255,255,255,0.5)" }} />
              <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
