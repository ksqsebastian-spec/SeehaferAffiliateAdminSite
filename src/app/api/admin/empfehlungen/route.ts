import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const VALID_STATUSES = ["offen", "erledigt", "ausgezahlt"] as const;

// PATCH /api/admin/empfehlungen — update empfehlung status
export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const { id, status } = body as { id: string; status: string };

  if (!id || !status) {
    return NextResponse.json(
      { error: "ID und Status erforderlich" },
      { status: 400 }
    );
  }

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: "Ungültiger Status" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Get current empfehlung for audit
  const { data: before } = await adminClient
    .from("empfehlungen")
    .select("status")
    .eq("id", id)
    .single();

  const updateData: Record<string, unknown> = { status };

  // Set ausgezahlt_am when marking as ausgezahlt
  if (status === "ausgezahlt") {
    updateData.ausgezahlt_am = new Date().toISOString();
  }

  // Clear ausgezahlt_am if moving back from ausgezahlt
  if (status !== "ausgezahlt" && before?.status === "ausgezahlt") {
    updateData.ausgezahlt_am = null;
  }

  const { data, error } = await adminClient
    .from("empfehlungen")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Status konnte nicht aktualisiert werden", detail: error?.message },
      { status: 500 }
    );
  }

  await logAudit({
    userId: "admin",
    action: "empfehlung.status_changed",
    targetType: "empfehlung",
    targetId: id,
    details: { from: before?.status, to: status },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json(data);
}

// DELETE /api/admin/empfehlungen — delete empfehlung
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: emp } = await adminClient
    .from("empfehlungen")
    .select("kunde_name, ref_code")
    .eq("id", id)
    .single();

  const { error } = await adminClient
    .from("empfehlungen")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Empfehlung konnte nicht gelöscht werden", detail: error.message },
      { status: 500 }
    );
  }

  await logAudit({
    userId: "admin",
    action: "empfehlung.deleted",
    targetType: "empfehlung",
    targetId: id,
    details: { kunde_name: emp?.kunde_name, ref_code: emp?.ref_code },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ success: true });
}
