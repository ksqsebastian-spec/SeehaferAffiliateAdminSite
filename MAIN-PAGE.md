# Claude Code Instructions — Seehafer Empfehlungsprogramm Main App

> Full-Stack App: Next.js + Supabase + PayPal. Handwerker-Dashboard, Quick Add, Admin Panel.

---

## 1. Projekt-Setup

```bash
npx create-next-app@latest seehafer-empfehlungen --ts --tailwind --app --eslint --src-dir --no-import-alias
cd seehafer-empfehlungen
```

**Abhängigkeiten:**
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @paypal/payouts-sdk
npm install zod                    # Schema-Validierung
npm install next-themes            # Dark Mode (optional, später)
npm install lucide-react           # Icons
```

---

## 2. Design-System

### IDENTISCH mit der Empfehlerinnen-Seite:

```css
:root {
  --bg:             #FBFAF5;
  --bg-card:        #FFFFFF;
  --navy:           #050234;
  --navy-light:     #062592;
  --orange:         #F28900;
  --orange-hover:   #E07E00;
  --orange-bg:      #FFF7ED;
  --text:           #1A1A2E;
  --text-muted:     #8A8A9A;
  --border:         #EBE9E3;
  --green:          #16A34A;
  --green-bg:       #F0FDF4;
  --blue:           #2563EB;
  --blue-bg:        #EFF6FF;
  --red:            #DC2626;
  --red-bg:         #FEF2F2;
  --radius:         16px;
  --radius-sm:      10px;
  --shadow-card:    0 2px 12px rgba(5,2,52,.06);
  --shadow-hover:   0 8px 24px rgba(5,2,52,.10);
}
```

### Typografie + Layout

- **Font:** Inter (400, 500, 600, 700, 800), antialiased
- **Hintergrund:** `--bg` (#FBFAF5)
- **Cards:** Weißer Hintergrund, border-radius 16px, shadow-card
- **Spacing:** Großzügig, atmet. Fun-and-awe.io Vibe.
- **Micro-Animationen:** Dezente Fade-ins, hover translateY(-1px), 0.2s ease transitions

### Responsive Breakpoints

| Name | px | Verwendung |
|------|-----|-----------|
| mobile | < 640 | Handwerker-Dashboard (primär) |
| tablet | 640-1024 | Hybrid |
| desktop | > 1024 | Admin Panel (primär) |

---

## 3. Architektur

```
┌─────────────────────────────────────────────┐
│                  Vercel                       │
│  ┌──────────────────────────────────────┐    │
│  │           Next.js App                 │    │
│  │  ┌──────────┐  ┌──────────────────┐  │    │
│  │  │ Dashboard │  │   Admin Panel    │  │    │
│  │  │ (Mobile)  │  │   (Desktop)     │  │    │
│  │  └──────────┘  └──────────────────┘  │    │
│  │  ┌──────────────────────────────────┐│    │
│  │  │      API Routes (Next.js)        ││    │
│  │  │  /api/referrals                  ││    │
│  │  │  /api/referrals/[id]/complete    ││    │
│  │  │  /api/payouts                    ││    │
│  │  │  /api/admin/*                    ││    │
│  │  └──────────────────────────────────┘│    │
│  └──────────────────────────────────────┘    │
│                     │                         │
│              Supabase (BaaS)                  │
│  ┌──────────────────────────────────────┐    │
│  │  Auth · Database · Row Level Security │    │
│  └──────────────────────────────────────┘    │
│                     │                         │
│            PayPal Payouts API                 │
│  ┌──────────────────────────────────────┐    │
│  │  Provisionsauszahlung an Empfehler    │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 4. Datenbank-Schema (Supabase / PostgreSQL)

### Tabelle: `handwerker`

```sql
CREATE TABLE handwerker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  provision_prozent NUMERIC(4,2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beispieldaten:
INSERT INTO handwerker (name, email, provision_prozent) VALUES
  ('Seehafer Elemente', 'info@seehafer-elemente.de', 5.00),
  ('Maler Hantke', 'info@maler-hantke.de', 4.00);
```

### Tabelle: `empfehlungen`

```sql
CREATE TABLE empfehlungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Empfehler (wer hat empfohlen)
  empfehler_name TEXT NOT NULL,
  empfehler_email TEXT NOT NULL,  -- gleichzeitig PayPal-Adresse

  -- Kunde (wer wurde empfohlen)
  kunde_name TEXT NOT NULL,
  kunde_kontakt TEXT,             -- Email oder Telefon

  -- Zuordnung
  handwerker_id UUID REFERENCES handwerker(id) NOT NULL,
  ref_code TEXT UNIQUE NOT NULL,  -- #SEE-2026-0317

  -- Status: 'offen' | 'erledigt' | 'ausgezahlt'
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt', 'ausgezahlt')),

  -- Finanzen (nur bei status='erledigt' oder 'ausgezahlt')
  rechnungsbetrag NUMERIC(10,2),  -- Brutto-Rechnungsbetrag
  provision_betrag NUMERIC(10,2), -- Berechneter Provisionsbetrag

  -- Auszahlung
  ausgezahlt_am TIMESTAMPTZ,
  paypal_transaction_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für häufige Queries
CREATE INDEX idx_empfehlungen_handwerker ON empfehlungen(handwerker_id);
CREATE INDEX idx_empfehlungen_status ON empfehlungen(status);
CREATE INDEX idx_empfehlungen_ref_code ON empfehlungen(ref_code);
```

### Row Level Security (RLS)

```sql
-- Handwerker sehen nur ihre eigenen Empfehlungen
ALTER TABLE empfehlungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Handwerker sehen eigene Empfehlungen"
  ON empfehlungen FOR SELECT
  USING (handwerker_id IN (
    SELECT id FROM handwerker WHERE email = auth.jwt()->>'email'
  ));

-- Admin (service_role) hat vollen Zugriff
-- Wird über API Routes mit service_role key gehandhabt
```

---

## 5. Benutzer-Rollen

### 5.1 Empfehler (KEIN Account)

- Hat KEINEN Account in diesem System
- Interagiert NUR mit der separaten Empfehlerinnen-Landingpage
- Wird in der Datenbank nur als Name + Email gespeichert

### 5.2 Handwerker (Supabase Auth)

- Loggt sich ein via Supabase Auth (Magic Link per E-Mail)
- Sieht NUR seine eigenen Empfehlungen (RLS)
- Kann:
  - Empfehlungen sehen (Dashboard)
  - Neue Empfehlung manuell hinzufügen (Quick Add)
  - Job als "erledigt" markieren + Rechnungsbetrag eintragen
- Kann NICHT:
  - Provisionsprozentsatz ändern
  - Auszahlungen auslösen
  - Andere Handwerker sehen

### 5.3 Admin (Supabase Auth + Admin-Flag)

- Hat ein `is_admin: true` Flag in der Supabase Auth Metadata
- Sieht ALLE Empfehlungen über ALLE Handwerker
- Kann:
  - Provisionsprozentsätze pro Handwerker setzen
  - Auszahlungen auslösen (PayPal Payouts API)
  - Handwerker anlegen/bearbeiten
  - Alle Daten exportieren

---

## 6. Seiten & Routes

### Dateistruktur

```
src/
├── app/
│   ├── layout.tsx                  ← Root Layout
│   ├── page.tsx                    ← Login/Landing
│   ├── dashboard/
│   │   ├── layout.tsx              ← Auth-Guard + Mobile Nav
│   │   ├── page.tsx                ← Handwerker Dashboard
│   │   ├── add/page.tsx            ← Quick Add Formular
│   │   └── [id]/page.tsx           ← Empfehlung Detail + "Erledigt" markieren
│   ├── admin/
│   │   ├── layout.tsx              ← Admin-Guard + Desktop Nav
│   │   ├── page.tsx                ← Admin Übersicht
│   │   ├── handwerker/page.tsx     ← Handwerker verwalten
│   │   └── payouts/page.tsx        ← Auszahlungen
│   └── api/
│       ├── referrals/
│       │   ├── route.ts            ← GET (list) + POST (create)
│       │   └── [id]/
│       │       ├── route.ts        ← GET (detail) + PATCH (update)
│       │       └── complete/route.ts ← POST (mark as erledigt)
│       ├── payouts/
│       │   └── route.ts            ← POST (trigger PayPal payout)
│       └── admin/
│           ├── handwerker/route.ts ← CRUD Handwerker
│           └── export/route.ts     ← CSV Export
├── components/
│   ├── ui/                         ← Wiederverwendbare UI-Elemente
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Badge.tsx               ← Status-Badges (OFFEN, ERLEDIGT, AUSGEZAHLT)
│   │   ├── Input.tsx
│   │   ├── Avatar.tsx              ← Initialen-Avatar (wie im Pitch)
│   │   └── StatCard.tsx            ← Zahlen-Card (4 Offen, 8 Erledigt, €640)
│   ├── dashboard/
│   │   ├── EmpfehlungCard.tsx      ← "X empfohlen von Y" Card
│   │   ├── QuickAddForm.tsx
│   │   ├── CompleteForm.tsx        ← Rechnungsbetrag + Erledigt-Button
│   │   └── FilterTabs.tsx          ← Alle | Offen | Erledigt
│   ├── admin/
│   │   ├── AdminTable.tsx
│   │   ├── HandwerkerForm.tsx
│   │   └── PayoutButton.tsx
│   └── layout/
│       ├── MobileNav.tsx
│       ├── DesktopSidebar.tsx
│       └── AuthGuard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Browser Supabase Client
│   │   ├── server.ts               ← Server Supabase Client (für API Routes)
│   │   └── admin.ts                ← Service Role Client (für Admin)
│   ├── paypal.ts                   ← PayPal Payouts SDK Wrapper
│   ├── validators.ts               ← Zod Schemas
│   └── utils.ts                    ← Hilfsfunktionen
└── types/
    └── index.ts
```

---

## 7. Handwerker-Dashboard (Mobile-First)

### 7.1 Dashboard Screen

```
┌──────────────────────────────┐
│  ⚒ Seehafer Empfehlungen    │  ← Header
│  März 2026                    │
├──────────────────────────────┤
│                              │
│  ┌───┐  ┌───┐  ┌──────┐    │  ← Stat-Cards
│  │ 4 │  │ 8 │  │€ 640 │    │
│  │Off│  │Erl│  │Prov. │    │
│  └───┘  └───┘  └──────┘    │
│                              │
│  [Alle(12)] [Offen(4)] [Erl]│  ← Filter Tabs
│                              │
│  ┌──────────────────────┐    │
│  │ 🟠 MM  Max Müller    │    │  ← EmpfehlungCard
│  │      empf. von Lisa   │    │
│  │      heute    [OFFEN] │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ 🔵 AW  Anna Weber    │    │
│  │      empf. von Tom    │    │
│  │      gestern  [OFFEN] │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ 🟢 JS  Jan Schulz    │    │
│  │      empf. von Lisa   │    │
│  │      02.03. [ERLEDIGT]│    │
│  └──────────────────────┘    │
│                              │
│              [+]             │  ← FAB (Quick Add)
└──────────────────────────────┘
```

**EmpfehlungCard Verhalten:**
- Tap auf Card → öffnet Detail-View (`/dashboard/[id]`)
- Avatar zeigt Initialen des Kundennamens
- Avatar-Farbe: Orange = Offen, Grün = Erledigt, Blau = Ausgezahlt
- Border-Left: 3px solid, gleiche Farbe wie Status
- Ausgezahlte Cards haben opacity 0.7

### 7.2 Quick Add Screen

Wird geöffnet über den FAB (+) Button.

```
┌──────────────────────────────┐
│  ← Zurück                    │
│  Neue Empfehlung erfassen    │
├──────────────────────────────┤
│                              │
│  Kunde                       │
│  ┌──────────────────────┐    │
│  │                      │    │
│  └──────────────────────┘    │
│                              │
│  Kontakt (Email/Telefon)     │
│  ┌──────────────────────┐    │
│  │                      │    │
│  └──────────────────────┘    │
│                              │
│  Empfohlen von               │
│  ┌──────────────────────┐    │
│  │                      │    │
│  └──────────────────────┘    │
│                              │
│  Email / PayPal              │
│  ┌──────────────────────┐    │
│  │                      │    │
│  └──────────────────────┘    │
│                              │
│  Ref-Code (optional)         │
│  ┌──────────────────────┐    │
│  │ #SEE-2026-           │    │  ← Vorausgefüllt, editierbar
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │   Empfehlung anlegen  │    │  ← Orange CTA
│  └──────────────────────┘    │
│                              │
└──────────────────────────────┘
```

**Datenquelle:** Der Handwerker bekommt eine Anfrage-Mail vom Kunden. In der Mail steht der Empfehlungsblock. Der Handwerker überträgt die Daten manuell in dieses Formular. Das ist BEWUSST so — kein Parsing, kein Automatismus. Einfach und zuverlässig.

### 7.3 Detail / Erledigt Screen

```
┌──────────────────────────────┐
│  ← Zurück                    │
│  Empfehlung Details          │
├──────────────────────────────┤
│                              │
│  Max Müller                  │  ← Kunde
│  empfohlen von Lisa Schmidt  │
│  lisa.schmidt@gmail.com      │
│  Ref: #SEE-2026-0317        │
│  Erfasst: 05.03.2026        │
│                              │
│  Status: OFFEN               │
│                              │
│  ─── Job erledigt? ───       │
│                              │
│  Rechnungsbetrag (brutto)    │
│  ┌──────────────────────┐    │
│  │ €                    │    │
│  └──────────────────────┘    │
│                              │
│  Provision: 5% = € XX,XX     │  ← Live-Berechnung
│                              │
│  ┌──────────────────────┐    │
│  │  ✓ Job erledigt       │    │  ← Grüner Button
│  └──────────────────────┘    │
│                              │
└──────────────────────────────┘
```

**PRIVACY-REGEL:** Der Handwerker sieht den Provisionsprozentsatz und den berechneten Betrag. Der EMPFEHLER sieht NIEMALS den Rechnungsbetrag oder den Prozentsatz — nur den Auszahlungsbetrag (per E-Mail-Notification nach Auszahlung).

---

## 8. Admin Panel (Desktop-First)

### 8.1 Übersicht

Desktop-Layout mit Sidebar-Navigation links.

```
┌────────────┬─────────────────────────────────────┐
│            │                                     │
│  Dashboard │  Alle Empfehlungen                  │
│  Handwerker│                                     │
│  Auszahlung│  [Filter: Handwerker ▼] [Status ▼]  │
│            │                                     │
│            │  ┌─────────────────────────────────┐│
│            │  │ Tabelle mit allen Empfehlungen  ││
│            │  │ Kunde | Empfehler | Handwerker  ││
│            │  │ Status | Betrag | Provision     ││
│            │  │ Datum | Aktionen                ││
│            │  └─────────────────────────────────┘│
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

### 8.2 Handwerker verwalten

- Tabelle: Name, Email, Provisionsprozentsatz, Anzahl Empfehlungen
- Inline-Edit für Provisionsprozentsatz
- Neuen Handwerker anlegen (Modal/Form)

### 8.3 Auszahlungen

- Liste aller Empfehlungen mit Status "erledigt" (bereit zur Auszahlung)
- Checkbox-Selektion für Batch-Auszahlung
- "Auszahlen" Button → PayPal Payouts API → Status wird "ausgezahlt"
- Bestätigungs-Dialog vor jeder Auszahlung

---

## 9. API Routes

### Validierung (Zod)

```typescript
import { z } from 'zod';

export const empfehlungSchema = z.object({
  kunde_name: z.string().min(1).max(120),
  kunde_kontakt: z.string().max(200).optional(),
  empfehler_name: z.string().min(1).max(120),
  empfehler_email: z.string().email().max(200),
  ref_code: z.string().regex(/^#SEE-\d{4}-\d{4}$/).optional(),
});

export const completeSchema = z.object({
  rechnungsbetrag: z.number().positive().max(999999),
});

export const payoutSchema = z.object({
  empfehlung_ids: z.array(z.string().uuid()).min(1).max(50),
});
```

### Auth-Middleware

Jede API Route prüft:
1. Supabase Session vorhanden?
2. User ist Handwerker ODER Admin?
3. Bei Handwerker-Routes: RLS filtert automatisch
4. Bei Admin-Routes: `is_admin` Flag in Auth Metadata prüfen

```typescript
// Beispiel Auth-Check
const { data: { session } } = await supabase.auth.getSession();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Admin-Check
const isAdmin = session.user.user_metadata?.is_admin === true;
```

### Rate Limiting

Implementiere einfaches Rate Limiting über Supabase oder Vercel Edge Config:
- POST /api/referrals: Max 20 pro Stunde pro User
- POST /api/payouts: Max 5 pro Stunde (Admin only)

---

## 10. PayPal Payouts Integration

```typescript
// lib/paypal.ts
import paypal from '@paypal/payouts-sdk';

const environment = process.env.PAYPAL_MODE === 'live'
  ? new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID!,
      process.env.PAYPAL_CLIENT_SECRET!
    )
  : new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID!,
      process.env.PAYPAL_CLIENT_SECRET!
    );

const client = new paypal.core.PayPalHttpClient(environment);

export async function sendPayout(
  recipientEmail: string,
  amount: number,
  refCode: string
): Promise<{ transactionId: string }> {
  const request = new paypal.payouts.PayoutsPostRequest();
  request.requestBody({
    sender_batch_header: {
      sender_batch_id: `SEE-${Date.now()}`,
      email_subject: 'Deine Empfehlungsprovision — Seehafer Elemente',
      email_message: `Vielen Dank für deine Empfehlung! Hier ist deine Provision für Ref ${refCode}.`,
    },
    items: [{
      recipient_type: 'EMAIL',
      amount: { value: amount.toFixed(2), currency: 'EUR' },
      receiver: recipientEmail,
      note: `Provision für Empfehlung ${refCode}`,
    }],
  });

  const response = await client.execute(request);
  return { transactionId: response.result.batch_header.payout_batch_id };
}
```

---

## 11. E-Mail Notifications

Nach jeder Statusänderung eine E-Mail an den Empfehler senden. Nutze Supabase Edge Functions oder einen einfachen E-Mail-Service (z.B. Resend).

### Bei Status → ERLEDIGT:
```
Betreff: Deine Empfehlung wurde bestätigt ✓

Hey {Empfehler-Name},

gute Nachrichten! Der Auftrag, den du empfohlen hast (Ref: {RefCode}),
wurde erfolgreich abgeschlossen.

Deine Provision wird in Kürze ausgezahlt.

Viele Grüße,
Seehafer Elemente
```

### Bei Status → AUSGEZAHLT:
```
Betreff: Deine Provision wurde ausgezahlt 💰

Hey {Empfehler-Name},

deine Provision für die Empfehlung (Ref: {RefCode}) in Höhe von
€{Provisionsbetrag} wurde soeben an {Empfehler-Email} via PayPal überwiesen.

Danke fürs Empfehlen! 🙌

Viele Grüße,
Seehafer Elemente
```

**PRIVACY:** Die E-Mail an den Empfehler enthält NUR den Provisionsbetrag. NIEMALS den Rechnungsbetrag oder Prozentsatz.

---

## 12. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # NUR serverseitig!

# PayPal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=sandbox               # 'sandbox' oder 'live'

# E-Mail (z.B. Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM=empfehlung@seehafer-elemente.de
```

**SICHERHEIT:**
- `SUPABASE_SERVICE_ROLE_KEY` NIE in Client-Code oder NEXT_PUBLIC_ Variablen
- PayPal Credentials NIE clientseitig
- Alle Secrets nur in `.env.local` (lokal) und Vercel Environment Variables (prod)

---

## 13. Security Checklist

- [ ] Supabase RLS aktiviert und getestet
- [ ] Alle API Routes haben Auth-Check
- [ ] Admin-Routes prüfen `is_admin` Flag
- [ ] Zod-Validierung auf allen POST/PATCH Routes
- [ ] Rate Limiting auf sensible Endpoints
- [ ] CSRF-Schutz (Next.js built-in via SameSite Cookies)
- [ ] PayPal Sandbox vollständig getestet vor Live-Schaltung
- [ ] Keine Secrets in Client-Bundle (überprüfe Build-Output)
- [ ] Input Sanitization: Keine SQL-Injection möglich (Supabase parameterized queries)
- [ ] HTTP Security Headers gesetzt (siehe Empfehlerinnen-Page MD)
- [ ] E-Mail-Adressen validieren (Zod + Regex)
- [ ] Rechnungsbeträge: Nur positive Zahlen, max 999.999€

---

## 14. Provisions-Berechnung

```typescript
function berechneProvision(
  rechnungsbetrag: number,
  prozentsatz: number
): number {
  // Prozentsatz kommt aus handwerker.provision_prozent (z.B. 5.00)
  const provision = rechnungsbetrag * (prozentsatz / 100);
  // Auf 2 Dezimalstellen runden
  return Math.round(provision * 100) / 100;
}

// Beispiel: Rechnung €3.200, Seehafer 5% → Provision €160
```

**Regel:** Der Prozentsatz wird vom ADMIN pro Handwerker gesetzt. Der Handwerker kann ihn sehen, aber nicht ändern. Der Empfehler sieht NUR den resultierenden Euro-Betrag.

---

## 15. PWA (Optional, Phase 2)

```json
// public/manifest.json
{
  "name": "Seehafer Empfehlungen",
  "short_name": "Empfehlungen",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#FBFAF5",
  "theme_color": "#050234",
  "icons": [...]
}
```

- Service Worker für Offline-Cache der Dashboard-Daten
- Push Notifications bei neuen Empfehlungen (Phase 3)

---

## 16. Zusammenfassung

| Aspekt | Entscheidung |
|--------|-------------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth + DB + RLS) |
| Auszahlung | PayPal Payouts API |
| E-Mail | Resend (oder Supabase Edge Functions) |
| Validierung | Zod |
| Icons | lucide-react |
| Auth | Supabase Magic Link |
| Deployment | Vercel |
| Domain | Eigene Domain (z.B. app.seehafer-empfehlung.de) |
