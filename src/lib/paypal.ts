// PayPal Payouts integration using REST API directly.
// The @paypal/payouts-sdk is deprecated; using fetch-based approach.

interface PayoutItem {
  recipientEmail: string;
  amount: number;
  refCode: string;
  note?: string;
}

interface PayoutResult {
  batchId: string;
  status: string;
}

function getBaseUrl(): string {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal auth failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function sendPayout(items: PayoutItem[]): Promise<PayoutResult> {
  const accessToken = await getAccessToken();
  const batchId = `SEE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const body = {
    sender_batch_header: {
      sender_batch_id: batchId,
      email_subject: "Deine Empfehlungsprovision — Seehafer Elemente",
      email_message:
        "Vielen Dank für deine Empfehlung! Hier ist deine Provision.",
    },
    items: items.map((item, index) => ({
      recipient_type: "EMAIL",
      amount: {
        value: item.amount.toFixed(2),
        currency: "EUR",
      },
      receiver: item.recipientEmail,
      note:
        item.note ||
        `Provision für Empfehlung ${item.refCode}`,
      sender_item_id: `${batchId}-${index}`,
    })),
  };

  const response = await fetch(`${getBaseUrl()}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal payout failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    batchId: data.batch_header.payout_batch_id,
    status: data.batch_header.batch_status,
  };
}

export async function getPayoutStatus(batchId: string): Promise<{
  status: string;
  items: Array<{ transactionId: string; status: string }>;
}> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/v1/payments/payouts/${batchId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal status check failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    status: data.batch_header.batch_status,
    items: (data.items || []).map(
      (item: { payout_item_id: string; transaction_status: string }) => ({
        transactionId: item.payout_item_id,
        status: item.transaction_status,
      })
    ),
  };
}
