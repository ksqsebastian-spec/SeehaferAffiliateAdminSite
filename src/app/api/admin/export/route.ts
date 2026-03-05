import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/export — CSV export of all empfehlungen
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const adminClient = createAdminClient();

  let query = adminClient
    .from("empfehlungen")
    .select("*, handwerker:handwerker_id(name)")
    .order("created_at", { ascending: false });

  if (status && ["offen", "erledigt", "ausgezahlt"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Export fehlgeschlagen" },
      { status: 500 }
    );
  }

  // Build CSV
  const headers = [
    "Ref-Code",
    "Kunde",
    "Kunde Kontakt",
    "Empfehler",
    "Empfehler Email",
    "Handwerker",
    "Status",
    "Rechnungsbetrag",
    "Provision",
    "Ausgezahlt am",
    "Erstellt am",
  ];

  const rows = (data || []).map((row) => {
    const hw = row.handwerker as { name: string } | null;
    return [
      row.ref_code,
      row.kunde_name,
      row.kunde_kontakt || "",
      row.empfehler_name,
      row.empfehler_email,
      hw?.name || "",
      row.status,
      row.rechnungsbetrag ?? "",
      row.provision_betrag ?? "",
      row.ausgezahlt_am || "",
      row.created_at,
    ];
  });

  function escapeCsv(val: string | number): string {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="empfehlungen-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
