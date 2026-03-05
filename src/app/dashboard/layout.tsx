import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth disabled for development
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <MobileNav userName="Admin" />
      <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
