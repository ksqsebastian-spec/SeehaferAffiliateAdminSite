import { NextRequest, NextResponse } from "next/server";
import { empfehlungCreateSchema } from "@/lib/validators";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { berechneProvision } from "@/lib/utils";

const VALID_STATUSES = ["offen", "erledigt", "ausgezahlt"] as const;

// POST /api/admin/empfehlungen — create new empfehlung (admin)
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const parsed = empfehlungCreateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return NextResponse.json(
      { error: "Validierungsfehler", detail: fieldErrors.join("; ") },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Auto-generate ref_code
  let refCode = parsed.data.ref_code;
  if (!refCode) {
    const { data: generated } = await adminClient.rpc("generate_ref_code");
    refCode = generated as string;
  }

  const { data, error } = await adminClient
    .from("empfehlungen")
    .insert({
      ...parsed.data,
      ref_code: refCode,
    })
    .select("*, handwerker:handwerker_id(id, name, email, telefon, provision_prozent)")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Empfehlung konnte nicht erstellt werden", detail: error.message },
      { status: 500 }
    );
  }

  await logAudit({
    userId: "admin",
    action: "empfehlung.created",
    targetType: "empfehlung",
    targetId: data.id,
    details: { kunde_name: parsed.data.kunde_name, ref_code: refCode },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/admin/empfehlungen — update empfehlung fields
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

  const {
    id,
    status,
    rechnungsbetrag,
    empfehler_name,
    empfehler_email,
    kunde_name,
    kunde_kontakt,
    handwerker_id,
    iban,
    bic,
    kontoinhaber,
    bank_name,
    provision_betrag: directProvisionBetrag,
  } = body as Record<string, unknown>;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "ID erforderlich" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Get current empfehlung for audit + provision calc (non-blocking)
  const { data: before } = await adminClient
    .from("empfehlungen")
    .select("status, rechnungsbetrag, handwerker:handwerker_id(provision_prozent)")
    .eq("id", id)
    .single();

  const updateData: Record<string, unknown> = {};

  // Status update
  if (status && typeof status === "string") {
    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { error: "Ungültiger Status" },
        { status: 400 }
      );
    }
    updateData.status = status;

    if (status === "ausgezahlt") {
      updateData.ausgezahlt_am = new Date().toISOString();
    }
    if (status !== "ausgezahlt" && before?.status === "ausgezahlt") {
      updateData.ausgezahlt_am = null;
    }
  }

  // Betrag update — recalculate provision
  if (rechnungsbetrag !== undefined) {
    const betrag = Number(rechnungsbetrag);
    if (isNaN(betrag) || betrag < 0) {
      return NextResponse.json(
        { error: "Ungültiger Betrag" },
        { status: 400 }
      );
    }
    updateData.rechnungsbetrag = betrag;

    const hw = before?.handwerker as unknown as { provision_prozent: number } | null;
    const provisionProzent = hw?.provision_prozent ?? 5;
    updateData.provision_betrag = berechneProvision(betrag, provisionProzent);
  }

  // Direct provision_betrag update (for Auszahlung page adjustments)
  if (directProvisionBetrag !== undefined && rechnungsbetrag === undefined) {
    const betrag = Number(directProvisionBetrag);
    if (!isNaN(betrag) && betrag >= 0) {
      updateData.provision_betrag = betrag;
    }
  }

  // Text field updates
  if (empfehler_name !== undefined) updateData.empfehler_name = empfehler_name;
  if (empfehler_email !== undefined) updateData.empfehler_email = empfehler_email;
  if (kunde_name !== undefined) updateData.kunde_name = kunde_name;
  if (kunde_kontakt !== undefined) updateData.kunde_kontakt = kunde_kontakt;
  if (handwerker_id !== undefined) updateData.handwerker_id = handwerker_id;

  // Bankdaten fields
  if (iban !== undefined) updateData.iban = iban;
  if (bic !== undefined) updateData.bic = bic;
  if (kontoinhaber !== undefined) updateData.kontoinhaber = kontoinhaber;
  if (bank_name !== undefined) updateData.bank_name = bank_name;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "Keine Änderungen" },
      { status: 400 }
    );
  }

  const { error } = await adminClient
    .from("empfehlungen")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Aktualisierung fehlgeschlagen", detail: error.message },
      { status: 500 }
    );
  }

  await logAudit({
    userId: "admin",
    action: "empfehlung.updated",
    targetType: "empfehlung",
    targetId: id as string,
    details: { changes: updateData },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ success: true });
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
