import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { QuickAddForm } from "@/components/dashboard/QuickAddForm";

export default function QuickAddPage() {
  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Link
        href="/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--text-muted)",
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        <ArrowLeft size={16} />
        Zurück
      </Link>

      <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
        Neue Empfehlung erfassen
      </h1>

      <Card>
        <QuickAddForm />
      </Card>
    </div>
  );
}
