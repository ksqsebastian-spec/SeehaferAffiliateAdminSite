import { NextResponse, type NextRequest } from "next/server";

export async function middleware(_request: NextRequest) {
  // Auth disabled for development — all requests pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
