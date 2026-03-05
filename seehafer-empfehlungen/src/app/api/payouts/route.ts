import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, validateOrigin } from "@/lib/auth";
import { payoutSchema } from "@/lib/validators";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPayout } from "@/lib/paypal";
import { logAudit } from "@/lib/audit";

// POST /api/payouts — trigger PayPal payout for selected empfehlungen
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 403 });
  }

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  // Rate limit
  const rateCheck = checkRateLimit(
    `payout:${auth.user.id}`,
    RATE_LIMITS.payoutTrigger
  );
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Zu viele Auszahlungen. Bitte warte eine Stunde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const parsed = payoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Fetch all empfehlungen that are 'erledigt' and in the requested IDs
  const { data: empfehlungen, error: fetchError } = await adminClient
    .from("empfehlungen")
    .select("*")
    .in("id", parsed.data.empfehlung_ids)
    .eq("status", "erledigt");

  if (fetchError || !empfehlungen || empfehlungen.length === 0) {
    return NextResponse.json(
      { error: "Keine gültigen Empfehlungen für Auszahlung gefunden" },
      { status: 400 }
    );
  }

  // Verify all requested IDs are actually erledigt
  if (empfehlungen.length !== parsed.data.empfehlung_ids.length) {
    return NextResponse.json(
      {
        error: `Nur ${empfehlungen.length} von ${parsed.data.empfehlung_ids.length} Empfehlungen sind bereit für Auszahlung`,
      },
      { status: 400 }
    );
  }

  // Build payout items
  const payoutItems = empfehlungen.map((emp) => ({
    recipientEmail: emp.empfehler_email,
    amount: Number(emp.provision_betrag),
    refCode: emp.ref_code,
  }));

  // Send PayPal payout
  let payoutResult;
  try {
    payoutResult = await sendPayout(payoutItems);
  } catch (err) {
    console.error("PayPal payout failed:", err);
    await logAudit({
      userId: auth.user.id,
      action: "payout.failed",
      targetType: "batch",
      targetId: "N/A",
      details: {
        empfehlung_ids: parsed.data.empfehlung_ids,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json(
      { error: "PayPal-Auszahlung fehlgeschlagen. Bitte versuche es erneut." },
      { status: 502 }
    );
  }

  // Update all empfehlungen to 'ausgezahlt'
  const now = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from("empfehlungen")
    .update({
      status: "ausgezahlt",
      ausgezahlt_am: now,
      paypal_batch_id: payoutResult.batchId,
    })
    .in(
      "id",
      empfehlungen.map((e) => e.id)
    );

  if (updateError) {
    console.error("Failed to update empfehlungen after payout:", updateError);
    // PayPal payout was sent, but DB update failed — critical error
    // Log and continue, needs manual reconciliation
  }

  // Audit log
  await logAudit({
    userId: auth.user.id,
    action: "payout.created",
    targetType: "batch",
    targetId: payoutResult.batchId,
    details: {
      empfehlung_ids: empfehlungen.map((e) => e.id),
      total_amount: payoutItems.reduce((s, i) => s + i.amount, 0),
      count: empfehlungen.length,
    },
    ipAddress: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({
    success: true,
    batchId: payoutResult.batchId,
    count: empfehlungen.length,
  });
}
