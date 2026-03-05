import { NextRequest, NextResponse } from "next/server";
import { requireAuth, validateOrigin } from "@/lib/auth";
import { empfehlungCompleteSchema } from "@/lib/validators";
import { createAdminClient } from "@/lib/supabase/admin";
import { berechneProvision } from "@/lib/utils";
import { sendErledigtEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

// POST /api/referrals/[id]/complete — mark empfehlung as erledigt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 403 });
  }

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

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

  // Fetch the empfehlung (must belong to this handwerker and be 'offen')
  const { data: empfehlung, error: fetchError } = await adminClient
    .from("empfehlungen")
    .select("*, handwerker:handwerker_id(provision_prozent)")
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId)
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
    userId: auth.user.id,
    action: "empfehlung.completed",
    targetType: "empfehlung",
    targetId: id,
    details: {
      rechnungsbetrag: parsed.data.rechnungsbetrag,
      provision_betrag: provisionBetrag,
    },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  // Send notification email (fire-and-forget, don't block response)
  sendErledigtEmail({
    empfehlerName: empfehlung.empfehler_name,
    empfehlerEmail: empfehlung.empfehler_email,
    refCode: empfehlung.ref_code,
  }).catch((err) => console.error("Email send failed:", err));

  return NextResponse.json(updated);
}
