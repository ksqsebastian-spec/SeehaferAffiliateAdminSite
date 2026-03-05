// Email template generator — produces copy-pasteable text for Outlook/mail clients.
// No automated sending; admin copies the output manually.

export type EmailType = "erledigt" | "ausgezahlt";

interface ErledigtParams {
  empfehlerName: string;
  refCode: string;
}

interface AusgezahltParams {
  empfehlerName: string;
  empfehlerEmail: string;
  refCode: string;
  provisionBetrag: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function generateErledigtEmail(params: ErledigtParams) {
  return {
    subject: "Deine Empfehlung wurde bestätigt ✓",
    body: `Hey ${params.empfehlerName},

gute Nachrichten! Der Auftrag, den du empfohlen hast (Ref: ${params.refCode}), wurde erfolgreich abgeschlossen.

Deine Provision wird in Kürze ausgezahlt.

Viele Grüße,
Seehafer Elemente`,
  };
}

export function generateAusgezahltEmail(params: AusgezahltParams) {
  // PRIVACY: Only show commission amount, never invoice total or percentage
  return {
    subject: "Deine Provision wurde ausgezahlt",
    body: `Hey ${params.empfehlerName},

deine Provision für die Empfehlung (Ref: ${params.refCode}) in Höhe von ${formatCurrency(params.provisionBetrag)} wurde soeben an ${params.empfehlerEmail} via PayPal überwiesen.

Danke fürs Empfehlen!

Viele Grüße,
Seehafer Elemente`,
  };
}

export function generateMailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
