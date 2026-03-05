import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || "empfehlung@seehafer-elemente.de";
}

export async function sendErledigtEmail(params: {
  empfehlerName: string;
  empfehlerEmail: string;
  refCode: string;
}): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: getFromAddress(),
    to: params.empfehlerEmail,
    subject: "Deine Empfehlung wurde bestätigt ✓",
    text: `Hey ${params.empfehlerName},

gute Nachrichten! Der Auftrag, den du empfohlen hast (Ref: ${params.refCode}), wurde erfolgreich abgeschlossen.

Deine Provision wird in Kürze ausgezahlt.

Viele Grüße,
Seehafer Elemente`,
  });
}

export async function sendAusgezahltEmail(params: {
  empfehlerName: string;
  empfehlerEmail: string;
  refCode: string;
  provisionBetrag: number;
}): Promise<void> {
  const resend = getResend();

  const formattedAmount = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(params.provisionBetrag);

  // PRIVACY: Only show the commission amount, never the invoice total or percentage
  await resend.emails.send({
    from: getFromAddress(),
    to: params.empfehlerEmail,
    subject: "Deine Provision wurde ausgezahlt",
    text: `Hey ${params.empfehlerName},

deine Provision für die Empfehlung (Ref: ${params.refCode}) in Höhe von ${formattedAmount} wurde soeben an ${params.empfehlerEmail} via PayPal überwiesen.

Danke fürs Empfehlen!

Viele Grüße,
Seehafer Elemente`,
  });
}
