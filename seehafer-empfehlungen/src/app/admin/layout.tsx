import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // SECURITY: Admin check uses app_metadata (not user_metadata)
  if (user.app_metadata?.is_admin !== true) {
    redirect("/dashboard");
  }

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
