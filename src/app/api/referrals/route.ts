import { NextRequest, NextResponse } from "next/server";
import { empfehlungCreateSchema, paginationSchema } from "@/lib/validators";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/referrals — list empfehlungen (handwerker sees own via query)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const handwerkerId = searchParams.get("handwerker_id");

  const pagination = paginationSchema.safeParse({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const page = pagination.success ? pagination.data.page : 1;
  const pageSize = pagination.success ? pagination.data.pageSize : 20;
  const status = searchParams.get("status");
  const offset = (page - 1) * pageSize;

  const adminClient = createAdminClient();

  let query = adminClient
    .from("empfehlungen")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (handwerkerId) {
    query = query.eq("handwerker_id", handwerkerId);
  }

  if (status && ["offen", "erledigt", "ausgezahlt"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Daten konnten nicht geladen werden", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  });
}

// POST /api/referrals — create new empfehlung
export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rateCheck = checkRateLimit(
    `referral-create:${ip}`,
    RATE_LIMITS.referralCreate
  );
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte eine Stunde." },
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

  const parsed = empfehlungCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validierungsfehler",
        details: parsed.error.format(),
      },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Generate ref_code if not provided
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
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ref-Code bereits vergeben" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Empfehlung konnte nicht erstellt werden", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
