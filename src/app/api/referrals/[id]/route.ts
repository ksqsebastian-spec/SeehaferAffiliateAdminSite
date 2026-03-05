import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/referrals/[id] — get single empfehlung
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("empfehlungen")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Empfehlung nicht gefunden" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
