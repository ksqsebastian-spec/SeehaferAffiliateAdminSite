import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seehafer Empfehlungen",
  description: "Empfehlungsprogramm-Verwaltung für Seehafer Elemente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
