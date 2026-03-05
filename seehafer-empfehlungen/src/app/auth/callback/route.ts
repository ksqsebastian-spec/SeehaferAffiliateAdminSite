import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Handles the Magic Link callback from Supabase Auth.
// When a user clicks the magic link in their email, Supabase redirects here
// with a code that we exchange for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user is admin to redirect appropriately
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.app_metadata?.is_admin === true) {
        return NextResponse.redirect(`${origin}/admin`);
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // If code exchange fails, redirect to login with error
  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
