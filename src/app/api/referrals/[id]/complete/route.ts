import { NextRequest, NextResponse } from "next/server";
import { empfehlungCompleteSchema } from "@/lib/validators";
import { createAdminClient } from "@/lib/supabase/admin";
import { berechneProvision } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

// POST /api/referrals/[id]/complete — mark empfehlung as erledigt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const parsed = empfehlungCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Fetch the empfehlung (must be 'offen')
  const { data: empfehlung, error: fetchError } = await adminClient
    .from("empfehlungen")
    .select("*, handwerker:handwerker_id(provision_prozent)")
    .eq("id", id)
    .eq("status", "offen")
    .single();

  if (fetchError || !empfehlung) {
    return NextResponse.json(
      { error: "Empfehlung nicht gefunden oder bereits erledigt" },
      { status: 404 }
    );
  }

  const provisionProzent =
    (empfehlung.handwerker as { provision_prozent: number })?.provision_prozent ?? 5;
  const provisionBetrag = berechneProvision(
    parsed.data.rechnungsbetrag,
    provisionProzent
  );

  // Update status
  const { data: updated, error: updateError } = await adminClient
    .from("empfehlungen")
    .update({
      status: "erledigt",
      rechnungsbetrag: parsed.data.rechnungsbetrag,
      provision_betrag: provisionBetrag,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: "Status konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }

  // Audit log
  await logAudit({
    userId: "admin",
    action: "empfehlung.completed",
    targetType: "empfehlung",
    targetId: id,
    details: {
      rechnungsbetrag: parsed.data.rechnungsbetrag,
      provision_betrag: provisionBetrag,
    },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json(updated);
}
