import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Use getUser() not getSession() for server-side auth verification.
  // getUser() sends a request to the Supabase Auth server to validate the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  const isAuthPage = request.nextUrl.pathname === "/";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/admin");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login page
  if (user && isAuthPage) {
    // Check if admin
    const isAdmin = user.app_metadata?.is_admin === true;
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Admin route protection
  if (user && request.nextUrl.pathname.startsWith("/admin")) {
    const isAdmin = user.app_metadata?.is_admin === true;
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // For API routes, don't redirect — the route handlers return 401/403
  if (!user && isApiRoute) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
