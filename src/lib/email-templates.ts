// Email template generator — produces copy-pasteable text for Outlook/mail clients.
// No automated sending; admin copies the output manually.

export type EmailType = "ausgezahlt";

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

export function generateAusgezahltEmail(params: AusgezahltParams) {
  // PRIVACY: Only show commission amount, never invoice total or percentage
  return {
    subject: "Deine Provision wurde ausgezahlt",
    body: `Hey ${params.empfehlerName},

deine Provision für die Empfehlung (Ref: ${params.refCode}) in Höhe von ${formatCurrency(params.provisionBetrag)} wurde soeben überwiesen.

Danke fürs Empfehlen!

Viele Grüße,
Seehafer Elemente`,
  };
}

export function generateMailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
