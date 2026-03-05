import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // If admin, redirect to admin panel
  if (user.app_metadata?.is_admin === true) {
    redirect("/admin");
  }

  const userName = user.email?.split("@")[0] || "Benutzer";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <MobileNav userName={userName} />
      <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
