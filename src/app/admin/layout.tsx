import { DesktopSidebar } from "@/components/layout/DesktopSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth disabled for development
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DesktopSidebar />
      <main
        style={{
          marginLeft: "240px",
          flex: 1,
          padding: "32px",
          backgroundColor: "var(--bg)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
