import { DesktopSidebar } from "@/components/layout/DesktopSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DesktopSidebar />
      <main
        style={{
          marginLeft: "260px",
          flex: 1,
          padding: "40px 48px",
          backgroundColor: "var(--bg)",
          width: "100%",
        }}
      >
        {children}
      </main>
    </div>
  );
}
